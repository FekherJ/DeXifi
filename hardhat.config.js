require("@nomicfoundation/hardhat-ethers");
require('dotenv').config(); // Load .env variables
require('@nomiclabs/hardhat-etherscan');

if (!process.env.ALCHEMY_URL || !process.env.PRIVATE_KEY) {
  console.error("Error: Please check your .env file to ensure that ALCHEMY_URL and PRIVATE_KEY are set correctly.");
  process.exit(1); // Exit if environment variables are missing
}

module.exports = {
  solidity: "0.8.24",
  networks: {
    sepolia: {
      url: process.env.ALCHEMY_URL,
      accounts: [process.env.PRIVATE_KEY],
      timeout: 600000,  // Increase timeout to 10 minutes
      gasMultiplier: 1.5,  // Ensure you're slightly overestimating gas
    },
  },

  localhost: {
    url: "http://127.0.0.1:8545", // Hardhat's default local network
    gas: 8000000, // Set the gas limit
    timeout: 600000,  // Set a longer timeout to avoid deployment issues
  },

  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,  // Sepolia Etherscan API key
  },
};