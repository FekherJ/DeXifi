import React, { useState } from "react";

const SwapSection = () => {
  const [fromToken, setFromToken] = useState("ETH");
  const [toToken, setToToken] = useState("STK");
  const [amount, setAmount] = useState("");

  const handleSwap = () => {
    console.log(`Swapping ${amount} ${fromToken} for ${toToken}`);
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

      <button
        onClick={handleSwap}
        className="w-full mt-4 bg-purple-600 py-3 rounded-lg text-lg font-bold"
      >
        Swap
      </button>
    </div>
  );
};

export default SwapSection;