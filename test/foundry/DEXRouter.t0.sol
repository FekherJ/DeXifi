// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Test.sol";
import "forge-std/console.sol";
import "../../contracts/DEXRouter.sol";
import "../../contracts/MockPriceFeed.sol";
import "../../contracts/ERC20Mock.sol";
import "../../contracts/WETH.sol";
import "@uniswap/v4-core/src/PoolManager.sol";
import "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import "@uniswap/v4-core/src/types/Currency.sol";
import "@uniswap/v4-core/src/libraries/TickMath.sol";
import {PoolId, PoolIdLibrary} from "@uniswap/v4-core/src/types/PoolId.sol";
import {IHooks} from "@uniswap/v4-core/src/interfaces/IHooks.sol";
import {Vm} from "forge-std/Vm.sol";


contract DEXRouterTest is Test {
    using CurrencyLibrary for Currency;
    using PoolIdLibrary for PoolId;

    PoolManager public poolManager;
    DEXRouter public dexRouter;
    ERC20Mock public token0;
    ERC20Mock public token1;
    WETH public weth;
    MockPriceFeed public feed0;
    MockPriceFeed public feed1;

    event PoolInitialized(address indexed token0, address indexed token1, uint160 sqrtPriceX96);

    address public user1 = address(0x1);
    address public user2 = address(0x2);
    
    PoolKey public poolKey;
    int24 public tickLower;
    int24 public tickUpper;
    bytes32 public positionSalt = keccak256("test_position");

    function setUp() public {
        console.log("Starting setup...");
        _deployContracts();
        _setupUsers();
        _createPool();
        _setInitialLiquidity();
        console.log("Setup completed successfully");
    }

    function _deployContracts() internal {
        console.log("Deploying PoolManager...");
        poolManager = new PoolManager(address(this));
        
        console.log("Deploying tokens...");
        token0 = new ERC20Mock("Token0", "TK0");
        token1 = new ERC20Mock("Token1", "TK1");
        weth = new WETH();
        
        console.log("Deploying DEXRouter...");
        dexRouter = new DEXRouter(IPoolManager(address(poolManager)), address(weth));
        
        console.log("Deploying price feeds...");
        feed0 = new MockPriceFeed(1e8, 8); // $1.00
        feed1 = new MockPriceFeed(2e8, 8); // $2.00
        
        console.log("Configuring price feeds...");
        dexRouter.setPriceFeed(address(token0), address(feed0));
        dexRouter.setPriceFeed(address(token1), address(feed1));
    }

    function _setupUsers() internal {
        console.log("Setting up users...");
        token0.mint(user1, 1_000_000 ether);
        token1.mint(user1, 1_000_000 ether);
        token0.mint(user2, 1_000_000 ether);
        token1.mint(user2, 1_000_000 ether);

        vm.startPrank(user1);
        token0.approve(address(dexRouter), type(uint256).max);
        token1.approve(address(dexRouter), type(uint256).max);
        vm.stopPrank();

        vm.startPrank(user2);
        token0.approve(address(dexRouter), type(uint256).max);
        token1.approve(address(dexRouter), type(uint256).max);
        vm.stopPrank();
    }

    function _createPool() internal {
    console.log("Creating pool...");
    (address tokenA, address tokenB) = address(token0) < address(token1) 
        ? (address(token0), address(token1)) 
        : (address(token1), address(token0));

    poolKey = PoolKey({
        currency0: Currency.wrap(tokenA),
        currency1: Currency.wrap(tokenB),
        fee: 3000,
        tickSpacing: 60,
        hooks: IHooks(address(0))
    });

    // Validate price feeds before initialization
    require(
        dexRouter.getPriceFeed(Currency.unwrap(poolKey.currency0)) != address(0),
        "Token0 price feed not set"
    );
    require(
        dexRouter.getPriceFeed(Currency.unwrap(poolKey.currency1)) != address(0),
        "Token1 price feed not set"
    ); // Added missing semicolon

    (uint80 roundId1, int256 answer1,,,) = feed0.latestRoundData();
    console.log("Token0 price:", answer1);

    (uint80 roundId2, int256 answer2,,,) = feed1.latestRoundData();
    console.log("Token1 price:", answer2);
    


    console.log("Initializing pool...");
    try dexRouter.initializePoolWithChainlink(poolKey) {
        console.log("Pool initialized");
        
        // Verify pool creation
        uint160 sqrtPriceX96 = dexRouter.computeSqrtPriceX96(poolKey);
        require(sqrtPriceX96 > 0, "Pool initialization failed");
    } catch Error(string memory reason) {
        revert(string(abi.encodePacked("Pool init failed: ", reason)));
    }
}

    function _setInitialLiquidity() internal {
        console.log("Setting initial liquidity...");
    
        // Get validated price from initialized pool
        uint160 sqrtPriceX96 = dexRouter.computeSqrtPriceX96(poolKey);

        console.log("Validated sqrtPriceX96:", sqrtPriceX96);
    
        // Calculate ticks aligned with tick spacing (60)
        int24 currentTick = TickMath.getTickAtSqrtPrice(sqrtPriceX96);
        currentTick = ((currentTick + (poolKey.tickSpacing / 2)) / poolKey.tickSpacing) * poolKey.tickSpacing;
    
        tickLower = currentTick - (10 * poolKey.tickSpacing); // -600 ticks (10% range)
        tickUpper = currentTick + (10 * poolKey.tickSpacing); // +600 ticks

        uint256 amount0 = 10_000 ether;
        uint256 amount1 = 10_000 ether;

        uint128 liquidity = dexRouter.getLiquidityForAmounts(
            sqrtPriceX96,
            TickMath.getSqrtPriceAtTick(tickLower),
            TickMath.getSqrtPriceAtTick(tickUpper),
            amount0,
            amount1
        );

        console.log("Calculated liquidity:", liquidity);





        vm.prank(user1);
        try dexRouter.addLiquidity(
            poolKey,
            amount0,
            amount1,
            tickLower,
            tickUpper,
            positionSalt
        ) {
            console.log("Initial liquidity added");
            (uint256 liq0, uint256 liq1) = dexRouter.getTotalLiquidity(address(token0), address(token1));
            console.log("Final liquidity:", liq0, liq1);
        } catch Error(string memory reason) {
            revert(string(abi.encodePacked("Add liquidity failed: ", reason)));
        }
    }

    // ===== Price Feed Tests =====
    function testPriceFeedConfiguration() public {
        assertEq(dexRouter.getPriceFeed(address(token0)), address(feed0), "Token0 feed mismatch");
        assertEq(dexRouter.getPriceFeed(address(token1)), address(feed1), "Token1 feed mismatch");
    }

    function testPriceFeedUpdates() public {
        feed0.updatePrice(15e8); // $1.50
        uint256 newPrice = dexRouter.getLatestPrice(address(token0));
        assertEq(newPrice, 1.5e18, "Price update failed");
    }

    function testPoolInitialization() public {
    // Create a new pool with different parameters to avoid conflict
    PoolKey memory newPoolKey = PoolKey({
        currency0: Currency.wrap(address(token0)),
        currency1: Currency.wrap(address(token1)),
        fee: 10000, // Different fee from setup's 3000
        tickSpacing: 200,
        hooks: IHooks(address(0))
    });

    // Compute expected sqrtPriceX96 using the same logic as DEXRouter
    uint256 price0 = dexRouter.getLatestPrice(address(token0)); // $1.00 (1e18)
    uint256 price1 = dexRouter.getLatestPrice(address(token1)); // $2.00 (2e18)
    uint256 ratio = FullMath.mulDiv(price1, 1e18, price0); // 2e18 / 1e18 = 2
    uint256 sqrtRatio = Babylonian.sqrt(ratio); // sqrt(2e36) = 1.4142e18
    uint160 expectedSqrtPriceX96 = uint160((sqrtRatio * 2**96) / 1e9); // Proper scaling

    // Expect the PoolInitialized event
    vm.expectEmit(true, true, true, true);
    emit PoolInitialized(
        address(token0),
        address(token1),
        expectedSqrtPriceX96
    );

    // Initialize the new pool (called by test contract, owner of PoolManager)
    dexRouter.initializePoolWithChainlink(newPoolKey);

    // Verify pool state
    uint160 sqrtPriceX96 = dexRouter.computeSqrtPriceX96(poolKey);

    assertEq(sqrtPriceX96, expectedSqrtPriceX96, "Incorrect sqrtPriceX96");
}

/*
    // ===== Pool Management Tests =====
function testPoolInitialization() public {
    // Get the PoolId from the PoolKey
    PoolId poolId = poolKey.toId();
    
    // Calculate storage slot for the pool's sqrtPriceX96
    // Assuming _pools mapping is at slot 0 and sqrtPriceX96 is the first field
    bytes32 baseSlot = keccak256(abi.encode(poolId, uint256(0)));
    
    // Load the sqrtPriceX96 value from storage
    uint160 sqrtPriceX96 = uint160(uint256(vm.load(address(poolManager), baseSlot)));
    
    // Perform assertions
    assertGt(sqrtPriceX96, 0, "Pool not initialized");
    
    uint256 expectedPrice = dexRouter.computeSqrtPriceX96(poolKey);
    assertEq(sqrtPriceX96, uint160(expectedPrice), "Incorrect initial price");
}
*/

    // ===== Liquidity Management Tests =====
    function testLiquidityLifecycle() public {
        uint256 initialBal0 = token0.balanceOf(user1);
        uint256 initialBal1 = token1.balanceOf(user1);
        uint256 amount0 = 1000 ether;
        uint256 amount1 = 1000 ether;

        vm.startPrank(user1);
        dexRouter.addLiquidity(poolKey, amount0, amount1, tickLower, tickUpper, positionSalt);

        // Verify balances
        assertEq(token0.balanceOf(user1), initialBal0 - amount0, "Token0 balance mismatch");
        (uint256 liq0, uint256 liq1) = dexRouter.getTotalLiquidity(address(token0), address(token1));
        assertApproxEqAbs(liq0, 10_000 ether + amount0, 1e15, "Liquidity tracking mismatch");

        // Remove liquidity
        dexRouter.removeLiquidity(poolKey, amount0, tickLower, tickUpper, positionSalt);
        assertGt(token0.balanceOf(user1), initialBal0 - amount0, "Funds not returned");
        vm.stopPrank();
    }

    // ===== Swap Tests =====
    function testBasicSwap() public {
        uint256 swapAmount = 100 ether;
        uint256 initialBal = token1.balanceOf(user2);

        vm.startPrank(user2);   // sets msg.sender for all subsequent calls until stopPrank is called.
        dexRouter.swapExactInputSingle(poolKey, swapAmount, block.timestamp + 1 hours, 5);
        
        // Verify swap executed
        assertEq(token0.balanceOf(user2), 1_000_000 ether - swapAmount, "Input token not spent");
        assertGt(token1.balanceOf(user2), initialBal, "Output token not received");
        vm.stopPrank();
    }

    function testSwapBoundaries() public {
        vm.startPrank(user2);
        // Test tight slippage
        vm.expectRevert();
        dexRouter.swapExactInputSingle(poolKey, 100 ether, block.timestamp + 1 hours, 9999);

        // Test expired deadline
        vm.expectRevert("Expired");
        dexRouter.swapExactInputSingle(poolKey, 100 ether, block.timestamp - 1, 0);
        vm.stopPrank();
    }

    // ===== Edge Case Tests =====
    function testInvalidLiquidityOperations() public {
        vm.startPrank(user1);
        // Test zero amounts
        vm.expectRevert("Invalid amounts");
        dexRouter.addLiquidity(poolKey, 0, 100 ether, tickLower, tickUpper, positionSalt);

        // Test invalid tick range
        vm.expectRevert();
        dexRouter.addLiquidity(poolKey, 100 ether, 100 ether, 0, 0, positionSalt);
        vm.stopPrank();
    }

    // ===== Helper Function Tests =====
    function testSqrtPriceCalculation() public {
        uint160 sqrtPrice = dexRouter.computeSqrtPriceX96(poolKey);
        uint256 price0 = dexRouter.getLatestPrice(address(token0));
        uint256 price1 = dexRouter.getLatestPrice(address(token1));
        uint256 expected = FullMath.mulDiv(
            Babylonian.sqrt(price1 * 1e18), 
            FixedPoint96.Q96, 
            Babylonian.sqrt(price0 * 1e18)
        );
        assertEq(sqrtPrice, uint160(expected), "Incorrect sqrtPrice calculation");
    }

    receive() external payable {} // For WETH tests
}