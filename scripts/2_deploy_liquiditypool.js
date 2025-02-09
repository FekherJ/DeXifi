// deploy-liquiditypool.js - Updated Hardhat deployment script for Liquidity Pool
import hardhat from "hardhat";
const { ethers } = hardhat;


import dotenv from "dotenv";
import fs from "fs";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  dotenv.config();

  // Fetch the deployed token addresses from .env
  const stakingTokenAddress = process.env.REACT_APP_STAKING_TOKEN_ADDRESS;
  const rewardTokenAddress = process.env.REACT_APP_REWARD_TOKEN_ADDRESS;

  console.log("Using existing Staking Token Address:", stakingTokenAddress);
  console.log("Using existing Reward Token Address:", rewardTokenAddress);

  // Deploy Liquidity Pool contract
  const LiquidityPool = await ethers.getContractFactory("LiquidityPool");
  const liquidityPool = await LiquidityPool.deploy(stakingTokenAddress, rewardTokenAddress);
  await liquidityPool.waitForDeployment();

  const liquidityPoolAddress = await liquidityPool.getAddress();
  console.log("Liquidity Pool Contract deployed to:", liquidityPoolAddress);

  // Verify contract addresses to avoid address conflicts
  console.log(`Staking Token Address: ${stakingTokenAddress}`);
  console.log(`Reward Token Address: ${rewardTokenAddress}`);
  console.log(`Liquidity Pool Address: ${liquidityPoolAddress}`);

    // ✅ Save Liquidity Pool Address to `.env` (overwrite old values)
    const envConfig = `
    ALCHEMY_URL=${process.env.ALCHEMY_URL}
    PRIVATE_KEY=${process.env.PRIVATE_KEY}
    ETHERSCAN_API_KEY=${process.env.ETHERSCAN_API_KEY}
    REACT_APP_STAKING_CONTRACT_ADDRESS=${process.env.REACT_APP_STAKING_CONTRACT_ADDRESS}
    REACT_APP_STAKING_TOKEN_ADDRESS=${process.env.REACT_APP_STAKING_TOKEN_ADDRESS}
    REACT_APP_REWARD_TOKEN_ADDRESS=${process.env.REACT_APP_REWARD_TOKEN_ADDRESS}
    REACT_APP_LIQUIDITY_POOL_ADDRESS=${liquidityPoolAddress}
      `.trim();
    
      fs.writeFileSync(".env", envConfig);
      console.log("✅ Updated .env with Liquidity Pool address");
      

  // Get instance of deployed staking token with explicit ABI
  const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
  const stakingToken = ERC20Mock.attach(stakingTokenAddress);


  // Verify contract interface and mint function
/*  console.log("Verifying contract interface...");
  const contractCode = await ethers.provider.getCode(stakingTokenAddress);
  if (contractCode === "0x") {
    throw new Error(`No contract deployed at ${stakingTokenAddress}`);
  }

  const expectedMintSelector = "0x6a627842"; // Keccak selector for mint(address,uint256)
  const stakingTokenInterface = stakingToken.interface.fragments.map(f => f.selector);
  if (!stakingTokenInterface.includes(expectedMintSelector)) {
    throw new Error("Contract does not support the mint function!");
  }

  console.log("Mint function verified, proceeding...");
*/
  // Mint tokens for testing
  const mintAmount = ethers.parseUnits("1000", 18);
  await stakingToken.mint(deployer.address, mintAmount);
  console.log(`Minted ${ethers.formatUnits(mintAmount, 18)} STK to ${deployer.address}`);

  // Approve Liquidity Pool contract to spend deployer's tokens
  const approveAmount = ethers.parseUnits("500", 18);
  await stakingToken.approve(liquidityPoolAddress, approveAmount);
  console.log(`Approved ${ethers.formatUnits(approveAmount, 18)} STK for Liquidity Pool contract`);

  console.log("Liquidity Pool deployment and setup completed successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment Error:", error);
    process.exit(1);
  });
