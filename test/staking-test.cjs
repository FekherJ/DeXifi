const { expect } = require("chai");
const { ethers } = require("hardhat");
require("@nomicfoundation/hardhat-chai-matchers");

describe("Staking Contract", function () {
    let stakingToken, rewardToken, stakingContract;
    let owner, user1, user2;
    const rewardRate = 100;

    beforeEach(async function () {
        // Deploy ERC20 tokens
        const ERC20 = await ethers.getContractFactory("ERC20Mock");
        stakingToken = await ERC20.deploy("Staking Token", "STK");
        await stakingToken.waitForDeployment();
        const stakingTokenAddress = await stakingToken.getAddress();

        rewardToken = await ERC20.deploy("Reward Token", "RWD");
        await rewardToken.waitForDeployment();
        const rewardTokenAddress = await rewardToken.getAddress();

        // DEBUG
        console.log("Staking token deployed at:", stakingTokenAddress);
        console.log("Reward token deployed at:", rewardTokenAddress);

        // Mint tokens to owner and users
        [owner, user1, user2] = await ethers.getSigners();
        await stakingToken.mint(owner.address, ethers.parseEther("1000"));
        await stakingToken.mint(user1.address, ethers.parseEther("1000"));
        await stakingToken.mint(user2.address, ethers.parseEther("1000"));
        await rewardToken.mint(owner.address, ethers.parseEther("1000"));

        // Deploy staking contract
        const Staking = await ethers.getContractFactory("Staking");
        stakingContract = await Staking.deploy(stakingTokenAddress, rewardTokenAddress);
        await stakingContract.waitForDeployment();
    });

    it("Should allow user to stake tokens", async function () {
        await stakingToken.connect(user1).approve(stakingContract.getAddress(), ethers.parseEther("100"));
        await stakingContract.connect(user1).stake(ethers.parseEther("100"));
        const balance = await stakingContract.balances(user1.address);
        expect(balance).to.equal(ethers.parseEther("100"));
    });

    it("Should allow user to withdraw staked tokens", async function () {
        await stakingToken.connect(user1).approve(stakingContract.getAddress(), ethers.parseEther("100"));
        await stakingContract.connect(user1).stake(ethers.parseEther("100"));
        await stakingContract.connect(user1).withdraw(ethers.parseEther("50"));
        const balance = await stakingContract.balances(user1.address);
        expect(balance).to.equal(ethers.parseEther("50"));
    });

    it("Should calculate and distribute rewards", async function () {
        await stakingToken.connect(user1).approve(stakingContract.getAddress(), ethers.parseEther("100"));
        await stakingContract.connect(user1).stake(ethers.parseEther("100"));

        // Fast-forward in time
        await ethers.provider.send("evm_increaseTime", [3600]);
        await ethers.provider.send("evm_mine", []);

        await rewardToken.transfer(stakingContract.getAddress(), ethers.parseEther("100"));
        const earned = await stakingContract.earned(user1.address);

        // Check reward earned
        console.log("Reward earned by user1:", earned.toString());
        expect(earned).to.be.above(ethers.parseEther("0"));
    });

    it("Should allow users to claim rewards", async function () {
        await stakingToken.connect(user1).approve(stakingContract.getAddress(), ethers.parseEther("100"));
        await stakingContract.connect(user1).stake(ethers.parseEther("100"));

        await ethers.provider.send("evm_mine", []);
        await ethers.provider.send("evm_mine", []);

        await rewardToken.transfer(stakingContract.getAddress(), ethers.parseEther("100"));
        await stakingContract.connect(user1).getReward();
        const rewardBalance = await rewardToken.balanceOf(user1.address);

        expect(rewardBalance).to.be.above(ethers.parseEther("0"));
    });

    it("Should allow users to compound rewards", async function () {
        await stakingToken.connect(user1).approve(stakingContract.getAddress(), ethers.parseEther("100"));
        await stakingContract.connect(user1).stake(ethers.parseEther("100"));

        await ethers.provider.send("evm_mine", []);
        await ethers.provider.send("evm_mine", []);

        await rewardToken.transfer(stakingContract.getAddress(), ethers.parseEther("100"));
        await stakingContract.connect(user1).compoundRewards();
        const updatedBalance = await stakingContract.balances(user1.address);

        expect(updatedBalance).to.be.above(ethers.parseEther("100"));
    });

    it("Should allow the owner to pause and unpause the contract", async function () {
        await stakingContract.pause();
        await stakingToken.connect(user1).approve(stakingContract.getAddress(), ethers.parseEther("100"));
        await expect(stakingContract.connect(user1).stake(ethers.parseEther("100"))).to.be.revertedWith("Pausable: paused");

        await stakingContract.unpause();
        await stakingContract.connect(user1).stake(ethers.parseEther("100"));
        const balance = await stakingContract.balances(user1.address);
        expect(balance).to.equal(ethers.parseEther("100"));
    });

    // Additional Tests
    it("Should correctly calculate rewards after reward rate change", async function () {
        await stakingToken.connect(user1).approve(stakingContract.getAddress(), ethers.parseEther("100"));
        await stakingContract.connect(user1).stake(ethers.parseEther("100"));

        // Fast-forward in time and check initial rewards
        await ethers.provider.send("evm_increaseTime", [3600]);
        await ethers.provider.send("evm_mine", []);
        let earned = await stakingContract.earned(user1.address);
        expect(earned).to.be.above(ethers.parseEther("0"));

        // Change reward rate (assuming function exists)
        await stakingContract.setRewardRate(200); 
        await ethers.provider.send("evm_increaseTime", [3600]);
        await ethers.provider.send("evm_mine", []);

        earned = await stakingContract.earned(user1.address);
        expect(earned).to.be.above(ethers.parseEther("0"));
    });

    xit("Should distribute rewards correctly between multiple users", async function () {
        await stakingToken.connect(user1).approve(stakingContract.getAddress(), ethers.parseEther("100"));
        await stakingContract.connect(user1).stake(ethers.parseEther("100"));
        
        await stakingToken.connect(user2).approve(stakingContract.getAddress(), ethers.parseEther("200"));
        await stakingContract.connect(user2).stake(ethers.parseEther("200"));
    
        // Transfer reward tokens to the staking contract
        await rewardToken.transfer(stakingContract.getAddress(), ethers.parseEther("300"));
        
        // Check staking contract's reward balance to ensure it has enough tokens
        const stakingContractRewardBalance = await rewardToken.balanceOf(stakingContract.getAddress());
        console.log("Staking Contract Reward Balance: ", stakingContractRewardBalance.toString());
        expect(stakingContractRewardBalance).to.equal(ethers.parseEther("300"));
    
        // Check earned rewards before fast-forwarding in time
        let earnedUser1Before = await stakingContract.earned(user1.address);
        let earnedUser2Before = await stakingContract.earned(user2.address);
        console.log("User1 earned before time advancement: ", earnedUser1Before.toString());
        console.log("User2 earned before time advancement: ", earnedUser2Before.toString());
        
        // Fast-forward in time to accumulate rewards
        await ethers.provider.send("evm_increaseTime", [86400]); // 1 day
        await ethers.provider.send("evm_mine", []);
    
        // Check rewards after fast-forwarding in time
        let earnedUser1After = await stakingContract.earned(user1.address);
        let earnedUser2After = await stakingContract.earned(user2.address);
        
        // Log earned values for debugging
        console.log("User1 earned after time advancement: ", earnedUser1After.toString());
        console.log("User2 earned after time advancement: ", earnedUser2After.toString());
    
        // Ensure both users have earned rewards
        expect(earnedUser1After).to.be.above(ethers.parseEther("0"));
        expect(earnedUser2After).to.be.above(ethers.parseEther("0"));
        
        // Ensure user2 gets more rewards than user1 due to larger stake
        expect(earnedUser2After).to.be.above(earnedUser1After);
    });    
    
    

    it("Should still allow users to claim rewards after withdrawing staked tokens", async function () {
        await stakingToken.connect(user1).approve(stakingContract.getAddress(), ethers.parseEther("100"));
        await stakingContract.connect(user1).stake(ethers.parseEther("100"));

        await ethers.provider.send("evm_increaseTime", [3600]);
        await ethers.provider.send("evm_mine", []);

        await stakingContract.connect(user1).withdraw(ethers.parseEther("100"));
        await rewardToken.transfer(stakingContract.getAddress(), ethers.parseEther("100"));

        await stakingContract.connect(user1).getReward();
        const rewardBalance = await rewardToken.balanceOf(user1.address);
        expect(rewardBalance).to.be.above(ethers.parseEther("0"));
    });

    it("Should correctly update rewards after partial withdrawal", async function () {
        await stakingToken.connect(user1).approve(stakingContract.getAddress(), ethers.parseEther("100"));
        await stakingContract.connect(user1).stake(ethers.parseEther("100"));

        await ethers.provider.send("evm_increaseTime", [3600]);
        await ethers.provider.send("evm_mine", []);

        await stakingContract.connect(user1).withdraw(ethers.parseEther("50"));
        await rewardToken.transfer(stakingContract.getAddress(), ethers.parseEther("100"));

        const remainingBalance = await stakingContract.balances(user1.address);
        const earned = await stakingContract.earned(user1.address);

        expect(remainingBalance).to.equal(ethers.parseEther("50"));
        expect(earned).to.be.above(ethers.parseEther("0"));
    });
});

