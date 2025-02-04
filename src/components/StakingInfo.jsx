import React, { useState, useEffect } from "react";
import { formatUnits, parseUnits } from "ethers";

const StakingInfo = ({ stakingContract, signer }) => {
  const [stakingBalance, setStakingBalance] = useState("0");
  const [withdrawAmount, setWithdrawAmount] = useState(""); // User input for withdrawal
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [withdrawError, setWithdrawError] = useState("");

  useEffect(() => {
    const fetchBalance = async () => {
      if (!signer || !stakingContract) {
        setError("⚠️ Signer or contract is not initialized.");
        return;
      }

      try {
        const userAddress = await signer.getAddress();
        console.log("Fetching balance for:", userAddress);

        const balance = await stakingContract.balances(userAddress);
        console.log("✅ Balance retrieved (raw):", balance.toString());

        // Convert balance to readable format
        setStakingBalance(formatUnits(balance, 18)); // Assuming 18 decimals
      } catch (err) {
        setError(`❌ Error fetching staking balance: ${err.message}`);
        console.error("⚠️ Debug Error:", err);
      }
    };

    fetchBalance();
  }, [signer, stakingContract]);

  // Handle Withdraw STK
  const handleWithdraw = async () => {
    try {
      if (!stakingContract || !signer) {
        throw new Error("Staking contract or signer is not initialized.");
      }
      if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
        throw new Error("Enter a valid amount to withdraw.");
      }

      setLoading(true);
      setWithdrawError("");

      console.log("⏳ Initiating STK withdrawal...");

      // Convert input amount to BigNumber (18 decimals assumed)
      const amountInWei = parseUnits(withdrawAmount, 18);
      const withdrawTx = await stakingContract.withdraw(amountInWei);
      console.log("Withdrawal transaction sent:", withdrawTx.hash);
      await withdrawTx.wait();

      console.log("✅ STK Withdrawal successful!");

      // Refresh staking balance
      const userAddress = await signer.getAddress();
      const updatedBalance = await stakingContract.balances(userAddress);
      setStakingBalance(formatUnits(updatedBalance, 18)); // Convert to readable format
      setWithdrawAmount(""); // Clear input
    } catch (error) {
      console.error("⚠️ Error during withdrawal:", error.message);
      setWithdrawError(error.message || "Error during withdrawal.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-gray-900 rounded-lg shadow-lg">
      <h3 className="text-2xl font-semibold text-white text-center mb-4">Staking Info</h3>

      {error ? (
        <p className="text-red-500">{error}</p>
      ) : (
        <div className="flex flex-col items-center gap-4">
          {/* Staking Balance Display */}
          <p className="text-lg text-gray-300">
            <span className="font-bold text-purple-400">Staking Balance:</span> {stakingBalance} STK
          </p>

          {/* Amount Input */}
          <div className="relative w-full max-w-sm">
            <input
              type="number"
              placeholder="Enter amount to withdraw"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
              className="w-full p-3 text-lg text-white bg-gray-800 border border-purple-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
          </div>

          {/* Withdraw Button */}
          <button
            className="w-full max-w-sm px-6 py-3 text-lg font-bold text-white bg-gradient-to-r from-red-500 to-red-700 rounded-lg shadow-lg hover:from-red-600 hover:to-red-800 transition-all duration-300 disabled:opacity-50"
            onClick={handleWithdraw}
            disabled={loading}
          >
            {loading ? "Withdrawing..." : "Withdraw STK"}
          </button>

          {/* Error Message */}
          {withdrawError && <p className="text-red-500 text-sm mt-2">{withdrawError}</p>}
        </div>
      )}
    </div>
  );
};

export default StakingInfo;
