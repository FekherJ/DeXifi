import React, { useState, useEffect } from "react";
import WalletInfo from "./WalletInfo";
import StakingInfo from "./StakingInfo";
import RewardInfo from "./RewardInfo";
import TransactionHistory from "./TransactionHistory";
import StakeWithdraw from "./StakeWithdraw";
import { BrowserProvider, Contract } from "ethers";
import StakingContractABI from "../../abi/staking_abi.json";

const Dashboard = () => {
  const [signer, setSigner] = useState(null);
  const [stakingContract, setStakingContract] = useState(null);
  const [activeTab, setActiveTab] = useState("stake");
  const [refreshKey, setRefreshKey] = useState(0); // To force data refresh

  const STAKING_CONTRACT_ADDRESS = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";

  useEffect(() => {
    console.log("🔄 Updated stakingContract state:", stakingContract);
  }, [stakingContract]);

  const handleWalletConnect = async (connectedSigner) => {
    if (!connectedSigner) {
      alert("Invalid signer detected. Please reconnect your wallet.");
      return;
    }

    try {
      console.log("⚡ Initializing staking contract...");
      setSigner(connectedSigner);

      const provider = connectedSigner.provider;
      const network = await provider.getNetwork();
      const expectedChainId = 31337;

      if (Number(network.chainId) !== expectedChainId) {
        throw new Error("Incorrect network. Switch to the expected chain.");
      }

      const stakingContractInstance = new Contract(
        STAKING_CONTRACT_ADDRESS,
        StakingContractABI.abi,
        connectedSigner
      );

      console.log("✅ Staking Contract Initialized:", stakingContractInstance);
      setStakingContract(stakingContractInstance);
    } catch (error) {
      console.error("❌ Error initializing contract:", error);
      alert("Failed to initialize staking contract. Please try again.");
    }
  };

  const refreshData = () => {
    setRefreshKey((prevKey) => prevKey + 1); // Increment to force re-render
  };

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
            <WalletInfo onWalletConnect={handleWalletConnect} />
          </div>
        </header>

        <main className="p-8 space-y-8">
          {stakingContract && signer ? (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <StakingInfo
                  stakingContract={stakingContract}
                  signer={signer}
                  refreshKey={refreshKey}
                />
                <RewardInfo
                  stakingContract={stakingContract}
                  signer={signer}
                  refreshKey={refreshKey}
                />
                <TransactionHistory
                  stakingContract={stakingContract}
                  signer={signer}
                  refreshKey={refreshKey}
                />
              </div>

              <section className="glass p-6 rounded-lg shadow-lg">
                <StakeWithdraw
                  stakingContract={stakingContract}
                  signer={signer}
                  activeTab={activeTab}
                  onTransactionComplete={refreshData} // Call refresh instead of reload
                />
              </section>
            </>
          ) : (
            <p>Please connect your wallet to view staking details.</p>
          )}
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
