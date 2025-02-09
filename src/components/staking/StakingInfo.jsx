import React, { useState } from "react";
import useStakingLogic from "../../hooks/useStakingLogic.js";

const StakingInfo = ({ stakingContract, signer }) => {
  const { stakingBalance, handleWithdraw } = useStakingLogic(stakingContract, signer);
  const [withdrawAmount, setWithdrawAmount] = useState("");

  const handleWithdrawClick = async () => {
    try {
      await handleWithdraw(withdrawAmount);
    } catch (error) {
      console.error(error.message);
    }
  };

  return (
    <div className="p-6 bg-gray-900 rounded-lg shadow-lg">
      <h3 className="text-2xl font-semibold text-white text-center mb-4">Staking Info</h3>
      <p className="text-lg text-gray-300">
        <span className="font-bold text-purple-400">Staking Balance:</span> {stakingBalance} STK
      </p>
      <input
        type="number"
        placeholder="Enter amount to withdraw"
        value={withdrawAmount}
        onChange={(e) => setWithdrawAmount(e.target.value)}
        className="w-full p-3 text-lg text-white bg-gray-800 border border-purple-500 rounded-lg"
      />
      <button onClick={handleWithdrawClick} className="w-full px-6 py-3 text-lg font-bold bg-red-600 text-white rounded-lg">
        Withdraw
      </button>
    </div>
  );
};

export default StakingInfo;
