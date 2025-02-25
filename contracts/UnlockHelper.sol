// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import "@uniswap/v4-core/src/interfaces/callback/IUnlockCallback.sol";

contract UnlockHelper is IUnlockCallback {
    IPoolManager public immutable poolManager;

    constructor(address _poolManager) {
        poolManager = IPoolManager(_poolManager);
    }

    function unlock() external {
        // Debug log
        try poolManager.unlock(abi.encode(msg.sender)) {
        } catch {
            revert("Unlock failed");
        }
    }

    // Implementing unlockCallback() to satisfy PoolManager requirements
    function unlockCallback(bytes calldata data) external override returns (bytes memory) {
        require(msg.sender == address(poolManager), "Only PoolManager can call");
        return data;
    }

    function checkIfUnlocked() external view returns (bool) {
    (bool success, bytes memory data) = address(poolManager).staticcall(
        abi.encodeWithSignature("isUnlocked()")
    );
    return success && abi.decode(data, (bool));
}

}
