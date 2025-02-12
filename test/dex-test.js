import hardhat from "hardhat";
const { ethers } = hardhat;
import { expect } from "chai";
import "@nomicfoundation/hardhat-chai-matchers";

describe("Decentralized Exchange (DEX)", function () {
    let owner, user1, user2;
    let factory, liquidityPoolImplementation, router;
    let tokenA, tokenB, tokenC;
    let liquidityPoolAddress;

    beforeEach(async function () {
        [owner, user1, user2] = await ethers.getSigners();

        // Deploy ERC20 Mock Tokens
        const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
        tokenA = await ERC20Mock.deploy("Token A", "TKA");
        tokenB = await ERC20Mock.deploy("Token B", "TKB");
        tokenC = await ERC20Mock.deploy("Token C", "TKC");

        await tokenA.waitForDeployment();
        await tokenB.waitForDeployment();
        await tokenC.waitForDeployment();

        const tokenAAddress = await tokenA.getAddress();
        const tokenBAddress = await tokenB.getAddress();
        const tokenCAddress = await tokenC.getAddress();

        // Deploy Liquidity Pool Implementation
        const LiquidityPool = await ethers.getContractFactory("LiquidityPool");
        liquidityPoolImplementation = await LiquidityPool.deploy(owner.address);
        await liquidityPoolImplementation.waitForDeployment();
        const liquidityPoolImplementationAddress = await liquidityPoolImplementation.getAddress();

        // Deploy Liquidity Pool Factory
        const LiquidityPoolFactory = await ethers.getContractFactory("LiquidityPoolFactory");
        factory = await LiquidityPoolFactory.deploy(liquidityPoolImplementationAddress);
        await factory.waitForDeployment();
        const factoryAddress = await factory.getAddress();

        console.log("Factory Address:", factoryAddress);

        // Create a liquidity pool for Token A and Token B
        await factory.connect(owner).createPool(tokenAAddress, tokenBAddress);
        liquidityPoolAddress = await factory.getPool(tokenAAddress, tokenBAddress);
        console.log("LiquidityPool Address:", liquidityPoolAddress);

        // Deploy DEX Router
        const DEXRouter = await ethers.getContractFactory("DEXRouter");
        router = await DEXRouter.deploy(factoryAddress);
        await router.waitForDeployment();
    });

    async function approveTokens(user, token, amount) {
        const routerAddress = await router.getAddress();
        let tx = await token.connect(user).approve(routerAddress, amount);
        await tx.wait();
        console.log(`Allowance for ${await token.symbol()} (User: ${user.address}):`, await token.allowance(user.address, routerAddress));
    }

    it("Should allow users to add liquidity", async function () {
        const amountA = ethers.parseEther("100");
        const amountB = ethers.parseEther("100");
        
        await approveTokens(user1, tokenA, amountA);
        await approveTokens(user1, tokenB, amountB);

        await router.connect(user1).addLiquidity(
            tokenA.getAddress(), tokenB.getAddress(), amountA, amountB
        );

        const pool = await ethers.getContractAt("LiquidityPool", liquidityPoolAddress);
        const [reserveA, reserveB] = await pool.getReserves();

        expect(reserveA).to.equal(amountA);
        expect(reserveB).to.equal(amountB);
    });

    it("Should allow users to remove liquidity", async function () {
        const amountA = ethers.parseEther("100");
        const amountB = ethers.parseEther("100");

        await approveTokens(user1, tokenA, amountA);
        await approveTokens(user1, tokenB, amountB);

        await router.connect(user1).addLiquidity(
            tokenA.getAddress(), tokenB.getAddress(), amountA, amountB
        );

        const pool = await ethers.getContractAt("LiquidityPool", liquidityPoolAddress);
        const lpTokens = await pool.balanceOf(user1.address);

        await approveTokens(user1, pool, lpTokens);
        await router.connect(user1).removeLiquidity(
            tokenA.getAddress(), tokenB.getAddress(), lpTokens
        );

        const [reserveA, reserveB] = await pool.getReserves();
        expect(reserveA).to.equal(0);
        expect(reserveB).to.equal(0);
    });

    it("Should allow users to swap tokens", async function () {
        const amountA = ethers.parseEther("100");
        const amountB = ethers.parseEther("100");
        const swapAmount = ethers.parseEther("10");

        await approveTokens(user1, tokenA, amountA);
        await approveTokens(user1, tokenB, amountB);
        await router.connect(user1).addLiquidity(
            tokenA.getAddress(), tokenB.getAddress(), amountA, amountB
        );

        await approveTokens(user2, tokenA, swapAmount);
        const initialBalance = await tokenB.balanceOf(user2.address);

        await router.connect(user2).swap(
            tokenA.getAddress(), tokenB.getAddress(), swapAmount
        );

        const finalBalance = await tokenB.balanceOf(user2.address);
        expect(finalBalance).to.be.gt(initialBalance);
    });

    it("Should correctly create new liquidity pools via factory", async function () {
        const tokenAAddress = await tokenA.getAddress();
        const tokenCAddress = await tokenC.getAddress();

        await factory.createPool(tokenAAddress, tokenCAddress);
        const newPoolAddress = await factory.getPool(tokenAAddress, tokenCAddress);

        expect(newPoolAddress).to.not.equal(ethers.ZeroAddress);
    });

    it("Should correctly fetch reserves from liquidity pool", async function () {
        const amountA = ethers.parseEther("200");
        const amountB = ethers.parseEther("200");

        await approveTokens(user1, tokenA, amountA);
        await approveTokens(user1, tokenB, amountB);
        await router.connect(user1).addLiquidity(
            tokenA.getAddress(), tokenB.getAddress(), amountA, amountB
        );

        const pool = await ethers.getContractAt("LiquidityPool", liquidityPoolAddress);
        const [reserveA, reserveB] = await pool.getReserves();

        expect(reserveA).to.equal(amountA);
        expect(reserveB).to.equal(amountB);
    });
});
