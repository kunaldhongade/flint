// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title DecisionLogger
 * @dev Immutable logbook for AI decisions in the Flint Trust Layer.
 * Stores evidence of AI reasoning, inputs, and context (FTSO/FDC).
 */
contract DecisionLogger {
    
    struct Decision {
        bytes32 decisionId;
        bytes32 decisionHash; // Keccak256(decision_json)
        bytes32 modelHash;    // Keccak256(model_id + template)
        uint256 ftsoRoundId;
        bytes32 fdcProofHash; // Optional, 0x0 if unused
        uint256 timestamp;
        address backendSigner;
    }

    // Prevent replay attacks / duplicate logs
    mapping(bytes32 => bool) public isDecisionLogged;
    
    // Store full details for on-chain transparency
    mapping(bytes32 => Decision) public decisions;

    event DecisionLogged(
        bytes32 indexed decisionId,
        bytes32 indexed decisionHash,
        address indexed backendSigner,
        uint256 timestamp,
        uint256 ftsoRoundId,
        bytes32 fdcProofHash
    );

    error DecisionAlreadyLogged(bytes32 decisionId);
    error InvalidSigner(address signer);

    /**
     * @notice Log a new AI decision.
     * @dev No access control - any backend with a valid signature can technically post,
     * but we verify the signer payload in logic (or rely on valid signatures in future extensions).
     * For this immutable version, we simply record what is sent.
     */
    function logDecision(
        bytes32 _decisionId,
        bytes32 _decisionHash,
        bytes32 _modelHash,
        uint256 _ftsoRoundId,
        bytes32 _fdcProofHash,
        uint256 _timestamp,
        address _backendSigner
    ) external {
        if (isDecisionLogged[_decisionId]) {
            revert DecisionAlreadyLogged(_decisionId);
        }

        if (_backendSigner == address(0)) {
            revert InvalidSigner(_backendSigner);
        }

        Decision memory newDecision = Decision({
            decisionId: _decisionId,
            decisionHash: _decisionHash,
            modelHash: _modelHash,
            ftsoRoundId: _ftsoRoundId,
            fdcProofHash: _fdcProofHash,
            timestamp: _timestamp,
            backendSigner: _backendSigner
        });

        decisions[_decisionId] = newDecision;
        isDecisionLogged[_decisionId] = true;

        emit DecisionLogged(
            _decisionId,
            _decisionHash,
            _backendSigner,
            _timestamp,
            _ftsoRoundId,
            _fdcProofHash
        );
    }

    /**
     * @notice Fetch decision details.
     */
    function getDecision(bytes32 _decisionId) external view returns (Decision memory) {
        return decisions[_decisionId];
    }
}
