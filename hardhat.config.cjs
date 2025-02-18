require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
    solidity: "0.8.24", // Update to match Uniswap v4 dependencies
    networks: {
      hardhat: {
        chainId: 31337,
      },
    },
  };
