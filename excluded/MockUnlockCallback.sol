// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@uniswap/v4-core/src/interfaces/callback/IUnlockCallback.sol";
import "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";


contract MockUnlockCallback is IUnlockCallback {
    IPoolManager public immutable poolManager;

    event UnlockCalled(address indexed caller, bytes data);
    event UnlockCallbackCalled(address indexed caller, bytes data);
    event DecodedUnlockData(address caller, uint256 operationType, bytes operationPayload);

    constructor(address _poolManager) {
        poolManager = IPoolManager(_poolManager);
    }

    /// @notice Unlocks the PoolManager before executing liquidity operations
    function unlock(bytes memory operationData) external {
        emit UnlockCalled(msg.sender, operationData);
        poolManager.unlock(operationData);
    }

    /// @notice Implements the real unlockCallback function, decoding and handling operations
    function unlockCallback(bytes calldata data) external override returns (bytes memory) {
        require(msg.sender == address(poolManager), "MockUnlockCallback: Unauthorized caller");

        emit UnlockCallbackCalled(msg.sender, data);

        // **1. Decode the Unlock Data**
        (uint256 operationType, bytes memory operationPayload) = abi.decode(data, (uint256, bytes));

        emit DecodedUnlockData(msg.sender, operationType, operationPayload);

        // **2. Execute the decoded operation**
        if (operationType == 1) {
            // Example: Liquidity addition operation
            _handleLiquidityAddition(operationPayload);
        } else if (operationType == 2) {
            // Example: Swap operation
            _handleSwap(operationPayload);
        } else {
            revert("MockUnlockCallback: Unknown operation type");
        }

        return data;
    }

    /// @dev Mock function to handle liquidity additions
    function _handleLiquidityAddition(bytes memory operationPayload) internal {
        (address token0, address token1, uint256 amount0, uint256 amount1) =
            abi.decode(operationPayload, (address, address, uint256, uint256));

        // Process the liquidity addition (e.g., update internal state, validate balances)
        emit UnlockCalled(token0, abi.encode(amount0, amount1));
    }

    /// @dev Mock function to handle swaps
    function _handleSwap(bytes memory operationPayload) internal {
    (address trader, address tokenIn, address tokenOut, uint256 amountIn, uint256 minAmountOut) =
        abi.decode(operationPayload, (address, address, address, uint256, uint256));

    require(trader != address(0), "Invalid trader address");
    require(tokenIn != address(0) && tokenOut != address(0), "Invalid token addresses");
    require(amountIn > 0, "Swap amount must be greater than zero");

    // 1. Approve PoolManager to spend `amountIn` from `trader`
    IERC20(tokenIn).transferFrom(trader, address(this), amountIn);
    IERC20(tokenIn).approve(address(poolManager), amountIn);

    // 2. Construct the Uniswap V4 swap parameters
    bytes memory swapData = abi.encode(
        tokenIn,
        tokenOut,
        amountIn,
        minAmountOut,
        trader // Receiver of the swapped tokens
    );

    // 3. Execute the swap through PoolManager
    poolManager.swap(swapData);

    emit UnlockCalled(trader, abi.encode(tokenIn, tokenOut, amountIn, minAmountOut));
}

}

