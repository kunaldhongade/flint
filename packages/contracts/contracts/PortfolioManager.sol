// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./FeeManager.sol";
import "./DecisionLogger.sol";

/**
 * @title PortfolioManager
 * @notice Manages user portfolios and integrates with FeeManager and DecisionLogger
 */
contract PortfolioManager is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    FeeManager public feeManager;
    DecisionLogger public decisionLogger;

    // User portfolio tracking
    struct Position {
        address asset;
        address protocol;
        uint256 amount;
        uint256 entryValueUSD;
        uint256 currentValueUSD;
        uint256 riskScore; // 0-10000 (10000 = 100%)
        uint256 yieldAPY; // Basis points (10000 = 100%)
    }

    mapping(address => Position[]) public userPositions;
    mapping(address => uint256) public userTotalValueUSD;

    // Events
    event PositionAdded(address indexed user, address indexed asset, address indexed protocol, uint256 amount);
    event PositionUpdated(address indexed user, address indexed asset, address indexed protocol, uint256 amount);
    event PositionRemoved(address indexed user, address indexed asset, address indexed protocol);
    event PortfolioValueUpdated(address indexed user, uint256 totalValueUSD);

    constructor(address _feeManager, address _decisionLogger) Ownable(msg.sender) {
        require(_feeManager != address(0), "PortfolioManager: invalid fee manager");
        require(_decisionLogger != address(0), "PortfolioManager: invalid decision logger");
        feeManager = FeeManager(_feeManager);
        decisionLogger = DecisionLogger(_decisionLogger);
    }

    /**
     * @notice Add a new position to user's portfolio
     */
    function addPosition(
        address user,
        address asset,
        address protocol,
        uint256 amount,
        uint256 valueUSD,
        uint256 riskScore,
        uint256 yieldAPY
    ) external onlyOwner {
        userPositions[user].push(Position({
            asset: asset,
            protocol: protocol,
            amount: amount,
            entryValueUSD: valueUSD,
            currentValueUSD: valueUSD,
            riskScore: riskScore,
            yieldAPY: yieldAPY
        }));

        userTotalValueUSD[user] += valueUSD;
        
        // Record deposit in fee manager
        feeManager.recordDeposit(user, asset, amount, valueUSD);

        emit PositionAdded(user, asset, protocol, amount);
        emit PortfolioValueUpdated(user, userTotalValueUSD[user]);
    }

    /**
     * @notice Update an existing position
     */
    function updatePosition(
        address user,
        uint256 positionIndex,
        uint256 newAmount,
        uint256 newValueUSD,
        uint256 newRiskScore,
        uint256 newYieldAPY
    ) external onlyOwner {
        require(positionIndex < userPositions[user].length, "PortfolioManager: invalid position index");
        
        Position storage position = userPositions[user][positionIndex];
        uint256 oldValue = position.currentValueUSD;
        
        position.amount = newAmount;
        position.currentValueUSD = newValueUSD;
        position.riskScore = newRiskScore;
        position.yieldAPY = newYieldAPY;

        userTotalValueUSD[user] = userTotalValueUSD[user] - oldValue + newValueUSD;

        emit PositionUpdated(user, position.asset, position.protocol, newAmount);
        emit PortfolioValueUpdated(user, userTotalValueUSD[user]);
    }

    /**
     * @notice Remove a position from user's portfolio
     */
    function removePosition(address user, uint256 positionIndex) external onlyOwner {
        require(positionIndex < userPositions[user].length, "PortfolioManager: invalid position index");
        
        Position memory position = userPositions[user][positionIndex];
        userTotalValueUSD[user] -= position.currentValueUSD;

        // Remove from array
        uint256 lastIndex = userPositions[user].length - 1;
        if (positionIndex != lastIndex) {
            userPositions[user][positionIndex] = userPositions[user][lastIndex];
        }
        userPositions[user].pop();

        // Record withdrawal in fee manager
        feeManager.recordWithdrawal(user, position.asset, position.amount);

        emit PositionRemoved(user, position.asset, position.protocol);
        emit PortfolioValueUpdated(user, userTotalValueUSD[user]);
    }

    /**
     * @notice Get user's portfolio positions
     */
    function getUserPositions(address user) external view returns (Position[] memory) {
        return userPositions[user];
    }

    /**
     * @notice Get user's total portfolio value
     */
    function getUserTotalValue(address user) external view returns (uint256) {
        return userTotalValueUSD[user];
    }
}

