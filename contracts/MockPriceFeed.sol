// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";    

// @title MockPriceFeed
// @dev Mock price feed for testing Chainlink oracle interactions
contract MockPriceFeed is AggregatorV3Interface {
    uint256 private price; // ✅ Changed to uint256 since we assume no negative prices

    constructor(uint256 _initialPrice) {
        require(_initialPrice > 0, "MockPriceFeed: Invalid initial price");  // ✅ Prevent zero or negative initialization
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
        require(price > 0, "MockPriceFeed: Price not set");  // ✅ Prevent invalid prices
        return (0, int256(price), 0, block.timestamp, 0);
    }

    function decimals() external pure override returns (uint8) {
        return 8; // Chainlink typically uses 8 decimals
    }

    function description() external pure override returns (string memory) {
        return "Mock Chainlink Price Feed"; // ✅ Function implemented
    }

    function version() external pure override returns (uint256) {
        return 1; // ✅ Function implemented
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
        require(price > 0, "MockPriceFeed: Price not set");  // ✅ Ensure valid price
        return (_roundId, int256(price), 0, block.timestamp, _roundId);
    }

    function setPrice(uint256 _price) external {
        require(_price > 0, "MockPriceFeed: Invalid price update");  // ✅ Prevent zero price updates
        price = _price;
    }
}
