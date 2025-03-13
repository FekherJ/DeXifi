import { expect } from "chai";
import hardhat from "hardhat";
const { ethers } = hardhat;

describe("DEXRouter + PriceFeed + Staking Tests", function () {
  let owner, trader1, trader2;
  let erc20A, erc20B, weth;
  let dexRouter, mockPriceFeed, priceFeedHook, staking;

  before(async () => {
    [owner, trader1, trader2] = await ethers.getSigners();

    const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
    const WETH = await ethers.getContractFactory("WETH");
    const DEXRouter = await ethers.getContractFactory("DEXRouter");
    const MockPriceFeed = await ethers.getContractFactory("MockPriceFeed");
    const PriceFeedHook = await ethers.getContractFactory("PriceFeedHook");
    

    const Staking = await ethers.getContractFactory("Staking");

    // Deploy Tokens
    erc20A = await ERC20Mock.deploy("Mock Token A", "MTA");
    await erc20A.deployed();
    erc20B = await ERC20Mock.deploy("Mock Token B", "MTB");
    await erc20B.deployed();
    weth = await WETH.deploy();
    await weth.deployed();

    // Deploy Mock Chainlink Price Feed
    mockPriceFeed = await MockPriceFeed.deploy(ethers.utils.parseEther("100"), 18);
    await mockPriceFeed.deployed();
    
    // Deploy PriceFeed Hook
    priceFeedHook = await PriceFeedHook.deploy(mockPriceFeed.address);
    await priceFeedHook.deployed();

    // Deploy DEX Router
    dexRouter = await DEXRouter.deploy(weth.address, priceFeedHook.address);
    await dexRouter.deployed();

    // Deploy Staking Contract
    staking = await Staking.deploy(erc20A.address, erc20B.address);
    await staking.deployed();
  });

  describe("Basic Deployment Checks", function () {
    it("should deploy ERC20 tokens correctly", async () => {
      expect(await erc20A.name()).to.equal("Mock Token A");
      expect(await erc20B.symbol()).to.equal("MTB");
    });

    it("should deploy and set up the DEX router", async () => {
      expect(await dexRouter.WETH()).to.equal(weth.address);
      expect(await dexRouter.priceFeedHook()).to.equal(priceFeedHook.address);
    });
  });

  describe("Liquidity Management", function () {
    it("Trader1 should add liquidity", async () => {
      await erc20A.mint(trader1.address, ethers.utils.parseEther("1000"));
      await erc20B.mint(trader1.address, ethers.utils.parseEther("1000"));

      await erc20A.connect(trader1).approve(dexRouter.address, ethers.utils.parseEther("1000"));
      await erc20B.connect(trader1).approve(dexRouter.address, ethers.utils.parseEther("1000"));

      await dexRouter.connect(trader1).addLiquidity(
        erc20A.address,
        erc20B.address,
        ethers.utils.parseEther("500"),
        ethers.utils.parseEther("500")
      );
    });
  });

  describe("Swaps", function () {
    it("Trader2 swaps TokenB for TokenA", async () => {
      await erc20B.mint(trader2.address, ethers.utils.parseEther("100"));
      await erc20B.connect(trader2).approve(dexRouter.address, ethers.utils.parseEther("100"));

      await dexRouter.connect(trader2).swapExactTokensForTokens(
        erc20B.address,
        erc20A.address,
        ethers.utils.parseEther("50")
      );
    });
  });

  describe("Staking", function () {
    it("Trader1 should stake TokenA", async () => {
      await erc20A.connect(trader1).approve(staking.address, ethers.utils.parseEther("200"));
      await staking.connect(trader1).stake(ethers.utils.parseEther("200"));
    });
  });
});
