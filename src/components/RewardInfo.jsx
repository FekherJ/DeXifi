import React from "react";

const RewardInfo = ({ rewardBalance, loading }) => {
  return (
    <div className="glass text-center">
      <h3 className="text-xl font-semibold text-purple-400">Rewards</h3>
      <p className="mt-2">Reward Balance:</p>
      <p className="mt-1 text-2xl font-bold">{loading ? "Loading..." : rewardBalance}</p>
      <button className="mt-4 w-full bg-gradient-to-r from-purple-600 to-pink-500">
        Claim Rewards
      </button>
    </div>
  );
};

export default RewardInfo;
