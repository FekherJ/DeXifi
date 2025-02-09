import hardhat from "hardhat";
const { ethers } = hardhat;
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Using Alchemy URL:", process.env.ALCHEMY_URL);
  console.log("Using Private Key:", process.env.PRIVATE_KEY);

  console.log("Deploying contracts with the account:", deployer.address);

  // Deploy ERC20 token contracts for staking and reward tokens
  const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
  
  // Deploy the staking token (STK)
  console.log('Deploying STK...');
  const stakingToken = await ERC20Mock.deploy("Staking Token", "STK");
  await stakingToken.waitForDeployment();

  // Deploy the reward token (RWD)
  console.log('Deploying RWD...');
  const rewardToken = await ERC20Mock.deploy("Reward Token", "RWD");
  await rewardToken.waitForDeployment();

  const stakingTokenAddress = await stakingToken.getAddress();
  const rewardTokenAddress = await rewardToken.getAddress();

  console.log("Staking Token deployed at:", stakingTokenAddress);
  console.log("Reward Token deployed at:", rewardTokenAddress);

  // Deploy the staking contract with stakingToken and rewardToken addresses
  const Staking = await ethers.getContractFactory("Staking");
  const stakingContract = await Staking.deploy(stakingToken.getAddress(), rewardToken.getAddress());
  await stakingContract.waitForDeployment();
  const stakingContractAddress = await stakingContract.getAddress();
  console.log("Staking Contract deployed to:", await stakingContract.getAddress());

  // ✅ Overwrite `.env` file with new contract addresses
  const envConfig = `
  ALCHEMY_URL=${process.env.ALCHEMY_URL}
  PRIVATE_KEY=${process.env.PRIVATE_KEY}
  ETHERSCAN_API_KEY=${process.env.ETHERSCAN_API_KEY}
  REACT_APP_STAKING_CONTRACT_ADDRESS=${stakingContractAddress}
  REACT_APP_STAKING_TOKEN_ADDRESS=${stakingTokenAddress}
  REACT_APP_REWARD_TOKEN_ADDRESS=${rewardTokenAddress}
    `.trim(); // ✅ Ensures no blank lines

  fs.writeFileSync(".env", envConfig);
  console.log("✅ Updated .env with new contract addresses");


  // Mint some tokens for testing purposes
  const mintAmount = ethers.parseUnits("10000000", 18);


  // Mint staking tokens for the deployer
  await stakingToken.mint(deployer.address, mintAmount);
  console.log(`Minted ${ethers.formatUnits(mintAmount, 18)} STK to ${deployer.address}`);

  // Mint reward tokens for the deployer
  await rewardToken.mint(deployer.address, mintAmount);
  console.log(`Minted ${ethers.formatUnits(mintAmount, 18)} RWD to ${deployer.address}`);

  // *** NEW: Transfer some RWD to the connected wallet for frontend testing ***
  const transferAmount = ethers.parseUnits("1000000", 18); // 1,000,000 RWD
  await rewardToken.transfer(deployer.address, transferAmount);
  console.log(`Transferred ${ethers.formatUnits(transferAmount, 18)} RWD to ${deployer.address}`);


  // *** Approve the staking contract to spend reward tokens ***
  const notifyRewardAmount = ethers.parseUnits("10000000", 18); // Sufficient for ~500 blocks
  //Why 500,000? With rewardRate = 1000 per block: 500,000 / 1000 = 500 blocks worth of rewards.This gives the APY calculation enough data to work with.

  await rewardToken.approve(stakingContract.getAddress(), notifyRewardAmount);  // This line is crucial
  console.log(`Approved staking contract to spend ${ethers.formatUnits(notifyRewardAmount, 18)} RWD`);

  // *** Verify that the allowance is correctly set ***
  const allowance = await rewardToken.allowance(deployer.address, stakingContract.getAddress());
  console.log(`Allowance after approval: ${ethers.formatUnits(allowance, 18)}`);

  

  // If allowance is BigInt, handle it as such without conversion
  if (typeof allowance === 'bigint') {
    //console.log("Allowance is a BigInt, treating it directly as BigInt.");
  } else if (typeof allowance === 'string' || typeof allowance === 'number') {
    // If it's not a BigInt, convert it to a BigNumber
    allowance = ethers.BigNumber.from(allowance.toString());
  } else {
    console.error("Unknown allowance type:", typeof allowance);
    return;
  }

  console.log(`Allowance for staking contract: ${ethers.formatUnits(allowance, 18)} RWD`);

  // *** Directly Compare the Allowance ***
  // Forcefully set rewards without conditional checks
  const tx = await stakingContract.notifyRewardAmount(notifyRewardAmount);
  await tx.wait();
  console.log(`Forced notification: ${ethers.formatUnits(notifyRewardAmount, 18)} RWD as rewards.`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });