import React, { useState, useEffect } from "react";
import useStakingLogic from "../../hooks/useStakingLogic";

const StakeWithdraw = ({ stakingContract, signer, onTransactionComplete }) => {
  const { handleStake } = useStakingLogic(stakingContract, signer);
  const [stakeAmount, setStakeAmount] = useState("");
  const [tokenAddress, setTokenAddress] = useState("");

  useEffect(() => {
    const fetchTokenAddress = async () => {
      if (!stakingContract) return;
      try {
        const address = await stakingContract.getFunction("stakingToken")(); // Fetch token address dynamically
        setTokenAddress(address);
      } catch (error) {
        console.error("Error fetching token address:", error);
      }
    };
    fetchTokenAddress();
  }, [stakingContract]);

  const handleStakeClick = async () => {
    try {
      if (!tokenAddress) {
        console.error("Token address is not available!");
        return;
      }
      console.log(`⏳ Staking ${stakeAmount} tokens...`);
      
      await handleStake(stakeAmount, tokenAddress);
      
      console.log("✅ Staking successful!");
      onTransactionComplete?.();
    } catch (error) {
      console.error("⚠️ Staking Error:", error.message);
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
      <button onClick={handleStakeClick} className="w-full p-3 rounded-lg font-bold bg-purple-600 hover:bg-purple-700 text-white">
        Stake
      </button>
    </div>
  );
};

export default StakeWithdraw;
