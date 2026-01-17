// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "./DecisionVerifier.sol";

/**
 * @title DecisionLogger
 * @notice Immutable on-chain storage for AI decision logs with full audit trail.
 * Now enforced by DecisionVerifier with Domain Separation.
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
        
        DOMAIN_SEPARATOR = keccak256(abi.encode(
            keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
            keccak256(bytes("FLINT_DECISION_LOGGER")),
            keccak256(bytes("1")),
            block.chainid,
            address(this)
        ));
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    function setVerifier(address _verifier) external onlyOwner {
        verifier = DecisionVerifier(_verifier);
    }

    /**
     * @notice Log an AI decision on-chain.
     * MUST be signed by a Verified Enclave.
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
        bytes32 onChainHash,
        string memory modelCid,
        string memory xaiCid,
        bytes memory signature // New: Signature from Enclave
    ) external {
        require(decisions[id].timestamp == 0, "DecisionLogger: decision already exists");
        require(action <= 3, "DecisionLogger: invalid action");
        require(confidenceScore <= 10000, "DecisionLogger: invalid confidence score");

        // 1. Reconstruct the hash that was signed
        // We hash the core decision parameters with DOMAIN_SEPARATOR to prevent replay
        bytes32 decisionHash = keccak256(abi.encodePacked(
            DOMAIN_SEPARATOR,
            id, user, action, asset, amount, confidenceScore, onChainHash
        ));

        // 2. Verify: Unknown enclaves cannot log data
        require(verifier.verifyDecision(decisionHash, signature), "DecisionLogger: Unauthorized Enclave Signature");

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

    // View functions (unchanged logic)
    
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
