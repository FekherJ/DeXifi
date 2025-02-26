import { expect } from "chai";
import hardhat from "hardhat";
import dotenv from "dotenv";

dotenv.config();
const { ethers } = hardhat;

describe("DEXRouter - Uniswap v4", function () {
    let owner, user1, user2;
    let DEXRouter, dexRouter;
    let TokenA, TokenB, tokenA, tokenB;
    let WETH;
    let poolManager;
    let mockUnlockCallback;
    let MockPriceFeed, priceFeedA, priceFeedB;

    before(async function () {
        [owner, user1, user2] = await ethers.getSigners();

        const PoolManager = await ethers.getContractFactory("PoolManager");
        poolManager = await PoolManager.deploy(owner.address);
        await poolManager.waitForDeployment();

        const MockUnlockCallback = await ethers.getContractFactory("MockUnlockCallback");
        mockUnlockCallback = await MockUnlockCallback.deploy(await poolManager.getAddress());
        await mockUnlockCallback.waitForDeployment();

        try {
            await mockUnlockCallback.connect(owner).unlock("0x");
            console.log("PoolManager is unlocked.");
        } catch (error) {
            console.log("PoolManager is still locked:", error);
        }

        const WETHMock = await ethers.getContractFactory("WETH");
        WETH = await WETHMock.deploy();
        await WETH.waitForDeployment();

        const TokenAFactory = await ethers.getContractFactory("ERC20Mock");
        tokenA = await TokenAFactory.deploy("Token A", "TKA");
        await tokenA.waitForDeployment();

        const TokenBFactory = await ethers.getContractFactory("ERC20Mock");
        tokenB = await TokenBFactory.deploy("Token B", "TKB");
        await tokenB.waitForDeployment();

        const mintAmount = ethers.parseEther("1000");
        await tokenA.mint(owner.address, mintAmount);
        await tokenB.mint(owner.address, mintAmount);
        await tokenA.mint(user1.address, mintAmount);
        await tokenB.mint(user1.address, mintAmount);

        // ✅ Deploy MockPriceFeed
        MockPriceFeed = await ethers.getContractFactory("MockPriceFeed");
        priceFeedA = await MockPriceFeed.deploy(ethers.parseEther("1")); // Token A = 1 USD
        await priceFeedA.waitForDeployment();

        priceFeedB = await MockPriceFeed.deploy(ethers.parseEther("2")); // Token B = 2 USD
        await priceFeedB.waitForDeployment();

        // ✅ Deploy DEXRouter
        DEXRouter = await ethers.getContractFactory("DEXRouter");
        dexRouter = await DEXRouter.deploy(
            await poolManager.getAddress(),
            await WETH.getAddress()
        );
        await dexRouter.waitForDeployment();

        // ✅ Set price feeds in the router
        await dexRouter.connect(owner).setPriceFeed(await tokenA.getAddress(), await priceFeedA.getAddress());
        await dexRouter.connect(owner).setPriceFeed(await tokenB.getAddress(), await priceFeedB.getAddress());

        // ✅ Add liquidity to enable swaps
        const liquidityAmountA = ethers.parseEther("500");
        const liquidityAmountB = ethers.parseEther("500");

        await tokenA.connect(owner).approve(await dexRouter.getAddress(), liquidityAmountA);
        await tokenB.connect(owner).approve(await dexRouter.getAddress(), liquidityAmountB);

        await dexRouter.connect(owner).addLiquidity(
            await tokenA.getAddress(),
            await tokenB.getAddress(),
            liquidityAmountA,
            liquidityAmountB
        );
    });

    describe("Chainlink Price Feeds", function () {
        it("Should set and fetch price feeds correctly", async function () {
            const fetchedPriceA = await dexRouter.getLatestPrice(await tokenA.getAddress());
            const fetchedPriceB = await dexRouter.getLatestPrice(await tokenB.getAddress());

            expect(fetchedPriceA).to.equal(ethers.parseEther("1")); // Mocked price
            expect(fetchedPriceB).to.equal(ethers.parseEther("2")); // Mocked price
        });

        it("Should revert if price feed is missing", async function () {
            await expect(
                dexRouter.getLatestPrice(user1.address) // Using an address without a feed
            ).to.be.revertedWith("DEXRouter: No price feed for token");
        });

        it("Should update price feed for a token", async function () {
            const newPriceFeed = await MockPriceFeed.deploy(ethers.parseEther("5")); // Set new price to 5 USD
            await newPriceFeed.waitForDeployment();
        
            await dexRouter.connect(owner).setPriceFeed(await tokenA.getAddress(), await newPriceFeed.getAddress());
        
            const updatedPrice = await dexRouter.getLatestPrice(await tokenA.getAddress());
            expect(updatedPrice).to.equal(ethers.parseEther("5")); // Ensure update worked
        });
        
    });

    describe("Liquidity Setup", function () {
        before(async function () {
            await tokenA.connect(owner).approve(await dexRouter.getAddress(), ethers.parseEther("1000"));
            await tokenB.connect(owner).approve(await dexRouter.getAddress(), ethers.parseEther("1000"));

            const amountA = ethers.parseEther("500");
            const amountB = ethers.parseEther("500");

            await dexRouter.connect(owner).addLiquidity(
                await tokenA.getAddress(),
                await tokenB.getAddress(),
                amountA,
                amountB
            );

            console.log("Liquidity added successfully.");
        });

        it("Should have enough reserves before swapping", async function () {
            const reserveA = await tokenA.balanceOf(await dexRouter.getAddress());
            const reserveB = await tokenB.balanceOf(await dexRouter.getAddress());

            console.log(`ReserveA: ${ethers.formatEther(reserveA)} TKA`);
            console.log(`ReserveB: ${ethers.formatEther(reserveB)} TKB`);

            expect(reserveA).to.be.gt(0);
            expect(reserveB).to.be.gt(0);
        });
    });

    describe("Token Swap with Price Feeds", function () {
        it("Should execute a valid token swap using Chainlink prices", async function () {
            const amountIn = ethers.parseEther("10");
            const amountOutMin = ethers.parseEther("5"); // 10 TKA (1 USD each) -> 5 TKB (2 USD each)
            const deadline = Math.floor(Date.now() / 1000) + 300; // 5 minutes from now

            await tokenA.connect(owner).approve(await dexRouter.getAddress(), amountIn);

            await expect(
                dexRouter.connect(owner).swapExactInputSingle(
                    await tokenA.getAddress(),
                    await tokenB.getAddress(),
                    amountIn,
                    amountOutMin,
                    deadline
                )
            ).to.emit(dexRouter, "SwapExecuted");
        });

        it("Should fail swap if price slippage is too high", async function () {
            const amountIn = ethers.parseEther("10");
            const amountOutMin = ethers.parseEther("10"); // Unrealistic slippage protection
            const deadline = Math.floor(Date.now() / 1000) + 300;

            await tokenA.connect(owner).approve(await dexRouter.getAddress(), amountIn);

            await expect(
                dexRouter.connect(owner).swapExactInputSingle(
                    await tokenA.getAddress(),
                    await tokenB.getAddress(),
                    amountIn,
                    amountOutMin,
                    deadline
                )
            ).to.be.revertedWith("DEXRouter: Slippage exceeded");
        });
    });

    it("Should execute a swap after price update", async function () {
        const newPriceFeedA = await MockPriceFeed.deploy(ethers.parseEther("3")); // New price: 3 USD
        await newPriceFeedA.waitForDeployment();  // ✅ Wait for deployment
    
        const newPriceFeedB = await MockPriceFeed.deploy(ethers.parseEther("1")); // New price: 1 USD
        await newPriceFeedB.waitForDeployment();  // ✅ Wait for deployment
    
        await dexRouter.connect(owner).setPriceFeed(await tokenA.getAddress(), await newPriceFeedA.getAddress());
        await dexRouter.connect(owner).setPriceFeed(await tokenB.getAddress(), await newPriceFeedB.getAddress());
    
        const amountIn = ethers.parseEther("3"); // 3 TKA (1 TKA = 3 USD)
        const expectedAmountOut = ethers.parseEther("9"); // 3 TKA = 9 TKB (1 TKB = 1 USD)
    
        await tokenA.connect(owner).approve(await dexRouter.getAddress(), amountIn);
    
        await expect(
            dexRouter.connect(owner).swapExactInputSingle(
                await tokenA.getAddress(),
                await tokenB.getAddress(),
                amountIn,
                expectedAmountOut,
                Math.floor(Date.now() / 1000) + 300
            )
        ).to.emit(dexRouter, "SwapExecuted");
    });
    

    it("Should fail swap if Chainlink returns an invalid price", async function () {
        const brokenPriceFeed = await MockPriceFeed.deploy(0); // 0 price (invalid)
        await brokenPriceFeed.waitForDeployment();  // ✅ Ensure deployment
    
        await dexRouter.connect(owner).setPriceFeed(await tokenA.getAddress(), await brokenPriceFeed.getAddress());
    
        const amountIn = ethers.parseEther("10");
        const amountOutMin = ethers.parseEther("5");
    
        await tokenA.connect(owner).approve(await dexRouter.getAddress(), amountIn);  // ✅ Ensure allowance
    
        await expect(
            dexRouter.connect(owner).swapExactInputSingle(
                await tokenA.getAddress(),
                await tokenB.getAddress(),
                amountIn,
                amountOutMin,
                Math.floor(Date.now() / 1000) + 300
            )
        ).to.be.revertedWith("DEXRouter: Invalid price");
    });
    
    

    it("Should revert if trying to swap a token without a price feed", async function () {
        const amountIn = ethers.parseEther("10");
        const amountOutMin = ethers.parseEther("5");
    
        await tokenA.connect(owner).approve(await dexRouter.getAddress(), amountIn);
    
        await expect(
            dexRouter.connect(owner).swapExactInputSingle(
                await tokenA.getAddress(),
                await user1.getAddress(), // Using an address that is NOT in the price feed
                amountIn,
                amountOutMin,
                Math.floor(Date.now() / 1000) + 300
            )
        ).to.be.revertedWith("DEXRouter: No price feed for token");
    });
    
    
    



    describe("Liquidity Management", function () {
        before(async function () {
            await tokenA.connect(owner).approve(await dexRouter.getAddress(), ethers.parseEther("1000"));
            await tokenB.connect(owner).approve(await dexRouter.getAddress(), ethers.parseEther("1000"));
        });

        it("Should add liquidity successfully", async function () {
            const amountA = ethers.parseEther("50");
            const amountB = ethers.parseEther("50");

            await expect(
                dexRouter.connect(owner).addLiquidity(
                    await tokenA.getAddress(),
                    await tokenB.getAddress(),
                    amountA,
                    amountB
                )
            ).to.emit(dexRouter, "LiquidityAdded");
        });

        it("Should remove liquidity successfully", async function () {
            const liquidity = ethers.parseEther("10");

            await expect(
                dexRouter.connect(owner).removeLiquidity(
                    await tokenA.getAddress(),
                    await tokenB.getAddress(),
                    liquidity
                )
            ).to.emit(dexRouter, "LiquidityRemoved");
        });

        it("Should fail if non-LP tries to remove liquidity", async function () {
            const liquidity = ethers.parseEther("10");

            await expect(
                dexRouter.connect(user1).removeLiquidity(
                    await tokenA.getAddress(),
                    await tokenB.getAddress(),
                    liquidity
                )
            ).to.be.revertedWith("DEXRouter: Not enough LP tokens");
        });
    });
});
