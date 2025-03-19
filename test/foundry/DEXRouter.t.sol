// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "forge-std/console.sol";
import "../../contracts/DEXRouter.sol";
import "../../contracts/PriceFeedHook.sol";
import "../../contracts/MockPriceFeedHook.sol";
import "../../contracts/MockPriceFeed.sol";
import "../../contracts/ERC20Mock.sol";
import "../../contracts/WETH.sol";
import "@uniswap/v4-core/src/PoolManager.sol";
import "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import "@uniswap/v4-core/src/types/Currency.sol";
import "@uniswap/v4-core/src/types/PoolKey.sol";
import "@uniswap/v4-core/src/interfaces/IHooks.sol";
import "@uniswap/v4-core/src/libraries/TickMath.sol";

// Declare events from DEXRouter.sol
interface IDEXRouterEvents {
    event LiquidityAdded(address indexed token0, address indexed token1, address indexed sender, uint256 amount0, uint256 amount1);
    event LiquidityRemoved(address indexed token0, address indexed token1, address indexed sender, uint256 liquidity);
    event SwapExecuted(address indexed token0, address indexed token1, address indexed sender, uint256 amountIn, uint256 amountOut);
}

contract DEXRouterTest is Test, IDEXRouterEvents {
    // Contracts and addresses
    PoolManager public poolManager;
    DEXRouter public dexRouter;
    ERC20Mock public token0;
    ERC20Mock public token1;
    WETH public weth;
    MockPriceFeed public feed0;
    MockPriceFeed public feed1;

    // Users
    address public user1; // Liquidity Provider
    address public user2; // Trader

    // Common PoolKey (for token0-token1 pair)
    PoolKey public poolKey;
    int24 public tickSpacing = 60;
    uint24 public fee = 3000; // 0.3% fee tier
    bytes32 public positionSalt = bytes32(uint256(1)); // Arbitrary salt for LP position

    // Tick range for liquidity
    int24 public tickLower;
    int24 public tickUpper;

    bytes public unlockData;

function setUp() public {
    user1 = address(0x1);
    user2 = address(0x2);

    // Deploy Uniswap v4 PoolManager
    poolManager = new PoolManager(address(this));
    require(address(poolManager) != address(0), "PoolManager not initialized");

    // Deploy tokens and WETH
    token0 = new ERC20Mock("Token0", "TK0");
    token1 = new ERC20Mock("Token1", "TK1");
    weth = new WETH();
    require(address(token0) != address(0) && address(token1) != address(0), "Token addresses not valid");

    // Deploy the DEXRouter
    dexRouter = new DEXRouter(IPoolManager(address(poolManager)), address(weth));
    require(address(dexRouter) != address(0), "DEXRouter not initialized");

    // Deploy Mock Chainlink price feeds
    feed0 = new MockPriceFeed(1e8, 8); // $1.00
    feed1 = new MockPriceFeed(2e8, 8); // $2.00
    require(address(feed0) != address(0) && address(feed1) != address(0), "Price feeds not initialized");

    // Set price feeds
    dexRouter.setPriceFeed(address(token0), address(feed0));
    dexRouter.setPriceFeed(address(token1), address(feed1));

    // Mint tokens to users
    token0.mint(user1, 1_000_000 ether);
    token1.mint(user1, 1_000_000 ether);
    token0.mint(user2, 1_000_000 ether);
    token1.mint(user2, 1_000_000 ether);

    // Approve tokens for DEXRouter (user1)
    vm.startPrank(user1);
    token0.approve(address(dexRouter), type(uint256).max);
    token1.approve(address(dexRouter), type(uint256).max);
    vm.stopPrank();

    // Approve tokens for DEXRouter (user2)
    vm.startPrank(user2);
    token0.approve(address(dexRouter), type(uint256).max);
    token1.approve(address(dexRouter), type(uint256).max);
    vm.stopPrank();

    // Construct PoolKey
    address tokenA = address(token0);
    address tokenB = address(token1);
    if (tokenA > tokenB) (tokenA, tokenB) = (tokenB, tokenA);

    poolKey = PoolKey({
        currency0: Currency.wrap(tokenA),
        currency1: Currency.wrap(tokenB),
        fee: 3000,
        tickSpacing: 10,
        hooks: IHooks(address(0))
    });

    require(Currency.unwrap(poolKey.currency0) != Currency.unwrap(poolKey.currency1), "PoolKey currencies must be different");
    require(Currency.unwrap(poolKey.currency0) != address(0) && Currency.unwrap(poolKey.currency1) != address(0), "Invalid PoolKey tokens");

    // Compute initial price
    uint160 sqrtPriceX96 = dexRouter.computeSqrtPriceX96(poolKey);
    require(sqrtPriceX96 > 0, "Invalid sqrtPriceX96 calculation");

    // Unlock PoolManager before adding liquidity
    bytes memory unlockData = abi.encode(poolKey, sqrtPriceX96);
    
    poolManager.unlock(unlockData);
    console.log("Pool unlocked successfully");

    // Initialize the pool
    dexRouter.initializePoolWithChainlink(poolKey);

    (uint256 liquidity0, uint256 liquidity1) = dexRouter.getTotalLiquidity(address(token0), address(token1));
    console.log("Liquidity after initialization:", liquidity0, liquidity1);
    require(liquidity0 >= 0 && liquidity1 >= 0, "Pool initialization failed");

    // Ensure Router has funds for testing
    token0.transfer(address(dexRouter), 10_000 ether);
    token1.transfer(address(dexRouter), 10_000 ether);
}



 function _initializePool() internal {
    // Ensure price feeds are set correctly
    dexRouter.setPriceFeed(address(token0), address(feed0));
    dexRouter.setPriceFeed(address(token1), address(feed1));

    // Initialize the pool
    dexRouter.initializePoolWithChainlink(poolKey);
    unlockData = abi.encode(poolKey, dexRouter.computeSqrtPriceX96(poolKey));

    // Calculate the initial tick from sqrtPriceX96
    uint160 sqrtPriceX96 = dexRouter.computeSqrtPriceX96(poolKey);
    int24 currentTick = TickMath.getTickAtSqrtPrice(sqrtPriceX96);

    // Define tick range around the current tick (e.g., ±100 ticks)
    tickLower = currentTick - 100;
    tickUpper = currentTick + 100;

    // Add small liquidity to unlock the pool
    vm.prank(user1);
    vm.warp(block.timestamp + 1); // Simulate time progression
    dexRouter.addLiquidity(poolKey, 100 ether, 100 ether, tickLower, tickUpper, positionSalt);

    // Unlock the pool
    require(poolManager.unlock(unlockData), "Pool unlock failed");
    console.log("Pool unlocked successfully");


    /*
    try poolManager.unlock(unlockData) {
        console.log("Pool unlock successful");
    } catch Error(string memory reason) {
        console.log("Pool unlock failed:", reason);
        revert(reason);
    } catch {
        revert("Pool unlock failed: Verify Uniswap v4 compatibility.");
    }
    */

    vm.warp(block.timestamp + 1); // Simulate time progression
}

    // --- Unit Tests ---

    function testSetAndGetLatestPrice() public {
        uint256 priceToken0 = dexRouter.getLatestPrice(address(token0));
        uint256 priceToken1 = dexRouter.getLatestPrice(address(token1));
        assertEq(priceToken0, 1e18, "Token0 price should be $1.00 (1e18)");
        assertEq(priceToken1, 2e18, "Token1 price should be $2.00 (2e18)");

        // Update the price feeds and test again
        feed0.updatePrice(15e7); // $1.50
        feed1.updatePrice(25e7); // $2.50
        uint256 newPrice0 = dexRouter.getLatestPrice(address(token0));
        uint256 newPrice1 = dexRouter.getLatestPrice(address(token1));
        assertEq(newPrice0, 1.5e18, "Token0 price should update to $1.5");
        assertEq(newPrice1, 2.5e18, "Token1 price should update to $2.5");
    }

    function testInitializePoolWithChainlink() public {
        _initializePool();

        // Verify the pool is initialized
        uint160 sqrtPriceX96 = dexRouter.computeSqrtPriceX96(poolKey);
        int24 currentTick = TickMath.getTickAtSqrtPrice(sqrtPriceX96);
        assertTrue(currentTick != 0, "Pool initialization failed");
    }

    function testAddLiquidityAndEvents() public {
        _initializePool();

        uint256 amount0 = 1000 ether;
        uint256 amount1 = 1000 ether;

        vm.startPrank(user1);

        // Expect the LiquidityAdded event
        vm.expectEmit(true, true, true, true);
        emit LiquidityAdded(address(token0), address(token1), user1, amount0, amount1);

        // Add liquidity
        vm.warp(block.timestamp + 1); // Simulate time progression
        dexRouter.addLiquidity(poolKey, amount0, amount1, tickLower, tickUpper, positionSalt);

        // Verify liquidity
        (uint256 liquidity0, uint256 liquidity1) = dexRouter.getTotalLiquidity(address(token0), address(token1));
        assertEq(liquidity0, amount0, "Liquidity mismatch for token0 after addLiquidity");
        assertEq(liquidity1, amount1, "Liquidity mismatch for token1 after addLiquidity");

        vm.stopPrank();
    }

    function testAddLiquidityRevertsOnInvalidAmounts() public {
        _initializePool();

        vm.startPrank(user1);

        // Test invalid amounts: amount0 = 0 and amount1 > 0
        vm.expectRevert("Invalid amounts");
        vm.warp(block.timestamp + 1); // Simulate time progression
        dexRouter.addLiquidity(poolKey, 0, 100 ether, tickLower, tickUpper, positionSalt);

        // Test invalid amounts: amount0 > 0 and amount1 = 0
        vm.expectRevert("Invalid amounts");
        vm.warp(block.timestamp + 1); // Simulate time progression
        dexRouter.addLiquidity(poolKey, 50 ether, 0, tickLower, tickUpper, positionSalt);

        vm.stopPrank();
    }

    function testRemoveLiquidityAndEvents() public {
        _initializePool();

        uint256 amount0 = 1000 ether;
        uint256 amount1 = 1000 ether;

        vm.startPrank(user1);
        vm.warp(block.timestamp + 1); // Simulate time progression
        dexRouter.addLiquidity(poolKey, amount0, amount1, tickLower, tickUpper, positionSalt);

        // Expect the LiquidityRemoved event
        vm.expectEmit(true, true, true, true);
        emit LiquidityRemoved(address(token0), address(token1), user1, amount0);

        // Remove liquidity
        dexRouter.removeLiquidity(poolKey, amount0, tickLower, tickUpper, positionSalt);

        // Verify liquidity is reduced
        (uint256 remainingLiquidity0, uint256 remainingLiquidity1) = dexRouter.getTotalLiquidity(address(token0), address(token1));
        assertLt(remainingLiquidity0, amount0, "Liquidity should be reduced for token0 after removeLiquidity");
        assertLt(remainingLiquidity1, amount1, "Liquidity should be reduced for token1 after removeLiquidity");

        vm.stopPrank();
    }

    function testRemoveLiquidityRevertsOnInvalidAmount() public {
        _initializePool();

        vm.startPrank(user1);

        // Attempt to remove 0 liquidity
        vm.expectRevert("Invalid liquidity amount");
        dexRouter.removeLiquidity(poolKey, 0, tickLower, tickUpper, positionSalt);

        vm.stopPrank();
    }

    function testSwapExactInputSingleSuccess() public {
        _initializePool();

        // Provide liquidity for the swap
        uint256 amount0 = 10_000 ether;
        uint256 amount1 = 10_000 ether;
        vm.startPrank(user1);
        vm.warp(block.timestamp + 1); // Simulate time progression
        dexRouter.addLiquidity(poolKey, amount0, amount1, tickLower, tickUpper, positionSalt);
        vm.stopPrank();

        // User2 prepares for swap
        uint256 swapAmountIn = 100 ether;
        vm.startPrank(user2);
        token0.mint(user2, swapAmountIn);
        token0.approve(address(dexRouter), type(uint256).max);

        // Expect the SwapExecuted event
        vm.expectEmit(true, true, true, true);
        emit SwapExecuted(address(token0), address(token1), user2, swapAmountIn, 0);

        // Execute swap
        dexRouter.swapExactInputSingle(poolKey, swapAmountIn, block.timestamp + 1 hours, 5);

        // Validate swap results
        assertEq(token0.balanceOf(user2), 0, "User2 should have spent all token0");
        assertGt(token1.balanceOf(user2), 0, "User2 should have received token1");

        vm.stopPrank();
    }

    function testSwapRevertsOnExpiredDeadline() public {
        _initializePool();

        // Provide liquidity
        uint256 amount0 = 1000 ether;
        uint256 amount1 = 1000 ether;
        vm.startPrank(user1);
        vm.warp(block.timestamp + 1); // Simulate time progression
        dexRouter.addLiquidity(poolKey, amount0, amount1, tickLower, tickUpper, positionSalt);
        vm.stopPrank();

        // Attempt swap with an expired deadline
        vm.startPrank(user2);
        token0.mint(user2, 10 ether);
        token0.approve(address(dexRouter), type(uint256).max);

        vm.expectRevert("Transaction expired");
        dexRouter.swapExactInputSingle(poolKey, 10 ether, block.timestamp - 1, 10);

        vm.stopPrank();
    }

    function testSwapRespectsSlippageLimit() public {
        _initializePool();

        // Provide liquidity
        uint256 amount0 = 20_000 ether;
        uint256 amount1 = 20_000 ether;
        vm.startPrank(user1);
        vm.warp(block.timestamp + 1); // Simulate time progression
        dexRouter.addLiquidity(poolKey, amount0, amount1, tickLower, tickUpper, positionSalt);
        vm.stopPrank();

        // Attempt swap with tight slippage
        uint256 hugeSwapIn = 15_000 ether;
        vm.startPrank(user2);
        token0.mint(user2, hugeSwapIn);
        token0.approve(address(dexRouter), type(uint256).max);

        vm.expectRevert();
        dexRouter.swapExactInputSingle(poolKey, hugeSwapIn, block.timestamp + 1, 1);

        vm.stopPrank();
    }

    function testWETHDepositWithdraw() public {
        uint256 depositAmount = 1 ether;
        vm.deal(address(this), depositAmount);

        // Deposit ETH into WETH
        weth.deposit{ value: depositAmount }();
        assertEq(weth.balanceOf(address(this)), depositAmount, "WETH balance should match deposited amount");

        // Withdraw WETH back to ETH
        weth.withdraw(depositAmount);
        assertEq(weth.balanceOf(address(this)), 0, "WETH balance should be zero after withdrawal");
        assertEq(address(this).balance, depositAmount, "ETH balance should be restored after withdrawal");
    }

    // Accept ETH transfers (needed for WETH withdraw tests)
    receive() external payable {}
}