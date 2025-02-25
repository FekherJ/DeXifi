// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@uniswap/v4-core/src/interfaces/callback/IUnlockCallback.sol";
import "@uniswap/v4-core/src/PoolManager.sol";

contract MockUnlockCallback is IUnlockCallback {
    PoolManager public poolManager;

    constructor(address _poolManager) {
        poolManager = PoolManager(_poolManager);
    }

    function unlockCallback(bytes calldata data) external override returns (bytes memory) {
        return data; // Just return the provided data
    }

    function unlock(bytes calldata data) external {
        poolManager.unlock(data);
    }
}
