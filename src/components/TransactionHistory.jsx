import React, { useEffect, useState } from "react";
import { Contract } from "ethers";
import tokenABI from "../../abi/erc20Mock_abi.json";

const tokenAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3"; // Token contract address

const TransactionHistory = ({ stakingContract, signer, refreshKey }) => {
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    const fetchTransactions = async () => {
      if (stakingContract && signer) {
        try {
          const address = await signer.getAddress();

          // Fetch token decimals
          const tokenContract = new Contract(tokenAddress, tokenABI.abi, signer);
          const decimals = await tokenContract.decimals();

          const divisor = BigInt(10) ** BigInt(decimals); // Use BigInt for divisor

          const stakeFilter = stakingContract.filters.Staked(address, null, null);
          const stakeEvents = await stakingContract.queryFilter(stakeFilter);

          const withdrawFilter = stakingContract.filters.Withdrawn(address, null, null);
          const withdrawEvents = await stakingContract.queryFilter(withdrawFilter);

          const rewardFilter = stakingContract.filters.RewardPaid(address, null, null);
          const rewardEvents = await stakingContract.queryFilter(rewardFilter);

          const formattedEvents = [
            ...stakeEvents.map((event) => ({
              type: "Stake",
              amount: (BigInt(event.args.amount) / divisor).toString(), // Convert to token units as string
              timestamp: new Date(Number(event.args.timestamp) * 1000).toLocaleString(),
            })),
            ...withdrawEvents.map((event) => ({
              type: "Withdraw",
              amount: (BigInt(event.args.amount) / divisor).toString(), // Convert to token units as string
              timestamp: new Date(Number(event.args.timestamp) * 1000).toLocaleString(),
            })),
            ...rewardEvents.map((event) => ({
              type: "Reward",
              amount: (BigInt(event.args.reward) / divisor).toString(), // Convert to token units as string
              timestamp: new Date(Number(event.args.timestamp) * 1000).toLocaleString(),
            })),
          ];

          setTransactions(formattedEvents);
        } catch (error) {
          console.error("Error fetching transaction history:", error);
        }
      }
    };

    fetchTransactions();
  }, [stakingContract, signer, refreshKey]); // Trigger on refreshKey changes

  return (
    <div className="glass">
      <h3 className="text-xl font-semibold text-purple-400">Transaction History</h3>
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
