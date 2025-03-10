// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import "./PriceFeedHook.sol"; 
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeCallback } from "@uniswap/v4-periphery/src/base/SafeCallback.sol"; 
import { Currency } from "@uniswap/v4-core/src/types/Currency.sol";
import { PoolKey } from "@uniswap/v4-core/src/types/PoolKey.sol";
import { Actions } from "@uniswap/v4-periphery/src/libraries/Actions.sol";
import { TickMath } from "@uniswap/v4-core/src/libraries/TickMath.sol"; 
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./external/permit2/src/interfaces/IPermit2.sol";

// Babylonian Library for sqrt calculations
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

    address public weth;
    mapping(address => address) public priceFeeds;

    event LiquidityAdded(address indexed token0, address indexed token1, address indexed sender, uint256 amount0, uint256 amount1);
    event LiquidityRemoved(address indexed token0, address indexed token1, address indexed sender, uint256 liquidity);
    event SwapExecuted(address indexed token0, address indexed token1, address indexed sender, uint256 amountIn, uint256 amountOut);

    constructor(IPoolManager _poolManager, address _weth) SafeCallback(_poolManager) {
        poolManager = _poolManager;
        weth = _weth;
    }

    function setPriceFeed(address token, address feed) external {
        priceFeeds[token] = feed;
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

        int24 tick = TickMath.getTickAtSqrtPrice(uint160((price1 * 1e18) / price0));
        return TickMath.getSqrtPriceAtTick(tick);
    }

    function initializePoolWithChainlink(PoolKey memory poolKey) external {
        require(priceFeeds[Currency.unwrap(poolKey.currency0)] != address(0), "Price feed for token0 not set");
        require(priceFeeds[Currency.unwrap(poolKey.currency1)] != address(0), "Price feed for token1 not set");

        uint160 sqrtPriceX96 = computeSqrtPriceX96(poolKey);
        bytes memory unlockData = abi.encode(poolKey, sqrtPriceX96);
        poolManager.unlock(unlockData);
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

        // Define liquidity parameters
        IPoolManager.ModifyLiquidityParams memory params = IPoolManager.ModifyLiquidityParams({
            tickLower: tickLower,
            tickUpper: tickUpper,
            liquidityDelta: int256(amount0),
            salt: salt
        });

        // Securely transfer tokens to PoolManager using SafeERC20
        IERC20(Currency.unwrap(poolKey.currency0)).safeTransferFrom(msg.sender, address(poolManager), amount0);
        IERC20(Currency.unwrap(poolKey.currency1)).safeTransferFrom(msg.sender, address(poolManager), amount1);

        poolManager.modifyLiquidity(poolKey, params, "");

        emit LiquidityAdded(
            Currency.unwrap(poolKey.currency0),
            Currency.unwrap(poolKey.currency1),
            msg.sender,
            amount0,
            amount1
        );
    }

    function swapExactInputSingle(
        PoolKey memory poolKey,
        uint256 amountIn,
        uint256 deadline,
        uint256 maxSlippage
    ) external {
        require(block.timestamp <= deadline, "Transaction expired");
        require(amountIn > 0, "Invalid swap amount");

        // Define swap parameters
        uint160 basePrice = computeSqrtPriceX96(poolKey);
        uint160 adjustedPrice = uint160(uint256(basePrice) * (100 + maxSlippage) / 100);

        IPoolManager.SwapParams memory swapParams = IPoolManager.SwapParams({
            zeroForOne: Currency.unwrap(poolKey.currency0) < Currency.unwrap(poolKey.currency1),
            amountSpecified: int256(amountIn),
            sqrtPriceLimitX96: adjustedPrice
        });

        IERC20(Currency.unwrap(poolKey.currency0)).safeTransferFrom(msg.sender, address(poolManager), amountIn);

        BalanceDelta swapDelta = poolManager.swap(poolKey, swapParams, "");

        int128 amountOutSigned = swapDelta.amount1() > 0 ? swapDelta.amount1() : swapDelta.amount0();
        uint256 amountOut = amountOutSigned >= 0 ? uint256(uint128(amountOutSigned)) : uint256(uint128(-amountOutSigned));

        emit SwapExecuted(
            Currency.unwrap(poolKey.currency0),
            Currency.unwrap(poolKey.currency1),
            msg.sender,
            amountIn,
            amountOut
        ); 
    }

    function removeLiquidity(
        PoolKey memory poolKey,
        uint256 liquidity,
        int24 tickLower,
        int24 tickUpper,
        bytes32 salt
    ) external {
        require(liquidity > 0, "Invalid liquidity amount");

        IPoolManager.ModifyLiquidityParams memory params = IPoolManager.ModifyLiquidityParams({
            tickLower: tickLower,
            tickUpper: tickUpper,
            liquidityDelta: -int256(liquidity),
            salt: salt
        });

        (BalanceDelta callerDelta, BalanceDelta feesAccrued) = poolManager.modifyLiquidity(poolKey, params, "");


        IERC20(Currency.unwrap(poolKey.currency0)).safeTransfer(msg.sender, uint256(int256(callerDelta.amount0())));
        IERC20(Currency.unwrap(poolKey.currency1)).safeTransfer(msg.sender, uint256(int256(callerDelta.amount1())));

        emit LiquidityRemoved(
            Currency.unwrap(poolKey.currency0),
            Currency.unwrap(poolKey.currency1),
            msg.sender,
            liquidity
        );
    }

    function _unlockCallback(bytes calldata data) internal override returns (bytes memory) {
        PoolKey memory dummyKey = PoolKey({
            currency0: Currency.wrap(address(0)), 
            currency1: Currency.wrap(address(0)), 
            fee: 0, 
            tickSpacing: 0, 
            hooks: IHooks(address(0))
        });

        if (data.length == abi.encode(dummyKey, uint160(0)).length) {
            (PoolKey memory poolKey, uint160 sqrtPriceX96) = abi.decode(data, (PoolKey, uint160));
            poolManager.initialize(poolKey, sqrtPriceX96);
        } else {
            revert("Invalid unlockCallback data");
        }
        return "";
    }
}
