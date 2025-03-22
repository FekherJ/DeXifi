// test/DEXRouter.test.js
const { expect } = require("chai");
const { ethers } = require("hardhat");

// Helper for creating a PoolKey-like object
function createPoolKey(token0, token1) {
  return {
    currency0: token0.address,
    currency1: token1.address,
    fee: 3000,
    tickSpacing: 60,
    hook: ethers.constants.AddressZero
  };
}

describe("DEXRouter", function () {
  let Token0, Token1, token0, token1;
  let mockFeed0, mockFeed1;
  let poolManager, dexRouter;
  let owner, user;

  beforeEach(async () => {
    [owner, user] = await ethers.getSigners();

    // Deploy mock ERC20 tokens
    Token0 = await ethers.getContractFactory("ERC20Mock");
    Token1 = await ethers.getContractFactory("ERC20Mock");
    token0 = await Token0.deploy("Token0", "TK0", 18);
    token1 = await Token1.deploy("Token1", "TK1", 18);

    await token0.mint(user.address, ethers.utils.parseEther("1000"));
    await token1.mint(user.address, ethers.utils.parseEther("1000"));

    // Deploy mock Chainlink price feeds
    const FeedMock = await ethers.getContractFactory("MockV3Aggregator");
    mockFeed0 = await FeedMock.deploy(18, ethers.utils.parseUnits("1", 18));
    mockFeed1 = await FeedMock.deploy(18, ethers.utils.parseUnits("2", 18));

    // Deploy mock PoolManager
    const PoolManager = await ethers.getContractFactory("MockPoolManager");
    poolManager = await PoolManager.deploy();

    // Deploy DEXRouter
    const DEXRouter = await ethers.getContractFactory("DEXRouter");
    dexRouter = await DEXRouter.deploy(poolManager.address, ethers.constants.AddressZero);
  });

  it("sets and gets price feed", async () => {
    await dexRouter.setPriceFeed(token0.address, mockFeed0.address);
    expect(await dexRouter.getPriceFeed(token0.address)).to.equal(mockFeed0.address);
  });

  it("fails to get price when not set", async () => {
    await expect(dexRouter.getLatestPrice(token0.address)).to.be.revertedWith("Price feed not set");
  });

  it("gets latest price from Chainlink feed", async () => {
    await dexRouter.setPriceFeed(token0.address, mockFeed0.address);
    const price = await dexRouter.getLatestPrice(token0.address);
    expect(price).to.equal(ethers.utils.parseEther("1"));
  });

  it("initializes pool with Chainlink", async () => {
    await dexRouter.setPriceFeed(token0.address, mockFeed0.address);
    await dexRouter.setPriceFeed(token1.address, mockFeed1.address);

    const poolKey = createPoolKey(token0, token1);
    await expect(dexRouter.initializePoolWithChainlink(poolKey))
      .to.emit(dexRouter, "PoolInitialized");
  });

  it("adds liquidity", async () => {
    const amount0 = ethers.utils.parseEther("10");
    const amount1 = ethers.utils.parseEther("20");

    await token0.connect(user).approve(dexRouter.address, amount0);
    await token1.connect(user).approve(dexRouter.address, amount1);
    await dexRouter.setPriceFeed(token0.address, mockFeed0.address);
    await dexRouter.setPriceFeed(token1.address, mockFeed1.address);

    const poolKey = createPoolKey(token0, token1);
    await dexRouter.initializePoolWithChainlink(poolKey);

    await token0.connect(user).transfer(dexRouter.address, amount0);
    await token1.connect(user).transfer(dexRouter.address, amount1);

    await expect(
      dexRouter.connect(user).addLiquidity(poolKey, amount0, amount1, -60, 60, ethers.constants.HashZero)
    ).to.emit(dexRouter, "LiquidityAdded");
  });

  // Additional tests should follow: removeLiquidity, swapExactInputSingle, etc.
});