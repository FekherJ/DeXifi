import React from "react";
import { BrowserProvider } from "ethers";

const WalletInfo = ({ onWalletConnect }) => {
  const connectWallet = async () => {
    try {
      if (!window.ethereum) throw new Error("MetaMask not detected.");

      const provider = new BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []); 
      const signer = await provider.getSigner(); 
      const address = await signer.getAddress(); 

      console.log("✅ Connected to:", address);
      onWalletConnect(signer);
    } catch (error) {
      console.error("⚠️ Wallet connection failed:", error.message);
    }
  };

  return (
    <button
      className="px-4 py-2 bg-purple-600 text-white rounded"
      onClick={connectWallet}
    >
      Connect Wallet
    </button>
  );
};

export default WalletInfo;
