require("@nomicfoundation/hardhat-toolbox");
require("dotenv/config");


module.exports = {
  solidity: {
    compilers: [
      {
        version: "0.8.20",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200, // Lower runs value makes the contract smaller
          },
          evmVersion: "cancun",
        },
      },
      {
        version: "0.8.24",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
          evmVersion: "cancun",
        },
      },
      {
        version: "0.8.26",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
          evmVersion: "cancun",
        },
      },
    ],
  },
  paths: {
    sources: "./contracts",
    artifacts: "./artifacts",
    cache: "./cache",
    libraries: "./node_modules/@uniswap/v4-core/src"
  },
  
  networks: {
    hardhat: {
      chainId: 31337,
      gas: "auto", // 6 million gas
      gasPrice: "auto", // 50 Gwei in string format
      blockGasLimit: 30000000, // Increase block gas limit
      
      forking: {
        url: process.env.SEPOLIA_RPC_URL || "", // Uses your Sepolia RPC URL
        blockNumber: 4880000, // (Optional) Choose a stable block
      },
    },
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
  },

  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY || "",  // ✅ Ensures it's not undefined
  },

  external: {
    contracts: [
      {
        artifacts: "node_modules/@uniswap/v4-core/src",
      },
    ],
  },
  mocha: {
    timeout: 20000,
  },
};
