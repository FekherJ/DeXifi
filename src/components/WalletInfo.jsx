import React, { useState } from "react";
import { BrowserProvider, formatEther } from "ethers";

const WalletInfo = ({ onWalletConnect }) => {
  const [walletAddress, setWalletAddress] = useState("");
  const [walletBalance, setWalletBalance] = useState("0.000 ETH");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert("MetaMask is not installed.");
      return;
    }
  
    try {
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      const balance = await provider.getBalance(address);
  
      if (!signer || !address) {
        throw new Error("Failed to retrieve wallet signer or address.");
      }
  
      setWalletAddress(address);
      setWalletBalance(`${formatEther(balance)} ETH`);
  
      // Pass signer to parent
      if (onWalletConnect) onWalletConnect(signer);
    } catch (error) {
      console.error("Error connecting wallet:", error);
      alert("Failed to connect wallet. Please try again.");
    }
  };
  

  const disconnectWallet = () => {
    setWalletAddress("");
    setWalletBalance("0.000 ETH");
    setIsDropdownOpen(false);
  };

  return (
    <div className="relative">
      {walletAddress ? (
        <div
          className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-blue-500 text-white px-4 py-2 rounded-full cursor-pointer hover:opacity-90"
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        >
          <span className="text-sm font-medium">
            {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
          </span>
          <span className="text-sm">{walletBalance}</span>

          {isDropdownOpen && (
            <div className="absolute top-12 right-0 bg-gray-800 text-white rounded-lg shadow-lg py-2">
              <button
                className="block px-4 py-2 hover:bg-gray-700 w-full text-left"
                onClick={disconnectWallet}
              >
                Disconnect Wallet
              </button>
            </div>
          )}
        </div>
      ) : (
        <button
          className="bg-gradient-to-r from-purple-600 to-blue-500 px-6 py-2 text-white rounded-full hover:from-purple-700 hover:to-blue-600"
          onClick={connectWallet}
        >
          Connect Wallet
        </button>
      )}
    </div>
  );
};

export default WalletInfo;
