import React, { useState } from "react";
import { Contract, parseUnits } from "ethers";
import SwapABI from "../../../abi/DEXRouter_abi.json";
import { collapseTextChangeRangesAcrossMultipleVersions } from "typescript";

// Import contract address from .env
const SWAP_CONTRACT_ADDRESS = process.env.REACT_APP_DEX_ROUTER_ADDRESS;

// Token Address Map
const tokenAddresses = {
  ETH: process.env.REACT_APP_WETH_ADDRESS, // Replace with the actual token contract address for WETH
  STK: process.env.REACT_APP_STAKING_TOKEN_ADDRESS,  // Replace with the STK token contract address
  RWD: process.env.REACT_APP_REWARD_TOKEN_ADDRESS,   // Replace with the RWD token contract address
};



const SwapForm = ({ signer }) => {
  const [fromToken, setFromToken] = useState("ETH");
  const [toToken, setToToken] = useState("STK");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSwap = async () => {
    if (!signer) {
      setError("⚠️ Please connect your wallet.");
      return;
    }
  
    try {
      setLoading(true);
      setError("");
  
      console.log(`Swapping ${amount} ${fromToken} for ${toToken}`);
  
      const swapContract = new Contract(SWAP_CONTRACT_ADDRESS, SwapABI, signer);

      conseole.log(SwapABI);
  
      // Convert amount to BigNumber (assuming 18 decimals for tokens)
      const amountInWei = parseUnits(amount, 18);
  
      // Get token addresses dynamically
      const fromTokenAddress = tokenAddresses[fromToken];
      const toTokenAddress = tokenAddresses[toToken];
  
      // Ensure token addresses exist
      if (!fromTokenAddress || !toTokenAddress) {
        throw new Error("Invalid token selection.");
      }
  
      console.log(`Using Token Addresses: ${fromTokenAddress} -> ${toTokenAddress}`);

      console.log("SWAP_CONTRACT_ADDRESS:", SWAP_CONTRACT_ADDRESS);
      console.log("Token Addresses:", tokenAddresses);
  
      // Ensure function exists
      if (typeof swapContract.swap !== "function") {
        throw new Error("The swap function is not defined in the contract.");
      }
  
      // Call the swap function correctly based on ABI
      const swapTx = await swapContract.swap(
        amountInWei, 
        fromTokenAddress, 
        toTokenAddress
      );
  
      console.log("Transaction Sent:", swapTx.hash);
      await swapTx.wait();
  
      console.log("✅ Swap Successful!");
    } catch (err) {
      console.error("⚠️ Error swapping tokens:", err.message);
      setError(`❌ Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  

  return (
    <div className="p-6 bg-gray-900 rounded-lg">
      <h2 className="text-2xl font-semibold text-purple-400">Swap Tokens</h2>

      <div className="mt-4">
        <label className="text-gray-300">From:</label>
        <select
          value={fromToken}
          onChange={(e) => setFromToken(e.target.value)}
          className="w-full p-2 mt-2 bg-gray-800 text-white border border-purple-500 rounded-lg"
        >
          <option value="ETH">ETH</option>
          <option value="STK">STK</option>
          <option value="RWD">RWD</option>
        </select>
      </div>

      <div className="mt-4">
        <label className="text-gray-300">To:</label>
        <select
          value={toToken}
          onChange={(e) => setToToken(e.target.value)}
          className="w-full p-2 mt-2 bg-gray-800 text-white border border-purple-500 rounded-lg"
        >
          <option value="ETH">ETH</option>
          <option value="STK">STK</option>
          <option value="RWD">RWD</option>
        </select>
      </div>

      <input
        type="number"
        placeholder="Amount"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        className="w-full p-3 mt-4 text-lg text-white bg-gray-800 border border-purple-500 rounded-lg"
      />

      {error && <p className="text-red-500 text-sm mt-2">{error}</p>}

      <button
        onClick={handleSwap}
        className="w-full mt-4 bg-purple-600 py-3 rounded-lg text-lg font-bold"
        disabled={loading}
      >
        {loading ? "Swapping..." : "Swap"}
      </button>
    </div>
  );
};

export default SwapForm;
