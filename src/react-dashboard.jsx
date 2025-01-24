import React, { useEffect, useState } from 'react';
import { useWallet } from '../hooks/useWallet';

function Dashboard() {
    const { walletAddress, provider, signer, connectWallet, error } = useWallet();
    const [dashboardData, setDashboardData] = useState({
        walletBalance: '0.000 ETH',
        stakingBalance: '0.000 STK',
        rewardBalance: '0.000 RWD',
        apy: '0.00%',
    });

    useEffect(() => {
        async function fetchData() {
            if (provider && signer) {
                const address = await signer.getAddress();
                const walletBalance = ethers.utils.formatEther(await provider.getBalance(address)) + ' ETH';

                // Simulate staking and reward balances (replace with actual contract calls)
                const stakingBalance = '5.000 STK'; // Replace with real data
                const rewardBalance = '2.000 RWD'; // Replace with real data
                const apy = '12.34%'; // Replace with real calculation

                setDashboardData({ walletBalance, stakingBalance, rewardBalance, apy });
            }
        }

        fetchData();
    }, [provider, signer]);

    return (
        <div className="dashboard">
            <button onClick={connectWallet}>
                {walletAddress ? `Connected: ${walletAddress}` : 'Connect Wallet'}
            </button>
            {error && <p style={{ color: 'red' }}>{error}</p>}

            <h2>User Dashboard</h2>
            <p>Wallet Balance (ETH): {dashboardData.walletBalance}</p>
            <p>Staking Balance (STK): {dashboardData.stakingBalance}</p>
            <p>Reward Balance (RWD): {dashboardData.rewardBalance}</p>
            <p>APY: {dashboardData.apy}</p>
        </div>
    );
}

export default Dashboard;
