import React, { useState, useEffect } from "react";
import { formatUnits } from "ethers";

const RewardInfo = ({ stakingContract, signer }) => {
  const [rewardBalance, setRewardBalance] = useState("0");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [claiming, setClaiming] = useState(false);

  // Fetch Reward Balance
  useEffect(() => {
    const fetchRewardBalance = async () => {
      if (!signer || !stakingContract) {
        setError("⚠️ Signer or contract is not initialized.");
        return;
      }

      try {
        const userAddress = await signer.getAddress();
        console.log("Fetching reward balance for:", userAddress);

        const balance = await stakingContract.earned(userAddress); // Fetch earned rewards
        console.log("✅ Reward Balance Retrieved (Raw):", balance.toString());

        setRewardBalance(formatUnits(balance, 18)); // Convert balance from Wei
      } catch (err) {
        setError(`❌ Error fetching reward balance: ${err.message}`);
        console.error("⚠️ Debug Error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchRewardBalance();
  }, [signer, stakingContract]);

  // Handle Claim Rewards
  const handleClaimRewards = async () => {
    try {
      if (!stakingContract || !signer) {
        throw new Error("Staking contract or signer is not initialized.");
      }

      setClaiming(true);
      setError("");

      console.log("⏳ Sending claim rewards transaction...");
      const claimTx = await stakingContract.getReward(); // Use getReward from the ABI
      console.log("Transaction Hash:", claimTx.hash);
      await claimTx.wait();

      console.log("✅ Rewards successfully claimed!");

      // Refresh reward balance after claiming
      const userAddress = await signer.getAddress();
      const newBalance = await stakingContract.earned(userAddress);
      setRewardBalance(formatUnits(newBalance, 18));
    } catch (err) {
      console.error("⚠️ Error claiming rewards:", err.message);
      setError(`❌ Error claiming rewards: ${err.message}`);
    } finally {
      setClaiming(false);
    }
  };

  return (
    <div className="card text-center">
      <h3 className="text-xl font-semibold text-purple-400">Rewards</h3>
      {error ? (
        <p className="text-red-500">{error}</p>
      ) : (
        <p className="mt-2">
          Reward Balance: {loading ? "Loading..." : `${rewardBalance} RWD`}
        </p>
      )}
      <button
        className="mt-4 w-full bg-gradient-to-r from-purple-600 to-pink-500 py-2 rounded-lg"
        onClick={handleClaimRewards}
        disabled={claiming || parseFloat(rewardBalance) <= 0}
      >
        {claiming ? "Claiming..." : "Claim Rewards"}
      </button>
    </div>
  );
};

export default RewardInfo;
