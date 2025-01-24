
# Detailed Testing Guide for Staking Contract in Remix

This guide will walk you through the process of testing the **Staking Contract** in Remix, including token deployment, allowance approval, staking, reward claiming, and withdrawing tokens. Each step is explained in detail to ensure successful interactions with the smart contract.

## Prerequisites
- Familiarity with Solidity and the Remix IDE.
- The **ERC20Mock** contract (for staking and reward tokens) and **Staking Contract** should be compiled and ready to deploy.

### Tools:
- Remix IDE (https://remix.ethereum.org/)
- JavaScript VM (for local testing)

## Steps Overview:
1. Deploy the ERC20 Mock tokens.
2. Deploy the Staking Contract.
3. Mint tokens to users.
4. Approve the staking contract to spend tokens.
5. Stake tokens.
6. Claim rewards.
7. Withdraw tokens.
   
---

## Step-by-Step Process:

### 1. **Deploy ERC20 Mock Tokens**
- In Remix, navigate to the "Deploy & Run Transactions" panel.
- From the contract dropdown, select the **ERC20Mock** contract.
- Deploy two instances of the ERC20Mock contract: one for **staking token** and one for **reward token**. You can name them `STK` and `RWD` respectively for easy identification.

### 2. **Deploy the Staking Contract**
- Once the tokens are deployed, go back to the "Deploy & Run Transactions" panel.
- Select the **Staking** contract from the dropdown.
- Provide the addresses of the **staking token** (STK) and **reward token** (RWD) when deploying the staking contract. You will see these addresses in the "Deployed Contracts" section for each ERC20Mock instance.

### 3. **Mint Tokens to Users**
- After deploying both tokens, you need to mint some tokens for the users.
- Under the **ERC20Mock** contract (e.g., STK), find the `mint()` function.
- Call the `mint()` function, providing:
  - **Account:** The address of the user (or the `msg.sender` address).
  - **Amount:** The number of tokens you want to mint (e.g., 1000 tokens).

    Example:
    ```solidity
    mint("0xYourAddressHere", 1000);
    ```

### 4. **Approve Staking Contract for Token Spending**
- In the **ERC20Mock** contract (e.g., STK), locate the `approve()` function.
- Provide:
  - **spender:** The address of the **Staking Contract** (found in the "Deployed Contracts" section).
  - **amount:** A sufficient amount of tokens to allow the staking contract to spend (e.g., 1000 tokens).

    Example:
    ```solidity
    approve("0xStakingContractAddress", 1000);
    ```

### 5. **Stake Tokens**
- In the **Staking Contract**, locate the `stake()` function.
- Provide the number of tokens you want to stake (e.g., 200 tokens).
- Call the function to stake the tokens:
    ```solidity
    stake(200);
    ```

- The transaction should complete successfully if the staking contract has sufficient allowance. If you get an "insufficient allowance" error, ensure you've completed step 4 correctly.

### 6. **Check Staked Balance (Optional)**
- To verify that tokens have been staked, you can call the `balances()` function in the **Staking Contract**:
    ```solidity
    balances("0xYourAddressHere");
    ```
  This will show you the number of tokens staked by the user.

### 7. **Claim Rewards**
- In the **Staking Contract**, call the `getReward()` function.
- This will transfer any earned rewards to the user. Ensure you have waited a sufficient amount of time for rewards to accumulate.

    Example:
    ```solidity
    getReward();
    ```

### 8. **Withdraw Staked Tokens**
- If you want to withdraw staked tokens, call the `withdraw()` function in the **Staking Contract**.
- Provide the amount you want to withdraw (e.g., 100 tokens).

    Example:
    ```solidity
    withdraw(100);
    ```

### 9. **Check Reward Balance (Optional)**
- If you want to verify the user's reward balance, you can call the `rewards()` function:
    ```solidity
    rewards("0xYourAddressHere");
    ```

---

## Troubleshooting:
- **Insufficient Allowance Error:** Ensure that the allowance was approved correctly in step 4. You may need to re-approve with a higher value.
- **No Rewards Claimed:** Make sure you have waited long enough for rewards to accumulate before calling `getReward()`.

## Conclusion:
By following these steps, you can fully test the staking, reward, and withdrawal functionality of your smart contract using Remix. These actions simulate real-world usage of the staking contract, allowing you to validate the contract's behavior before deploying it on a live network.

