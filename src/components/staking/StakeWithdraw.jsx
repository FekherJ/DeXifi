import React, { useState, useEffect } from "react";
import { parseUnits, Contract, parseEther, parseUnits } from "ethers";


const StakeWithdraw = ({ stakingContract, signer, activeTab, onTransactionComplete }) => {
  const [stakeAmount, setStakeAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [tokenAddress, setTokenAddress] = useState("");
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
  
      // Create the token contract instance
      const tokenContract = new Contract(
        tokenAddress,
        [
          "function approve(address spender, uint256 amount) public returns (bool)",
          "function allowance(address owner, address spender) public view returns (uint256)",
          "function balanceOf(address owner) public view returns (uint256)",
          "function decimals() public view returns (uint8)",
        ],
        signer
      );
  
      // Fetch token decimals
      const decimals = await tokenContract.decimals();
      const amountInWei = parseUnits(stakeAmount, decimals); // Convert the amount to Wei using decimals
      console.log("Stake Amount (in Wei):", amountInWei.toString());
  
      // Get the token balance
      const tokenBalance = await tokenContract.balanceOf(await signer.getAddress());
      console.log("Token Balance (in Wei):", tokenBalance.toString());
      if (tokenBalance < amountInWei) {
        throw new Error("Insufficient token balance for staking.");
      }
  
      // Fetch allowance
      const stakingAddress = await stakingContract.getAddress();
      const allowance = await tokenContract.allowance(await signer.getAddress(), stakingAddress);
      console.log("Current Allowance (in Wei):", allowance.toString());
  
      // Approve tokens if allowance is insufficient
      if (allowance < amountInWei) {
        console.log("Allowance insufficient! Approving tokens...");
        const approveTx = await tokenContract.approve(stakingAddress, amountInWei);
        console.log("Approval Transaction Sent:", approveTx.hash);
        await approveTx.wait();
        console.log("Approval Confirmed");
      }
  
      // Stake tokens
      const stakeTx = await stakingContract.stake(amountInWei);
      console.log("Stake Transaction Sent:", stakeTx.hash);
      await stakeTx.wait();
      console.log("Stake Confirmed");
  
      onTransactionComplete?.(); // Refresh data after staking

   
    } catch (error) {
      console.error("Error during staking:", error);
      setErrorMessage(error.error?.message || error.message || "Error during staking.");
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