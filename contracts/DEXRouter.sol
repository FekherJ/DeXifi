// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import "@uniswap/v4-core/src/PoolManager.sol";
import "./PriceFeedHook.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeCallback} from "@uniswap/v4-periphery/src/base/SafeCallback.sol";
import {Currency, CurrencyLibrary} from "@uniswap/v4-core/src/types/Currency.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {BalanceDelta} from "@uniswap/v4-core/src/types/BalanceDelta.sol";
import {TickMath} from "@uniswap/v4-core/src/libraries/TickMath.sol";
import {FullMath} from "@uniswap/v4-core/src/libraries/FullMath.sol";
import {FixedPoint96} from "@uniswap/v4-core/src/libraries/FixedPoint96.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./external/permit2/src/interfaces/IPermit2.sol";



library Babylonian {
    function sqrt(uint256 y) internal pure returns (uint256 z) {
        if (y > 3) {
            z = y;
            uint256 x = y / 2 + 1;
            while (x < z) {
                z = x;
                x = (y / x + x) / 2;
            }
        } else if (y != 0) {
            z = 1;
        }
    }
}

contract DEXRouter is SafeCallback {
    using SafeERC20 for IERC20;
    using CurrencyLibrary for Currency;

    uint160 internal constant MIN_SQRT_RATIO = 4295128739;
    uint160 internal constant MAX_SQRT_RATIO = 1461446703485210103287273052203988822378723970342;

    address public weth;
    mapping(address => address) public priceFeeds;
    mapping(address => mapping(address => uint256)) public totalLiquidity;

    event LiquidityAdded(address indexed token0, address indexed token1, address indexed sender, uint256 amount0, uint256 amount1);
    event LiquidityRemoved(address indexed token0, address indexed token1, address indexed sender, uint256 liquidity);
    event SwapExecuted(address indexed token0, address indexed token1, address indexed sender, uint256 amountIn, uint256 amountOut);
    event PoolInitialized(address indexed token0, address indexed token1, uint160 sqrtPriceX96);

    constructor(IPoolManager _poolManager, address _weth) SafeCallback(_poolManager) {
        poolManager = _poolManager;
        weth = _weth;
    }

    function getPriceFeed(address token) external view returns (address) {
        return priceFeeds[token]; 
    }


    function setPriceFeed(address token, address feed) external {
        priceFeeds[token] = feed;
    }

    function getTotalLiquidity(address token0, address token1) public view returns (uint256, uint256) {
        return (totalLiquidity[token0][token1], totalLiquidity[token1][token0]);
    }


    function getLatestPrice(address token) public view returns (uint256) {
        address feedAddress = priceFeeds[token];
        require(feedAddress != address(0), "Price feed not set");
        AggregatorV3Interface feed = AggregatorV3Interface(feedAddress);
        (, int256 answer, , ,) = feed.latestRoundData();
        require(answer > 0, "Invalid price");
        uint8 feedDecimals = feed.decimals();
        return uint256(answer) * (10 ** (18 - feedDecimals));
    }

    function computeSqrtPriceX96(PoolKey memory poolKey) public view returns (uint160 sqrtPriceX96) {
        uint256 price0 = getLatestPrice(Currency.unwrap(poolKey.currency0));
        uint256 price1 = getLatestPrice(Currency.unwrap(poolKey.currency1));
        
        require(price0 > 0 && price1 > 0, "Invalid prices");
        uint256 ratio = FullMath.mulDiv(price1, 1e18, price0);
        uint256 sqrtRatio = Babylonian.sqrt(ratio);
        sqrtPriceX96 = uint160((sqrtRatio * 2**96) / 1e9);
    }


    function initializePoolWithChainlink(PoolKey memory poolKey) external {
        require(priceFeeds[Currency.unwrap(poolKey.currency0)] != address(0), "Price feed for token0 not set");
        require(priceFeeds[Currency.unwrap(poolKey.currency1)] != address(0), "Price feed for token1 not set");

        uint160 sqrtPriceX96 = computeSqrtPriceX96(poolKey);

        if (!_isPoolInitialized(poolKey)) {
            poolManager.initialize(poolKey, sqrtPriceX96);
            emit PoolInitialized(Currency.unwrap(poolKey.currency0), Currency.unwrap(poolKey.currency1), sqrtPriceX96);
        }
    }


  function addLiquidity(
        PoolKey memory poolKey,
        uint256 amount0,
        uint256 amount1,
        int24 tickLower,
        int24 tickUpper,
        bytes32 salt
    ) external {
        require(amount0 > 0 && amount1 > 0, "Invalid amounts");
        address token0 = Currency.unwrap(poolKey.currency0);
        address token1 = Currency.unwrap(poolKey.currency1);

        // Transfer to router and approve PoolManager
        IERC20(token0).safeTransferFrom(msg.sender, address(this), amount0);
        IERC20(token1).safeTransferFrom(msg.sender, address(this), amount1);
        IERC20(token0).approve(address(poolManager), amount0);
        IERC20(token1).approve(address(poolManager), amount1);

        poolManager.unlock(abi.encode(poolKey));

        uint160 sqrtRatioAX96 = TickMath.getSqrtPriceAtTick(tickLower);
        uint160 sqrtRatioBX96 = TickMath.getSqrtPriceAtTick(tickUpper);
        uint160 sqrtPriceX96 = computeSqrtPriceX96(poolKey);

        uint128 liquidity = getLiquidityForAmounts(
            sqrtPriceX96,
            sqrtRatioAX96,
            sqrtRatioBX96,
            amount0,
            amount1
        );

        IPoolManager.ModifyLiquidityParams memory params = IPoolManager.ModifyLiquidityParams({
            tickLower: tickLower,
            tickUpper: tickUpper,
            liquidityDelta: int256(uint256(liquidity)),
            salt: salt
        });

        (BalanceDelta delta, ) = poolManager.modifyLiquidity(poolKey, params, "");
/*
         if (delta.amount0() < 0) {
            poolKey.currency0.settle(
                poolManager,
                address(this),
                uint256(int256(-delta.amount0()))
            );
        }
        if (delta.amount1() < 0) {
            poolKey.currency1.settle(
                poolManager,
                address(this),
                uint256(int256(-delta.amount1()))
            );
        }
*/

    // Add this after modifying liquidity:
    if (delta.amount0() < 0) {
        uint256 amount0 = uint256(int256(-delta.amount0()));
        IERC20(Currency.unwrap(poolKey.currency0)).safeTransfer(
            address(poolManager),
            amount0
        );
    }
    if (delta.amount1() < 0) {
        uint256 amount1 = uint256(int256(-delta.amount1()));
        IERC20(Currency.unwrap(poolKey.currency1)).safeTransfer(
            address(poolManager),
            amount1
        );
    }
        uint256 actualAmount0 = amount0 - (
            delta.amount0() < 0 
                ? uint256(int256(-delta.amount0())) 
                : 0
        );
        uint256 actualAmount1 = amount1 - (
            delta.amount1() < 0 
            ? uint256(int256(-delta.amount1())) 
            : 0
        );

        totalLiquidity[token0][token1] += actualAmount0;
        totalLiquidity[token1][token0] += actualAmount1;
        emit LiquidityAdded(token0, token1, msg.sender, amount0, amount1);
    }



   function swapExactInputSingle(
        PoolKey memory poolKey,
        uint256 amountIn,
        uint256 deadline,
        uint256 maxSlippage
    ) external {
        require(block.timestamp <= deadline, "Expired");
        require(amountIn > 0, "Invalid amount");

        address token0 = Currency.unwrap(poolKey.currency0);
        address token1 = Currency.unwrap(poolKey.currency1);
        bool zeroForOne = token0 < token1;
        address tokenIn = zeroForOne ? token0 : token1;
        
        uint160 sqrtPriceLimitX96 = zeroForOne 
            ? MIN_SQRT_RATIO + 1 
            : MAX_SQRT_RATIO - 1;

        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenIn).approve(address(poolManager), amountIn);

        IPoolManager.SwapParams memory params = IPoolManager.SwapParams({
            zeroForOne: zeroForOne,
            amountSpecified: int256(amountIn),
            sqrtPriceLimitX96: sqrtPriceLimitX96
        });

        BalanceDelta delta = poolManager.swap(poolKey, params, "");

        // Handle output token
        uint256 amountOut = zeroForOne 
            ? uint256(-int256(delta.amount1())) 
            : uint256(-int256(delta.amount0()));
        
        Currency outputCurrency = zeroForOne ? poolKey.currency1 : poolKey.currency0;
        poolManager.take(outputCurrency, msg.sender, amountOut);


        emit SwapExecuted(token0, token1, msg.sender, amountIn, amountOut);
    }


    function removeLiquidity(
        PoolKey memory poolKey,
        uint256 liquidity,
        int24 tickLower,
        int24 tickUpper,
        bytes32 salt
    ) external {
        require(liquidity > 0, "Invalid liquidity");
        require(_isPoolInitialized(poolKey), "Pool not initialized");

        poolManager.unlock(abi.encode(poolKey));

        IPoolManager.ModifyLiquidityParams memory params = IPoolManager.ModifyLiquidityParams({
            tickLower: tickLower,
            tickUpper: tickUpper,
            liquidityDelta: -int256(liquidity),
            salt: salt
        });

        (BalanceDelta delta,) = poolManager.modifyLiquidity(poolKey, params, "");

        // Convert negative deltas to positive amounts
        uint256 amount0 = uint256(int256(-delta.amount0())); // Add int256 cast first
        uint256 amount1 = uint256(int256(-delta.amount1()));

        // Update liquidity tracking
        totalLiquidity[Currency.unwrap(poolKey.currency0)][Currency.unwrap(poolKey.currency1)] = 
            totalLiquidity[Currency.unwrap(poolKey.currency0)][Currency.unwrap(poolKey.currency1)] >= amount0 
            ? totalLiquidity[Currency.unwrap(poolKey.currency0)][Currency.unwrap(poolKey.currency1)] - amount0 
            : 0;
        
        totalLiquidity[Currency.unwrap(poolKey.currency1)][Currency.unwrap(poolKey.currency0)] = 
            totalLiquidity[Currency.unwrap(poolKey.currency1)][Currency.unwrap(poolKey.currency0)] >= amount1 
            ? totalLiquidity[Currency.unwrap(poolKey.currency1)][Currency.unwrap(poolKey.currency0)] - amount1 
            : 0;

        // Transfer tokens to user
        poolManager.take(poolKey.currency0, msg.sender, amount0);
        poolManager.take(poolKey.currency1, msg.sender, amount1);

        emit LiquidityRemoved(
            Currency.unwrap(poolKey.currency0),
            Currency.unwrap(poolKey.currency1),
            msg.sender,
            liquidity
        );
    }

function _unlockCallback(bytes calldata data) internal override returns (bytes memory) {
    require(data.length > 0, "Invalid unlockCallback data");

    (PoolKey memory poolKey, uint160 sqrtPriceX96) = abi.decode(data, (PoolKey, uint160));
    require(Currency.unwrap(poolKey.currency0) != address(0), "Invalid poolKey");


    return data;
}




function _isPoolInitialized(PoolKey memory poolKey) internal view returns (bool) {
    (uint256 liquidity0, uint256 liquidity1) = getTotalLiquidity(
        Currency.unwrap(poolKey.currency0), 
        Currency.unwrap(poolKey.currency1)
    );
    return liquidity0 > 0 || liquidity1 > 0;
}

// Replicates Uniswap v3's LiquidityAmounts.getLiquidityForAmounts
function getLiquidityForAmounts(
    uint160 sqrtPriceX96,
    uint160 sqrtRatioAX96,
    uint160 sqrtRatioBX96,
    uint256 amount0,
    uint256 amount1
) public pure returns (uint128 liquidity) {
    if (sqrtRatioAX96 > sqrtRatioBX96) {
        (sqrtRatioAX96, sqrtRatioBX96) = (sqrtRatioBX96, sqrtRatioAX96);
    }

    if (sqrtPriceX96 <= sqrtRatioAX96) {
        liquidity = _getLiquidityForAmount0(sqrtRatioAX96, sqrtRatioBX96, amount0);
    } else if (sqrtPriceX96 < sqrtRatioBX96) {
        uint128 liquidity0 = _getLiquidityForAmount0(sqrtPriceX96, sqrtRatioBX96, amount0);
        uint128 liquidity1 = _getLiquidityForAmount1(sqrtRatioAX96, sqrtPriceX96, amount1);
        liquidity = liquidity0 < liquidity1 ? liquidity0 : liquidity1;
    } else {
        liquidity = _getLiquidityForAmount1(sqrtRatioAX96, sqrtRatioBX96, amount1);
    }
}

function _getLiquidityForAmount0(
    uint160 sqrtRatioAX96,
    uint160 sqrtRatioBX96,
    uint256 amount0
) internal pure returns (uint128) {
    if (sqrtRatioAX96 > sqrtRatioBX96) {
        (sqrtRatioAX96, sqrtRatioBX96) = (sqrtRatioBX96, sqrtRatioAX96);
    }
    uint256 intermediate = FullMath.mulDiv(sqrtRatioAX96, sqrtRatioBX96, FixedPoint96.Q96);
    return uint128(FullMath.mulDiv(amount0, intermediate, sqrtRatioBX96 - sqrtRatioAX96));
}

function _getLiquidityForAmount1(
    uint160 sqrtRatioAX96,
    uint160 sqrtRatioBX96,
    uint256 amount1
) internal pure returns (uint128) {
    if (sqrtRatioAX96 > sqrtRatioBX96) {
        (sqrtRatioAX96, sqrtRatioBX96) = (sqrtRatioBX96, sqrtRatioAX96);
    }
    return uint128(FullMath.mulDiv(amount1, FixedPoint96.Q96, sqrtRatioBX96 - sqrtRatioAX96));
}

}
