// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

import "./PriceFeedHook.sol";

contract MockPriceFeedHook is PriceFeedHook {
    
    constructor(address _poolManager) PriceFeedHook(_poolManager) {}

    function beforeInitialize(address, PoolKey calldata, uint160) external pure override returns (bytes4) {
        return IHooks.beforeInitialize.selector;
    }

    function afterInitialize(address, PoolKey calldata, uint160, int24) external pure override returns (bytes4) {
        return IHooks.afterInitialize.selector;
    }

    function beforeAddLiquidity(address, PoolKey calldata, IPoolManager.ModifyLiquidityParams calldata, bytes calldata)
        external pure override returns (bytes4)
    {
        return IHooks.beforeAddLiquidity.selector;
    }

    function afterAddLiquidity(
        address,
        PoolKey calldata,
        IPoolManager.ModifyLiquidityParams calldata,
        BalanceDelta,
        BalanceDelta,
        bytes calldata
    ) external pure override returns (bytes4, BalanceDelta)
    {
        return (IHooks.afterAddLiquidity.selector, BalanceDelta.wrap(0));
    }

    function beforeSwap(address, PoolKey calldata, IPoolManager.SwapParams calldata, bytes calldata)
        external pure override returns (bytes4, BeforeSwapDelta, uint24)
    {
        BeforeSwapDelta delta = BeforeSwapDelta.wrap(0);
        return (IHooks.beforeSwap.selector, delta, 0);
    }

    function afterSwap(address, PoolKey calldata, IPoolManager.SwapParams calldata, BalanceDelta, bytes calldata)
        external pure override returns (bytes4, int128)
    {
        return (IHooks.afterSwap.selector, 0);
    }

    function beforeDonate(address, PoolKey calldata, uint256, uint256, bytes calldata)
        external pure override returns (bytes4)
    {
        return IHooks.beforeDonate.selector;
    }

    function afterDonate(address, PoolKey calldata, uint256, uint256, bytes calldata)
        external pure override returns (bytes4)
    {
        return IHooks.afterDonate.selector;
    }

      // **Adding the missing functions**
    function beforeRemoveLiquidity(
        address,
        PoolKey calldata,
        IPoolManager.ModifyLiquidityParams calldata,
        bytes calldata
    ) external pure override returns (bytes4) {
        return IHooks.beforeRemoveLiquidity.selector;
    }

    function afterRemoveLiquidity(
    address sender,
    PoolKey calldata key,
    IPoolManager.ModifyLiquidityParams calldata params,
    BalanceDelta delta,
    BalanceDelta feesAccrued,
    bytes calldata hookData
    ) external pure override returns (bytes4, BalanceDelta) {
        return (IHooks.afterRemoveLiquidity.selector, BalanceDelta.wrap(0));

    }


}
