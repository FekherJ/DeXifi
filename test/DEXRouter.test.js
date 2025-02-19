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

        // 🚀 Deploy WETH Mock
        console.log("🚀 Deploying WETH...");
        const WETHMock = await ethers.getContractFactory("WETH");
        WETH = await WETHMock.deploy();
        await WETH.waitForDeployment();
        console.log("✅ WETH deployed at:", await WETH.getAddress());

        // 🚀 Deploy Mock Tokens (Fixed ERC20Mock deployment)
        console.log("🚀 Deploying Token A...");
        const TokenAFactory = await ethers.getContractFactory("ERC20Mock");
        tokenA = await TokenAFactory.deploy("Token A", "TKA");
        await tokenA.waitForDeployment();
        console.log("✅ Token A deployed at:", await tokenA.getAddress());

        console.log("🚀 Deploying Token B...");
        const TokenBFactory = await ethers.getContractFactory("ERC20Mock");
        tokenB = await TokenBFactory.deploy("Token B", "TKB");
        await tokenB.waitForDeployment();
        console.log("✅ Token B deployed at:", await tokenB.getAddress());

        // 🚀 Determine network & get PoolManager address
        const network = await ethers.provider.getNetwork();
        console.log(`🌍 Detected Network: Chain ID = ${network.chainId}`);
        
        if (network.chainId === 31337) {  // ✅ This is localhost, so deploy a new PoolManager
            console.log("🚀 Deploying Pool Manager on localhost...");
            const PoolManagerFactory = await ethers.getContractFactory("PoolManager");
            poolManager = await PoolManagerFactory.deploy();
            await poolManager.waitForDeployment();
            console.log("✅ Pool Manager deployed at:", await poolManager.getAddress());
        } else if (process.env.SEPOLIA_POOL_MANAGER) {  // ✅ This runs only if a Sepolia address exists
            console.log("🌍 Using Sepolia Pool Manager...");
            console.log("🔍 Sepolia Pool Manager Address:", process.env.SEPOLIA_POOL_MANAGER);
            poolManager = await ethers.getContractAt("IPoolManager", process.env.SEPOLIA_POOL_MANAGER);
        } else {
            // ❌ This should only trigger if the test is running on Sepolia but no ENV variable is set
            throw new Error("❌ SEPOLIA_POOL_MANAGER is missing in .env, and you're not running on localhost.");
        }
        
    console.log("🌍 Using Sepolia Pool Manager...");
    console.log("🔍 Sepolia Pool Manager Address:", process.env.SEPOLIA_POOL_MANAGER);
    poolManager = await ethers.getContractAt("IPoolManager", process.env.SEPOLIA_POOL_MANAGER);




        // 🚀 Deploy DEXRouter (Confirmed constructor format)
        console.log("🚀 Deploying DEXRouter...");
        DEXRouter = await ethers.getContractFactory("DEXRouter");
        dexRouter = await DEXRouter.deploy(await poolManager.getAddress(), await WETH.getAddress());
        await dexRouter.waitForDeployment();
        console.log("✅ DEXRouter deployed at:", await dexRouter.getAddress());
    });

    describe("1️⃣ Contract Deployment", function () {
        it("Should deploy the contracts correctly", async function () {
            expect(await dexRouter.poolManager()).to.equal(await poolManager.getAddress());
            expect(await dexRouter.WETH()).to.equal(await WETH.getAddress());
        });
    });

    describe("2️⃣ Token Swap", function () {
        before(async function () {
            console.log("🚀 Approving DEXRouter to spend tokens...");
            await tokenA.connect(owner).approve(await dexRouter.getAddress(), ethers.parseEther("1000"));
            await tokenB.connect(owner).approve(await dexRouter.getAddress(), ethers.parseEther("1000"));
        });

        it("Should execute a valid token swap", async function () {
            const amountIn = ethers.parseEther("10");
            const amountOutMin = ethers.parseEther("9");

            await expect(
                dexRouter.connect(owner).swapExactInputSingle(
                    await tokenA.getAddress(),
                    await tokenB.getAddress(),
                    amountIn,
                    amountOutMin
                )
            ).to.emit(dexRouter, "SwapExecuted")
            .withArgs(owner.address, await tokenA.getAddress(), await tokenB.getAddress(), amountIn, amountOutMin);
        });

        it("Should fail swap with insufficient balance", async function () {
            const amountIn = ethers.parseEther("100000"); // Too high
            const amountOutMin = ethers.parseEther("99");

            await expect(
                dexRouter.connect(user1).swapExactInputSingle(
                    await tokenA.getAddress(),
                    await tokenB.getAddress(),
                    amountIn,
                    amountOutMin
                )
            ).to.be.revertedWith("ERC20: transfer amount exceeds balance");
        });
    });

    describe("3️⃣ Liquidity Management", function () {
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
            ).to.emit(dexRouter, "LiquidityAdded")
            .withArgs(owner.address, await tokenA.getAddress(), await tokenB.getAddress(), amountA);
        });

        it("Should fail adding liquidity with zero amounts", async function () {
            await expect(
                dexRouter.connect(owner).addLiquidity(
                    await tokenA.getAddress(),
                    await tokenB.getAddress(),
                    0,
                    0
                )
            ).to.be.revertedWith("Invalid amounts");
        });

        it("Should remove liquidity successfully", async function () {
            const liquidity = ethers.parseEther("10");

            await expect(
                dexRouter.connect(owner).removeLiquidity(
                    await tokenA.getAddress(),
                    await tokenB.getAddress(),
                    liquidity
                )
            ).to.emit(dexRouter, "LiquidityRemoved")
            .withArgs(owner.address, await tokenA.getAddress(), await tokenB.getAddress(), liquidity);
        });
    });
});
