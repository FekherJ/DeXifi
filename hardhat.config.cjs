require("@nomicfoundation/hardhat-ethers");
require("@nomiclabs/hardhat-etherscan");
require("dotenv").config();

module.exports = {
  solidity: "0.8.26",
  networks: {
    sepolia: {
      url: process.env.ALCHEMY_URL,
      accounts: [process.env.PRIVATE_KEY],
      timeout: 600000,
      gasMultiplier: 1.5,
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      gas: 8000000,
      timeout: 600000,
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
  paths: {
    sources: "./contracts",
  },
  external: {
    sources: ["node_modules/@uniswap/v4-core/src"], // Correct way to include Uniswap V4 sources
  },
  settings: {
    optimizer: {
      enabled: true,
      runs: 200,
    },
  },
};
