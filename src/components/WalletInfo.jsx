import React, { useState } from "react";
import { BrowserProvider, formatEther } from "ethers"; // Updated standalone imports

const WalletInfo = () => {
  const [walletAddress, setWalletAddress] = useState("");
  const [walletBalance, setWalletBalance] = useState("0.000 ETH");

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert("MetaMask is not installed.");
      return;
    }

    try {
      const provider = new BrowserProvider(window.ethereum); // Corrected import
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      const balance = await provider.getBalance(address);

      setWalletAddress(address);
      setWalletBalance(`${formatEther(balance)} ETH`);
    } catch (error) {
      console.error("Error connecting wallet:", error);
    }
  };

  return (
    <div className="p-4 glass rounded-md text-center">
      {walletAddress ? (
        <>
          <p className="truncate text-sm text-gray-400">Connected: {walletAddress}</p>
          <p className="mt-2 text-lg font-bold">Balance: {walletBalance}</p>
        </>
      ) : (
        <button
          className="bg-gradient-to-r from-purple-600 to-pink-500 px-4 py-2 rounded-md hover:from-purple-700 hover:to-pink-600"
          onClick={connectWallet}
        >
          Connect Wallet
        </button>
      )}
    </div>
  );
};

export default WalletInfo;
