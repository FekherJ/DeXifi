// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import "@uniswap/v4-core/src/PoolManager.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@uniswap/v4-core/src/libraries/Lock.sol";
import "@uniswap/v4-core/src/libraries/TickMath.sol";
import "@uniswap/v4-core/src/types/Currency.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";


contract DEXRouter is ReentrancyGuard {

    mapping(address => AggregatorV3Interface) public priceFeeds;
    IPoolManager public immutable poolManager;
    address public immutable WETH;

    // Tracks how much liquidity each provider owns
    mapping(address => uint256) public liquidityProviders;
    uint256 public totalLiquidity;

    event SwapExecuted(address indexed trader, address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOut);
    event LiquidityAdded(address indexed provider, address tokenA, address tokenB, uint256 liquidity);
    event LiquidityRemoved(address indexed provider, address tokenA, address tokenB, uint256 liquidity);


    modifier onlyOwner() {
        require(msg.sender == owner, "DEXRouter: Not authorized");
        _;
    }

    address public owner;

    constructor(address _poolManager, address _WETH) {
        poolManager = IPoolManager(_poolManager);
        WETH = _WETH;
        owner = msg.sender; // Set deployer as owner
    }

    function setPriceFeed(address token, address priceFeed) external onlyOwner {
        priceFeeds[token] = AggregatorV3Interface(priceFeed);
    }


    function getLatestPrice(address token) public view returns (uint256) {
        AggregatorV3Interface priceFeed = priceFeeds[token];
    
        // Ensure the token has a registered price feed
        if (address(priceFeed) == address(0)) {
            revert("DEXRouter: No price feed for token");
        }

        // Fetch latest price data
        (, int256 price, , uint256 updatedAt, ) = priceFeed.latestRoundData();

        // Ensure the price is valid
        if (price <= 0) {
            revert("DEXRouter: Invalid price");
        }

        // Optional: Ensure price is recent (avoid stale data)
        require(updatedAt > 0, "DEXRouter: Stale price data");

        return uint256(price);
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

        // Fetch token prices from Chainlink price feeds
        uint256 priceIn = getLatestPrice(tokenIn);
        uint256 priceOut = getLatestPrice(tokenOut);
        require(priceIn > 0 && priceOut > 0, "DEXRouter: Invalid price data");

        // Calculate expected output amount based on Chainlink prices
        uint256 expectedAmountOut = (amountIn * priceIn) / priceOut;

        // ✅ Enforce slippage protection
        require(expectedAmountOut >= amountOutMin, "DEXRouter: Slippage exceeded");

        // Ensure the contract has enough tokens to fulfill the swap
        require(IERC20(tokenOut).balanceOf(address(this)) >= expectedAmountOut, "DEXRouter: Insufficient liquidity in contract");

        // Transfer output tokens to sender
        IERC20(tokenOut).transfer(msg.sender, expectedAmountOut);

        emit SwapExecuted(msg.sender, tokenIn, tokenOut, amountIn, expectedAmountOut);
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

   
}
