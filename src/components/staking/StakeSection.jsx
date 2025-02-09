import React from "react";
import StakingInfo from "./StakingInfo";
import RewardInfo from "../common/RewardInfo";
import TransactionHistory from "../common/TransactionHistory";
import StakeWithdraw from "./StakeWithdraw";
import useStakingLogic from "../../hooks/useStakingLogic";

const StakeSection = ({ stakingContract, signer }) => {
  const { stakingBalance, fetchBalance } = useStakingLogic(stakingContract, signer);

  if (!stakingContract || !signer) {
    return <div className="text-center text-red-500">Error: Staking contract or signer not initialized.</div>;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="card p-6">
        <StakeWithdraw stakingContract={stakingContract} signer={signer} onTransactionComplete={fetchBalance} />
      </div>
      <div className="space-y-6">
        <StakingInfo stakingContract={stakingContract} signer={signer} stakingBalance={stakingBalance} />
        <RewardInfo stakingContract={stakingContract} signer={signer} />
        <TransactionHistory stakingContract={stakingContract} signer={signer} />
      </div>
    </div>
  );
};

export default StakeSection;
