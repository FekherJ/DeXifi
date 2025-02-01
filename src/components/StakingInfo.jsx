import React, { useEffect, useState } from "react";
import { Contract } from "ethers";
import tokenABI from "../../abi/erc20Mock_abi.json";

const tokenAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3"; // Token contract address

const StakingInfo = ({ stakingContract, signer }) => {
  const [stakingBalance, setStakingBalance] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStakingBalance = async () => {
      if (!stakingContract || !signer) {
        console.warn("Staking contract or signer is missing.");
        setLoading(false);
        return;
      }
  
      try {
        setLoading(true);
        const address = await signer.getAddress();
        console.log("Fetching staking balance for address:", address);
  
        // Fetch raw staking balance (in Wei)
        const rawBalance = await stakingContract.balances(address);
        console.log("Raw Staking Balance (in Wei):", rawBalance.toString());
  
        // Fetch decimals from token contract
        const tokenContract = new Contract(tokenAddress, tokenABI.abi, signer);
        const decimals = await tokenContract.decimals();
        console.log("Token Decimals:", decimals);
  
        // Convert balance to token units
        const divisor = BigInt(10) ** BigInt(decimals);
        const balanceInTokens = rawBalance / divisor;
        console.log("Converted Staking Balance:", balanceInTokens.toString());
  
        setStakingBalance(balanceInTokens.toString());
      } catch (error) {
        console.error("Error fetching staking balance:", error);
      } finally {
        setLoading(false);
      }
    };
  
    fetchStakingBalance();
  }, [stakingContract, signer]);
  

  return (
    <div className="glass text-center">
      <h3 className="text-xl font-semibold text-purple-400">Staking Info</h3>
      <p className="mt-2">Staking Balance:</p>
      <p className="mt-1 text-2xl font-bold">{loading ? "Loading..." : `${stakingBalance} STK`}</p>
      <p className="mt-4">APY:</p>
      <p className="text-lg font-semibold">5.00%</p>
    </div>
  );
};

export default StakingInfo;
