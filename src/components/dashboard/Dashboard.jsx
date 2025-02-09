import React, { useState, useEffect } from "react";
import WalletInfo from "../common/WalletInfo";
import StakeSection from "../staking/StakeSection";  // ✅ Fixed import path
import SwapForm from "../DEX/SwapForm";  // ✅ Fixed import path
import Sidebar from "../common/Sidebar";
import LiquidityPools from "../liquidity/LiquidityPools";
import { Contract } from "ethers";
import StakingContractABI from "../../../abi/staking_abi.json";


const Dashboard = () => {
  const [signer, setSigner] = useState(null);
  const [stakingContract, setStakingContract] = useState(null);
  const [activeTab, setActiveTab] = useState("staking");

  const STAKING_CONTRACT_ADDRESS = process.env.REACT_APP_STAKING_CONTRACT_ADDRESS;

  useEffect(() => {
    if (!signer) {
      console.warn("Signer not initialized.");
      return;
    }

    try {
      console.log("🔄 Initializing staking contract...");
      const contract = new Contract(
        STAKING_CONTRACT_ADDRESS,
        StakingContractABI,
        signer
      );
      setStakingContract(contract);
      console.log("✅ Staking contract initialized successfully.");
    } catch (error) {
      console.error("⚠️ Error initializing staking contract:", error);
    }
  }, [signer]);

  const renderActiveTab = () => {
    switch (activeTab) {
      case "staking":
        return <StakeSection stakingContract={stakingContract} signer={signer} />;
      case "swap":
        return <SwapForm signer={signer} />;
      case "liquidity":
        return <LiquidityPools />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-[#0d001f] via-[#090027] to-[#1a0033] text-white">
      <Sidebar setActiveSection={setActiveTab} activeSection={activeTab} />

      <div className="flex-grow">
        <header className="flex justify-between items-center px-8 py-6 bg-gradient-to-r from-[#140033] to-[#250050] shadow-lg">
          <h1 className="text-2xl font-bold tracking-wide">Stakely</h1>
          <WalletInfo onWalletConnect={setSigner} />
        </header>

        <main className="p-8">
          {!signer ? (
            <div className="text-center text-red-500">
              <p>⚠️ Please connect your wallet.</p>
            </div>
          ) : renderActiveTab()}
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
