import { expect } from "chai";
import hardhat from "hardhat";
const { ethers } = hardhat;

describe("DEXRouter - Uniswap v4", function () {
    let deployer, user;
    let poolManager, unlockCallback, dexRouter, tokenA, tokenB, priceFeedA, priceFeedB;

    before(async function () {
        [deployer, user] = await ethers.getSigners();

        // Deploy Mock ERC20 Tokens
        const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
        tokenA = await ERC20Mock.deploy("Token A", "TKA", deployer);
        tokenB = await ERC20Mock.deploy("Token B", "TKB", deployer);
        await tokenA.waitForDeployment();
        await tokenB.waitForDeployment();

        // Deploy Mock Chainlink Price Feeds
        const MockPriceFeed = await ethers.getContractFactory("MockPriceFeed");
        priceFeedA = await MockPriceFeed.deploy(ethers.parseUnits("200", 8)); // Price for Token A
        priceFeedB = await MockPriceFeed.deploy(ethers.parseUnits("400", 8)); // Price for Token B
        await priceFeedA.waitForDeployment();
        await priceFeedB.waitForDeployment();

        // Deploy PoolManager
        const PoolManager = await ethers.getContractFactory("PoolManager");
        poolManager = await PoolManager.deploy(deployer);
        await poolManager.waitForDeployment();

        // Deploy Mock Unlock Callback
        const UnlockHelper = await ethers.getContractFactory("MockUnlockCallback");
        unlockCallback = await UnlockHelper.deploy(poolManager.target);
        await unlockCallback.waitForDeployment();

        // Ensure unlockCallback has the right function
        if (typeof unlockCallback.unlock !== "function") {
            throw new Error("unlockCallback contract does not have the function 'unlock'");
        }

        const WETH = await ethers.getContractFactory("WETH");
        const weth = await WETH.deploy();
        await weth.waitForDeployment();


        // Deploy DEXRouter (Ensure correct constructor arguments)
        const DEXRouter = await ethers.getContractFactory("DEXRouter");
        dexRouter = await DEXRouter.deploy(poolManager.target, weth.target);
        await dexRouter.waitForDeployment();

        // Set up price feeds
        await dexRouter.setPriceFeed(tokenA.target, priceFeedA.target);
        await dexRouter.setPriceFeed(tokenB.target, priceFeedB.target);
    });

    describe("Pool Initialization", function () {
        it("Should initialize pool using Chainlink prices", async function () {
            const poolKey = {
                currency0: tokenA.target,
                currency1: tokenB.target,
                fee: 3000,
                tickSpacing: 60,
                hooks: ethers.ZeroAddress
            };

            await expect(dexRouter.initializePoolWithChainlink(poolKey))
                .to.emit(poolManager, "Initialize")
                .withArgs(
                    tokenA.target,
                    tokenB.target,
                    3000,
                    60,
                    ethers.ZeroAddress
                );
        });
    });

    describe("Liquidity Management", function () {
        it("Should add liquidity successfully", async function () {
            const amountA = ethers.parseEther("10");
            const amountB = ethers.parseEther("20");
            const poolKey = {
                currency0: tokenA.target,
                currency1: tokenB.target,
                fee: 3000,
                tickSpacing: 60,
                hooks: ethers.ZeroAddress
            };

            await tokenA.approve(dexRouter.target, amountA);
            await tokenB.approve(dexRouter.target, amountB);

            await expect(
                dexRouter.addLiquidity(poolKey, amountA, amountB, -600, 600, ethers.ZeroHash)
            )
                .to.emit(dexRouter, "LiquidityAdded")
                .withArgs(tokenA.target, tokenB.target, deployer.address, amountA, amountB);
        });

        it("Should remove liquidity successfully", async function () {
            const liquidity = ethers.parseEther("5");
            const poolKey = {
                currency0: tokenA.target,
                currency1: tokenB.target,
                fee: 3000,
                tickSpacing: 60,
                hooks: ethers.ZeroAddress
            };

            await expect(
                dexRouter.removeLiquidity(poolKey, liquidity, -600, 600, ethers.ZeroHash)
            )
                .to.emit(dexRouter, "LiquidityRemoved")
                .withArgs(tokenA.target, tokenB.target, deployer.address, liquidity);
        });
    });

    describe("Token Swaps", function () {
        it("Should execute a swap correctly", async function () {
            const amountIn = ethers.parseEther("1");
            const poolKey = {
                currency0: tokenA.target,
                currency1: tokenB.target,
                fee: 3000,
                tickSpacing: 60,
                hooks: ethers.ZeroAddress
            };

            await tokenA.approve(dexRouter.target, amountIn);

            await expect(
                dexRouter.swapExactInputSingle(poolKey, amountIn, Math.floor(Date.now() / 1000) + 60, 5)
            )
                .to.emit(dexRouter, "SwapExecuted")
                .withArgs(tokenA.target, tokenB.target, deployer.address, amountIn);
        });
    });

    describe("Security & Edge Cases", function () {
        it("Should revert if slippage is exceeded", async function () {
            const amountIn = ethers.parseEther("1");
            const poolKey = {
                currency0: tokenA.target,
                currency1: tokenB.target,
                fee: 3000,
                tickSpacing: 60,
                hooks: ethers.ZeroAddress
            };

            await tokenA.approve(dexRouter.target, amountIn);

            await expect(
                dexRouter.swapExactInputSingle(poolKey, amountIn, Math.floor(Date.now() / 1000) + 60, 50)
            ).to.be.revertedWith("Transaction expired");
        });
    });
});
