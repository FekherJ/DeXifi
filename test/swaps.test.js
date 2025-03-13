const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DEX Swap Functionality", function () {
    let deployer, user1, user2;
    let DEXRouter, dexRouter, tokenA, tokenB, poolManager, priceFeed;

    beforeEach(async function () {
        [deployer, user1, user2] = await ethers.getSigners();

        // Deploy Mock ERC20 tokens
        const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
        tokenA = await ERC20Mock.deploy("Token A", "TKA");
        tokenB = await ERC20Mock.deploy("Token B", "TKB");
        await tokenA.deployed();
        await tokenB.deployed();

        // Deploy Pool Manager mock
        const PoolManager = await ethers.getContractFactory("MockPoolManager");
        poolManager = await PoolManager.deploy();
        await poolManager.deployed();

        // Deploy Price Feed Mock
        const MockPriceFeed = await ethers.getContractFactory("MockPriceFeed");
        priceFeed = await MockPriceFeed.deploy(ethers.utils.parseUnits("2000", 8), 8);
        await priceFeed.deployed();

        // Deploy DEX Router
        const DEXRouter = await ethers.getContractFactory("DEXRouter");
        dexRouter = await DEXRouter.deploy(poolManager.address);
        await dexRouter.deployed();

        // Mint tokens
        await tokenA.mint(user1.address, ethers.utils.parseEther("1000"));
        await tokenB.mint(user1.address, ethers.utils.parseEther("1000"));

        // Approve tokens for DEX Router
        await tokenA.connect(user1).approve(dexRouter.address, ethers.utils.parseEther("1000"));
        await tokenB.connect(user1).approve(dexRouter.address, ethers.utils.parseEther("1000"));
    });

    it("Should execute a swap successfully", async function () {
        const amountIn = ethers.utils.parseEther("10");
        const deadline = Math.floor(Date.now() / 1000) + 60 * 10; // 10 minutes deadline
        const maxSlippage = 1; // 1% max slippage

        // Get initial balances
        const user1BalanceBefore = await tokenB.balanceOf(user1.address);

        await expect(
            dexRouter.connect(user1).swapExactInputSingle(
                { currency0: tokenA.address, currency1: tokenB.address, fee: 3000, tickSpacing: 10, hooks: ethers.constants.AddressZero },
                amountIn,
                deadline,
                maxSlippage
            )
        ).to.emit(dexRouter, "SwapExecuted");

        const user1BalanceAfter = await tokenB.balanceOf(user1.address);

        console.log("✅ Swap executed successfully!");
        console.log(`💰 User received: ${ethers.utils.formatEther(user1BalanceAfter.sub(user1BalanceBefore))} TKB`);
    });

    it("Should fail if swap exceeds max slippage", async function () {
        const amountIn = ethers.utils.parseEther("10");
        const deadline = Math.floor(Date.now() / 1000) + 60 * 10;
        const maxSlippage = 0; // Zero slippage allowed (edge case)

        await expect(
            dexRouter.connect(user1).swapExactInputSingle(
                { currency0: tokenA.address, currency1: tokenB.address, fee: 3000, tickSpacing: 10, hooks: ethers.constants.AddressZero },
                amountIn,
                deadline,
                maxSlippage
            )
        ).to.be.revertedWith("Transaction expired");

        console.log("✅ Swap correctly failed due to slippage limit!");
    });
});
