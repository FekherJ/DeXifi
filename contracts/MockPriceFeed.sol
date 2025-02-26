// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";    

// @title MockPriceFeed
// @dev Mock price feed for testing Chainlink oracle interactions
contract MockPriceFeed is AggregatorV3Interface {
    int256 private price;

    constructor(int256 _initialPrice) {
        price = _initialPrice;
    }

    function latestRoundData()
        external
        view
        override
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        return (0, price, 0, block.timestamp, 0);
    }

    function decimals() external pure override returns (uint8) {
        return 8; // Chainlink typically uses 8 decimals
    }

    function description() external pure override returns (string memory) {
        return "Mock Chainlink Price Feed"; // 🔹 FIXED: Added missing function
    }

    function version() external pure override returns (uint256) {
        return 1; // 🔹 FIXED: Added missing function
    }

    function getRoundData(uint80 _roundId)
        external
        view
        override
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        return (_roundId, price, 0, block.timestamp, _roundId); // 🔹 FIXED: Added missing function
    }

    function setPrice(int256 _price) external {
        require(_price > 0, "Price cannot be zero");
        price = _price;
    }
}
