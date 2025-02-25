# **Decentralized Exchange (DEX) and Staking Platform**

This project implements a **Decentralized Exchange (DEX) with liquidity management**, **staking**, and **yield farming** functionalities on Ethereum. It allows users to **swap tokens, provide liquidity, stake tokens, and earn rewards** in a decentralized manner.

## **Table of Contents**
- [Introduction](#introduction)
- [Features](#features)
- [Technologies Used](#technologies-used)
- [Installation and Setup](#installation-and-setup)
- [Usage](#usage)
- [Testing](#testing)
- [Deployment](#deployment)
- [Front-End Integration](#front-end-integration)
- [License](#license)

---

## **Introduction**
This project provides a **fully on-chain decentralized exchange (DEX)** inspired by **Uniswap v4**, with integrated **staking and yield farming**. Users can:
- Swap ERC-20 tokens.
- Provide liquidity and earn LP rewards.
- Stake tokens to earn additional rewards.
- Withdraw liquidity and claim rewards.

It leverages **Uniswap v4 pool management** while adding **custom smart contract logic** for staking and yield farming.

---

## **Features**
### ✅ **DEX (Decentralized Exchange)**
- **Token Swaps:** Users can swap ERC-20 tokens using a liquidity pool model.
- **Liquidity Management:** Users can provide liquidity and receive LP tokens.
- **Automated Market Maker (AMM):** Trades are executed based on the constant product formula.
- **Fee Distribution:** A portion of swap fees goes to liquidity providers.

### ✅ **Liquidity Pools**
- **Add Liquidity:** Users can deposit token pairs to liquidity pools.
- **Remove Liquidity:** Users can withdraw their liquidity at any time.

### ✅ **Staking and Yield Farming**
- **Staking:** Users can lock up tokens in exchange for rewards.
- **Rewards Calculation:** Yield is distributed based on a predefined formula.
- **Claiming Rewards:** Users can claim staking rewards separately.

### ✅ **Security and Optimizations**
- **Custom Hooks and Callbacks:** The system ensures safe interactions between liquidity providers and the DEX.
- **Permissionless Trading:** Any ERC-20 token can be listed for swapping.
- **OpenZeppelin Security:** Uses secure libraries for token interactions.

---

## **Technologies Used**
- **Solidity** - Smart contract programming.
- **Hardhat** - Ethereum development and testing.
- **Ethers.js** - Blockchain interaction library.
- **OpenZeppelin** - Standardized security libraries.
- **Uniswap v4 Core** - Pool management integration.
- **Node.js** - Scripting and contract deployment.

---

## **Installation and Setup**
### **Prerequisites**
Ensure you have:
- **Node.js** (https://nodejs.org/)
- **npm** or **yarn**
- **Hardhat**
- **MetaMask** (for interacting with deployed contracts)

### **Clone the Repository**
```bash
git clone https://github.com/FekherJ/ChainFlight.git
cd ChainFlight
```

### **Install Dependencies**
```bash
npm install
```

### **Compile Contracts**
```bash
npx hardhat compile
```

### **Start Local Blockchain**
```bash
npx hardhat node
```

### **Deploy Contracts Locally**
```bash
npx hardhat run scripts/deploy_dexrouter.js --network localhost
```

---

## **Usage**
### **1️⃣ Adding Liquidity**
To add liquidity:
```javascript
await dexRouter.addLiquidity(tokenA.address, tokenB.address, amountA, amountB);
```

### **2️⃣ Swapping Tokens**
To swap tokens:
```javascript
await dexRouter.swapExactInputSingle(tokenA.address, tokenB.address, amountIn, amountOutMin);
```

### **3️⃣ Staking Tokens**
To stake tokens:
```javascript
await stakingContract.stake(amount);
```

### **4️⃣ Claiming Rewards**
To claim staking rewards:
```javascript
await stakingContract.getReward();
```

---

## **Testing**
Run unit tests using Hardhat:
```bash
npx hardhat test
```
The test suite includes:
- ✅ Token swaps.
- ✅ Liquidity management.
- ✅ Staking functionality.
- ✅ Security and edge case tests.

---

## **Deployment**
To deploy on a **testnet (Sepolia/Goerli)**:
1. Configure **hardhat.config.js** with your **Infura/Alchemy API Key** and **Private Key**.
2. Deploy:
```bash
npx hardhat run scripts/deploy_dexrouter.js --network sepolia
```

---

## **Front-End Integration**
- Uses **React + ethers.js** for interacting with smart contracts.
- Implements a **DEX interface** where users can:
  - Swap tokens.
  - Add/remove liquidity.
  - Stake and claim rewards.

---

## **License**
This project is licensed under the **MIT License**.

