// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title DecisionLogger
 * @notice Immutable on-chain storage for AI decision logs with full audit trail
 */
contract DecisionLogger is Ownable {
    struct Decision {
        bytes32 id;
        uint256 timestamp;
        uint8 action; // 0=ALLOCATE, 1=REALLOCATE, 2=DEALLOCATE, 3=HOLD
        address user;
        address asset;
        uint256 amount;
        address fromProtocol;
        address toProtocol;
        uint256 confidenceScore; // 0-10000 (10000 = 100%)
        string reasons; // JSON string of reasons
        string dataSources; // JSON string of data sources
        string alternatives; // JSON string of alternatives considered
        bytes32 onChainHash; // Hash of off-chain decision data
    }

    // Mapping from decision ID to Decision
    mapping(bytes32 => Decision) public decisions;
    
    // Mapping from user to array of decision IDs
    mapping(address => bytes32[]) public userDecisions;
    
    // Array of all decision IDs
    bytes32[] public allDecisions;

    // Events
    event DecisionLogged(
        bytes32 indexed id,
        address indexed user,
        uint8 action,
        address asset,
        uint256 amount,
        uint256 confidenceScore
    );

    /**
     * @notice Log an AI decision on-chain
     */
    function logDecision(
        bytes32 id,
        address user,
        uint8 action,
        address asset,
        uint256 amount,
        address fromProtocol,
        address toProtocol,
        uint256 confidenceScore,
        string memory reasons,
        string memory dataSources,
        string memory alternatives,
        bytes32 onChainHash
    ) external onlyOwner {
        require(decisions[id].timestamp == 0, "DecisionLogger: decision already exists");
        require(action <= 3, "DecisionLogger: invalid action");
        require(confidenceScore <= 10000, "DecisionLogger: invalid confidence score");

        Decision memory decision = Decision({
            id: id,
            timestamp: block.timestamp,
            action: action,
            user: user,
            asset: asset,
            amount: amount,
            fromProtocol: fromProtocol,
            toProtocol: toProtocol,
            confidenceScore: confidenceScore,
            reasons: reasons,
            dataSources: dataSources,
            alternatives: alternatives,
            onChainHash: onChainHash
        });

        decisions[id] = decision;
        userDecisions[user].push(id);
        allDecisions.push(id);

        emit DecisionLogged(id, user, action, asset, amount, confidenceScore);
    }

    /**
     * @notice Get a decision by ID
     */
    function getDecision(bytes32 id) external view returns (Decision memory) {
        require(decisions[id].timestamp != 0, "DecisionLogger: decision not found");
        return decisions[id];
    }

    /**
     * @notice Get all decisions for a user
     */
    function getUserDecisions(address user) external view returns (bytes32[] memory) {
        return userDecisions[user];
    }

    /**
     * @notice Get total number of decisions
     */
    function getTotalDecisions() external view returns (uint256) {
        return allDecisions.length;
    }

    /**
     * @notice Get decision IDs with pagination
     */
    function getDecisions(uint256 offset, uint256 limit) external view returns (bytes32[] memory) {
        uint256 total = allDecisions.length;
        if (offset >= total) {
            return new bytes32[](0);
        }
        
        uint256 end = offset + limit;
        if (end > total) {
            end = total;
        }
        
        bytes32[] memory result = new bytes32[](end - offset);
        for (uint256 i = offset; i < end; i++) {
            result[i - offset] = allDecisions[i];
        }
        
        return result;
    }
}

