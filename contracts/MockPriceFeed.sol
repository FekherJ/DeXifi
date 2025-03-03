// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MockPriceFeed is AggregatorV3Interface,Ownable(msg.sender)  {
    int256 private latestAnswer;
    uint8 private immutable decimals_;
    uint80 private roundId;
    uint256 private updatedAt;

    event PriceUpdated(int256 newPrice, uint256 timestamp);

    constructor(int256 initialPrice, uint8 _decimals) {
        latestAnswer = initialPrice;
        decimals_ = _decimals;
        roundId = 1;
        updatedAt = block.timestamp;
    }

    function updatePrice(int256 newPrice) external onlyOwner {
        latestAnswer = newPrice;
        roundId++;
        updatedAt = block.timestamp;
        emit PriceUpdated(newPrice, updatedAt);
    }

    function decimals() external view override returns (uint8) {
        return decimals_;
    }

    function description() external pure override returns (string memory) {
        return "Mock Chainlink Price Feed";
    }

    function version() external pure override returns (uint256) {
        return 1;
    }

    function getRoundData(uint80 _roundId)
        external
        view
        override
        returns (uint80, int256, uint256, uint256, uint80)
    {
        require(_roundId == roundId, "MockPriceFeed: Invalid roundId");
        return (roundId, latestAnswer, updatedAt, updatedAt, roundId);
    }

    function latestRoundData()
        external
        view
        override
        returns (uint80, int256, uint256, uint256, uint80)
    {
        return (roundId, latestAnswer, updatedAt, updatedAt, roundId);
    }
}