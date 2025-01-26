let provider;
let signer;
let stakingContract;
const sepoliaChainId = 11155111;
const localhostChainId = 31337;


// Contract addresses for different networks
const contractAddresses = {
    //sepolia: '0x56D2caa1B5E42614764a9F1f71D6DbfFd66487a4',
    localhost: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0'    // Replace this address with the actual staking contract address (logged in 1_deploy_staking.js)
    // don't forget to load the abi json :  cp artifacts/contracts/Staking.sol/Staking.json abi/staking_abi.json
};

// Function to show notifications at the bottom-right of the screen
function showNotification(message, type = 'success') {
    const notification = document.getElementById("notification");
    const notificationMessage = document.getElementById("notificationMessage");

    // Set the message and type (success or error)
    notificationMessage.innerText = message;
    notification.classList.remove("hidden");
    
    if (type === 'success') {
        notification.classList.add("success");
        notification.classList.remove("error");
    } else if (type === 'error') {
        notification.classList.add("error");
        notification.classList.remove("success");
    }

    // Display notification with animation
    notification.classList.add("show");

    // Auto-hide after 3 seconds
    setTimeout(() => {
        hideNotification();
    }, 3000);
}

function hideNotification() {
    const notification = document.getElementById("notification");
    notification.classList.remove("show");
}

// Auto-refresh dashboard every 10 seconds
setInterval(async () => {
    if (signer && stakingContract) {
        await updateDashboard();
        //await updateTransactionHistory();
    }
}, 10000); // Updates every 10 seconds


// Function to update connection status on the top-right of the screen
function updateConnectionStatus(address = null) {
    const connectionStatus = document.getElementById("connectionStatus");
    if (connectionStatus) {
        if (address) {
            connectionStatus.innerText = `Connected: ${address}`;
        } else {
            connectionStatus.innerText = "Not connected";
        }
    } else {
        console.error("Connection status element is missing from the DOM.");
    }
}

// Connect to MetaMask and detect network
async function connectWallet() {
    if (typeof window.ethereum !== 'undefined') {
        try {
            await window.ethereum.request({ method: 'eth_requestAccounts' });
            provider = new ethers.providers.Web3Provider(window.ethereum);
            signer = provider.getSigner();

            const address = await signer.getAddress();
            updateConnectionStatus(address);

            const network = await provider.getNetwork();
            console.log(`Connected to network: ${network.chainId}`);

            if (network.chainId === sepoliaChainId) {
                await initializeStakingContract(contractAddresses.sepolia);
            } else if (network.chainId === localhostChainId) {
                await initializeStakingContract(contractAddresses.localhost);
            } else {
                showNotification('Please switch to Sepolia or Localhost (Hardhat).', 'error');
                return;
            }

            updateDashboard();
            await updateTransactionHistory();
        } catch (error) {
            showNotification('Error connecting wallet: ' + error.message, 'error');
        }
    } else {
        showNotification('MetaMask not found. Please install it.', 'error');
    }
}

async function initializeStakingContract(contractAddress) {
    try {
        const stakingAbiJson = await loadStakingABI();
        if (!stakingAbiJson) {
            throw new Error('Failed to load ABI JSON.');
        }
        console.log("Extracted ABI:", stakingAbiJson.abi);
        const stakingAbi = stakingAbiJson.abi;

        if (!Array.isArray(stakingAbi)) {
            throw new Error('Loaded ABI is not a valid array.');
        }

        stakingContract = new ethers.Contract(contractAddress, stakingAbi, signer);
        console.log("Staking contract initialized:", stakingContract);
    } catch (error) {
        console.error('Failed to initialize staking contract:', error);
        showNotification('Failed to initialize staking contract: ' + error.message, 'error');
    }
}




async function updateDashboard() {
    try {
        if (!stakingContract) {
            showNotification("Please connect the wallet to load contract data.", "error");
            return;
        }

        const walletBalance = ethers.utils.formatUnits(await provider.getBalance(await signer.getAddress()), 18) + " ETH";
        const stakingBalance = ethers.utils.formatUnits(await stakingContract.balances(await signer.getAddress()), 18) + " STK";
        const rewardBalance = ethers.utils.formatUnits(await stakingContract.earned(await signer.getAddress()), 18) + " RWD";

        const rewardRate = await stakingContract.rewardRate();
        const totalStaked = await stakingContract.totalSupply();
        const blocksPerYear = (365 * 24 * 60 * 60) / 15;
        const yearlyRewards = rewardRate.mul(blocksPerYear);
        const apy = totalStaked.isZero()
            ? "0.00%"
            : (yearlyRewards.mul(10000).div(totalStaked) / 100).toFixed(2) + "%";

        renderReactDashboard({ walletBalance, stakingBalance, rewardBalance, apy });
    } catch (error) {
        showNotification("Error updating dashboard: " + error.message, "error");
    }
}



// Load the ABI for the staking contract
async function loadStakingABI() {
    try {
        const response = await fetch('./abi/staking_abi.json');
        if (!response.ok) throw new Error(`Failed to fetch staking ABI: ${response.status} ${response.statusText}`);
        const abiJson = await response.json();
        console.log("Loaded Staking ABI JSON:", abiJson); // Log entire JSON object
        if (!abiJson || !Array.isArray(abiJson.abi)) {
            throw new Error("Invalid ABI structure: ABI is not an array.");
        }
        return abiJson;
    } catch (error) {
        console.error("Error loading staking ABI:", error);
        showNotification('Failed to load staking ABI: ' + error.message, 'error');
        return null;
    }
}


// Load the ERC20 ABI for interacting with the staking token
async function loadERC20ABI() {
    try {
        const response = await fetch('./abi/erc20_abi.json');
        if (!response.ok) throw new Error(`Failed to fetch ERC20 ABI: ${response.status} ${response.statusText}`);
        const abi = await response.json();
        return abi;
    } catch (error) {
        showNotification('Failed to load ERC20 ABI: ' + error.message, 'error');
        return null;
    }
}

// Stake tokens
async function stakeTokens() {
    if (!stakingContract) {
        console.error("Staking contract not defined.");
        showNotification("Error: stakingContract is undefined. Please connect your wallet.", "error");
        return;
    }

    const amountToStake = document.getElementById("stakeAmount").value.trim();
    if (!amountToStake || amountToStake === "0") {
        showNotification("Please enter a valid amount to stake.", "error");
        return;
    }

    try {
        const stakeAmountInWei = ethers.utils.parseUnits(amountToStake, 18);

        // Fetch the staking token address
        const stakingTokenAddress = await stakingContract.stakingToken();
        console.log("Staking Token Address:", stakingTokenAddress);

        // Load the ERC20 ABI
        const erc20ABIJson = await loadERC20ABI();
        if (!erc20ABIJson) {
            showNotification("Failed to load ERC20 ABI.", "error");
            return;
        }
        const erc20ABI = erc20ABIJson.abi;

        // Initialize the token contract
        const tokenContract = new ethers.Contract(stakingTokenAddress, erc20ABI, signer);
        console.log("ERC20 Token Contract Initialized:", tokenContract);

        // Log user balances and staking contract address
        const userBalance = await tokenContract.balanceOf(await signer.getAddress());
        console.log("User Token Balance:", ethers.utils.formatUnits(userBalance, 18));
        console.log("Staking Contract Address:", stakingContract.address);

        // Check the allowance
        let allowance = await tokenContract.allowance(await signer.getAddress(), stakingContract.address);
        console.log("Current Allowance:", ethers.utils.formatUnits(allowance, 18));

        // Approve staking contract if allowance is insufficient
        if (allowance.lt(stakeAmountInWei)) {
            try {
                console.log("Testing Approval...");
                await tokenContract.callStatic.approve(stakingContract.address, stakeAmountInWei);
                console.log("Approve callStatic succeeded.");

                console.log("Requesting Approval...");
                const gasEstimate = await tokenContract.estimateGas.approve(stakingContract.address, stakeAmountInWei);
                console.log("Gas Estimate for Approval:", gasEstimate.toString());

                const approvalTx = await tokenContract.approve(stakingContract.address, stakeAmountInWei, {
                    gasLimit: gasEstimate.add(50000), // Add buffer to avoid gas underestimation
                });
                console.log("Approval Transaction Hash:", approvalTx.hash);
                await approvalTx.wait();
                console.log("Approval confirmed.");

                // Check updated allowance
                allowance = await tokenContract.allowance(await signer.getAddress(), stakingContract.address);
                console.log("Updated Allowance:", ethers.utils.formatUnits(allowance, 18));
            } catch (error) {
                console.error("Approval failed:", error.reason || error.message);
                showNotification(`Approval error: ${error.message}`, "error");
                return;
            }
        }

        // Stake tokens
        const tx = await stakingContract.stake(stakeAmountInWei);
        await tx.wait();
        showNotification(`Successfully staked ${amountToStake} tokens!`, "success");
        updateDashboard();
        await updateTransactionHistory();
    } catch (error) {
        console.error("Error during staking process:", error);
        showNotification(`Error staking tokens: ${error.message}`, "error");
    }
}










async function fetchTransactionHistory() {
    if (!stakingContract) {
        console.error('Staking contract not connected.');
        return [];
    }

    const address = await signer.getAddress();
    console.log("Available filters:", stakingContract.filters);

    // Fetch events
    const stakeEvents = await stakingContract.queryFilter(stakingContract.filters.Staked(address));
    const withdrawEvents = await stakingContract.queryFilter(stakingContract.filters.Withdrawn(address));
    const rewardEvents = await stakingContract.queryFilter(stakingContract.filters.RewardPaid(address));

    const history = [...stakeEvents, ...withdrawEvents, ...rewardEvents];
    history.sort((a, b) => a.blockNumber - b.blockNumber);

    // Parse data
    const parsedHistory = await Promise.all(
        history.map(async (event) => {
            const { args, event: eventType, blockNumber } = event;
            if (!args.amount) {
                console.warn(`Event ${eventType} has no amount field.`);
                return null; // Skip invalid events
            }

            const block = await provider.getBlock(blockNumber);
            return {
                type: eventType,
                amount: ethers.utils.formatUnits(args.amount, 18),
                timestamp: new Date(block.timestamp * 1000).toLocaleString(),
            };
        })
    );

    return parsedHistory.filter((entry) => entry !== null); // Remove invalid entries
}




async function updateTransactionHistory() {
    const tableBody = document.getElementById('transactionHistoryTable');
    tableBody.innerHTML = ''; // Clear the table

    const history = await fetchTransactionHistory();

    history.forEach((entry) => {
        const row = document.createElement('tr');
        let typeIcon = '';

        // Add icons based on transaction type
        if (entry.type === 'Staked') {
            typeIcon = '📥'; // Icon for staking
        } else if (entry.type === 'Withdrawn') {
            typeIcon = '📤'; // Icon for withdrawal
        } else if (entry.type === 'RewardPaid') {
            typeIcon = '🎁'; // Icon for rewards
        }

        row.innerHTML = `
            <td class="py-2 px-4">${typeIcon} ${entry.type}</td>
            <td class="py-2 px-4">${entry.amount} STK</td>
            <td class="py-2 px-4">${entry.timestamp}</td>
        `;
        tableBody.appendChild(row);
    });
}








// Stake LP tokens (uses the same STK token contract)
async function stakeLPTokens() {
    if (!stakingContract) {
        showNotification('Error: stakingContract is undefined. Please connect your wallet.', 'error');
        return;
    }

    const amountToStake = document.getElementById('lpStakeAmount').value.trim();
    if (!amountToStake || amountToStake === '0') {
        showNotification('Please enter a valid amount to stake.', 'error');
        return;
    }

    try {
        const stakeAmountInWei = ethers.utils.parseUnits(amountToStake, 18);

        // Reuse the same ERC20 ABI and staking token contract
        const erc20ABI = await loadERC20ABI();
        if (!erc20ABI) return;

        const stakingTokenAddress = await stakingContract.stakingToken();
        const tokenContract = new ethers.Contract(stakingTokenAddress, erc20ABI, signer);

        // Check user token balance
        const balance = await tokenContract.balanceOf(await signer.getAddress());
        console.log("Token Balance:", ethers.utils.formatUnits(balance, 18));

        const userBalance = await tokenContract.balanceOf(await signer.getAddress());
        if (userBalance.lt(stakeAmountInWei)) {
            showNotification("Insufficient tokens for staking.", 'error');
            return;
        }

        const allowance = await tokenContract.allowance(await signer.getAddress(), stakingContract.address);
        if (allowance.lt(stakeAmountInWei)) {
            const approvalTx = await tokenContract.approve(stakingContract.address, stakeAmountInWei);
            await approvalTx.wait();
            console.log("Updated Allowance:", ethers.utils.formatUnits(await tokenContract.allowance(await signer.getAddress(), stakingContract.address), 18));
        }

        const tx = await stakingContract.stakeLP(stakeAmountInWei);
        await tx.wait();
        showNotification(`Successfully staked ${amountToStake} LP tokens!`, 'success');
        updateDashboard();
        await updateTransactionHistory();
    } catch (error) {
        console.error('Error staking LP tokens:', error);
        showNotification(`Error staking LP tokens: ${error.message}`, 'error');
    }
}

// Withdraw tokens
async function withdrawTokens() {
    const amountToWithdraw = document.getElementById("withdrawAmount").value;
    if (!amountToWithdraw) {
        showNotification("Please enter an amount to withdraw.", 'error');
        return;
    }
    
    try {
        const parsedAmount = ethers.utils.parseUnits(amountToWithdraw, 18);
        const tx = await stakingContract.withdraw(parsedAmount);
        await tx.wait();
        showNotification('Tokens withdrawn successfully!', 'success');
        updateDashboard();
        await updateTransactionHistory();
    } catch (error) {
        showNotification(`Error withdrawing tokens: ${error.message}`, 'error');
    }
}

// Function to update the selected reward amount when the slider changes
function updateRewardAmount() {
    const rewardSlider = document.getElementById('rewardSlider');
    const selectedReward = document.getElementById('selectedReward');
    const maxReward = parseFloat(document.getElementById('rewardBalance').innerText.split(' ')[0]);

    if (!isNaN(maxReward) && maxReward > 0) {
        rewardSlider.max = maxReward; // Set slider maximum
        rewardSlider.value = Math.min(rewardSlider.value, maxReward); // Ensure slider value is within bounds
    } else {
        rewardSlider.value = 0; // Default to 0 if maxReward is invalid
    }

    // Update the selected reward display
    selectedReward.innerText = `${rewardSlider.value} RWD`;
}

// Update the claim rewards function to use the slider value
async function claimRewards() {
    try {
        if (!stakingContract) {
            showNotification('Staking contract not connected. Please connect your wallet.', 'error');
            return;
        }

        // Fetch the user's reward balance
        const rewardBalance = await stakingContract.earned(await signer.getAddress());
        if (rewardBalance.isZero()) {
            showNotification('No rewards available to claim.', 'error');
            return;
        }

        console.log("Claiming rewards:", ethers.utils.formatUnits(rewardBalance, 18), "RWD");

        // Claim all rewards
        const tx = await stakingContract.getReward();
        await tx.wait();

        showNotification(`Successfully claimed ${ethers.utils.formatUnits(rewardBalance, 18)} rewards!`, 'success');

        // Update the dashboard and transaction history
        await updateDashboard();
        await updateTransactionHistory();
    } catch (error) {
        console.error('Error claiming rewards:', error);
        showNotification(`Error claiming rewards: ${error.message}`, 'error');
    }
}



async function ClaimAllStakingRewards() {
    try {
        if (!stakingContract) {
            showNotification('Staking contract not connected. Please connect your wallet.', 'error');
            return;
        }

        // Claim all rewards from the contract
        const earned = await stakingContract.earned(await signer.getAddress());
        if (earned.eq(0)) {
            showNotification('No rewards available to claim.', 'error');
            return;
        }

        const tx = await stakingContract.getReward();
        await tx.wait();

        await tx.wait();

        showNotification('All rewards claimed successfully!', 'success');

        // Update dashboard to reflect changes
        await updateDashboard();
        await updateTransactionHistory();
    } catch (error) {
        console.error('Error claiming all rewards:', error);
        showNotification(`Error claiming rewards: ${error.message}`, 'error');
    }
}

function updateSelectedPercentage() {
    const slider = document.getElementById('percentageSlider');
    const percentage = slider.value;

    // Update the displayed percentage
    document.getElementById('selectedPercentage').innerText = percentage + "%";

    // Ensure gradient only covers up to the thumb
    const fillPercentage = (percentage - slider.min) / (slider.max - slider.min) * 100;
    slider.style.background = `linear-gradient(to right, #00b4d8 ${fillPercentage}%, #ccc ${fillPercentage}%)`;
}


// Initialize slider style on load
window.onload = () => {
    const slider = document.getElementById('percentageSlider');
    slider.style.background = `linear-gradient(to right, #00b4d8 0%, #ccc 0%)`;
    slider.value = 10;
    updateSelectedPercentage();
};



// Claim LP rewards
async function claimLPRewards() {
    if (!liquidityContract) {
        showNotification('Error: liquidityContract is undefined. Please connect your wallet.', 'error');
        return;
    }

    try {
        const rewardAmount = document.getElementById('rewardSlider').value;
        if (rewardAmount === '0') {
            showNotification('Please select a valid reward amount to claim.', 'error');
            return;
        }

        const amountInWei = ethers.utils.parseUnits(rewardAmount, 18);
        const tx = await liquidityContract.claimRewards(amountInWei);
        await tx.wait();
        showNotification(`${rewardAmount} RWD claimed successfully!`, 'success');

        // Refresh slider and dashboard
        await updateLPDashboard();
        await updateTransactionHistory();
        await initializeSlider();
    } catch (error) {
        console.error('Error claiming LP rewards:', error);
        showNotification(`Error claiming LP rewards: ${error.message}`, 'error');
    }
}

