import React from "react";
import { ethers } from "ethers";

const StakeWithdraw = ({ stakingContract, signer, activeTab, onTransactionComplete }) => {
  const handleTransaction = async (type) => {
    const inputId = type === "stake" ? "stakeAmount" : "withdrawAmount";
    const amount = document.getElementById(inputId).value;

    if (!amount || amount <= 0) {
      alert(`Please enter a valid amount to ${type}.`);
      return;
    }

    try {
      const amountInWei = ethers.utils.parseUnits(amount, 18);
      const tx =
        type === "stake"
          ? await stakingContract.stake(amountInWei)
          : await stakingContract.withdraw(amountInWei);

      await tx.wait();
      alert(`Tokens successfully ${type === "stake" ? "staked" : "withdrawn"}!`);

      // Notify parent to refresh data
      if (onTransactionComplete) onTransactionComplete();
    } catch (error) {
      console.error(`Error during ${type}:`, error);
      alert(`Failed to ${type} tokens.`);
    }
  };

  return (
    <div>
      <h3 className="text-2xl font-bold text-purple-400">
        {activeTab === "stake" ? "Stake Tokens" : "Withdraw Tokens"}
      </h3>
      <div className="mt-4 flex gap-4">
        <input
          type="number"
          id={activeTab === "stake" ? "stakeAmount" : "withdrawAmount"}
          placeholder="Enter amount"
          className="flex-1 px-4 py-2 bg-gray-800 text-white rounded-md focus:ring-2 focus:ring-purple-500"
        />
        <button
          className={`px-6 py-2 rounded-md ${
            activeTab === "stake"
              ? "bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
              : "bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600"
          }`}
          onClick={() => handleTransaction(activeTab)}
        >
          {activeTab === "stake" ? "Stake" : "Withdraw"}
        </button>
      </div>
    </div>
  );
};

export default StakeWithdraw;
