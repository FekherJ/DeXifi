// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract LiquidityPool is Ownable, ReentrancyGuard {
    IERC20 public tokenA;
    IERC20 public tokenB;
    
    uint256 public reserveA;
    uint256 public reserveB;

    mapping(address => uint256) public lpBalances;
    mapping(address => bool) public isLiquidityProvider;
    address[] public liquidityProviders;

    event LiquidityAdded(address indexed provider, uint256 amountA, uint256 amountB);
    event LiquidityRemoved(address indexed provider, uint256 amountA, uint256 amountB);
    event Swapped(address indexed user, address tokenIn, uint256 amountIn, uint256 amountOut);

    constructor(address initialOwner) Ownable(initialOwner) {}

    bool private initialized;

    function initialize(address _tokenA, address _tokenB) external onlyOwner {
        require(!initialized, "Already initialized");
        require(address(tokenA) == address(0) && address(tokenB) == address(0), "Tokens already set");

        tokenA = IERC20(_tokenA);
        tokenB = IERC20(_tokenB);
        initialized = true;
    }


    function addLiquidity(uint256 amountA, uint256 amountB) external nonReentrant {
        require(amountA > 0 && amountB > 0, "Amounts must be greater than 0");

        tokenA.transferFrom(msg.sender, address(this), amountA);
        tokenB.transferFrom(msg.sender, address(this), amountB);

        reserveA += amountA;
        reserveB += amountB;
        lpBalances[msg.sender] += (amountA + amountB);

        if (!isLiquidityProvider[msg.sender]) {
            isLiquidityProvider[msg.sender] = true;
            liquidityProviders.push(msg.sender);
        }

        emit LiquidityAdded(msg.sender, amountA, amountB);
    }

    function getTotalSupply() public view returns (uint256) {
        uint256 totalSupply = 0;
        for (uint i = 0; i < liquidityProviders.length; i++) {
            totalSupply += lpBalances[liquidityProviders[i]];
        }
        return totalSupply;
    }

    function getReserves() public view returns (uint256, uint256) {
        return (reserveA, reserveB);
    }

    function balanceOf(address account) public view returns (uint256) {
        return lpBalances[account];
    }

    function totalLiquidity() public view returns (uint256) {
        return reserveA + reserveB;
    }

    function removeLiquidity(uint256 lpAmount) external nonReentrant {
        require(lpBalances[msg.sender] >= lpAmount, "Not enough LP tokens");

        uint256 totalSupplyLP = getTotalSupply();
        require(totalSupplyLP > 0, "No liquidity in pool");

        uint256 amountA = (lpAmount * reserveA) / totalSupplyLP;
        uint256 amountB = (lpAmount * reserveB) / totalSupplyLP;

        reserveA -= amountA;
        reserveB -= amountB;
        lpBalances[msg.sender] -= lpAmount;

        tokenA.transfer(msg.sender, amountA);
        tokenB.transfer(msg.sender, amountB);

        emit LiquidityRemoved(msg.sender, amountA, amountB);
    }

    function swap(address tokenIn, address tokenOut, uint256 amountIn) external nonReentrant {
        require(amountIn > 0, "Amount must be greater than 0");
        require(tokenIn == address(tokenA) || tokenIn == address(tokenB), "Invalid tokenIn");
        require(tokenOut == address(tokenA) || tokenOut == address(tokenB), "Invalid tokenOut");
        require(tokenIn != tokenOut, "Tokens must be different");

        (IERC20 inputToken, IERC20 outputToken, uint256 inputReserve, uint256 outputReserve) = 
            tokenIn == address(tokenA) ? (tokenA, tokenB, reserveA, reserveB) : (tokenB, tokenA, reserveB, reserveA);

        uint256 amountOut = (amountIn * outputReserve) / (inputReserve + amountIn);
        require(amountOut >= 1, "Swap output too low");


        inputToken.transferFrom(msg.sender, address(this), amountIn);
        outputToken.transfer(msg.sender, amountOut);

        if (tokenIn == address(tokenA)) {
            reserveA += amountIn;
            reserveB -= amountOut;
        } else {
            reserveB += amountIn;
            reserveA -= amountOut;
        }

        emit Swapped(msg.sender, tokenIn, amountIn, amountOut);
    }
}
