import React, { useState, useEffect } from "react";
import WalletInfo from "./WalletInfo";
import StakeSection from "./StakeSection";
import AssetList from "./AssetList";
import { Contract } from "ethers";
import StakingContractABI from "../../abi/staking_abi.json";

const Dashboard = () => {
  const [signer, setSigner] = useState(null);
  const [stakingContract, setStakingContract] = useState(null);

  const STAKING_CONTRACT_ADDRESS = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";

  useEffect(() => {
    if (!signer) {
      console.warn("Signer not initialized.");
      return;
    }

    try {
      console.log("🔄 Initializing staking contract...");
      const contract = new Contract(
        STAKING_CONTRACT_ADDRESS,
        StakingContractABI.abi,
        signer
      );
      setStakingContract(contract);
      console.log("✅ Staking contract initialized successfully.");
    } catch (error) {
      console.error("⚠️ Error initializing staking contract:", error);
    }
  }, [signer]);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#0d001f] via-[#090027] to-[#1a0033] text-white">
      <header className="flex justify-between items-center px-8 py-6 bg-gradient-to-r from-[#140033] to-[#250050] shadow-lg">
        <h1 className="text-2xl font-bold tracking-wide">Stakely</h1>
        <WalletInfo onWalletConnect={setSigner} />
      </header>

      <div className="flex flex-grow">
        <aside className="w-72 bg-gradient-to-b from-[#12003a] to-[#1a0055] p-6">
          <AssetList />
        </aside>

        <main className="flex-grow p-8">
          {!signer ? (
            <div className="text-center text-red-500">
              <p>⚠️ Please connect your wallet.</p>
            </div>
          ) : !stakingContract ? (
            <div className="text-center text-yellow-500">
              <p>🔄 Loading staking contract...</p>
            </div>
          ) : (
            <StakeSection stakingContract={stakingContract} signer={signer} />
          )}
        </main>
      </div>
    </div>
  );
};

export default Dashboard;