import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';

function Dashboard({ walletBalance, stakingBalance, rewardBalance, apy }) {
    return (
        <div className="glass p-8 mb-8 rounded-lg shadow-lg">
            <h2 className="text-3xl mb-4">📊 User Dashboard</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                    <p>Wallet Balance (ETH):</p>
                    <p className="font-bold text-2xl">{walletBalance}</p>
                </div>
                <div>
                    <p>Staking Balance (STK):</p>
                    <p className="font-bold text-2xl">{stakingBalance}</p>
                </div>
                <div>
                    <p>Reward Balance (RWD):</p>
                    <p className="font-bold text-2xl">{rewardBalance}</p>
                </div>
                <div>
                    <p>APY:</p>
                    <p className="font-bold text-2xl">{apy}</p>
                </div>
            </div>
        </div>
    );
}

export function renderReactDashboard(data) {
    const root = ReactDOM.createRoot(document.getElementById('react-dashboard'));
    root.render(<Dashboard {...data} />);
}
