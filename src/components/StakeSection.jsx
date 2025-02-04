import React from "react";
import StakingInfo from "./StakingInfo";
import RewardInfo from "./RewardInfo";
import TransactionHistory from "./TransactionHistory";
import StakeWithdraw from "./StakeWithdraw";

const StakeSection = ({ stakingContract, signer }) => {
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
        <StakeWithdraw stakingContract={stakingContract} signer={signer} />
      </div>
      <div className="space-y-6">
        <StakingInfo stakingContract={stakingContract} signer={signer} />
        <RewardInfo stakingContract={stakingContract} signer={signer} />
        <TransactionHistory stakingContract={stakingContract} signer={signer} />
      </div>
    </div>
  );
};

export default StakeSection;
