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

    function swapExactInputSingle(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOutMin
    ) external returns (int128 amountOut) {
        require(amountIn > 0, "Invalid amount");

        // Transfer tokens from user to contract
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenIn).approve(address(poolManager), amountIn);

        // ✅ Define PoolKey correctly
        PoolKey memory poolKey = PoolKey({
            currency0: Currency.wrap(tokenIn),  // ✅ Use Currency.wrap() to convert address to Currency
            currency1: Currency.wrap(tokenOut),
            fee: 3000,  // Adjust fee tier as needed
            tickSpacing: 60,  // Default tick spacing for Uniswap v4 pools
            hooks: IHooks(address(0))  // No hooks (set to `IHooks(address(0))`)
        });

        // ✅ Define SwapParams correctly
        IPoolManager.SwapParams memory swapParams = IPoolManager.SwapParams({
            zeroForOne: tokenIn < tokenOut,  // Determines swap direction
            amountSpecified: int128(int256(amountIn)),  // Convert uint to signed int
            sqrtPriceLimitX96: 0  // No price limit
        });

        // ✅ Corrected swap() function call
        (BalanceDelta delta) = poolManager.swap(poolKey, swapParams, ""); // ✅ FIXED: Pass an empty `bytes memory` instead of `msg.sender`

        // Extract correct output amount
        amountOut = swapParams.zeroForOne ? delta.amount1() : delta.amount0();

        require(amountOut >= 0 && uint256(int256(amountOut)) >= amountOutMin, "Insufficient output amount");
        emit SwapExecuted(msg.sender, tokenIn, tokenOut, amountIn, uint256(int256(amountOut)));
    }



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

    // ✅ Define PoolKey correctly
    PoolKey memory poolKey = PoolKey({
        currency0: Currency.wrap(tokenA),  
        currency1: Currency.wrap(tokenB),
        fee: 3000,  
        tickSpacing: 60,  
        hooks: IHooks(address(0))  
    });

    int24 tickLower = -887220; // Minimum tick range
    int24 tickUpper = 887220;  // Maximum tick range

    // ✅ Step 1: Ensure pool is initialized
    poolManager.initialize(poolKey, 0); // Initializes the pool if needed

    // ✅ Step 2: Define ModifyLiquidityParams correctly (Add stackedLiquidityDelta)
    IPoolManager.ModifyLiquidityParams memory modifyParams = IPoolManager.ModifyLiquidityParams({
        tickLower: tickLower,
        tickUpper: tickUpper,
        liquidityDelta: int256(amountA + amountB), // ✅ Main liquidity change
        salt: 0 // ✅ Required fourth parameter
    });

    // ✅ Step 3: Modify the liquidity using correct function signature
    poolManager.modifyLiquidity(poolKey, modifyParams, "");

    // ✅ Step 4: Finalize the liquidity update
    poolManager.settle();

    emit LiquidityAdded(msg.sender, tokenA, tokenB, amountA + amountB);
}


function removeLiquidity(
    address tokenA,
    address tokenB,
    uint256 liquidity
) external {
    require(liquidity > 0, "Invalid liquidity amount");

    // Define the correct PoolKey for the given token pair
    PoolKey memory poolKey = PoolKey({
        currency0: Currency.wrap(tokenA),  
        currency1: Currency.wrap(tokenB),
        fee: 3000,  // Adjust fee tier as needed
        tickSpacing: 60,  // Default tick spacing for Uniswap v4 pools
        hooks: IHooks(address(0))  // No hooks (set to `IHooks(address(0))`)
    });

    // Define tick range (ensure consistency with addLiquidity)
    int24 tickLower = -887220;  // Minimum tick range
    int24 tickUpper = 887220;   // Maximum tick range

    // ✅ Step 1: Define ModifyLiquidityParams for Removing Liquidity
    IPoolManager.ModifyLiquidityParams memory params = IPoolManager.ModifyLiquidityParams({
        tickLower: tickLower,
        tickUpper: tickUpper,
        liquidityDelta: -int256(liquidity), // ✅ Negative value to remove liquidity
        salt: 0  // Keep it 0 unless using a custom salt for unique positions
    });

    // ✅ Step 2: Call modifyLiquidity to remove liquidity
    poolManager.modifyLiquidity(poolKey, params, "");

    // ✅ Step 3: Finalize settlement
    poolManager.settle();

    // ✅ Emit event
    emit LiquidityRemoved(msg.sender, tokenA, tokenB, liquidity);
    }

}
