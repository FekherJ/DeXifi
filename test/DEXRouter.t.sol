// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../contracts/DEXRouter.sol";
import "../contracts/ERC20Mock.sol";
import "../contracts/MockPriceFeed.sol";
import "../contracts/MockPriceFeedHook.sol";
import "../contracts/WETH.sol";

contract DEXRouterTest is Test {
    DEXRouter public dexRouter;
    ERC20Mock public token0;
    ERC20Mock public token1;
    MockPriceFeed public priceFeedToken0;
    MockPriceFeed public priceFeedToken1;
    MockPriceFeedHook public priceFeedHook;
    WETH public weth;
    IPoolManager public poolManager;

    address public deployer = address(this);

    function setUp() public {
        // Deploy Mock Tokens
        token0 = new ERC20Mock("Token0", "TKN0");
        token1 = new ERC20Mock("Token1", "TKN1");

        // Deploy Mock Chainlink Price Feeds
        priceFeedToken0 = new MockPriceFeed(1500 * 10 ** 18, 18); // 1500 USD per token0
        priceFeedToken1 = new MockPriceFeed(3000 * 10 ** 18, 18); // 3000 USD per token1

        // Deploy WETH Mock
        weth = new WETH();

        // Deploy PoolManager Mock (using a mock address)
        poolManager = IPoolManager(address(100)); 

        // Deploy MockPriceFeedHook instead of abstract PriceFeedHook
        priceFeedHook = new MockPriceFeedHook(address(poolManager));

        // Deploy DEXRouter
        dexRouter = new DEXRouter(poolManager, address(weth));

        // Set price feeds in the router
        dexRouter.setPriceFeed(address(token0), address(priceFeedToken0));
        dexRouter.setPriceFeed(address(token1), address(priceFeedToken1));
    }

    function testAddLiquidity() public {
        uint256 amount0 = 10 * 10 ** 18;
        uint256 amount1 = 10 * 10 ** 18;

        // Approve tokens
        token0.approve(address(dexRouter), amount0);
        token1.approve(address(dexRouter), amount1);

        // Define PoolKey
        PoolKey memory poolKey = PoolKey({
            currency0: Currency.wrap(address(token0)),
            currency1: Currency.wrap(address(token1)),
            fee: 3000,
            tickSpacing: 60,
            hooks: IHooks(address(priceFeedHook)) // Ensure correct type conversion
        });

        // Call addLiquidity
        dexRouter.addLiquidity(poolKey, amount0, amount1, -100, 100, keccak256("salt"));

        // Additional assertions (e.g., check token balances, emitted events)
    }

    function testSwap() public {
        uint256 amountIn = 5 * 10 ** 18;
        uint256 maxSlippage = 5; // 5%
        uint256 deadline = block.timestamp + 1 hours;

        // Approve token
        token0.approve(address(dexRouter), amountIn);

        // Define PoolKey
        PoolKey memory poolKey = PoolKey({
            currency0: Currency.wrap(address(token0)),
            currency1: Currency.wrap(address(token1)),
            fee: 3000,
            tickSpacing: 60,
            hooks: IHooks(address(priceFeedHook))
        });

        // Call swap function
        dexRouter.swapExactInputSingle(poolKey, amountIn, deadline, maxSlippage);

        // Additional assertions to verify correct behavior
    }

    function testRemoveLiquidity() public {
        uint256 liquidity = 10 * 10 ** 18;

        // Define PoolKey
        PoolKey memory poolKey = PoolKey({
            currency0: Currency.wrap(address(token0)),
            currency1: Currency.wrap(address(token1)),
            fee: 3000,
            tickSpacing: 60,
            hooks: IHooks(address(priceFeedHook))
        });

        // Call removeLiquidity
        dexRouter.removeLiquidity(poolKey, liquidity, -100, 100, keccak256("salt"));

        // Additional assertions can be made to check token balances after removal
    }
}
