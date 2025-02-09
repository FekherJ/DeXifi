import hardhat from "hardhat";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

const { ethers } = hardhat;

async function main() {
  const LIQUIDITY_POOL_ADDRESS = process.env.REACT_APP_LIQUIDITY_POOL_ADDRESS;

  if (!LIQUIDITY_POOL_ADDRESS) {
    throw new Error("❌ LIQUIDITY_POOL_ADDRESS is not set in the .env file");
  }

  console.log("⏳ Deploying DEXRouter...");
  const DEXRouter = await ethers.getContractFactory("DEXRouter");
  const dexRouter = await DEXRouter.deploy(LIQUIDITY_POOL_ADDRESS);

  await dexRouter.waitForDeployment();

  const dexRouterAddress = await dexRouter.getAddress();
  console.log(`✅ DEXRouter deployed at: ${dexRouterAddress}`);

  // Update the .env file
  const envConfig = `
ALCHEMY_URL=${process.env.ALCHEMY_URL}
PRIVATE_KEY=${process.env.PRIVATE_KEY}
ETHERSCAN_API_KEY=${process.env.ETHERSCAN_API_KEY}
REACT_APP_STAKING_CONTRACT_ADDRESS=${process.env.REACT_APP_STAKING_CONTRACT_ADDRESS}
REACT_APP_STAKING_TOKEN_ADDRESS=${process.env.REACT_APP_STAKING_TOKEN_ADDRESS}
REACT_APP_REWARD_TOKEN_ADDRESS=${process.env.REACT_APP_REWARD_TOKEN_ADDRESS}
REACT_APP_LIQUIDITY_POOL_ADDRESS=${LIQUIDITY_POOL_ADDRESS}
REACT_APP_DEX_ROUTER_ADDRESS=${dexRouterAddress}
  `.trim();

  fs.writeFileSync(".env", envConfig);
  console.log("✅ Updated .env with DEX Router address");
}

main().catch((error) => {
  console.error("❌ Deployment failed:", error);
  process.exit(1);
});
