import React, { useState, useEffect } from "react";
import StakingInfo from "./StakingInfo";
import RewardInfo from "./RewardInfo";
import TransactionHistory from "./TransactionHistory";
import StakeWithdraw from "./StakeWithdraw";

const StakeSection = ({ stakingContract, signer }) => {
  const [stakingBalance, setStakingBalance] = useState("0");

  // Define fetchBalance function
  const fetchBalance = async () => {
    if (!stakingContract || !signer) {
      console.error("⚠️ Staking contract or signer is not initialized.");
      return;
    }

    try {
      const userAddress = await signer.getAddress();
      const balance = await stakingContract.balances(userAddress);
      console.log("✅ Updated Staking Balance (Raw):", balance.toString());
      setStakingBalance(balance.toString());
    } catch (err) {
      console.error("⚠️ Error fetching staking balance:", err.message);
    }
  };

  // Fetch balance on mount
  useEffect(() => {
    fetchBalance();
  }, [stakingContract, signer]);

  if (!stakingContract || !signer) {
    return (
      <div className="text-center text-red-500">
        <p>Error: Staking contract or signer not initialized.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="card p-6">
        <StakeWithdraw
          stakingContract={stakingContract}
          signer={signer}
          onTransactionComplete={fetchBalance} // Pass fetchBalance
        />
      </div>
      <div className="space-y-6">
        <StakingInfo
          stakingContract={stakingContract}
          signer={signer}
          stakingBalance={stakingBalance} // Pass staking balance
        />
        <RewardInfo stakingContract={stakingContract} signer={signer} />
        <TransactionHistory stakingContract={stakingContract} signer={signer} />
      </div>
    </div>
  );
};

export default StakeSection;
