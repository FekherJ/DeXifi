// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract WETH is ERC20 {
    constructor() ERC20("Wrapped Ether", "WETH") {}

    function deposit() public payable {
        _mint(msg.sender, msg.value);
    }

    function withdraw(uint256 amount) public {
        require(balanceOf(msg.sender) >= amount, "Not enough WETH");
        _burn(msg.sender, amount);
        //payable(msg.sender).transfer(amount);
        (bool success, ) = msg.sender.call{value: amount}(""); // ✅ Fixed reentrancy vulnerability
        require(success, "ETH transfer failed");
    }

    receive() external payable {
        deposit();
    }
}

