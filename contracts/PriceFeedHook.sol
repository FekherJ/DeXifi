// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

import "@uniswap/v4-core/src/interfaces/IHooks.sol";
import "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

contract PriceFeedHook is IHooks {
    IPoolManager public immutable poolManager;
    mapping(address => AggregatorV3Interface) public priceFeeds;

    event PriceChecked(address indexed tokenA, address indexed tokenB, uint256 priceA, uint256 priceB);

    constructor(address _poolManager) {
        poolManager = IPoolManager(_poolManager);
    }

    function setPriceFeed(address token, address priceFeed) external {
        priceFeeds[token] = AggregatorV3Interface(priceFeed);
    }

    function getLatestPrice(address token) public view returns (uint256) {
        AggregatorV3Interface priceFeed = priceFeeds[token];
        require(address(priceFeed) != address(0), "No price feed for token");

        (, int256 price, , , ) = priceFeed.latestRoundData();
        require(price > 0, "Invalid price");

        return uint256(price);
    }

    // ✅ Implement all required functions from IHooks

    function beforeInitialize(address sender, PoolKey calldata key, uint160 sqrtPriceX96) 
        external override returns (bytes4) 
    {
        return IHooks.beforeInitialize.selector;
    }

    function afterInitialize(address sender, PoolKey calldata key, uint160 sqrtPriceX96, int24 tick) 
        external override returns (bytes4) 
    {
        return IHooks.afterInitialize.selector;
    }

    function beforeAddLiquidity(
        address sender,
        PoolKey calldata key,
        IPoolManager.ModifyLiquidityParams calldata params,
        bytes calldata hookData
    ) external override returns (bytes4) 
    {
        return IHooks.beforeAddLiquidity.selector;
    }

    function afterAddLiquidity(
        address sender,
        PoolKey calldata key,
        IPoolManager.ModifyLiquidityParams calldata params,
        BalanceDelta delta,
        BalanceDelta feesAccrued,
        bytes calldata hookData
    ) external override returns (bytes4, BalanceDelta) 
    {
        return (IHooks.afterAddLiquidity.selector, delta);
    }

    function beforeRemoveLiquidity(
        address sender,
        PoolKey calldata key,
        IPoolManager.ModifyLiquidityParams calldata params,
        bytes calldata hookData
    ) external override returns (bytes4) 
    {
        return IHooks.beforeRemoveLiquidity.selector;
    }

    function afterRemoveLiquidity(
        address sender,
        PoolKey calldata key,
        IPoolManager.ModifyLiquidityParams calldata params,
        BalanceDelta delta,
        BalanceDelta feesAccrued,
        bytes calldata hookData
    ) external override returns (bytes4, BalanceDelta) 
    {
        return (IHooks.afterRemoveLiquidity.selector, delta);
    }

    function beforeSwap(
        address sender,
        PoolKey calldata key,
        IPoolManager.SwapParams calldata params,
        bytes calldata hookData
    ) external override returns (bytes4, BeforeSwapDelta, uint24) 
    {
        BeforeSwapDelta delta = BeforeSwapDelta.wrap(0);
        return (IHooks.beforeSwap.selector, delta, 0);



        
    }

    function afterSwap(
        address sender,
        PoolKey calldata key,
        IPoolManager.SwapParams calldata params,
        BalanceDelta delta,
        bytes calldata hookData
    ) external override returns (bytes4, int128) 
    {
        return (IHooks.afterSwap.selector, 0);
    }

    function beforeDonate(
        address sender,
        PoolKey calldata key,
        uint256 amount0,
        uint256 amount1,
        bytes calldata hookData
    ) external override returns (bytes4) 
    {
        return IHooks.beforeDonate.selector;
    }

    function afterDonate(
        address sender,
        PoolKey calldata key,
        uint256 amount0,
        uint256 amount1,
        bytes calldata hookData
    ) external override returns (bytes4) 
    {
        return IHooks.afterDonate.selector;
    }
}
