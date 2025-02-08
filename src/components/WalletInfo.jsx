import React, { useState } from "react";
import { BrowserProvider } from "ethers";

const WalletInfo = ({ onWalletConnect }) => {
  const [walletAddress, setWalletAddress] = useState(null);
  const [dropdownVisible, setDropdownVisible] = useState(false);

  const truncateAddress = (address) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const connectWallet = async () => {
    try {
      if (!window.ethereum) throw new Error("MetaMask not detected.");

      const provider = new BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();

      console.log("✅ Connected to:", address);
      setWalletAddress(address);
      onWalletConnect(signer);
    } catch (error) {
      console.error("⚠️ Wallet connection failed:", error.message);
    }
  };

  const disconnectWallet = () => {
    setWalletAddress(null);
    onWalletConnect(null);
    setDropdownVisible(false);
    console.log("❌ Wallet disconnected.");
  };

  return (
    <div className="relative">
      {walletAddress ? (
        <div
          className="flex items-center px-4 py-2 bg-purple-600 text-white rounded cursor-pointer"
          onClick={() => setDropdownVisible(!dropdownVisible)}
        >
          <div className="mr-2 w-6 h-6 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full"></div>
          <span>{truncateAddress(walletAddress)}</span>
          <span className="ml-2">▼</span>
        </div>
      ) : (
        <button
          className="px-4 py-2 bg-purple-600 text-white rounded"
          onClick={connectWallet}
        >
          Connect Wallet
        </button>
      )}

      {dropdownVisible && (
        <div className="absolute right-0 mt-2 w-48 bg-[#1a0033] text-white rounded shadow-lg">
          <button
            className="w-full text-left px-4 py-2 hover:bg-purple-700 flex items-center"
            onClick={disconnectWallet}
          >
            <span className="mr-2">⏻</span> Disconnect Wallet
          </button>
        </div>
      )}
    </div>
  );
};

export default WalletInfo;
