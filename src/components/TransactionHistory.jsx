import React, { useEffect, useState } from "react";

const TransactionHistory = ({ stakingContract, signer }) => {
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    const fetchTransactions = async () => {
      if (stakingContract && signer) {
        try {
          const address = await signer.getAddress();
    
          // Fetch Staked events
          const stakeFilter = stakingContract.filters.Staked(address, null, null);
          const stakeEvents = await stakingContract.queryFilter(stakeFilter);
    
          // Fetch Withdrawn events
          const withdrawFilter = stakingContract.filters.Withdrawn(address, null, null);
          const withdrawEvents = await stakingContract.queryFilter(withdrawFilter);
    
          // Fetch RewardPaid events (optional)
          const rewardFilter = stakingContract.filters.RewardPaid(address, null, null);
          const rewardEvents = await stakingContract.queryFilter(rewardFilter);
    
          // Combine and format events
          const formattedEvents = [
            ...stakeEvents.map(event => ({
              type: "Stake",
              amount: event.args.amount.toString(),
              timestamp: new Date(event.args.timestamp * 1000).toLocaleString(),
            })),
            ...withdrawEvents.map(event => ({
              type: "Withdraw",
              amount: event.args.amount.toString(),
              timestamp: new Date(event.args.timestamp * 1000).toLocaleString(),
            })),
            ...rewardEvents.map(event => ({
              type: "Reward",
              amount: event.args.reward.toString(),
              timestamp: new Date(event.args.timestamp * 1000).toLocaleString(),
            })),
          ];
    
          setTransactions(formattedEvents);
        } catch (error) {
          console.error("Error fetching transaction history:", error);
        }
      }
    };
    

    fetchTransactions();
  }, [stakingContract, signer]);

  return (
    <div className="glass">
      <h3 className="text-xl font-semibold text-purple-400">
        Transaction History
      </h3>
      <table className="transaction-table w-full mt-4">
        <thead>
          <tr>
            <th>Type</th>
            <th>Amount</th>
            <th>Timestamp</th>
          </tr>
        </thead>
        <tbody>
          {transactions.length === 0 ? (
            <tr>
              <td colSpan="3" className="text-center text-gray-500">
                No transactions found.
              </td>
            </tr>
          ) : (
            transactions.map((tx, index) => (
              <tr key={index}>
                <td>{tx.type}</td>
                <td>{tx.amount}</td>
                <td>{tx.timestamp}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default TransactionHistory;
