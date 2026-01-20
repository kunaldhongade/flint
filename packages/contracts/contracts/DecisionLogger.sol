// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "./DecisionVerifier.sol";

/**
 * @title DecisionLogger
 * @notice Immutable on-chain storage for AI decision logs with full audit trail.
 * Hardened to ensure all metadata is integrity-protected by Enclave signatures.
 */
contract DecisionLogger is Initializable, UUPSUpgradeable, OwnableUpgradeable {
    DecisionVerifier public verifier;
    
    // Domain Separator to prevent cross-chain or cross-contract replay attacks
    bytes32 public DOMAIN_SEPARATOR;

    struct Decision {
        bytes32 id;
        uint256 timestamp;
        uint8 action;
        address user;
        address asset;
        uint256 amount;
        address fromProtocol;
        address toProtocol;
        uint256 confidenceScore;
        string reasons;
        string dataSources;
        string alternatives;
        bytes32 onChainHash;
        string modelCid;
        string xaiCid;
    }

    mapping(bytes32 => Decision) public decisions;
    mapping(address => bytes32[]) public userDecisions;
    bytes32[] public allDecisions;

    event DecisionLogged(
        bytes32 indexed id,
        address indexed user,
        uint8 action,
        address asset,
        uint256 amount,
        uint256 confidenceScore
    );

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address _verifier) public initializer {
        __Ownable_init(msg.sender);
        __UUPSUpgradeable_init();
        verifier = DecisionVerifier(_verifier);
        
        _updateDomainSeparator();
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    /**
     * @notice Governance sets the trusted Decision Verifier.
     */
    function setVerifier(address _verifier) external onlyOwner {
        require(_verifier != address(0), "DecisionLogger: Invalid verifier");
        verifier = DecisionVerifier(_verifier);
    }

    /**
     * @notice Log an AI decision on-chain.
     * MUST be signed by a Verified Enclave.
     * Hardened Fix: All parameters are now part of the signed hash.
     */
    // EIP-712 TypeHash for Decision
    bytes32 private constant DECISION_TYPEHASH = keccak256("Decision(bytes32 id,address user,uint8 action,address asset,uint256 amount,address fromProtocol,address toProtocol,uint256 confidenceScore,bytes32 reasonsHash,bytes32 dataSourcesHash,bytes32 alternativesHash,bytes32 onChainHash,bytes32 modelCidHash,bytes32 xaiCidHash)");

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
        bytes32 onChainHash,
        string memory modelCid,
        string memory xaiCid,
        bytes memory signature 
    ) external {
        require(decisions[id].timestamp == 0, "DecisionLogger: decision already exists");
        require(user != address(0), "DecisionLogger: Invalid user");
        require(action <= 3, "DecisionLogger: invalid action");
        require(confidenceScore <= 10000, "DecisionLogger: invalid confidence score");

        // 1. Comprehensive Data Hashing: 
        // We use abi.encode to prevent collisions and include ALL fields to prevent tampering.
        // Hashing dynamic strings (reasons, dataSources, etc.) is mandatory for integrity.
        bytes32 structHash = keccak256(abi.encode(
            DECISION_TYPEHASH,
            id,
            user,
            action,
            asset,
            amount,
            fromProtocol,
            toProtocol,
            confidenceScore,
            keccak256(bytes(reasons)),
            keccak256(bytes(dataSources)),
            keccak256(bytes(alternatives)),
            onChainHash,
            keccak256(bytes(modelCid)),
            keccak256(bytes(xaiCid))
        ));

        // 2. Verify: Any change to any parameter (even CID or Reasons) will invalidate the signature.
        // Also triggers relay protection inside DecisionVerifier.
        // Verifier will compute digest using its own DOMAIN_SEPARATOR.
        require(verifier.verifyDecision(structHash, signature), "DecisionLogger: Unauthorized or Replayed Signature");

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
            onChainHash: onChainHash,
            modelCid: modelCid,
            xaiCid: xaiCid
        });

        decisions[id] = decision;
        userDecisions[user].push(id);
        allDecisions.push(id);

        emit DecisionLogged(id, user, action, asset, amount, confidenceScore);
    }

    function _updateDomainSeparator() internal {
        DOMAIN_SEPARATOR = keccak256(abi.encode(
            keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
            keccak256(bytes("FLINT_DECISION_LOGGER")),
            keccak256(bytes("1")),
            block.chainid,
            address(this)
        ));
    }

    // View functions 
    
    function getDecision(bytes32 id) external view returns (Decision memory) {
        require(decisions[id].timestamp != 0, "DecisionLogger: decision not found");
        return decisions[id];
    }

    function getUserDecisions(address user) external view returns (bytes32[] memory) {
        return userDecisions[user];
    }

    function getTotalDecisions() external view returns (uint256) {
        return allDecisions.length;
    }

    function getDecisions(uint256 offset, uint256 limit) external view returns (bytes32[] memory) {
        uint256 total = allDecisions.length;
        if (offset >= total) return new bytes32[](0);
        uint256 end = offset + limit;
        if (end > total) end = total;
        
        bytes32[] memory result = new bytes32[](end - offset);
        for (uint256 i = offset; i < end; i++) {
            result[i - offset] = allDecisions[i];
        }
        return result;
    }
}
