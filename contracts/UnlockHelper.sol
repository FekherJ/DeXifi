// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@uniswap/v4-core/src/interfaces/callback/IUnlockCallback.sol";
import "@uniswap/v4-core/src/PoolManager.sol";

contract UnlockHelper is IUnlockCallback {
    PoolManager public poolManager;

    constructor(address _poolManager) {
        poolManager = PoolManager(_poolManager);
    }

    function unlock(bytes calldata data) external returns (bytes memory result) {
        result = poolManager.unlock(data);
    }

    function unlockCallback(bytes calldata data) external pure override returns (bytes memory) {
        return data;
    }
}
