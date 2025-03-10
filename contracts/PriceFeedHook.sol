// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

import "@uniswap/v4-core/src/interfaces/IHooks.sol";
import "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

abstract contract PriceFeedHook is IHooks {
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

    // ✅ Ensure all required functions from IHooks are implemented
    function beforeInitialize(address, PoolKey calldata, uint160) external virtual override returns (bytes4) {
        return IHooks.beforeInitialize.selector;
    }

    function afterInitialize(address, PoolKey calldata, uint160, int24) external virtual override returns (bytes4) {
        return IHooks.afterInitialize.selector;
    }

    function beforeAddLiquidity(
        address,
        PoolKey calldata,
        IPoolManager.ModifyLiquidityParams calldata,
        bytes calldata
    ) external virtual override returns (bytes4) {
        return IHooks.beforeAddLiquidity.selector;
    }

    function afterAddLiquidity(
        address,
        PoolKey calldata,
        IPoolManager.ModifyLiquidityParams calldata,
        BalanceDelta,
        BalanceDelta,
        bytes calldata
    ) external virtual override returns (bytes4, BalanceDelta) {
        return (IHooks.afterAddLiquidity.selector, BalanceDelta.wrap(0));
    }

    function beforeSwap(
        address,
        PoolKey calldata,
        IPoolManager.SwapParams calldata,
        bytes calldata
    ) external virtual override returns (bytes4, BeforeSwapDelta, uint24) {
        BeforeSwapDelta delta = BeforeSwapDelta.wrap(0);
        return (IHooks.beforeSwap.selector, delta, 0);
    }

    function afterSwap(
        address,
        PoolKey calldata,
        IPoolManager.SwapParams calldata,
        BalanceDelta,
        bytes calldata
    ) external virtual override returns (bytes4, int128) {
        return (IHooks.afterSwap.selector, 0);
    }

    function beforeDonate(
        address,
        PoolKey calldata,
        uint256,
        uint256,
        bytes calldata
    ) external virtual override returns (bytes4) {
        return IHooks.beforeDonate.selector;
    }

    function afterDonate(
        address,
        PoolKey calldata,
        uint256,
        uint256,
        bytes calldata
    ) external virtual override returns (bytes4) {
        return IHooks.afterDonate.selector;
    }
}
