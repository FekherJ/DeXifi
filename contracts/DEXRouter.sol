// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import "@uniswap/v4-core/src/PoolManager.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@uniswap/v4-core/src/libraries/Lock.sol";
import "@uniswap/v4-core/src/libraries/TickMath.sol";
import "@uniswap/v4-core/src/types/Currency.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

using SafeERC20 for IERC20;



contract DEXRouter is ReentrancyGuard {

    mapping(address => address) public priceFeeds;
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
        require(token != address(0), "Invalid token address");
        require(priceFeed != address(0), "Invalid price feed address");

        priceFeeds[token] = priceFeed; // Store the address of the Chainlink price feed
    }




    function getLatestPrice(address token) public view returns (uint256) {
        address priceFeedAddress = priceFeeds[token];
        require(priceFeedAddress != address(0), "DEXRouter: No price feed for token");

        AggregatorV3Interface priceFeed = AggregatorV3Interface(priceFeedAddress);
        (, int256 price, , uint256 updatedAt, ) = priceFeed.latestRoundData();

        require(price > 0, "DEXRouter: Invalid price"); 
        require(block.timestamp - updatedAt < 3600, "DEXRouter: Stale price data"); 

        uint8 decimals = priceFeed.decimals(); // ✅ Fetch decimals dynamically
        return uint256(price) * (10 ** (18 - decimals)); // ✅ Normalize to 18 decimals
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

        // ✅ Use SafeERC20 to prevent transfer failures
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);

        // ✅ Fetch token prices from Chainlink price feeds
        uint256 priceIn = getLatestPrice(tokenIn);
        uint256 priceOut = getLatestPrice(tokenOut);
        require(priceIn > 0 && priceOut > 0, "DEXRouter: Invalid price data");

        // ✅ Calculate expected output amount based on Chainlink prices
        uint256 expectedAmountOut = (amountIn * priceIn) / priceOut;

        // ✅ Enforce slippage protection
        require(expectedAmountOut >= amountOutMin, "DEXRouter: Slippage exceeded");

        // ✅ Ensure contract has enough tokens for the swap
        uint256 contractBalance = IERC20(tokenOut).balanceOf(address(this));
        require(contractBalance >= expectedAmountOut, "DEXRouter: Insufficient liquidity in contract");

        // ✅ Transfer output tokens to sender
        IERC20(tokenOut).safeTransfer(msg.sender, expectedAmountOut);

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
