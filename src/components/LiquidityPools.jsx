import React, { useState } from "react";

const LiquidityPools = () => {
  const [tokenA, setTokenA] = useState("ETH");
  const [tokenB, setTokenB] = useState("STK");
  const [amountA, setAmountA] = useState("");
  const [amountB, setAmountB] = useState("");

  const handleAddLiquidity = () => {
    console.log(`Providing ${amountA} ${tokenA} and ${amountB} ${tokenB}`);
  };

  return (
    <div className="p-6 bg-gray-900 rounded-lg">
      <h2 className="text-2xl font-semibold text-purple-400">Liquidity Pools</h2>
      <div className="mt-4">
        <label className="text-gray-300">Token A:</label>
        <select
          value={tokenA}
          onChange={(e) => setTokenA(e.target.value)}
          className="w-full p-2 mt-2 bg-gray-800 text-white border border-purple-500 rounded-lg"
        >
          <option value="ETH">ETH</option>
          <option value="STK">STK</option>
        </select>
      </div>

      <input
        type="number"
        placeholder="Amount A"
        value={amountA}
        onChange={(e) => setAmountA(e.target.value)}
        className="w-full p-3 mt-4 text-lg text-white bg-gray-800 border border-purple-500 rounded-lg"
      />

      <button
        onClick={handleAddLiquidity}
        className="w-full mt-4 bg-purple-600 py-3 rounded-lg text-lg font-bold"
      >
        Add Liquidity
      </button>
    </div>
  );
};

export default LiquidityPools;
