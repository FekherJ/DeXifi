import React, { useEffect, useState } from "react";

const StakingInfo = ({ stakingContract, signer }) => {
  const [stakingBalance, setStakingBalance] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStakingBalance = async () => {
      if (!stakingContract || !signer) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const address = await signer.getAddress();
        const balance = await stakingContract.balances(address); // ✅ Correct function
        setStakingBalance(balance.toString());
      } catch (error) {
        console.error("Error fetching staking balance:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStakingBalance();
  }, [stakingContract, signer]);

  if (!loading && (stakingBalance === null || stakingBalance === undefined)) {
    return <p className="text-red-500">Unable to load staking info. Please try again.</p>;
  }

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
