import React, { useEffect, useState } from "react";
import { formatUnits } from "ethers";

const TransactionHistory = ({ stakingContract, signer }) => {
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    const fetchTransactions = async () => {
      if (!stakingContract || !signer) return;

      try {
        const address = await signer.getAddress();
        const stakeFilter = stakingContract.filters.Staked(address);
        const unstakeFilter = stakingContract.filters.Withdrawn(address);
        
        const stakeEvents = await stakingContract.queryFilter(stakeFilter);
        const unstakeEvents = await stakingContract.queryFilter(unstakeFilter);

        const formattedEvents = [
          ...stakeEvents.map((event) => ({
            type: "Stake",
            amount: formatUnits(event.args?.amount || "0", 18), // Convert from wei
            timestamp: new Date(Number(event.args?.timestamp || 0) * 1000).toLocaleString(),
          })),
          ...unstakeEvents.map((event) => ({
            type: "Withdraw",
            amount: formatUnits(event.args?.amount || "0", 18), // Convert from wei
            timestamp: new Date(Number(event.args?.timestamp || 0) * 1000).toLocaleString(),
          })),
        ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)); // Sort transactions by newest first

        setTransactions(formattedEvents);
      } catch (error) {
        console.error("Error fetching transactions:", error.message);
      }
    };

    fetchTransactions();

    stakingContract.on(stakingContract.filters.Staked(), fetchTransactions);
    stakingContract.on(stakingContract.filters.Withdrawn(), fetchTransactions);

    return () => {
      stakingContract.off(stakingContract.filters.Staked(), fetchTransactions);
      stakingContract.off(stakingContract.filters.Withdrawn(), fetchTransactions);
    };
  }, [stakingContract, signer]);

  return (
    <div className="card">
      <h3 className="text-xl font-bold">Transaction History</h3>
      <ul className="mt-4">
        {transactions.length === 0 ? (
          <li>No transactions found.</li>
        ) : (
          transactions.map((tx, index) => (
            <li key={index}>
              {tx.type}: {tx.amount} STK at {tx.timestamp}
            </li>
          ))
        )}
      </ul>
    </div>
  );
};

export default TransactionHistory;