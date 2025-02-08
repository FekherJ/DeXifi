const hre = require("hardhat");

async function main() {
    // Replace this with your deployed Liquidity Pool contract address
    const LIQUIDITY_POOL_ADDRESS = "0xYourLiquidityPoolAddress"; 

    // Deploy the DEXRouter contract
    const DEXRouter = await hre.ethers.getContractFactory("DEXRouter");
    const dexRouter = await DEXRouter.deploy(LIQUIDITY_POOL_ADDRESS);

    await dexRouter.waitForDeployment();

    console.log(`✅ DEXRouter deployed at: ${await dexRouter.getAddress()}`);
}

main().catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
});
