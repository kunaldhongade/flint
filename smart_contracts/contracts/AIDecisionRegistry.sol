// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title AIDecisionRegistry
 * @dev General registry for verifiable AI outcomes. 
 * Stores the cryptographic link to off-chain IPFS logs and the context of the decision.
 * No DeFi logic is embedded here; it acts purely as a truth source.
 */
contract AIDecisionRegistry {
    
    struct Decision {
        bytes32 decisionId;       // Unique UUIDv4 hash
        bytes32 ipfsCidHash;      // Keccak256(IPFS_CID) for immutable link
        string ipfsCid;           // The actual IPFS CID string (e.g. Qm... or ba...)
        bytes32 domainHash;       // Keccak256("DeFi" | "Medical" | "Security")
        bytes32 chosenModelHash;  // Keccak256(model_id)
        string subject;           // Human-readable context (e.g., "Swap 100 USDC")
        uint256 timestamp;        // Execution time
    }

    // Lookup by decision ID
    mapping(bytes32 => Decision) public decisions;
    
    // Duplicate prevention
    mapping(bytes32 => bool) public isRegistered;

    event DecisionRegistered(
        bytes32 indexed decisionId,
        bytes32 indexed domainHash,
        bytes32 indexed chosenModelHash,
        bytes32 ipfsCidHash,
        string subject,
        uint256 timestamp
    );

    error DecisionAlreadyRegistered(bytes32 decisionId);

    /**
     * @notice Register a new AI decision.
     * @param _decisionId Unique identifier for the decision.
     * @param _ipfsCidHash Hash of the IPFS CID containing the full audit trail.
     * @param _domainHash Hash of the domain (DeFi, Medical, etc.).
     * @param _chosenModelHash Hash of the model ID selected by the user.
     * @param _subject Brief description of the action.
     */
    function registerDecision(
        bytes32 _decisionId,
        bytes32 _ipfsCidHash,
        string calldata _ipfsCid,
        bytes32 _domainHash,
        bytes32 _chosenModelHash,
        string calldata _subject
    ) external {
        if (isRegistered[_decisionId]) {
            revert DecisionAlreadyRegistered(_decisionId);
        }

        decisions[_decisionId] = Decision({
            decisionId: _decisionId,
            ipfsCidHash: _ipfsCidHash,
            ipfsCid: _ipfsCid,
            domainHash: _domainHash,
            chosenModelHash: _chosenModelHash,
            subject: _subject,
            timestamp: block.timestamp
        });

        isRegistered[_decisionId] = true;

        emit DecisionRegistered(
            _decisionId,
            _domainHash,
            _chosenModelHash,
            _ipfsCidHash,
            _subject,
            block.timestamp
        );
    }

    /**
     * @notice Verify if a decision exists and matches the IPFS hash.
     */
    function verifyDecision(bytes32 _decisionId, bytes32 _ipfsCidHash) external view returns (bool) {
        if (!isRegistered[_decisionId]) return false;
        return decisions[_decisionId].ipfsCidHash == _ipfsCidHash;
    }
}
