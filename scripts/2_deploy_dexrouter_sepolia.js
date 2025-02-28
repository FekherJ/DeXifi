import hardhat from "hardhat";
const { ethers } = hardhat;

async function main() {
    console.log("🚀 Starting DEX deployment...");

    const [deployer] = await ethers.getSigners();
    console.log("Deployer Address:", deployer.address);

    // 📌 1️⃣ Deploy PoolManager
    const PoolManager = await ethers.getContractFactory("PoolManager");
    const poolManager = await PoolManager.deploy(deployer.address);
    await poolManager.waitForDeployment();
    console.log("✅ PoolManager deployed at:", await poolManager.getAddress());

    // 📌 2️⃣ Deploy MockUnlockCallback to Unlock PoolManager
    const MockUnlockCallback = await ethers.getContractFactory("MockUnlockCallback");
    const mockUnlockCallback = await MockUnlockCallback.deploy(await poolManager.getAddress());
    await mockUnlockCallback.waitForDeployment();
    console.log("✅ MockUnlockCallback deployed at:", await mockUnlockCallback.getAddress());

    // Unlock the PoolManager
    await mockUnlockCallback.connect(deployer).unlock("0x");
    console.log("✅ PoolManager unlocked.");

    // 📌 3️⃣ Deploy WETH Mock
    const WETH = await ethers.getContractFactory("WETH");
    const weth = await WETH.deploy();
    await weth.waitForDeployment();
    console.log("✅ WETH deployed at:", await weth.getAddress());

    // 📌 4️⃣ Deploy ERC20 Tokens
    const TokenA = await ethers.getContractFactory("ERC20Mock");
    const tokenA = await TokenA.deploy("Token A", "TKA");
    await tokenA.waitForDeployment();
    console.log("✅ Token A deployed at:", await tokenA.getAddress());

    const TokenB = await ethers.getContractFactory("ERC20Mock");
    const tokenB = await TokenB.deploy("Token B", "TKB");
    await tokenB.waitForDeployment();
    console.log("✅ Token B deployed at:", await tokenB.getAddress());

    // 📌 5️⃣ Deploy DEXRouter
    const DEXRouter = await ethers.getContractFactory("DEXRouter");
    const dexRouter = await DEXRouter.deploy(await poolManager.getAddress(), await weth.getAddress());
    await dexRouter.waitForDeployment();
    console.log(`✅ DEXRouter deployed at: ${await dexRouter.getAddress()} ✅`);

    // 📌 6️⃣ Mint Tokens to Deployer
    const mintAmount = ethers.parseEther("1000000");
    await tokenA.mint(deployer.address, mintAmount);
    await tokenB.mint(deployer.address, mintAmount);
    console.log("✅ Minted tokens to deployer.");

    // 📌 7️⃣ Approve Tokens for Router
    await tokenA.connect(deployer).approve(await dexRouter.getAddress(), mintAmount);
    await tokenB.connect(deployer).approve(await dexRouter.getAddress(), mintAmount);
    console.log("✅ Approved tokens for DEXRouter.");

    // 📌 8️⃣ Initialize Liquidity Pool (Check if required)
    try {
        await dexRouter.connect(deployer).initializePool(
            await tokenA.getAddress(),
            await tokenB.getAddress(),
            ethers.parseEther("1")
        );
        console.log("✅ Liquidity Pool Initialized.");
    } catch (error) {
        console.log("⚠️ Pool initialization skipped (already exists or not required).");
    }

    // 📌 9️⃣ Add Initial Liquidity (Check Before Adding)
    const totalLiquidity = await dexRouter.totalLiquidity();
    if (totalLiquidity === BigInt(0)) {

        const liquidityAmountA = ethers.parseEther("50000");
        const liquidityAmountB = ethers.parseEther("50000");

        await dexRouter.connect(deployer).addLiquidity(
            await tokenA.getAddress(),
            await tokenB.getAddress(),
            liquidityAmountA,
            liquidityAmountB
        );
        console.log(`✅ Added Liquidity: ${ethers.formatEther(liquidityAmountA)} TKA + ${ethers.formatEther(liquidityAmountB)} TKB`);
    } else {
        console.log("⚠️ Liquidity already exists, skipping...");
    }

    console.log("🎉 Deployment complete! ✅");
}

// Run the deployment script
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
