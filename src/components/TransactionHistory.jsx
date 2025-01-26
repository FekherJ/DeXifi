import React, { useEffect, useState } from "react";

const TransactionHistory = ({ stakingContract, signer }) => {
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    const fetchTransactions = async () => {
      if (stakingContract && signer) {
        try {
          const address = await signer.getAddress();
          const filter = stakingContract.filters.Transfer(address, null);
          const events = await stakingContract.queryFilter(filter);
          const formattedEvents = events.map((event) => ({
            type: event.args[0] === address ? "Withdrawal" : "Deposit",
            amount: event.args[2].toString(),
            timestamp: new Date(event.blockNumber * 1000).toLocaleString(),
          }));
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
