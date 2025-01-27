import React from "react";

const StakingInfo = ({ stakingBalance, loading }) => {
  return (
    <div className="glass text-center">
      <h3 className="text-xl font-semibold text-purple-400">Staking Info</h3>
      <p className="mt-2">Staking Balance:</p>
      <p className="mt-1 text-2xl font-bold">{loading ? "Loading..." : stakingBalance}</p>
      <p className="mt-4">APY:</p>
      <p className="text-lg font-semibold">5.00%</p>
    </div>
  );
};

export default StakingInfo;
