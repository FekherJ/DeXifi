// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import "@uniswap/v4-core/src/PoolManager.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@uniswap/v4-core/src/libraries/Lock.sol";
import "@uniswap/v4-core/src/libraries/TickMath.sol";
import "@uniswap/v4-core/src/types/Currency.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract DEXRouter is ReentrancyGuard {
    IPoolManager public immutable poolManager;
    address public immutable WETH;

    // Tracks how much liquidity each provider owns
    mapping(address => uint256) public liquidityProviders;
    uint256 public totalLiquidity;

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
        uint256 amountOutMin,
        uint256 deadline
    ) external nonReentrant {
        require(block.timestamp <= deadline, "DEXRouter: Transaction expired");
        require(IERC20(tokenIn).allowance(msg.sender, address(this)) >= amountIn, "DEXRouter: Insufficient allowance");

        // Transfer input tokens from sender
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);

        // Simulate the swap logic - assuming Uniswap-like functionality
        uint256 amountOut = _calculateSwap(tokenIn, tokenOut, amountIn);
        require(amountOut >= amountOutMin, "DEXRouter: Slippage exceeded");

        // Transfer output tokens to sender
        IERC20(tokenOut).transfer(msg.sender, amountOut);

        emit SwapExecuted(msg.sender, tokenIn, tokenOut, amountIn, amountOut);
    }

    function addLiquidity(
    address tokenA,
    address tokenB,
    uint256 amountA,
    uint256 amountB
) external nonReentrant {
    require(tokenA != tokenB, "DEXRouter: Cannot pair a token with itself");
    require(amountA > 0 && amountB > 0, "DEXRouter: Invalid liquidity amounts");

    // Ensure sufficient allowance
    require(
        IERC20(tokenA).allowance(msg.sender, address(this)) >= amountA,
        "DEXRouter: Insufficient allowance for tokenA"
    );
    require(
        IERC20(tokenB).allowance(msg.sender, address(this)) >= amountB,
        "DEXRouter: Insufficient allowance for tokenB"
    );

    // Transfer tokens from user to contract
    bool successA = IERC20(tokenA).transferFrom(msg.sender, address(this), amountA);
    bool successB = IERC20(tokenB).transferFrom(msg.sender, address(this), amountB);
    require(successA && successB, "DEXRouter: Transfer failed");

    // Calculate liquidity tokens issued (simplified)
    uint256 liquidityMinted = amountA + amountB;
    require(liquidityMinted > 0, "DEXRouter: Liquidity minting failed");

    // Update the sender's LP balance
    liquidityProviders[msg.sender] += liquidityMinted;
    totalLiquidity += liquidityMinted;

    emit LiquidityAdded(msg.sender, tokenA, tokenB, liquidityMinted);
}



    function removeLiquidity(
        address tokenA,
        address tokenB,
        uint256 liquidity
    ) external nonReentrant {
        require(liquidity > 0, "DEXRouter: Invalid liquidity amount");
        require(liquidityProviders[msg.sender] >= liquidity, "DEXRouter: Not enough LP tokens");

        uint256 reserveA = IERC20(tokenA).balanceOf(address(this));
        uint256 reserveB = IERC20(tokenB).balanceOf(address(this));

        require(reserveA > 0 && reserveB > 0, "DEXRouter: Insufficient reserves");

        uint256 amountA = (liquidity * reserveA) / totalLiquidity;
        uint256 amountB = (liquidity * reserveB) / totalLiquidity;

        liquidityProviders[msg.sender] -= liquidity;
        totalLiquidity -= liquidity;

        IERC20(tokenA).transfer(msg.sender, amountA);
        IERC20(tokenB).transfer(msg.sender, amountB);

        emit LiquidityRemoved(msg.sender, tokenA, tokenB, liquidity);
    }

    function _calculateSwap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) internal pure returns (uint256) {
        uint256 amountInWithFee = (amountIn * 997) / 1000; // 0.3% Uniswap-style fee
        return amountInWithFee;
    }
}
