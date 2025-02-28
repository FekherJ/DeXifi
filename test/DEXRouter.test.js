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

        const mintAmount = ethers.parseEther("5000");
        
        console.log("Owner TKA Balance:", ethers.formatEther(await tokenA.balanceOf(owner.address)));
        console.log("Owner TKB Balance:", ethers.formatEther(await tokenB.balanceOf(owner.address)));

        await tokenA.mint(owner.address, mintAmount);
        await tokenB.mint(owner.address, mintAmount);
        await tokenA.mint(user1.address, mintAmount);
        await tokenB.mint(user1.address, mintAmount);

       /*
        // ✅ Deploy MockPriceFeed
        MockPriceFeed = await ethers.getContractFactory("MockPriceFeed");
        priceFeedA = await MockPriceFeed.deploy(ethers.parseEther("1")); // Token A = 1 USD
        await priceFeedA.waitForDeployment();

        priceFeedB = await MockPriceFeed.deploy(ethers.parseEther("2")); // Token B = 2 USD
        await priceFeedB.waitForDeployment();
        */
        // Use Chainlink price feeds (Sepolia testnet)
        const chainlinkETHUSD = "0x694AA1769357215DE4FAC081bf1f309aDC325306"; // ETH/USD
        const chainlinkBTCUSD = "0xA39434A63A52E749F02807ae27335515BA4b07F7"; // BTC/USD


        // ✅ Deploy DEXRouter
        DEXRouter = await ethers.getContractFactory("DEXRouter");
        dexRouter = await DEXRouter.deploy(
            await poolManager.getAddress(),
            await WETH.getAddress()
        );
        await dexRouter.waitForDeployment();

        /*// ✅ Set price feeds in the router
        await dexRouter.connect(owner).setPriceFeed(await tokenA.getAddress(), await priceFeedA.getAddress());
        await dexRouter.connect(owner).setPriceFeed(await tokenB.getAddress(), await priceFeedB.getAddress());
        */
        await dexRouter.connect(owner).setPriceFeed(await tokenA.getAddress(), chainlinkETHUSD);
        await dexRouter.connect(owner).setPriceFeed(await tokenB.getAddress(), chainlinkBTCUSD);
        
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
            
            expect(fetchedPriceA).to.be.gt(ethers.parseEther("0.1")); // Ensure it's greater than 0
            expect(fetchedPriceB).to.be.gt(ethers.parseEther("0.1"));
            
        });

        it("Should revert if price feed is missing", async function () {
            await expect(
                dexRouter.getLatestPrice(user1.address) // Using an address without a feed
            ).to.be.revertedWith("DEXRouter: No price feed for token");
        });

        it("Should update price feed for a token", async function () {
            /*const newPriceFeed = await MockPriceFeed.deploy(ethers.parseEther("5")); // Set new price to 5 USD
            await newPriceFeed.waitForDeployment();
        
            await dexRouter.connect(owner).setPriceFeed(await tokenA.getAddress(), await newPriceFeed.getAddress());
        
            const updatedPrice = await dexRouter.getLatestPrice(await tokenA.getAddress());
            expect(updatedPrice).to.equal(ethers.parseEther("5")); // Ensure update worked
            */
            const newChainlinkFeed = "0x694AA1769357215DE4FAC081bf1f309aDC325306"; // Replace with a valid Chainlink test feed
            await dexRouter.connect(owner).setPriceFeed(await tokenA.getAddress(), newChainlinkFeed);
            
            const updatedPrice = await dexRouter.getLatestPrice(await tokenA.getAddress());
            expect(updatedPrice).to.be.gt(ethers.parseEther("0.1")); // Ensure update worked
            

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
        
            // ✅ Fetch latest Chainlink prices dynamically and convert to BigInt
            const priceA = BigInt(await dexRouter.getLatestPrice(await tokenA.getAddress()));
            const priceB = BigInt(await dexRouter.getLatestPrice(await tokenB.getAddress()));
        
            // ✅ Convert to BigInt and calculate expected output amount
            const expectedAmountOut = (BigInt(amountIn) * priceA) / priceB;
            const amountOutMin = expectedAmountOut * BigInt(98) / BigInt(100); // 2% slippage
        
            const deadline = Math.floor(Date.now() / 1000) + 300; // 5 minutes from now
        
            await tokenA.connect(owner).approve(await dexRouter.getAddress(), amountIn);
        
            await expect(
                dexRouter.connect(owner).swapExactInputSingle(
                    await tokenA.getAddress(),
                    await tokenB.getAddress(),
                    amountIn.toString(), // ✅ Convert BigInt to string
                    amountOutMin.toString(), // ✅ Convert BigInt to string
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
        const newChainlinkFeedA = "0x694AA1769357215DE4FAC081bf1f309aDC325306"; // ETH/USD
        const newChainlinkFeedB = "0x1b44F3514812d835EB1BDB0acB33d3fA3351Ee43"; // BTC/USD
    
        await dexRouter.connect(owner).setPriceFeed(await tokenA.getAddress(), newChainlinkFeedA);
        await dexRouter.connect(owner).setPriceFeed(await tokenB.getAddress(), newChainlinkFeedB);
    
        const amountIn = ethers.parseEther("3"); // 3 TKA
    
        // ✅ Fetch latest prices dynamically
        const priceA = await dexRouter.getLatestPrice(await tokenA.getAddress());
        const priceB = await dexRouter.getLatestPrice(await tokenB.getAddress());
    
        const expectedAmountOut = amountIn * priceA / priceB; // ✅ Compute expected output dynamically
    
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
    
    

    xit("Should fail swap if Chainlink returns an invalid price", async function () {
        // ✅ Deploy a mock Chainlink oracle with a zero price
        const MockPriceFeed = await ethers.getContractFactory("MockPriceFeed");
        const invalidPriceFeed = await MockPriceFeed.deploy(0); // Returns price = 0
    
        await dexRouter.setPriceFeed(await tokenA.getAddress(), await invalidPriceFeed.getAddress());
    
        const amountIn = ethers.parseEther("0.01"); // ✅ Smaller amount to avoid slippage issues
        const amountOutMin = ethers.parseEther("0.005");
    
        await tokenA.connect(owner).approve(await dexRouter.getAddress(), amountIn);
    
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
