import React, { useEffect, useState } from "react";
import { formatUnits } from "ethers";

const StakingInfo = ({ stakingContract, signer }) => {
  const [stakingBalance, setStakingBalance] = useState("0.000 STK");
  const [apy, setApy] = useState("0.00%");

  useEffect(() => {
    const fetchStakingInfo = async () => {
      if (stakingContract && signer) {
        try {
          const address = await signer.getAddress();
          const balance = await stakingContract.balanceOf(address);
          setStakingBalance(`${formatUnits(balance, 18)} STK`);

          const calculatedApy = 5.0; // Example placeholder APY calculation
          setApy(`${calculatedApy}%`);
        } catch (error) {
          console.error("Error fetching staking info:", error);
        }
      }
    };

    fetchStakingInfo();
  }, [stakingContract, signer]);

  return (
    <div className="glass text-center">
      <h3 className="text-xl font-semibold text-purple-400">Staking Info</h3>
      <p className="mt-2">Staking Balance:</p>
      <p className="mt-1 text-2xl font-bold">{stakingBalance}</p>
      <p className="mt-4">APY:</p>
      <p className="text-lg font-semibold">{apy}</p>
    </div>
  );
};

export default StakingInfo;
