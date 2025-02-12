// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./LiquidityPool.sol"; // Ensure LiquidityPool is imported
import "@openzeppelin/contracts/proxy/Clones.sol";

interface ILiquidityPool {
    function initialize(address tokenA, address tokenB) external;
}

contract LiquidityPoolFactory is Ownable(msg.sender) {
    address public immutable liquidityPoolImplementation;
    mapping(address => mapping(address => address)) public getPool;

    event PoolCreated(address indexed tokenA, address indexed tokenB, address pool);

    constructor(address _liquidityPoolImplementation) {
        liquidityPoolImplementation = _liquidityPoolImplementation;
    }



    function createPool(address tokenA, address tokenB) external onlyOwner returns (address pool) {
        require(tokenA != tokenB, "Identical token addresses");
        require(getPool[tokenA][tokenB] == address(0), "Pool already exists");

        // Deploy the pool with factory as the owner
        pool = address(new LiquidityPool(address(this))); 

        ILiquidityPool(pool).initialize(tokenA, tokenB); // Factory calls initialize

        getPool[tokenA][tokenB] = pool;
        getPool[tokenB][tokenA] = pool;

        emit PoolCreated(tokenA, tokenB, pool);
    }



}
