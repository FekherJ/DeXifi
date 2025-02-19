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

    before(async function () {
        [owner, user1, user2] = await ethers.getSigners();

        // 🚀 Deploy Pool Manager (Uniswap V4)
        console.log("🚀 Deploying Uniswap V4 Pool Manager...");
        const PoolManager = await ethers.getContractFactory("Uniswap/PoolManager");
        poolManager = await PoolManager.deploy();
        await poolManager.waitForDeployment();
        console.log("✅ Pool Manager deployed at:", await poolManager.getAddress());

        // 🚀 Deploy WETH
        console.log("🚀 Deploying WETH...");
        const WETHMock = await ethers.getContractFactory("WETH");
        WETH = await WETHMock.deploy();
        await WETH.waitForDeployment();
        console.log("✅ WETH deployed at:", await WETH.getAddress());

        // 🚀 Deploy Token A
        console.log("🚀 Deploying Token A...");
        const TokenAFactory = await ethers.getContractFactory("ERC20Mock");
        tokenA = await TokenAFactory.deploy("Token A", "TKA");
        await tokenA.waitForDeployment();
        console.log("✅ Token A deployed at:", await tokenA.getAddress());

        // 🚀 Deploy Token B
        console.log("🚀 Deploying Token B...");
        const TokenBFactory = await ethers.getContractFactory("ERC20Mock");
        tokenB = await TokenBFactory.deploy("Token B", "TKB");
        await tokenB.waitForDeployment();
        console.log("✅ Token B deployed at:", await tokenB.getAddress());

        // 🚀 Mint tokens to test accounts
        console.log("🚀 Minting tokens to test users...");
        await tokenA.mint(owner.address, ethers.parseEther("1000"));
        await tokenB.mint(owner.address, ethers.parseEther("1000"));
        await tokenA.mint(user1.address, ethers.parseEther("1000"));
        await tokenB.mint(user1.address, ethers.parseEther("1000"));

        // 🚀 Deploy DEXRouter with real Uniswap V4 PoolManager
        console.log("🚀 Deploying DEXRouter...");
        DEXRouter = await ethers.getContractFactory("DEXRouter");
        dexRouter = await DEXRouter.deploy(await poolManager.getAddress(), await WETH.getAddress());
        await dexRouter.waitForDeployment();
        console.log("✅ DEXRouter deployed at:", await dexRouter.getAddress());
    });

    describe("1️⃣ Contract Deployment", function () {
        it("Should deploy the contracts correctly", async function () {
            expect(await dexRouter.WETH()).to.equal(await WETH.getAddress());
        });
    });

    describe("2️⃣ Token Swap", function () {
        before(async function () {
            console.log("🚀 Approving DEXRouter to spend tokens...");
            await tokenA.connect(owner).approve(await dexRouter.getAddress(), ethers.parseEther("1000"));
            await tokenB.connect(owner).approve(await dexRouter.getAddress(), ethers.parseEther("1000"));
            await tokenA.connect(owner).approve(await poolManager.getAddress(), ethers.parseEther("1000"));
            await tokenB.connect(owner).approve(await poolManager.getAddress(), ethers.parseEther("1000"));
        });

        it("Should execute a valid token swap", async function () {
            const amountIn = ethers.parseEther("10");
            const amountOutMin = ethers.parseEther("9");

            const ownerBalanceBefore = await tokenB.balanceOf(owner.address);

            await expect(
                dexRouter.connect(owner).swapExactInputSingle(
                    await tokenA.getAddress(),
                    await tokenB.getAddress(),
                    amountIn,
                    amountOutMin
                )
            ).to.emit(dexRouter, "SwapExecuted");

            const ownerBalanceAfter = await tokenB.balanceOf(owner.address);
            expect(ownerBalanceAfter).to.be.gt(ownerBalanceBefore);
        });

        it("Should fail swap with insufficient balance", async function () {
            await tokenA.connect(user1).approve(await dexRouter.getAddress(), ethers.parseEther("100000"));

            const amountIn = ethers.parseEther("100000"); // Too high
            const amountOutMin = ethers.parseEther("99");

            await expect(
                dexRouter.connect(user1).swapExactInputSingle(
                    await tokenA.getAddress(),
                    await tokenB.getAddress(),
                    amountIn,
                    amountOutMin
                )
            ).to.be.revertedWithCustomError(tokenA, "ERC20InsufficientBalance");
        });
    });

    describe("3️⃣ Liquidity Management", function () {
        before(async function () {
            console.log("🚀 Approving DEXRouter for liquidity...");
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

        it("Should fail adding liquidity with zero amounts", async function () {
            await expect(
                dexRouter.connect(owner).addLiquidity(
                    await tokenA.getAddress(),
                    await tokenB.getAddress(),
                    0,
                    0
                )
            ).to.be.revertedWith("Amounts must be greater than 0");
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
    });
});
