// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { UniversalRouter } from "@uniswap/universal-router/contracts/UniversalRouter.sol";
import { Commands } from "@uniswap/universal-router/contracts/libraries/Commands.sol";
import { IPermit2 } from "@uniswap/permit2/contracts/interfaces/IPermit2.sol";

interface IDEXRouter {
    function swapTokens(address tokenIn, address tokenOut, uint256 amountIn, uint256 minAmountOut, address recipient) external returns (uint256);
}

contract DEXAggregator {
    address public owner;
    IDEXRouter public dexRouter;
    UniversalRouter public uniRouter;
    IPermit2 public permit2;

    event SwapExecuted(address indexed user, address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 amountOut, string routerUsed);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor(address _dexRouter, address _uniRouter, address _permit2) {
        owner = msg.sender;
        dexRouter = IDEXRouter(_dexRouter);
        uniRouter = UniversalRouter(_uniRouter);
        permit2 = IPermit2(_permit2);
    }

    function setRouters(address _dexRouter, address _uniRouter) external onlyOwner {
        dexRouter = IDEXRouter(_dexRouter);
        uniRouter = UniversalRouter(_uniRouter);
    }

    function approveTokens(address token, uint256 amount) external {
        IERC20(token).approve(address(permit2), amount);
        permit2.approve(token, address(uniRouter), amount, uint48(block.timestamp + 3600));
    }

    function swapViaDEXRouter(address tokenIn, address tokenOut, uint256 amountIn, uint256 minAmountOut) external returns (uint256) {
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenIn).approve(address(dexRouter), amountIn);

        uint256 amountOut = dexRouter.swapTokens(tokenIn, tokenOut, amountIn, minAmountOut, msg.sender);
        
        emit SwapExecuted(msg.sender, tokenIn, tokenOut, amountIn, amountOut, "DEXRouter");
        return amountOut;
    }

    function swapViaUniversalRouter(address tokenIn, address tokenOut, uint256 amountIn, uint256 minAmountOut) external returns (uint256) {
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenIn).approve(address(uniRouter), amountIn);

        bytes memory commands = abi.encodePacked(uint8(Commands.V4_SWAP));
        bytes;
        
        // Encode swap parameters
        inputs[0] = abi.encode(amountIn, minAmountOut, msg.sender);

        // Execute swap
        uniRouter.execute(commands, inputs, block.timestamp + 3600);

        uint256 amountOut = IERC20(tokenOut).balanceOf(msg.sender);
        require(amountOut >= minAmountOut, "Swap failed");

        emit SwapExecuted(msg.sender, tokenIn, tokenOut, amountIn, amountOut, "UniversalRouter");
        return amountOut;
    }

    function bestSwap(address tokenIn, address tokenOut, uint256 amountIn, uint256 minAmountOut) external returns (uint256) {
        // Simulate both swaps to determine best execution
        uint256 dexAmountOut = dexRouter.swapTokens(tokenIn, tokenOut, amountIn, minAmountOut, address(this));
        uint256 uniAmountOut = IERC20(tokenOut).balanceOf(address(this));

        if (uniAmountOut > dexAmountOut) {
            return swapViaUniversalRouter(tokenIn, tokenOut, amountIn, minAmountOut);
        } else {
            return swapViaDEXRouter(tokenIn, tokenOut, amountIn, minAmountOut);
        }
    }
}
