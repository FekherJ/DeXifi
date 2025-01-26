import React, { useState } from "react";
import WalletInfo from "./WalletInfo";
import StakingInfo from "./StakingInfo";
import RewardInfo from "./RewardInfo";
import TransactionHistory from "./TransactionHistory";

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState("stake");

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-gray-900 to-black text-white">
      {/* Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-gradient-to-b from-[#090024] to-[#130045] p-6 text-white shadow-lg">
        <h1 className="text-3xl font-bold text-purple-400 mb-12">Stakely</h1>
        <nav className="space-y-4">
          <button
            onClick={() => setActiveTab("stake")}
            className={`flex items-center gap-4 px-4 py-3 rounded-lg ${
              activeTab === "stake"
                ? "bg-purple-700 text-white"
                : "hover:bg-purple-700 hover:text-white text-gray-400"
            }`}
          >
            🪙 Stake
          </button>
          <button
            onClick={() => setActiveTab("withdraw")}
            className={`flex items-center gap-4 px-4 py-3 rounded-lg ${
              activeTab === "withdraw"
                ? "bg-purple-700 text-white"
                : "hover:bg-purple-700 hover:text-white text-gray-400"
            }`}
          >
            💰 Withdraw
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="flex justify-between items-center p-6 bg-gradient-to-r from-purple-900 to-purple-700 shadow-lg rounded-b-lg">
          <div className="flex items-center gap-6">
            <h2 className="text-3xl font-bold capitalize">{activeTab}</h2>
            <nav className="hidden md:flex gap-4">
              <button className="px-4 py-2 bg-purple-600 rounded-md hover:bg-purple-800">Wrap</button>
              <button className="px-4 py-2 bg-purple-600 rounded-md hover:bg-purple-800">Bridge</button>
            </nav>
          </div>
          <WalletInfo />
        </header>

        {/* Main Content */}
        <main className="p-8 space-y-8">
          {/* Info Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <StakingInfo />
            <RewardInfo />
            <TransactionHistory />
          </div>

          {/* Action Area */}
          <section className="glass p-6 rounded-lg shadow-lg">
            {activeTab === "stake" ? (
              <div>
                <h3 className="text-2xl font-bold text-purple-400">Stake Tokens</h3>
                <div className="mt-4 flex gap-4">
                  <input
                    type="number"
                    placeholder="Enter amount"
                    className="flex-1 px-4 py-2 bg-gray-800 text-white rounded-md focus:ring-2 focus:ring-purple-500"
                  />
                  <button className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-md hover:from-purple-600 hover:to-pink-600">
                    Stake
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <h3 className="text-2xl font-bold text-purple-400">Withdraw Tokens</h3>
                <div className="mt-4 flex gap-4">
                  <input
                    type="number"
                    placeholder="Enter amount"
                    className="flex-1 px-4 py-2 bg-gray-800 text-white rounded-md focus:ring-2 focus:ring-red-500"
                  />
                  <button className="px-6 py-2 bg-gradient-to-r from-red-500 to-orange-500 rounded-md hover:from-red-600 hover:to-orange-600">
                    Withdraw
                  </button>
                </div>
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
