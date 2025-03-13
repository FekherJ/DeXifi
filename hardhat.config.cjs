require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    compilers: [

      {
        version: "0.8.26",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
          viaIR: true,
          evmVersion: "cancun"
        },
      },

      {
        version: "0.8.20",
        settings: {
          viaIR: true,
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: "0.8.24",
        settings: {
          viaIR: true,
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: "0.8.17",
        viaIR: true,
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      
    ],
  },
  networks: {
    hardhat: {
      chainId: 1337,
    },
  },
};
