import hardhat from "hardhat";
const { ethers } = hardhat;
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);

    let poolManagerAddress;
    const network = await ethers.provider.getNetwork();

    if (network.chainId === 31337) {  // Localhost
        console.log("🚀 Deploying Pool Manager on localhost...");
        const PoolManagerFactory = await ethers.getContractFactory("PoolManager");
        const poolManager = await PoolManagerFactory.deploy();
        await poolManager.waitForDeployment();
        poolManagerAddress = poolManager.address;
        console.log("✅ Pool Manager deployed at:", poolManagerAddress);

        // Update .env with local PoolManager address
        const updatedEnvConfig = `
${fs.readFileSync(".env", "utf8")}
LOCAL_POOL_MANAGER=${poolManagerAddress}
`.trim();
        fs.writeFileSync(".env", updatedEnvConfig, { encoding: "utf8", flag: "w" });
        console.log("✅ Updated .env with local Pool Manager address!");
    } else {
        poolManagerAddress = process.env.SEPOLIA_POOL_MANAGER;
        if (!poolManagerAddress) throw new Error("Missing SEPLOIA_POOL_MANAGER in .env");
        console.log("🌍 Using Sepolia Pool Manager:", poolManagerAddress);
    }

    console.log("🚀 Deploying DEXRouter...");
    const DEXRouter = await ethers.getContractFactory("DEXRouter");
    const dexRouter = await DEXRouter.deploy(poolManagerAddress, process.env.WETH_ADDRESS);
    await dexRouter.waitForDeployment();
    console.log("✅ DEXRouter deployed at:", dexRouter.address);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
