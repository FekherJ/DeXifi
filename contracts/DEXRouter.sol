// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import "@uniswap/v4-core/src/types/BalanceDelta.sol";
import "@uniswap/v4-core/src/types/PoolKey.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract DEXRouter {
    IPoolManager public immutable poolManager;
    address public immutable WETH;

    event SwapExecuted(address indexed trader, address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOut);
    event LiquidityAdded(address indexed provider, address tokenA, address tokenB, uint256 liquidity);
    event LiquidityRemoved(address indexed provider, address tokenA, address tokenB, uint256 liquidity);

    constructor(address _poolManager, address _WETH) {
        poolManager = IPoolManager(_poolManager);
        WETH = _WETH;
    }

    /**
     * @notice Swaps an exact amount of input tokens for output tokens
     */
    function swapExactInputSingle(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOutMin
    ) external returns (uint256 amountOut) {
        require(amountIn > 0, "Invalid amount");

        // Transfer tokens from user to contract
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenIn).approve(address(poolManager), amountIn);

        // Define PoolKey correctly
        PoolKey memory poolKey = PoolKey({
            currency0: Currency.wrap(tokenIn),
            currency1: Currency.wrap(tokenOut),
            fee: 3000,
            tickSpacing: 60,
            hooks: IHooks(address(0))
        });

        // Define SwapParams correctly
        IPoolManager.SwapParams memory swapParams = IPoolManager.SwapParams({
            zeroForOne: tokenIn < tokenOut,
            amountSpecified: int128(int256(amountIn)),
            sqrtPriceLimitX96: 0
        });

        // Execute swap
        (BalanceDelta delta) = poolManager.swap(poolKey, swapParams, "");

        // Extract correct output amount and convert safely
        amountOut = swapParams.zeroForOne ? uint256(int256(delta.amount1())) : uint256(int256(delta.amount0()));

        require(amountOut >= amountOutMin, "Insufficient output amount");

        // Transfer output tokens to the user
        IERC20(tokenOut).transfer(msg.sender, amountOut);

        // Emit event after successful execution
        emit SwapExecuted(msg.sender, tokenIn, tokenOut, amountIn, amountOut);
        return amountOut;
    }

    /**
     * @notice Adds liquidity to a pool
     */
    function addLiquidity(
        address tokenA,
        address tokenB,
        uint256 amountA,
        uint256 amountB
    ) external {
        require(amountA > 0 && amountB > 0, "Amounts must be greater than 0");

        IERC20(tokenA).transferFrom(msg.sender, address(this), amountA);
        IERC20(tokenB).transferFrom(msg.sender, address(this), amountB);

        IERC20(tokenA).approve(address(poolManager), amountA);
        IERC20(tokenB).approve(address(poolManager), amountB);

        // Define PoolKey correctly
        PoolKey memory poolKey = PoolKey({
            currency0: Currency.wrap(tokenA),
            currency1: Currency.wrap(tokenB),
            fee: 3000,
            tickSpacing: 60,
            hooks: IHooks(address(0))
        });

        int24 tickLower = -887220;
        int24 tickUpper = 887220;

        // Step 1: Check if pool is already initialized
        try poolManager.initialize(poolKey, 0) {} catch {}

        // Step 2: Modify liquidity
        IPoolManager.ModifyLiquidityParams memory modifyParams = IPoolManager.ModifyLiquidityParams({
            tickLower: tickLower,
            tickUpper: tickUpper,
            liquidityDelta: int256(amountA + amountB),
            salt: 0
        });

        poolManager.modifyLiquidity(poolKey, modifyParams, "");

        // Step 3: Finalize settlement
        poolManager.settle();

        // Emit event after liquidity addition
        emit LiquidityAdded(msg.sender, tokenA, tokenB, amountA + amountB);
    }

    /**
     * @notice Removes liquidity from a pool
     */
    function removeLiquidity(
        address tokenA,
        address tokenB,
        uint256 liquidity
    ) external {
        require(liquidity > 0, "Invalid liquidity amount");

        PoolKey memory poolKey = PoolKey({
            currency0: Currency.wrap(tokenA),
            currency1: Currency.wrap(tokenB),
            fee: 3000,
            tickSpacing: 60,
            hooks: IHooks(address(0))
        });

        int24 tickLower = -887220;
        int24 tickUpper = 887220;

        // Step 1: Modify liquidity (removal)
        IPoolManager.ModifyLiquidityParams memory params = IPoolManager.ModifyLiquidityParams({
            tickLower: tickLower,
            tickUpper: tickUpper,
            liquidityDelta: -int256(liquidity),
            salt: 0
        });

        poolManager.modifyLiquidity(poolKey, params, "");

        // Step 2: Finalize settlement
        poolManager.settle();

        // Step 3: Transfer tokens back to the user
        IERC20(tokenA).transfer(msg.sender, liquidity / 2);
        IERC20(tokenB).transfer(msg.sender, liquidity / 2);

        // Emit event after liquidity removal
        emit LiquidityRemoved(msg.sender, tokenA, tokenB, liquidity);
    }
}
