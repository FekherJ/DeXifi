// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface ILiquidityPool {
    function addLiquidity(uint256 amountA, uint256 amountB) external;
    function removeLiquidity(uint256 lpAmount) external;
    function swap(address tokenIn, address tokenOut, uint256 amountIn) external returns (uint256 amountOut);
}

interface ILiquidityPoolFactory {
    function getPool(address tokenA, address tokenB) external view returns (address);
}


contract DEXRouter {
    ILiquidityPoolFactory public factory;

    event LiquidityAdded(address indexed provider, address tokenA, address tokenB, uint256 amountA, uint256 amountB);
    event LiquidityRemoved(address indexed provider, address tokenA, address tokenB, uint256 lpAmount);
    event SwapExecuted(address indexed trader, address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOut);

    constructor(address _factory) {
        factory = ILiquidityPoolFactory(_factory);
    }

    function addLiquidity(address tokenA, address tokenB, uint256 amountA, uint256 amountB) external {
        address pool = factory.getPool(tokenA, tokenB);
        require(pool != address(0), "Liquidity pool does not exist");

        ILiquidityPool(pool).addLiquidity(amountA, amountB);
        emit LiquidityAdded(msg.sender, tokenA, tokenB, amountA, amountB);
    }

    function removeLiquidity(address tokenA, address tokenB, uint256 lpAmount) external {
        address pool = factory.getPool(tokenA, tokenB);
        require(pool != address(0), "Liquidity pool does not exist");

        ILiquidityPool(pool).removeLiquidity(lpAmount);
        emit LiquidityRemoved(msg.sender, tokenA, tokenB, lpAmount);
    }

    function swap(address tokenIn, address tokenOut, uint256 amountIn) external {
        address pool = factory.getPool(tokenIn, tokenOut);
        require(pool != address(0), "Liquidity pool does not exist");

        uint256 amountOut = ILiquidityPool(pool).swap(tokenIn, tokenOut, amountIn);
        emit SwapExecuted(msg.sender, tokenIn, tokenOut, amountIn, amountOut);
    }
}
