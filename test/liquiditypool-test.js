import hardhat from "hardhat";
const { ethers } = hardhat;
import { expect } from "chai";
import "@nomicfoundation/hardhat-chai-matchers";

describe("Liquidity Pool Contract", function () {
    let liquidityPool, stakingToken, anotherToken, owner, user1, user2;
    let stakingTokenAddress, anotherTokenAddress, liquidityPoolAddress;

    beforeEach(async function () {
        const ERC20Mock = await ethers.getContractFactory("ERC20Mock");

        stakingToken = await ERC20Mock.deploy("Staking Token", "STK");
        await stakingToken.waitForDeployment();
        stakingTokenAddress = await stakingToken.getAddress();

        anotherToken = await ERC20Mock.deploy("Another Token", "ANT");
        await anotherToken.waitForDeployment();
        anotherTokenAddress = await anotherToken.getAddress();

        [owner, user1, user2] = await ethers.getSigners();

        await stakingToken.mint(user1.address, ethers.parseEther("1000"));
        await anotherToken.mint(user1.address, ethers.parseEther("1000"));
        await stakingToken.mint(user2.address, ethers.parseEther("1000"));
        await anotherToken.mint(user2.address, ethers.parseEther("1000"));

        const LiquidityPool = await ethers.getContractFactory("LiquidityPool");
        liquidityPool = await LiquidityPool.deploy(owner.address);
        await liquidityPool.waitForDeployment();
        liquidityPoolAddress = await liquidityPool.getAddress();

        await liquidityPool.initialize(stakingTokenAddress, anotherTokenAddress);
    });

    it("Should allow users to deposit liquidity", async function () {
        const amount1 = ethers.parseEther("100");
        const amount2 = ethers.parseEther("100");

        await stakingToken.connect(user1).approve(liquidityPoolAddress, amount1);
        await anotherToken.connect(user1).approve(liquidityPoolAddress, amount2);
        await liquidityPool.connect(user1).addLiquidity(amount1, amount2);

        const [reserve1, reserve2] = await liquidityPool.getReserves();
        expect(reserve1).to.equal(amount1);
        expect(reserve2).to.equal(amount2);
    });


    it("Should allow users to withdraw liquidity", async function () {
        const deposit1 = ethers.parseEther("100");
        const deposit2 = ethers.parseEther("100");
    
        // Approving and adding liquidity
        await stakingToken.connect(user1).approve(liquidityPoolAddress, deposit1);
        await anotherToken.connect(user1).approve(liquidityPoolAddress, deposit2);
        await liquidityPool.connect(user1).addLiquidity(deposit1, deposit2);
    
        // Fetch LP token balance of user before withdrawal
        const lpTokensBefore = await liquidityPool.balanceOf(user1.address);
        console.log("LP Token Balance Before Withdrawal:", lpTokensBefore.toString());
    
        // Fetch reserves before withdrawal
        const [reserve1Before, reserve2Before] = await liquidityPool.getReserves();
        console.log("Reserves Before Withdrawal:", reserve1Before.toString(), reserve2Before.toString());
    
        // Withdraw liquidity
        await liquidityPool.connect(user1).removeLiquidity(lpTokensBefore);
    
        // Fetch reserves after withdrawal
        const [reserve1After, reserve2After] = await liquidityPool.getReserves();
        console.log("Reserves After Withdrawal:", reserve1After.toString(), reserve2After.toString());
    
        // Fetch LP token balance of user after withdrawal
        const lpTokensAfter = await liquidityPool.balanceOf(user1.address);
        console.log("LP Token Balance After Withdrawal:", lpTokensAfter.toString());
    
        // Fetch user token balances after withdrawal
        const user1Token1Balance = await stakingToken.balanceOf(user1.address);
        const user1Token2Balance = await anotherToken.balanceOf(user1.address);
        console.log("User1 Token Balances After Withdrawal:", user1Token1Balance.toString(), user1Token2Balance.toString());
    
        // Validate reserves are now zero
        expect(reserve1After).to.equal(0);
        expect(reserve2After).to.equal(0);
    
        // Validate LP tokens were burned
        expect(lpTokensAfter).to.equal(0);
    });
    
    

    it("Should update reserves after a swap", async function () {
        const initialAmount1 = ethers.parseEther("100");
        const initialAmount2 = ethers.parseEther("200");

        await stakingToken.connect(user1).approve(liquidityPoolAddress, initialAmount1);
        await anotherToken.connect(user1).approve(liquidityPoolAddress, initialAmount2);
        await liquidityPool.connect(user1).addLiquidity(initialAmount1, initialAmount2);

        const swapAmountIn = ethers.parseEther("10");
        await stakingToken.connect(user2).approve(liquidityPoolAddress, swapAmountIn);

        const [reserve1Before, reserve2Before] = await liquidityPool.getReserves();
        await liquidityPool.connect(user2).swap(stakingTokenAddress, anotherTokenAddress, swapAmountIn);
        const [reserve1After, reserve2After] = await liquidityPool.getReserves();

        expect(reserve1After).to.be.gt(reserve1Before);
        expect(reserve2After).to.be.lt(reserve2Before);
    });

    it("Should revert if user tries to swap with insufficient liquidity", async function () {
        const swapAmount = ethers.parseEther("100");

        await expect(
            liquidityPool.connect(user2).swap(stakingTokenAddress, anotherTokenAddress, swapAmount)
        ).to.be.revertedWith("Swap output too low");
    });
});
