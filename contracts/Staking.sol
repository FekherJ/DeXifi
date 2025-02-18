// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Importing the ERC20 interface to interact with ERC20 tokens,
// and importing OpenZeppelin's Ownable, ReentrancyGuard, and Pausable contracts for added functionality.
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";


// Staking contract allows users to stake tokens and earn rewards
// Contract includes reentrancy protection, pausable functionality, and automatic reward compounding
contract Staking is Ownable, ReentrancyGuard, Pausable {

    // Public variables to store the staking token and the reward token
    IERC20 public stakingToken;
    IERC20 public rewardToken;

    // Reward rate per block, defines how many reward tokens are distributed per block
    uint256 public rewardRate = 1000;
    // The last block number when rewards were updated
    uint256 public lastUpdateBlock;
    // The accumulated reward per token, stored value to track rewards between updates
    uint256 public rewardPerTokenStored;

    // Mapping to track the user's reward per token paid (used for calculating earned rewards)
    mapping(address => uint256) public userRewardPerTokenPaid;
    // Mapping to store the user's earned rewards
    mapping(address => uint256) public rewards;
    // Mapping to store the user's staked token balances
    mapping(address => uint256) public balances;

    // Events to log actions like staking, withdrawing, reward payment, and reward compounding
    event Staked(address indexed user, uint256 amount, uint256 timestamp);
    event Withdrawn(address indexed user, uint256 amount, uint256 timestamp);
    event RewardPaid(address indexed user, uint256 reward, uint256 timestamp);
    event Compounded(address indexed user, uint256 reward, uint256 timestamp);
    event RewardAdded(uint256 rewardAmount);   // New event to log when new rewards are added

    // Constructor initializes the staking and reward tokens with the provided addresses
    constructor(address _stakingToken, address _rewardToken) Ownable(msg.sender) {
        stakingToken = IERC20(_stakingToken);
        rewardToken = IERC20(_rewardToken);
    }

    // Stake function: Allows users to stake a specific amount of tokens
    function stake(uint256 amount) external nonReentrant whenNotPaused updateReward(msg.sender) {
        require(amount > 0, "Cannot stake 0");
        balances[msg.sender] += amount;
        require(stakingToken.transferFrom(msg.sender, address(this), amount), "Stake transfer failed");
        emit Staked(msg.sender, amount, block.timestamp);
    }

    // Withdraw function: Allows users to withdraw staked tokens
    function withdraw(uint256 amount) public nonReentrant whenNotPaused updateReward(msg.sender) {
        require(amount > 0, "Cannot withdraw 0");
        require(balances[msg.sender] >= amount, "Insufficient balance");
        balances[msg.sender] -= amount;
        require(stakingToken.transfer(msg.sender, amount), "Withdraw transfer failed");
        emit Withdrawn(msg.sender, amount, block.timestamp);
    }

    // getReward function: Allows users to claim their earned rewards
    function getReward() public nonReentrant whenNotPaused updateReward(msg.sender) {
        uint256 reward = rewards[msg.sender];
        require(reward > 0, "No reward available");
        rewards[msg.sender] = 0;
        require(rewardToken.transfer(msg.sender, reward), "Reward transfer failed");
        emit RewardPaid(msg.sender, reward, block.timestamp);
    }

    // compoundRewards function: Allows users to automatically stake their rewards into the staking pool
    function compoundRewards() public nonReentrant whenNotPaused updateReward(msg.sender) {
        uint256 reward = rewards[msg.sender];
        require(reward > 0, "No reward available to compound");
        rewards[msg.sender] = 0;
        balances[msg.sender] += reward;
        emit Compounded(msg.sender, reward, block.timestamp);
    }

    // updateReward modifier: Updates the user's reward information before executing any staking, withdrawal, or reward claim action
    modifier updateReward(address account) {
        rewardPerTokenStored = rewardPerToken();
        lastUpdateBlock = block.number;
        rewards[account] = earned(account);
        userRewardPerTokenPaid[account] = rewardPerTokenStored;
        _;
    }

    // rewardPerToken function: Calculates and returns the current reward per token based on the elapsed blocks and total staked tokens
    function rewardPerToken() public view returns (uint256) {
        if (totalSupply() == 0) {
            return rewardPerTokenStored;
        }
        return rewardPerTokenStored + ((block.number - lastUpdateBlock) * rewardRate * 1e18) / totalSupply();
    }

    // earned function: Calculates the total rewards earned by a user
    function earned(address account) public view returns (uint256) {
        return (balances[account] * (rewardPerToken() - userRewardPerTokenPaid[account])) / 1e18 + rewards[account];
    }

    // totalSupply function: Returns the total amount of staked tokens in the contract
    function totalSupply() public view returns (uint256) {
        return stakingToken.balanceOf(address(this));
    }

    // Pausable functions to allow the owner to pause and unpause the contract in case of emergency
    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    // Function to notify contract about newly added rewards
    function notifyRewardAmount(uint256 rewardAmount) external onlyOwner updateReward(address(0)) {
        require(rewardAmount > 0, "Reward amount should be greater than 0");
        require(rewardToken.transferFrom(msg.sender, address(this), rewardAmount), "Transfer failed");
        emit RewardAdded(rewardAmount);
    }

    // New function to change the reward rate, ensuring rewards are updated first
    function setRewardRate(uint256 newRate) external onlyOwner updateReward(address(0)) {
        rewardRate = newRate;
    }
}
