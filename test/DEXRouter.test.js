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

        DEXRouter = await ethers.getContractFactory("DEXRouter");
        dexRouter = await DEXRouter.deploy(
            await poolManager.getAddress(),
            await WETH.getAddress()
        );
        await dexRouter.waitForDeployment();
    });

    describe("Liquidity Setup", function () {
        before(async function () {
            await tokenA.connect(owner).approve(await dexRouter.getAddress(), ethers.parseEther("1000"));
            await tokenB.connect(owner).approve(await dexRouter.getAddress(), ethers.parseEther("1000"));

            try {
                await dexRouter.connect(owner).initializePool(
                    await tokenA.getAddress(),
                    await tokenB.getAddress(),
                    ethers.parseEther("1")
                );
                console.log("Pool initialized successfully.");
            } catch (error) {
                console.log("Pool initialization skipped (already initialized or not required).");
            }

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

    describe("Token Swap", function () {
        it("Should execute a valid token swap", async function () {
            const amountIn = ethers.parseEther("10");
            const amountOutMin = ethers.parseEther("9");
            const deadline = Math.floor(Date.now() / 1000) + 300; // 5 minutes from now

            await tokenA.connect(owner).approve(await dexRouter.getAddress(), amountIn);

            const ownerBalanceBefore = await tokenB.balanceOf(owner.address);

            await expect(
                dexRouter.connect(owner).swapExactInputSingle(
                    await tokenA.getAddress(),
                    await tokenB.getAddress(),
                    amountIn,
                    amountOutMin,
                    deadline
                )
            ).to.emit(dexRouter, "SwapExecuted");

            const ownerBalanceAfter = await tokenB.balanceOf(owner.address);
            expect(ownerBalanceAfter).to.be.gt(ownerBalanceBefore);
        });


        it("Should fail swap if there is insufficient liquidity", async function () {
            const amountIn = ethers.parseEther("500000"); // Too high to swap
            const amountOutMin = ethers.parseEther("450000");
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
            ).to.be.reverted;

        });
        

        it("Should fail swap if transaction deadline is exceeded", async function () {
            const amountIn = ethers.parseEther("10");
            const amountOutMin = ethers.parseEther("9");
            const expiredDeadline = Math.floor(Date.now() / 1000) - 60; // 1 min ago

            await expect(
                dexRouter.connect(owner).swapExactInputSingle(
                    await tokenA.getAddress(),
                    await tokenB.getAddress(),
                    amountIn,
                    amountOutMin,
                    expiredDeadline
                )
            ).to.be.revertedWith("DEXRouter: Transaction expired");
        });

        it("Should fail swap if allowance is insufficient", async function () {
            const amountIn = ethers.parseEther("100");
            const amountOutMin = ethers.parseEther("90");
            const deadline = Math.floor(Date.now() / 1000) + 300; // 5 minutes from now

            await expect(
                dexRouter.connect(user1).swapExactInputSingle(
                    await tokenA.getAddress(),
                    await tokenB.getAddress(),
                    amountIn,
                    amountOutMin,
                    deadline
                )
            ).to.be.revertedWith("DEXRouter: Insufficient allowance");
        });
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
