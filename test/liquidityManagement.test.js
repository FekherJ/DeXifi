import { expect } from "chai";
import hardhat from "hardhat";
const { ethers } = hardhat;



describe("DEX Liquidity Management", function () {
    let deployer, user1, user2;
    let DEXRouter, dexRouter, tokenA, tokenB, weth, poolManager;
    

    beforeEach(async function () {
        this.timeout(100000);

        [deployer, user1, user2] = await ethers.getSigners();

        // Deploy WETH mock
        const WETH = await ethers.getContractFactory("WETH");
        weth = await WETH.deploy();
        await weth.waitForDeployment();

        // Deploy ERC20 tokens
        const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
        tokenA = await ERC20Mock.deploy("Token A", "TKA");
        tokenB = await ERC20Mock.deploy("Token B", "TKB");
        await tokenA.waitForDeployment();
        await tokenB.waitForDeployment();

        // Deploy Pool Manager
        const PoolManager = await ethers.getContractFactory("PoolManager");
        poolManager = await PoolManager.deploy(owner.address);
        await poolManager.waitForDeployment();

        // Deploy DEX Router
        const DEXRouter = await ethers.getContractFactory("DEXRouter");
        dexRouter = await DEXRouter.deploy(poolManager.address);
        await dexRouter.waitForDeployment();

        // Mint tokens
        await tokenA.mint(user1.address, ethers.utils.parseEther("1000"));
        await tokenB.mint(user1.address, ethers.utils.parseEther("1000"));

        // Approve tokens for DEX Router
        await tokenA.connect(user1).approve(dexRouter.address, ethers.utils.parseEther("1000"));
        await tokenB.connect(user1).approve(dexRouter.address, ethers.utils.parseEther("1000"));
    });

    it("Should add liquidity successfully", async function () {
        const amountA = ethers.utils.parseEther("100");
        const amountB = ethers.utils.parseEther("100");

        await expect(
            dexRouter.connect(user1).addLiquidity(
                { currency0: tokenA.address, currency1: tokenB.address, fee: 3000, tickSpacing: 10, hooks: ethers.constants.AddressZero },
                amountA,
                amountB,
                -887220,
                887220,
                ethers.utils.id("someSalt")
            )
        ).to.emit(dexRouter, "LiquidityAdded");

        console.log("✅ Liquidity added successfully!");
    });

    it("Should remove liquidity successfully", async function () {
        const liquidityAmount = ethers.utils.parseEther("50");

        await expect(
            dexRouter.connect(user1).removeLiquidity(
                { currency0: tokenA.address, currency1: tokenB.address, fee: 3000, tickSpacing: 10, hooks: ethers.constants.AddressZero },
                liquidityAmount,
                -887220,
                887220,
                ethers.utils.id("someSalt")
            )
        ).to.emit(dexRouter, "LiquidityRemoved");

        console.log("✅ Liquidity removed successfully!");
    });
});
