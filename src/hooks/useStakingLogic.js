import { useState, useEffect } from "react";
import { parseUnits, formatUnits, Contract, getAddress } from "ethers";

const useStakingLogic = (stakingContract, signer) => {
  const [stakingBalance, setStakingBalance] = useState("0");
  const [error, setError] = useState(null);

  // Utility function to get user's address safely
  const getUserAddress = async () => {
    try {
      return signer.address || getAddress(await signer.getAddress());
    } catch (err) {
      setError("⚠️ Error getting user address.");
      console.error("Error getting user address:", err.message);
      return null;
    }
  };

  // Fetch staking balance
  const fetchBalance = async () => {
    if (!stakingContract || !signer) {
      console.error("⚠️ Staking contract or signer is not initialized.");
      return;
    }

    try {
      const userAddress = await getUserAddress();
      if (!userAddress) return;

      const balance = await stakingContract.getFunction("balances")(userAddress);
      setStakingBalance(formatUnits(balance, 18)); // Assuming 18 decimals
    } catch (err) {
      console.error("⚠️ Error fetching staking balance:", err.message);
      setError(err.message);
    }
  };

  // Stake tokens
  const handleStake = async (stakeAmount, tokenAddress) => {
    if (!stakingContract || !tokenAddress) {
      throw new Error("Staking contract or token address is missing.");
    }

    const tokenContract = new Contract(
      tokenAddress,
      [
        "function approve(address spender, uint256 amount) public returns (bool)",
        "function allowance(address owner, address spender) public view returns (uint256)",
        "function balanceOf(address owner) public view returns (uint256)",
        "function decimals() public view returns (uint8)",
      ],
      signer
    );

    try {
      const userAddress = await getUserAddress();
      if (!userAddress) return;

      const decimals = await tokenContract.getFunction("decimals")();
      const amountInWei = parseUnits(stakeAmount, decimals);

      const stakingAddress = await stakingContract.getAddress(); // Fix contract address fetching
      const allowance = await tokenContract.getFunction("allowance")(userAddress, stakingAddress);

      if (allowance < amountInWei) {
        const approveTx = await tokenContract.getFunction("approve")(stakingAddress, amountInWei);
        await approveTx.wait();
      }

      const stakeTx = await stakingContract.getFunction("stake")(amountInWei);
      await stakeTx.wait();
    } catch (error) {
      console.error("Error during staking:", error.message);
      setError(error.message);
    }
  };

  // Handle Withdraw STK
  const handleWithdraw = async (withdrawAmount) => {
    try {
      if (!stakingContract || !signer) {
        throw new Error("Staking contract or signer is not initialized.");
      }
      if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
        throw new Error("Enter a valid amount to withdraw.");
      }

      console.log("⏳ Initiating STK withdrawal...");

      // Convert input amount to BigNumber (18 decimals assumed)
      const amountInWei = parseUnits(withdrawAmount, 18);
      const withdrawTx = await stakingContract.getFunction("withdraw")(amountInWei);
      console.log("Withdrawal transaction sent:", withdrawTx.hash);
      await withdrawTx.wait();

      console.log("✅ STK Withdrawal successful!");

      // Refresh staking balance
      const userAddress = await signer.getAddress();
      const updatedBalance = await stakingContract.balances(userAddress);
      setStakingBalance(formatUnits(updatedBalance, 18));
    } catch (error) {
      console.error("⚠️ Error during withdrawal:", error.message);
      setError(error.message || "Error during withdrawal.");
    }
  };

  useEffect(() => {
    fetchBalance();
  }, [stakingContract, signer]);

  // ✅ Fix: Return `handleWithdraw`
  return { stakingBalance, fetchBalance, handleStake, handleWithdraw, error };
};

export default useStakingLogic;
