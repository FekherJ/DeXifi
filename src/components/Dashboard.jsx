import React, { useState, useEffect } from "react";
import WalletInfo from "./WalletInfo";
import StakingInfo from "./StakingInfo";
import RewardInfo from "./RewardInfo";
import TransactionHistory from "./TransactionHistory";
import StakeWithdraw from "./StakeWithdraw";
import { ethers } from "ethers";

const Dashboard = ({ stakingContract, signer }) => {
  const [activeTab, setActiveTab] = useState("stake");
  const [stakingBalance, setStakingBalance] = useState("0.000 STK");
  const [rewardBalance, setRewardBalance] = useState("0.000 RWD");
  const [walletBalance, setWalletBalance] = useState("0.000 ETH");
  const [apy, setApy] = useState("0.00%");
  const [loading, setLoading] = useState(true);

  // Fetch balances and APY
  const fetchBalances = async () => {
    if (!stakingContract || !signer) {
      console.error("stakingContract or signer is missing!");
      setLoading(false);
      return;
    }

    try {
      const address = await signer.getAddress();
      const walletBal = await signer.getBalance();
      const stakingBal = await stakingContract.balanceOf(address);
      const rewards = await stakingContract.earned(address);
      const rewardRate = await stakingContract.rewardRate();
      const totalStaked = await stakingContract.totalSupply();
      const blocksPerYear = (365 * 24 * 60 * 60) / 15; // Assuming 15s block time
      const yearlyRewards = rewardRate.mul(blocksPerYear);

      setWalletBalance(`${ethers.utils.formatUnits(walletBal, 18)} ETH`);
      setStakingBalance(`${ethers.utils.formatUnits(stakingBal, 18)} STK`);
      setRewardBalance(`${ethers.utils.formatUnits(rewards, 18)} RWD`);
      setApy(
        totalStaked.isZero()
          ? "0.00%"
          : (yearlyRewards.mul(10000).div(totalStaked) / 100).toFixed(2) + "%"
      );
    } catch (error) {
      console.error("Error fetching balances:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBalances();
  }, [stakingContract, signer]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-gray-900 to-black text-white">
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

      <div className="flex-1 flex flex-col">
        <header className="flex justify-between items-center p-6 bg-gradient-to-r from-purple-900 to-purple-700 shadow-lg rounded-b-lg">
          <div className="flex items-center gap-6">
            <h2 className="text-3xl font-bold capitalize">{activeTab}</h2>
          </div>
          <div className="absolute top-6 right-6">
            <WalletInfo />
          </div>
        </header>

        <main className="p-8 space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <StakingInfo
              stakingBalance={stakingBalance}
              apy={apy}
              loading={loading}
            />
            <RewardInfo
              rewardBalance={rewardBalance}
              loading={loading}
              stakingContract={stakingContract}
            />
            <TransactionHistory stakingContract={stakingContract} signer={signer} />
          </div>

          {/* StakeWithdraw Section */}
          <section className="glass p-6 rounded-lg shadow-lg">
            <StakeWithdraw
              stakingContract={stakingContract}
              signer={signer}
              activeTab={activeTab}
              onTransactionComplete={fetchBalances}
            />
          </section>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
