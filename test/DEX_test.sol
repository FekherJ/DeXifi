// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../contracts/DEXAggregator.sol";
import "../contracts/DEXRouter.sol";
import "../contracts/ERC20Mock.sol";
import "../contracts/WETH.sol";
import "../contracts/MockPriceFeed.sol";


contract DEXAggregatorTest is Test {
    DEXAggregator aggregator;
    DEXRouter router;
    ERC20Mock tokenA;
    ERC20Mock tokenB;
    WETH weth;
    address dex1;
    address dex2;
    address user;

    function setUp() public {
        user = address(this);

        // Deploy Mock ERC20 Tokens
        tokenA = new ERC20Mock("TokenA", "TKA", 18);
        tokenB = new ERC20Mock("TokenB", "TKB", 18);
        
        // Deploy Mock WETH
        weth = new WETH();
        
        // Deploy Aggregator & Router
        aggregator = new DEXAggregator();
        router = new DEXRouter(address(aggregator), address(weth));

        // Set up mock DEX addresses
        dex1 = address(0x1);
        dex2 = address(0x2);
    }

    function testTokenDeployment() public {
        assertEq(tokenA.name(), "TokenA");
        assertEq(tokenB.name(), "TokenB");
        assertEq(tokenA.decimals(), 18);
        assertEq(tokenB.decimals(), 18);
    }

    function testAddDEX() public {
        aggregator.addDEX(dex1);
        aggregator.addDEX(dex2);
        assertTrue(aggregator.isDEXSupported(dex1));
        assertTrue(aggregator.isDEXSupported(dex2));
    }

    function testSwapTokenToToken() public {
        aggregator.addDEX(dex1);
        aggregator.addDEX(dex2);

        // Mint tokens to user
        tokenA.mint(user, 1000 ether);
        tokenB.mint(user, 1000 ether);

        // Approve Router
        tokenA.approve(address(router), 500 ether);

        // Perform swap
        router.swap(address(tokenA), address(tokenB), 500 ether, user);

        // Ensure swap executed
        assertGt(tokenB.balanceOf(user), 0);
    }

    function testSwapWithZeroInput() public {
        vm.expectRevert();
        router.swap(address(tokenA), address(tokenB), 0, user);
    }

    function testInvalidDEX() public {
        vm.expectRevert();
        router.swap(address(tokenA), address(tokenB), 100 ether, user);
    }

    function testSlippageProtection() public {
        aggregator.addDEX(dex1);
        aggregator.addDEX(dex2);
        
        tokenA.mint(user, 1000 ether);
        tokenA.approve(address(router), 1000 ether);
        
        uint256 minAmount = 400 ether; // Simulate slippage guard
        
        vm.expectRevert(); // Expect revert if swap is lower than minAmount
        router.swapWithSlippage(address(tokenA), address(tokenB), 500 ether, minAmount, user);
    }

    function testReentrancyAttack() public {
        aggregator.addDEX(dex1);
        aggregator.addDEX(dex2);
        
        tokenA.mint(user, 1000 ether);
        tokenA.approve(address(router), 1000 ether);

        vm.expectRevert();
        router.reentrantSwap(address(tokenA), address(tokenB), 500 ether, user);
    }
}