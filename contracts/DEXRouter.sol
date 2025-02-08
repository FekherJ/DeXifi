// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface ILiquidityPool {
    function addLiquidity(address tokenA, address tokenB, uint amountA, uint amountB) external;
    function removeLiquidity(address tokenA, address tokenB, uint lpAmount) external;
    function getAmountOut(uint amountIn, address tokenIn, address tokenOut) external view returns (uint);
}

contract DEXRouter is Ownable {
    ILiquidityPool public liquidityPool;

    constructor(address _liquidityPool) {
        liquidityPool = ILiquidityPool(_liquidityPool);
    }

    // Swap Tokens
    function swap(
        uint amountIn,
        address tokenIn,
        address tokenOut
    ) external {
        require(amountIn > 0, "Amount must be greater than zero");
        uint amountOut = liquidityPool.getAmountOut(amountIn, tokenIn, tokenOut);
        require(amountOut > 0, "Insufficient liquidity");

        IERC20(tokenIn).transferFrom(msg.sender, address(liquidityPool), amountIn);
        IERC20(tokenOut).transfer(msg.sender, amountOut);
    }

    // Add Liquidity
    function addLiquidity(
        address tokenA,
        address tokenB,
        uint amountA,
        uint amountB
    ) external {
        require(amountA > 0 && amountB > 0, "Amounts must be greater than zero");

        IERC20(tokenA).transferFrom(msg.sender, address(liquidityPool), amountA);
        IERC20(tokenB).transferFrom(msg.sender, address(liquidityPool), amountB);
        
        liquidityPool.addLiquidity(tokenA, tokenB, amountA, amountB);
    }

    // Remove Liquidity
    function removeLiquidity(
        address tokenA,
        address tokenB,
        uint lpAmount
    ) external {
        require(lpAmount > 0, "LP amount must be greater than zero");

        liquidityPool.removeLiquidity(tokenA, tokenB, lpAmount);
        IERC20(tokenA).transfer(msg.sender, lpAmount);
        IERC20(tokenB).transfer(msg.sender, lpAmount);
    }
}
