import React, { useEffect, useState } from "react";
import { formatUnits } from "ethers"; // Use standalone import

const RewardInfo = ({ stakingContract, signer }) => {
  const [rewardBalance, setRewardBalance] = useState("0.000 RWD");

  useEffect(() => {
    const fetchRewardBalance = async () => {
      if (stakingContract && signer) {
        try {
          const address = await signer.getAddress();
          const balance = await stakingContract.earned(address);
          setRewardBalance(`${formatUnits(balance, 18)} RWD`);
        } catch (error) {
          console.error("Error fetching reward balance:", error);
        }
      }
    };

    fetchRewardBalance();
  }, [stakingContract, signer]);

  const claimRewards = async () => {
    try {
      const tx = await stakingContract.getReward();
      await tx.wait();
      alert("Rewards claimed successfully!");
    } catch (error) {
      console.error("Error claiming rewards:", error);
      alert("Error claiming rewards.");
    }
  };

  return (
    <div className="glass text-center">
      <h3 className="text-xl font-semibold text-purple-400">Rewards</h3>
      <p className="mt-2 text-lg">Reward Balance:</p>
      <p className="mt-1 text-2xl font-bold">{rewardBalance}</p>
      <button
        className="mt-4 w-full bg-gradient-to-r from-purple-600 to-pink-500"
        onClick={claimRewards}
      >
        Claim Rewards
      </button>
    </div>
  );
};

export default RewardInfo;
