import { expect } from "chai";
import hardhat from "hardhat";
const { ethers } = hardhat;

describe("DEXRouter - Uniswap v4", function () {
    let owner, user1, user2;
    let DEXRouter, dexRouter;
    let TokenA, TokenB, tokenA, tokenB;
    let WETH;
    let poolManager; // Use an interface instead of deploying

    before(async function () {
        [owner, user1, user2] = await ethers.getSigners();

        // Deploy WETH Mock
        const WETHMock = await ethers.getContractFactory("WETH");
        WETH = await WETHMock.deploy();

        // Deploy Mock Tokens
        TokenA = await ethers.getContractFactory("ERC20Mock");
        TokenB = await ethers.getContractFactory("ERC20Mock");
        tokenA = await TokenA.deploy("Token A", "TKA", ethers.parseEther("100000"));
        tokenB = await TokenB.deploy("Token B", "TKB", ethers.parseEther("100000"));

        // Get Uniswap PoolManager (use an actual deployed address)
        const POOL_MANAGER_ADDRESS = "0xYourUniswapPoolManagerAddress"; // Replace with the actual address
        poolManager = await ethers.getContractAt("IPoolManager", POOL_MANAGER_ADDRESS);

        // Deploy DEXRouter
        DEXRouter = await ethers.getContractFactory("DEXRouter");
        dexRouter = await DEXRouter.deploy(poolManager.target, WETH.target);
    });

    describe("1️⃣ Contract Deployment", function () {
        it("Should deploy the contracts correctly", async function () {
            expect(await dexRouter.poolManager()).to.equal(poolManager.target);
            expect(await dexRouter.WETH()).to.equal(WETH.target);
        });
    });

    describe("2️⃣ Token Swap", function () {
        before(async function () {
            // Approve DEXRouter to use tokens
            await tokenA.connect(owner).approve(dexRouter.target, ethers.parseEther("1000"));
            await tokenB.connect(owner).approve(dexRouter.target, ethers.parseEther("1000"));
        });

        it("Should execute a valid token swap", async function () {
            const amountIn = ethers.parseEther("10");
            const amountOutMin = ethers.parseEther("9");

            await expect(
                dexRouter.connect(owner).swapExactInputSingle(
                    tokenA.target,
                    tokenB.target,
                    amountIn,
                    amountOutMin
                )
            ).to.emit(dexRouter, "SwapExecuted")
            .withArgs(owner.address, tokenA.target, tokenB.target, amountIn, amountOutMin);
        });

        it("Should fail swap with insufficient balance", async function () {
            const amountIn = ethers.parseEther("100000"); // Too high
            const amountOutMin = ethers.parseEther("99");

            await expect(
                dexRouter.connect(user1).swapExactInputSingle(
                    tokenA.target,
                    tokenB.target,
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
                    tokenA.target,
                    tokenB.target,
                    amountA,
                    amountB
                )
            ).to.emit(dexRouter, "LiquidityAdded")
            .withArgs(owner.address, tokenA.target, tokenB.target, amountA);
        });

        it("Should fail adding liquidity with zero amounts", async function () {
            await expect(
                dexRouter.connect(owner).addLiquidity(
                    tokenA.target,
                    tokenB.target,
                    0,
                    0
                )
            ).to.be.revertedWith("Invalid amounts");
        });

        it("Should remove liquidity successfully", async function () {
            const liquidity = ethers.parseEther("10");

            await expect(
                dexRouter.connect(owner).removeLiquidity(
                    tokenA.target,
                    tokenB.target,
                    liquidity
                )
            ).to.emit(dexRouter, "LiquidityRemoved")
            .withArgs(owner.address, tokenA.target, tokenB.target, liquidity);
        });
    });
});
