// StakeWithdraw.jsx (Updated)
import React, { useState, useEffect } from "react";
import { parseUnits, Contract } from "ethers";


const StakeWithdraw = ({ stakingContract, signer, activeTab, onTransactionComplete }) => {
  const [stakeAmount, setStakeAmount] = useState(""); // Input value for staking amount
  const [loading, setLoading] = useState(false); // Loading state for button
  const [tokenAddress, setTokenAddress] = useState(""); // Token address from staking contract
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const fetchTokenAddress = async () => {
      try {
        if (!stakingContract) {
          throw new Error("Staking contract not initialized.");
        }
        const address = await stakingContract.stakingToken();
        setTokenAddress(address);
        console.log("Token Address fetched:", address);
      } catch (error) {
        setErrorMessage("Failed to fetch token address. Check the contract configuration.");
        console.error("Error fetching token address:", error);
      }
    };

    fetchTokenAddress();
  }, [stakingContract]);

  const handleStake = async () => {
    try {
      if (!stakingContract || !tokenAddress) {
        throw new Error("Staking contract or token address is missing.");
      }

      setLoading(true);
      const amountInWei = parseUnits(stakeAmount, 18);

      // Approve the staking contract to spend tokens
      const tokenContract = new Contract(
        tokenAddress,
        ["function approve(address spender, uint256 amount) public returns (bool)"],
        signer
      );
      const approveTx = await tokenContract.approve(stakingContract.getAddress(), amountInWei);
      await approveTx.wait();

      // Stake tokens
      const stakeTx = await stakingContract.stake(amountInWei);
      await stakeTx.wait();

      onTransactionComplete?.();
    } catch (error) {
      setErrorMessage("Error during staking. Ensure sufficient balance and approval.");
      console.error("Error during staking:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass p-6 rounded-lg shadow-lg">
      <h3 className="text-xl font-bold mb-4">Stake Tokens</h3>
      <input
        type="number"
        value={stakeAmount}
        onChange={(e) => setStakeAmount(e.target.value)}
        placeholder="Enter amount to stake"
        className="w-full p-3 mb-4 rounded-lg border-2 border-purple-500 focus:outline-none focus:border-purple-700"
      />
      {errorMessage && <p className="text-red-500 text-sm mb-4">{errorMessage}</p>}
      <button
        onClick={handleStake}
        className={`w-full p-3 rounded-lg font-bold ${
          loading ? "bg-gray-500" : "bg-purple-600 hover:bg-purple-700"
        } text-white`}
        disabled={loading}
      >
        {loading ? "Staking..." : "Stake"}
      </button>
    </div>
  );
};

export default StakeWithdraw;
