import React, { useState } from "react";
import useStakingLogic from "../../hooks/useStakingLogic.js";

const StakingInfo = ({ stakingContract, signer }) => {
  const { stakingBalance, handleWithdraw, fetchBalance } = useStakingLogic(stakingContract, signer);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleWithdrawClick = async () => {
    try {
      if (!withdrawAmount || isNaN(withdrawAmount) || parseFloat(withdrawAmount) <= 0) {
        setError("Enter a valid withdrawal amount.");
        return;
      }

      setLoading(true);
      setError(null);
      console.log(`⏳ Withdrawing ${withdrawAmount} STK...`);

      await handleWithdraw(withdrawAmount);

      console.log("✅ Withdrawal successful!");
      setWithdrawAmount(""); // Reset input field
      await fetchBalance(); // Refresh staking balance
    } catch (error) {
      console.error("⚠️ Withdrawal Error:", error.message);
      setError(error.message || "Withdrawal failed.");
    } finally {
      setLoading(false);
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
      {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
      <button
        onClick={handleWithdrawClick}
        disabled={loading}
        className={`w-full px-6 py-3 text-lg font-bold rounded-lg ${
          loading ? "bg-gray-500 cursor-not-allowed" : "bg-red-600 hover:bg-red-700 text-white"
        }`}
      >
        {loading ? "Processing..." : "Withdraw"}
      </button>
    </div>
  );
};

export default StakingInfo;
