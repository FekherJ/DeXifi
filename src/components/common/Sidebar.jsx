import React from "react";

const Sidebar = ({ setActiveSection, activeSection }) => {
  return (
    <div className="w-64 bg-gray-800 p-6">
      <h1 className="text-2xl font-bold text-purple-400">Stakely</h1>
      <ul className="mt-6 space-y-4">
        <li
          className={`cursor-pointer p-2 rounded transition ${
            activeSection === "staking" ? "bg-purple-700 text-white" : "hover:bg-purple-600"
          }`}
          onClick={() => setActiveSection("staking")}
        >
          🏦 Staking
        </li>
        <li
          className={`cursor-pointer p-2 rounded transition ${
            activeSection === "swap" ? "bg-purple-700 text-white" : "hover:bg-purple-600"
          }`}
          onClick={() => setActiveSection("swap")}
        >
          🔄 Swap
        </li>
        <li
          className={`cursor-pointer p-2 rounded transition ${
            activeSection === "liquidity" ? "bg-purple-700 text-white" : "hover:bg-purple-600"
          }`}
          onClick={() => setActiveSection("liquidity")}
        >
          💧 Liquidity Pools
        </li>
      </ul>
    </div>
  );
};

export default Sidebar;
