// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@uniswap/v4-core/src/interfaces/callback/IUnlockCallback.sol";
import "@uniswap/v4-core/src/interfaces/IPoolManager.sol";

contract MockUnlockCallback is IUnlockCallback {
    IPoolManager public immutable poolManager;

    constructor(address _poolManager) {
        poolManager = IPoolManager(_poolManager);
    }

    function unlock() external {
        // Call the PoolManager's unlock function
        poolManager.unlock("");
    }

    function unlockCallback(bytes calldata data) external override returns (bytes memory) {
        require(msg.sender == address(poolManager), "MockUnlockCallback: Unauthorized caller");
        return data;
    }
}
