// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
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


contract DEXRouterTest is Test {
    
    // Contracts and addresses
    PoolManager public poolManager;
    DEXRouter public dexRouter;
    ERC20Mock public token0;
    ERC20Mock public token1;
    WETH public weth;
    MockPriceFeed public feed0;
    MockPriceFeed public feed1;

    // Users
    address public user1; // will act as Liquidity Provider
    address public user2; // will act as Trader

    // Common PoolKey (for token0-token1 pair)
    PoolKey public poolKey;
    int24 public tickSpacing = 60;
    uint24 public fee = 3000;  // using 0.3% fee tier for example
    bytes32 public positionSalt = bytes32(uint256(1)); // arbitrary salt for LP position

    // Tick range for liquidity (will cover a wide range around initial price)
    int24 public tickLower;
    int24 public tickUpper;

    bytes public unlockData;

    function setUp() public {
    user1 = address(0x1);
    user2 = address(0x2);

    // 1. Deploy Uniswap v4 PoolManager
    poolManager = new PoolManager(address(this));
    require(address(poolManager) != address(0), "PoolManager not initialized");


    // 2. Deploy tokens and WETH
    token0 = new ERC20Mock("Token0", "TK0");
    token1 = new ERC20Mock("Token1", "TK1");
    weth   = new WETH();
    require(address(token0) != address(0) && address(token1) != address(0), "Token addresses not valid");

    // 3. Deploy the DEXRouter
    dexRouter = new DEXRouter(IPoolManager(address(poolManager)), address(weth));
    require(address(dexRouter) != address(0), "DEXRouter not initialized");


    // 5. Deploy Mock Chainlink price feeds
    feed0 = new MockPriceFeed(1e8, 8);
    feed1 = new MockPriceFeed(2e8, 8);
    require(address(feed0) != address(0) && address(feed1) != address(0), "Price feeds not initialized");

    dexRouter.setPriceFeed(address(token0), address(feed0));
    dexRouter.setPriceFeed(address(token1), address(feed1));

    // 6. Ensure test contract has enough tokens before adding liquidity
    token0.mint(address(this), 1e28);
    token1.mint(address(this), 1e28);
    
    require(token0.balanceOf(address(this)) >= 1e28, "Token0 minting failed");
    require(token1.balanceOf(address(this)) >= 1e28, "Token1 minting failed");

    // Mint initial balances for test user accounts
    token0.mint(user1, 1_000_000 ether);
    token1.mint(user1, 1_000_000 ether);
    token0.mint(user2, 1_000_000 ether);
    token1.mint(user2, 1_000_000 ether);

    require(token0.balanceOf(user1) >= 1_000_000 ether, "User1 minting failed");
    require(token0.balanceOf(user2) >= 1_000_000 ether, "User2 minting failed");
    require(token1.balanceOf(user1) >= 1_000_000 ether, "User1 minting failed");
    require(token1.balanceOf(user2) >= 1_000_000 ether, "User2 minting failed");

    // Debugging balances before transferring to msg.sender
    emit log_named_uint("Token0 Balance (Before Transfer)", token0.balanceOf(address(this)));
    emit log_named_uint("Token1 Balance (Before Transfer)", token1.balanceOf(address(this)));

    // Transfer tokens to `msg.sender` (to prevent "Token transfer failed" errors)
    token0.transfer(msg.sender, 5e27);
    token1.transfer(msg.sender, 5e27);

    // Debugging balances after transfer
    emit log_named_uint("Token0 Balance (After Transfer)", token0.balanceOf(msg.sender));
    emit log_named_uint("Token1 Balance (After Transfer)", token1.balanceOf(msg.sender));

    require(token0.balanceOf(msg.sender) >= 5e27, "Token0 transfer to msg.sender failed");
    require(token1.balanceOf(msg.sender) >= 5e27, "Token1 transfer to msg.sender failed");

    // 6. Approve tokens for DEXRouter and PoolManager
    bool approval1 = token0.approve(address(dexRouter), type(uint256).max);
    bool approval2 = token1.approve(address(dexRouter), type(uint256).max);
    require(approval1 && approval2, "Token approvals for dexRouter failed");

    // Check and log approvals
    emit log_named_uint("Token0 Allowance for DEXRouter", token0.allowance(address(this), address(dexRouter)));
    emit log_named_uint("Token1 Allowance for DEXRouter", token1.allowance(address(this), address(dexRouter)));

    require(token0.allowance(address(this), address(dexRouter)) > 0, "Token0 approval failed");
    require(token1.allowance(address(this), address(dexRouter)) > 0, "Token1 approval failed");

    bool approval3 = token0.approve(address(poolManager), type(uint256).max);
    bool approval4 = token1.approve(address(poolManager), type(uint256).max);
    require(approval3 && approval4, "Token approvals for poolManager failed");

    // 7. Construct PoolKey
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

    uint160 sqrtPriceX96 = dexRouter.computeSqrtPriceX96(poolKey);
    require(sqrtPriceX96 > 0, "Invalid sqrtPriceX96 calculation");
}


    function _initializePool() internal {
    // Ensure price feeds are set correctly before initializing
    dexRouter.setPriceFeed(address(token0), address(feed0));
    dexRouter.setPriceFeed(address(token1), address(feed1));

    // Verify that the price feeds are set properly
    require(dexRouter.getPriceFeed(address(token0)) == address(feed0), "Price feed for token0 not set");
    require(dexRouter.getPriceFeed(address(token1)) == address(feed1), "Price feed for token1 not set");


    // Call pool initialization
    dexRouter.initializePoolWithChainlink(poolKey);
    // Compute price data for unlock
    unlockData = abi.encode(poolKey, dexRouter.computeSqrtPriceX96(poolKey));

    // Add small liquidity before unlocking (to ensure compatibility)
    token0.approve(address(dexRouter), type(uint256).max);
    token1.approve(address(dexRouter), type(uint256).max);
    dexRouter.addLiquidity(poolKey, 100 ether, 100 ether, tickLower, tickUpper, positionSalt);

    // Unlock the pool after adding liquidity
    try poolManager.unlock(unlockData) {
        console.log("Pool unlock successful");
    } catch Error(string memory reason) {
        console.log("Pool unlock failed:", reason);
        revert(reason);
    } catch {
        revert("Pool unlock failed: Verify Uniswap v4 compatibility.");
    }

    vm.warp(block.timestamp + 1); // Simulate time progression
}




    // --- Unit Tests ---

    function testSetAndGetLatestPrice() public {
        // Ensure that getLatestPrice returns the scaled price correctly for each token.
        uint256 priceToken0 = dexRouter.getLatestPrice(address(token0));
        uint256 priceToken1 = dexRouter.getLatestPrice(address(token1));
        // Based on our setup, priceToken0 should be 1e18 ($1.00) and priceToken1 should be 2e18 ($2.00)
        assertEq(priceToken0, 1e18, "Token0 price should be $1.00 (1e18)");
        assertEq(priceToken1, 2e18, "Token1 price should be $2.00 (2e18)");

        // Update the price feeds and test again
        feed0.updatePrice(15e7); // update token0 to $1.5
        feed1.updatePrice(25e7); // update token1 to $2.5
        uint256 newPrice0 = dexRouter.getLatestPrice(address(token0));
        uint256 newPrice1 = dexRouter.getLatestPrice(address(token1));
        assertEq(newPrice0, 1.5e18, "Token0 price should update to $1.5");
        assertEq(newPrice1, 2.5e18, "Token1 price should update to $2.5");
    }

    function testInitializePoolWithChainlink() public {
        // Ensure price feeds are set
        dexRouter.setPriceFeed(address(token0), address(feed0));
        dexRouter.setPriceFeed(address(token1), address(feed1));

        // Initialize the pool (no explicit event to catch here)
        dexRouter.initializePoolWithChainlink(poolKey);
        unlockData = abi.encode(poolKey, dexRouter.computeSqrtPriceX96(poolKey));
        try poolManager.unlock(unlockData) {
            (uint256 liquidity0, uint256 liquidity1) = dexRouter.getTotalLiquidity(address(token0), address(token1));
            require(liquidity0 > 0 || liquidity1 > 0, "Pool unlock failed: No liquidity found.");
        } catch Error(string memory reason) {
            revert(reason);
        } catch {
            revert("Pool unlock failed: Verify Uniswap v4 compatibility.");
        }
        
        vm.warp(block.timestamp + 1); // Small delay to stabilize pool

        // Verify the pool is initialized by checking tick
        uint160 sqrtPriceX96 = dexRouter.computeSqrtPriceX96(poolKey);
        int24 currentTick = TickMath.getTickAtSqrtPrice(sqrtPriceX96);
        assertTrue(currentTick != 0, "Pool initialization failed");
    }

    function testAddLiquidityAndEvents() public {
    // Initialize the pool
    _initializePool();

    uint256 amount0 = 1000 ether;
    uint256 amount1 = 1000 ether;

    // Ensure poolKey tokens are valid.
    require(
        Currency.unwrap(poolKey.currency0) != address(0) && 
        Currency.unwrap(poolKey.currency1) != address(0), 
        "Invalid poolKey"
    );

    vm.startPrank(user1);

    // --- Ensure user1 has sufficient token balances ---
    uint256 bal0 = token0.balanceOf(user1);
    uint256 bal1 = token1.balanceOf(user1);
    console.log("User1 initial balance - Token0:", bal0);
    console.log("User1 initial balance - Token1:", bal1);

    if (bal0 < amount0) {
        token0.mint(user1, amount0 - bal0);
    }
    if (bal1 < amount1) {
        token1.mint(user1, amount1 - bal1);
    }

    // --- Approvals for PoolManager and DEXRouter ---
    token0.approve(address(poolManager), amount0);
    token1.approve(address(poolManager), amount1);
    token0.approve(address(dexRouter), amount0);
    token1.approve(address(dexRouter), amount1);

    // --- Debugging allowances ---
    console.log("User1 Allowance for PoolManager - Token0:", token0.allowance(user1, address(poolManager)));
    console.log("User1 Allowance for PoolManager - Token1:", token1.allowance(user1, address(poolManager)));
    console.log("User1 Allowance for DEXRouter - Token0:", token0.allowance(user1, address(dexRouter)));
    console.log("User1 Allowance for DEXRouter - Token1:", token1.allowance(user1, address(dexRouter)));

    // --- Unlock the pool (if locked) ---
    unlockData = abi.encode(poolKey, dexRouter.computeSqrtPriceX96(poolKey));
    try poolManager.unlock(unlockData) {
        console.log("Pool unlock successful.");
    } catch Error(string memory reason) {
        console.log("Pool unlock failed:", reason);
        revert(reason);
    } catch {
        revert("Pool unlock failed: Verify Uniswap v4 compatibility.");
    }

    // --- Expect the LiquidityAdded event before adding liquidity ---
    vm.expectEmit(true, true, true, true);
    emit LiquidityAdded(address(token0), address(token1), user1, amount0, amount1);

    // --- Add liquidity ---
    dexRouter.addLiquidity(poolKey, amount0, amount1, tickLower, tickUpper, positionSalt);

    // --- Retrieve and verify liquidity ---
    uint256 liquidity0;
    uint256 liquidity1;
    (liquidity0, liquidity1) = dexRouter.getTotalLiquidity(address(token0), address(token1));
    console.log("Liquidity after addLiquidity: Token0 =", liquidity0, "Token1 =", liquidity1);

    assertEq(liquidity0, amount0, "Liquidity mismatch for token0 after addLiquidity");
    assertEq(liquidity1, amount1, "Liquidity mismatch for token1 after addLiquidity");

    // --- Log final balances after liquidity addition ---
    console.log("User1 balance after addLiquidity - Token0:", token0.balanceOf(user1));
    console.log("User1 balance after addLiquidity - Token1:", token1.balanceOf(user1));

    vm.stopPrank();
}




function testAddLiquidityRevertsOnInvalidAmounts() public {
    // Initialize the pool without pre-existing liquidity.
    _initializePool();

    uint256 amount0 = 1000 ether;
    uint256 amount1 = 1000 ether;
    
    // Get liquidity before the test (declare variables first).
    uint256 liquidityBefore0;
    uint256 liquidityBefore1;
    (liquidityBefore0, liquidityBefore1) = dexRouter.getTotalLiquidity(address(token0), address(token1));

    vm.startPrank(user1);

    // Approve tokens for dexRouter.
    token0.approve(address(dexRouter), type(uint256).max);
    token1.approve(address(dexRouter), type(uint256).max);
    // For poolManager, simulate resetting approvals and then giving a small allowance.
    token0.approve(address(poolManager), 0);
    token0.approve(address(poolManager), type(uint256).max);
    token1.approve(address(poolManager), 0);
    token1.approve(address(poolManager), type(uint256).max);
    token0.approve(address(poolManager), 100 ether);
    token1.approve(address(poolManager), 100 ether);

    // Log balances for debugging.
    console.log("User1 balance before invalid addLiquidity - Token0:", token0.balanceOf(user1));
    console.log("User1 balance before invalid addLiquidity - Token1:", token1.balanceOf(user1));

    // Unlock the pool.

    unlockData = abi.encode(poolKey, dexRouter.computeSqrtPriceX96(poolKey));


    try poolManager.unlock(unlockData) {
        console.log("Pool unlock successful");
    } catch Error(string memory reason) {
        console.log("Pool unlock failed:", reason);
        revert(reason);
    } catch {
        revert("Pool unlock failed: Verify Uniswap v4 compatibility.");
    }

    // Test invalid amounts: amount0 = 0 and amount1 > 0.
    vm.expectRevert("Invalid amounts");
    dexRouter.addLiquidity(poolKey, 0, 100 ether, tickLower, tickUpper, positionSalt);

    // Test invalid amounts: amount0 > 0 and amount1 = 0.
    vm.expectRevert("Invalid amounts");
    dexRouter.addLiquidity(poolKey, 50 ether, 0, tickLower, tickUpper, positionSalt);

    // Get liquidity after the failed attempts.
    uint256 liquidityAfter0;
    uint256 liquidityAfter1;
    (liquidityAfter0, liquidityAfter1) = dexRouter.getTotalLiquidity(address(token0), address(token1));
    console.log("Liquidity after failed addLiquidity attempts - Token0:", liquidityAfter0, "Token1:", liquidityAfter1);

    // Confirm that liquidity has not changed.
    assertEq(liquidityAfter0, liquidityBefore0, "Liquidity should be unchanged for token0 after failed addLiquidity");
    assertEq(liquidityAfter1, liquidityBefore1, "Liquidity should be unchanged for token1 after failed addLiquidity");

    vm.stopPrank();
}




    function testRemoveLiquidityAndEvents() public {
        _initializePool();
        // First, user1 adds liquidity
        uint256 amount0 = 1000 ether;
        uint256 amount1 = 1000 ether;
        vm.startPrank(user1);
        token0.approve(address(poolManager), amount0);
        token1.approve(address(poolManager), amount1);
        token0.approve(address(dexRouter), amount0);
        token1.approve(address(dexRouter), amount1);
        
        unlockData = abi.encode(poolKey, dexRouter.computeSqrtPriceX96(poolKey));
        poolManager.unlock(unlockData);


        dexRouter.addLiquidity(poolKey, amount0, amount1, tickLower, tickUpper, positionSalt);

        (uint256 liquidity0, uint256 liquidity1) = dexRouter.getTotalLiquidity(address(token0), address(token1));
        assertEq(liquidity0, amount0, "Liquidity amount mismatch for token0 after addLiquidity");
        assertEq(liquidity1, amount1, "Liquidity amount mismatch for token1 after addLiquidity");

        vm.stopPrank();

        // Now user1 removes liquidity
        vm.startPrank(user1);
        vm.expectEmit(true, true, true, true);
        emit LiquidityRemoved(address(token0), address(token1), user1, amount0);
        
        unlockData = abi.encode(poolKey, dexRouter.computeSqrtPriceX96(poolKey));
        poolManager.unlock(unlockData);


        dexRouter.removeLiquidity(poolKey, amount0, tickLower, tickUpper, positionSalt);

        (uint256 remainingLiquidity0, uint256 remainingLiquidity1) = dexRouter.getTotalLiquidity(address(token0), address(token1));
        assertLt(remainingLiquidity0, amount0, "Liquidity should be reduced for token0 after removeLiquidity");
        assertLt(remainingLiquidity1, amount1, "Liquidity should be reduced for token1 after removeLiquidity");

        vm.stopPrank();

        // User1 should regain exactly their initial balances (no swaps happened)
        assertEq(token0.balanceOf(user1), 1_000_000 ether, "User1 token0 balance should be restored after removeLiquidity");
        assertEq(token1.balanceOf(user1), 1_000_000 ether, "User1 token1 balance should be restored after removeLiquidity");
        // PoolManager should hold 0 of both tokens after full removal
        assertEq(token0.balanceOf(address(poolManager)), 0, "PoolManager token0 balance should be 0 after removal");
        assertEq(token1.balanceOf(address(poolManager)), 0, "PoolManager token1 balance should be 0 after removal");
    }

    function testRemoveLiquidityRevertsOnInvalidAmount() public {
        _initializePool();

        uint256 amount0 = 100 ether;
        uint256 amount1 = 100 ether;
        // Add liquidity first
        vm.startPrank(user1);
        token0.approve(address(dexRouter), type(uint256).max);
        token1.approve(address(dexRouter), type(uint256).max);
        token0.approve(address(poolManager), type(uint256).max);
        token1.approve(address(poolManager), type(uint256).max);
        
        unlockData = abi.encode(poolKey, dexRouter.computeSqrtPriceX96(poolKey));
        poolManager.unlock(unlockData);


        dexRouter.addLiquidity(poolKey, amount0, amount1, tickLower, tickUpper, positionSalt);

        (uint256 liquidity0, uint256 liquidity1) = dexRouter.getTotalLiquidity(address(token0), address(token1));
        assertEq(liquidity0, amount0, "Liquidity amount mismatch for token0 after addLiquidity");
        assertEq(liquidity1, amount1, "Liquidity amount mismatch for token1 after addLiquidity");

        vm.stopPrank();
        // Now try to remove 0 liquidity (should fail)
        vm.startPrank(user1);
        vm.expectRevert("Invalid liquidity amount");
        
        unlockData = abi.encode(poolKey, dexRouter.computeSqrtPriceX96(poolKey));
        poolManager.unlock(unlockData);



        dexRouter.removeLiquidity(poolKey, 0, tickLower, tickUpper, positionSalt);

        (uint256 remainingLiquidity0, uint256 remainingLiquidity1) = dexRouter.getTotalLiquidity(address(token0), address(token1));
        assertEq(remainingLiquidity0, amount0, "Liquidity should remain unchanged for token0 after failed removeLiquidity");
        assertEq(remainingLiquidity1, amount1, "Liquidity should remain unchanged for token1 after failed removeLiquidity");

        vm.stopPrank();
    }

    function testSwapExactInputSingleSuccess() public {
        _initializePool();

        // Provide liquidity for the swap
        uint256 amount0 = 10_000 ether;
        uint256 amount1 = 10_000 ether;
        vm.startPrank(user1);
        token0.approve(address(poolManager), amount0);
        token1.approve(address(poolManager), amount1);
        
        unlockData = abi.encode(poolKey, dexRouter.computeSqrtPriceX96(poolKey));
        poolManager.unlock(unlockData);




        dexRouter.addLiquidity(poolKey, amount0, amount1, tickLower, tickUpper, positionSalt);
        (uint256 liquidity0, uint256 liquidity1) = dexRouter.getTotalLiquidity(address(token0), address(token1));
        assertEq(liquidity0, amount0, "Liquidity amount mismatch for token0 after addLiquidity");
        assertEq(liquidity1, amount1, "Liquidity amount mismatch for token1 after addLiquidity");
        vm.stopPrank();

        // User2 prepares for swap
        uint256 swapAmountIn = 100 ether;
        vm.startPrank(user2);
        token0.burn(token0.balanceOf(user2));
        token0.mint(user2, swapAmountIn);
        assertEq(token0.balanceOf(user2), swapAmountIn, "User2 should have token0 before swap");
        token0.approve(address(dexRouter), type(uint256).max);
        token0.approve(address(poolManager), swapAmountIn);
        uint256 deadline = block.timestamp + 1 hours;
        uint256 maxSlippage = 5; // 5%

        vm.expectEmit(true, true, true, true);
        emit SwapExecuted(address(token0), address(token1), user2, swapAmountIn, 0);
        
        unlockData = abi.encode(poolKey, dexRouter.computeSqrtPriceX96(poolKey));
        poolManager.unlock(unlockData);


        dexRouter.swapExactInputSingle(poolKey, swapAmountIn, deadline, maxSlippage);

        // Validate swap results
        assertEq(token0.balanceOf(user2), 0, "User2 should have spent all token0");
        assertGt(token1.balanceOf(user2), 0, "User2 should have received token1");
        vm.stopPrank();
    }

    function testSwapRevertsOnExpiredDeadline() public {
        _initializePool();

        // Add minimal liquidity
        uint256 amount0 = 1000 ether;
        uint256 amount1 = 1000 ether;
        vm.startPrank(user1);
        token0.approve(address(poolManager), type(uint256).max);
        token1.approve(address(poolManager), type(uint256).max);
        
        unlockData = abi.encode(poolKey, dexRouter.computeSqrtPriceX96(poolKey));
        poolManager.unlock(unlockData);


        dexRouter.addLiquidity(poolKey, amount0, amount1, tickLower, tickUpper, positionSalt);
        (uint256 liquidity0, uint256 liquidity1) = dexRouter.getTotalLiquidity(address(token0), address(token1));
        assertEq(liquidity0, amount0, "Liquidity amount mismatch for token0 after addLiquidity");
        assertEq(liquidity1, amount1, "Liquidity amount mismatch for token1 after addLiquidity");
        vm.stopPrank();

        // Attempt swap with an expired deadline
        vm.startPrank(user2);
        token0.approve(address(dexRouter), type(uint256).max);
        token0.approve(address(poolManager), 10 ether);
        uint256 pastDeadline = block.timestamp - 1;
        vm.expectRevert("Transaction expired");
        
        unlockData = abi.encode(poolKey, dexRouter.computeSqrtPriceX96(poolKey));
        poolManager.unlock(unlockData);




        dexRouter.swapExactInputSingle(poolKey, 10 ether, pastDeadline, 10);
        vm.stopPrank();
    }

    function testSwapRespectsSlippageLimit() public {
        _initializePool();

        // Provide a moderate amount of liquidity
        uint256 amount0 = 20_000 ether;
        uint256 amount1 = 20_000 ether;
        vm.startPrank(user1);
        token0.approve(address(poolManager), type(uint256).max);
        token1.approve(address(poolManager), type(uint256).max);
        
        unlockData = abi.encode(poolKey, dexRouter.computeSqrtPriceX96(poolKey));
        poolManager.unlock(unlockData);



        dexRouter.addLiquidity(poolKey, amount0, amount1, tickLower, tickUpper, positionSalt);
        (uint256 liquidity0, uint256 liquidity1) = dexRouter.getTotalLiquidity(address(token0), address(token1));
        assertEq(liquidity0, amount0, "Liquidity amount mismatch for token0 after addLiquidity");
        assertEq(liquidity1, amount1, "Liquidity amount mismatch for token1 after addLiquidity");
        vm.stopPrank();

        // User2 attempts a large swap that would move price significantly
        uint256 hugeSwapIn = 15_000 ether;
        uint256 deadline = block.timestamp + 1;
        uint256 tightSlippage = 1; // 1% slippage allowed
        vm.startPrank(user2);
        token0.burn(token0.balanceOf(user2));
        token0.mint(user2, hugeSwapIn);
        assertEq(token0.balanceOf(user2), hugeSwapIn, "User2 should have enough token0 before swap");
        token0.approve(address(dexRouter), type(uint256).max);
        token0.approve(address(poolManager), hugeSwapIn);
        vm.expectRevert();
        
        unlockData = abi.encode(poolKey, dexRouter.computeSqrtPriceX96(poolKey));
        poolManager.unlock(unlockData);


        dexRouter.swapExactInputSingle(poolKey, hugeSwapIn, deadline, tightSlippage);
        vm.stopPrank();
    }

    function testWETHDepositWithdraw() public {
        // Ensure test contract has enough ETH for deposit
        uint256 initialETHBalance = address(this).balance;
        uint256 depositAmount = 1 ether;
        if (initialETHBalance < depositAmount) {
            vm.deal(address(this), depositAmount);
        }

        // Deposit ETH into WETH
        weth.approve(address(poolManager), type(uint256).max);
        weth.deposit{ value: depositAmount }();
        assertEq(weth.balanceOf(address(this)), depositAmount, "WETH balance should match deposited amount");
        assertEq(address(this).balance, initialETHBalance - depositAmount, "ETH balance should decrease correctly");

        // Approve WETH for withdrawal by test contract
        weth.approve(address(this), depositAmount);

        // Withdraw WETH back to ETH
        address payable receiver = payable(address(this));
        weth.withdraw(depositAmount);
        assertEq(weth.balanceOf(address(this)), 0, "WETH balance should be zero after withdrawal");
        assertEq(receiver.balance, initialETHBalance, "ETH balance should be restored after withdrawal");
    }

    // Accept ETH transfers (needed for WETH withdraw tests)
    receive() external payable {}

    // --- Integration Test: Multi-step scenario ---
    function testEndToEndScenario() public {
        _initializePool();

        // Step 1: User1 adds liquidity
        uint256 amount0 = 5000 ether;
        uint256 amount1 = 5000 ether;
        vm.startPrank(user1);
        token0.approve(address(poolManager), type(uint256).max);
        token1.approve(address(poolManager), type(uint256).max);
        token0.approve(address(dexRouter), type(uint256).max);
        token1.approve(address(dexRouter), type(uint256).max);
        dexRouter.initializePoolWithChainlink(poolKey);
        unlockData = abi.encode(poolKey, dexRouter.computeSqrtPriceX96(poolKey));
        try poolManager.unlock(unlockData) {
            (uint256 liquidity0, uint256 liquidity1) = dexRouter.getTotalLiquidity(address(token0), address(token1));
            require(liquidity0 > 0 || liquidity1 > 0, "Pool unlock failed: No liquidity found.");
        } catch Error(string memory reason) {
            revert(reason);
        } catch {
            revert("Pool unlock failed: Verify Uniswap v4 compatibility.");
        }
        
        vm.warp(block.timestamp + 1);
        
        unlockData = abi.encode(poolKey, dexRouter.computeSqrtPriceX96(poolKey));
        poolManager.unlock(unlockData);


        dexRouter.addLiquidity(poolKey, amount0, amount1, tickLower, tickUpper, positionSalt);
        (uint256 liquidity0, uint256 liquidity1) = dexRouter.getTotalLiquidity(address(token0), address(token1));
        assertEq(liquidity0, amount0, "Liquidity amount mismatch for token0 after addLiquidity");
        assertEq(liquidity1, amount1, "Liquidity amount mismatch for token1 after addLiquidity");
        vm.stopPrank();

        // Record user1 balances after adding liquidity
        uint256 u1Token0AfterAdd = token0.balanceOf(user1);
        uint256 u1Token1AfterAdd = token1.balanceOf(user1);

        // Step 2: User2 swaps token0 -> token1
        uint256 swapAmountIn = 100 ether;
        vm.startPrank(user2);
        token0.mint(user2, swapAmountIn);
        token0.approve(address(dexRouter), type(uint256).max);
        uint256 deadline = block.timestamp + 1000;
        
        unlockData = abi.encode(poolKey, dexRouter.computeSqrtPriceX96(poolKey));
        poolManager.unlock(unlockData);


        dexRouter.swapExactInputSingle(poolKey, swapAmountIn, deadline, 2);
        uint256 u2Token1Gain = token1.balanceOf(user2);
        assertGt(u2Token1Gain, 0, "User2 should receive token1 after swap");
        vm.stopPrank();

        // Step 3: Simulate price change for token1 (price rises from $2.5 to $4.0)
        feed1.updatePrice(4e8);

        // Step 4: User2 tries another swap with outdated slippage (should revert)
        uint256 largerSwapAmount = 200 ether;
        vm.startPrank(user2);
        token0.mint(user2, largerSwapAmount);
        token0.approve(address(dexRouter), type(uint256).max);
        vm.expectRevert();
        
        unlockData = abi.encode(poolKey, dexRouter.computeSqrtPriceX96(poolKey));
        poolManager.unlock(unlockData);



        dexRouter.swapExactInputSingle(poolKey, largerSwapAmount, block.timestamp + 100, 2);
        vm.stopPrank();

        // Step 5: User2 adjusts slippage and retries successfully
        vm.startPrank(user2);
        
        unlockData = abi.encode(poolKey, dexRouter.computeSqrtPriceX96(poolKey));
        poolManager.unlock(unlockData);


        dexRouter.swapExactInputSingle(poolKey, largerSwapAmount, block.timestamp + 100, 50);
        vm.stopPrank();

        // Step 6: User1 removes half the liquidity (and accumulates fees)
        uint256 removeLiquidityAmount = 2500 ether;
        vm.startPrank(user1);
        
        unlockData = abi.encode(poolKey, dexRouter.computeSqrtPriceX96(poolKey));
        poolManager.unlock(unlockData);


        dexRouter.removeLiquidity(poolKey, removeLiquidityAmount, tickLower, tickUpper, positionSalt);
        (uint256 remainingLiquidity0, uint256 remainingLiquidity1) = dexRouter.getTotalLiquidity(address(token0), address(token1));
        assertLt(remainingLiquidity0, amount0, "Liquidity should be reduced for token0 after removeLiquidity");
        assertLt(remainingLiquidity1, amount1, "Liquidity should be reduced for token1 after removeLiquidity");
        vm.stopPrank();

        // Verify that User1 earned fees in token1 and has slightly less token0 (due to swaps)
        uint256 u1Token0AfterRem = token0.balanceOf(user1);
        uint256 u1Token1AfterRem = token1.balanceOf(user1);
        assertGt(u1Token1AfterRem, u1Token1AfterAdd, "User1 should earn token1 fees from swaps");
        assertLt(u1Token0AfterRem, u1Token0AfterAdd, "User1 token0 balance should be lower after swaps (fees in token1)");
    }

    // Expected events from DEXRouter
    event LiquidityAdded(address indexed token0, address indexed token1, address indexed sender, uint256 amount0, uint256 amount1);
    event LiquidityRemoved(address indexed token0, address indexed token1, address indexed sender, uint256 liquidity);
    event SwapExecuted(address indexed token0, address indexed token1, address indexed sender, uint256 amountIn, uint256 amountOut);
}
