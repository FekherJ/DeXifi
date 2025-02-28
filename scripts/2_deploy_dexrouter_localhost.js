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

    await mockUnlockCallback.connect(deployer).unlock("0x");
    console.log("✅ PoolManager unlocked.");

    // 📌 3️⃣ Deploy Wrapped ETH (WETH)
    const WETH = await ethers.getContractFactory("WETH");
    const weth = await WETH.deploy();
    await weth.waitForDeployment();
    console.log("✅ WETH deployed at:", await weth.getAddress());

    // 📌 4️⃣ Deploy Wrapped BTC (WBTC)
    const WBTC = await ethers.getContractFactory("ERC20Mock");
    const wbtc = await WBTC.deploy("Wrapped Bitcoin", "WBTC");
    await wbtc.waitForDeployment();
    console.log("✅ WBTC deployed at:", await wbtc.getAddress());

    // 📌 5️⃣ Deploy USDC Mock
    const USDC = await ethers.getContractFactory("ERC20Mock");
    const usdc = await USDC.deploy("USD Coin", "USDC");
    await usdc.waitForDeployment();
    console.log("✅ USDC deployed at:", await usdc.getAddress());

    // 📌 6️⃣ Deploy DEXRouter
    const DEXRouter = await ethers.getContractFactory("DEXRouter");
    const dexRouter = await DEXRouter.deploy(await poolManager.getAddress(), await weth.getAddress());
    await dexRouter.waitForDeployment();
    console.log(`✅ DEXRouter deployed at: ${await dexRouter.getAddress()} ✅`);

    // 📌 7️⃣ Mint Tokens to Deployer
    const mintAmount = ethers.parseEther("1000"); // Adjust as needed
    await wbtc.mint(deployer.address, mintAmount);

    const mintAmountUSDC = ethers.parseUnits("1000000", 6); // 1,000,000 USDC
    await usdc.mint(deployer.address, mintAmountUSDC);

    // ⚠️ Fix WETH Minting: Use deposit() instead of mint()
    try {
        await weth.connect(deployer).deposit({ value: mintAmount });
        console.log(`✅ Deposited ${ethers.formatEther(mintAmount)} ETH into WETH contract.`);
    } catch (error) {
        console.log("⚠️ Failed to deposit ETH into WETH! Ensure deployer has enough ETH.");
        console.error(error);
    }

    console.log("✅ Minted WBTC, WETH, and USDC to deployer.");

    // 📌 8️⃣ Approve Tokens for Router (Wait for Confirmation)
    console.log("🔄 Approving tokens for DEXRouter...");
    await (await wbtc.connect(deployer).approve(await dexRouter.getAddress(), mintAmount)).wait();
    await (await weth.connect(deployer).approve(await dexRouter.getAddress(), mintAmount)).wait();
    await (await usdc.connect(deployer).approve(await dexRouter.getAddress(), mintAmountUSDC)).wait();
    console.log("✅ Approved WBTC, WETH, and USDC for DEXRouter.");

    // 📌 9️⃣ Set Chainlink Price Feeds
    const chainlinkETHUSD = "0x694AA1769357215DE4FAC081bf1f309aDC325306"; // ETH/USD
    const chainlinkBTCUSD = "0x1b44F3514812d835EB1BDB0acB33d3fA3351Ee43"; // BTC/USD
    const chainlinkUSDCUSD = "0xA2F78ab2355fe2f984D808B5CeE7FD0A93D5270E"; // USDC/USD

    await dexRouter.connect(deployer).setPriceFeed(await wbtc.getAddress(), chainlinkBTCUSD);
    await dexRouter.connect(deployer).setPriceFeed(await weth.getAddress(), chainlinkETHUSD);
    await dexRouter.connect(deployer).setPriceFeed(await usdc.getAddress(), chainlinkUSDCUSD);
    console.log("✅ BTC, ETH & USDC Chainlink price feeds set.");

    // 📌 🔟 Initialize Liquidity Pools
    const liquidityAmount = ethers.parseEther("10");

    async function addLiquidity(token1, token2) {
        const symbol1 = await token1.symbol();
        const symbol2 = await token2.symbol();
    
        const allowance1 = BigInt(await token1.allowance(deployer.address, await dexRouter.getAddress()));
        const allowance2 = BigInt(await token2.allowance(deployer.address, await dexRouter.getAddress()));
    
        console.log(`🔍 Checking Allowances for ${symbol1} - ${symbol2}`);
        console.log(`🔹 Allowance for ${symbol1}: ${ethers.formatEther(allowance1)}`);
        console.log(`🔹 Allowance for ${symbol2}: ${ethers.formatEther(allowance2)}`);
    
        if (allowance1 < BigInt(liquidityAmount) || allowance2 < BigInt(liquidityAmount)) {
            console.log(`❌ Insufficient allowance for ${symbol1} or ${symbol2}.`);
            return;
        }
    
        await dexRouter.connect(deployer).addLiquidity(
            await token1.getAddress(),
            await token2.getAddress(),
            liquidityAmount,
            liquidityAmount
        );
    
        console.log(`✅ Added Liquidity: ${symbol1} - ${symbol2}`);
    }
    

    await addLiquidity(wbtc, weth);
    await addLiquidity(wbtc, usdc);
    await addLiquidity(weth, usdc);

    console.log("🎉 Deployment complete! ✅");
}

main().catch(console.error);
