

export const CONTRACT_ADDRESSES = {
    localhost: '0x610178dA211FEF7D417bC0e6FeD39F05609AD788', // Replace with your localhost Staking contract address 
  };
  
  // Dynamically get the staking contract address based on chain ID
  export const getStakingContractAddress = (chainId) => {
    switch (chainId) {
      case 31337: // Localhost
        return CONTRACT_ADDRESSES.localhost;
      case 11155111: // Sepolia
        return CONTRACT_ADDRESSES.sepolia;
      default:
        throw new Error('Unsupported network. Please switch to localhost or Sepolia.');
    }
  };