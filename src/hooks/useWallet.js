import { useState, useEffect } from 'react';
import { ethers } from 'ethers';

export function useWallet() {
    const [walletAddress, setWalletAddress] = useState(null);
    const [provider, setProvider] = useState(null);
    const [signer, setSigner] = useState(null);
    const [error, setError] = useState(null);

    const connectWallet = async () => {
        if (typeof window.ethereum !== 'undefined') {
            try {
                await window.ethereum.request({ method: 'eth_requestAccounts' });
                const ethProvider = new ethers.providers.Web3Provider(window.ethereum);
                const ethSigner = ethProvider.getSigner();
                const address = await ethSigner.getAddress();

                setProvider(ethProvider);
                setSigner(ethSigner);
                setWalletAddress(address);
            } catch (err) {
                setError('Failed to connect wallet: ' + err.message);
            }
        } else {
            setError('MetaMask is not installed.');
        }
    };

    return { walletAddress, provider, signer, connectWallet, error };
}
