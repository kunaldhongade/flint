// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/**
 * @title DecisionVerifier
 * @notice Verifies that decisions are signed by a trusted Enclave.
 * Hardened with Replay Protection, Domain Separation, and Revocation logic.
 */
contract DecisionVerifier is Initializable, UUPSUpgradeable, OwnableUpgradeable {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    // Registry of Allowed Measurement Hashes (MRENCLAVE/MRIS)
    mapping(bytes32 => bool) public allowedMrenclaves;

    // Registry of Verified Enclave Keys (Ephemeral)
    // EnclaveKey => Expiry Timestamp
    mapping(address => uint256) public verifiedEnclaves;

    // Registry of Revoked Enclave Keys
    mapping(address => bool) public revokedEnclaves;

    // Replay Protection: Prevents reusing the same decision signature
    mapping(bytes32 => bool) public usedDecisionHashes;

    // The address of the trusted off-chain DCAP Verifier Service
    address public attestationVerifier;

    // EIP-712 Domain Separator
    bytes32 public DOMAIN_SEPARATOR;

    // Type hashes for EIP-712
    bytes32 private constant REGISTER_TYPEHASH = keccak256("RegisterEnclave(address enclaveKey,bytes32 mrenclave,uint256 expiry)");

    event EnclaveRegistered(address indexed enclaveKey, bytes32 indexed mrenclave, uint256 expiry);
    event EnclaveRevoked(address indexed enclaveKey);
    event MrenclaveWhitelisted(bytes32 indexed mrenclave, bool status);
    event AttestationVerifierUpdated(address indexed newVerifier);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address _attestationVerifier) public initializer {
        __Ownable_init(msg.sender);
        __UUPSUpgradeable_init();
        
        require(_attestationVerifier != address(0), "DecisionVerifier: Invalid verifier address");
        attestationVerifier = _attestationVerifier;

        _updateDomainSeparator();
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    /**
     * @notice Governance sets the trusted Attestation Verifier Oracle address.
     */
    function setAttestationVerifier(address _attestationVerifier) external onlyOwner {
        require(_attestationVerifier != address(0), "DecisionVerifier: Invalid address");
        attestationVerifier = _attestationVerifier;
        emit AttestationVerifierUpdated(_attestationVerifier);
    }

    /**
     * @notice Governance adds a trusted software measurement.
     */
    function setAllowedMrenclave(bytes32 mrenclave, bool allowed) external onlyOwner {
        allowedMrenclaves[mrenclave] = allowed;
        emit MrenclaveWhitelisted(mrenclave, allowed);
    }

    /**
     * @notice Governance revokes a compromised enclave key.
     * Prevents future registration or verification using this key.
     */
    function revokeEnclave(address enclaveKey) external onlyOwner {
        revokedEnclaves[enclaveKey] = true;
        delete verifiedEnclaves[enclaveKey];
        emit EnclaveRevoked(enclaveKey);
    }

    /**
     * @notice Registers an Enclave Key using a signature from the trusted Attestation Verifier.
     * Fixed with:
     * - Domain Separation (ChainID + address(this))
     * - Revocation Check
     * - EIP-712 Style hashing
     */
    function registerEnclave(
        address enclaveKey,
        bytes32 mrenclave,
        uint256 expiry,
        bytes memory verifierSignature
    ) external {
        require(enclaveKey != address(0), "DecisionVerifier: Invalid enclave key");
        require(!revokedEnclaves[enclaveKey], "DecisionVerifier: Enclave revoked");
        require(expiry > block.timestamp, "DecisionVerifier: Attestation expired");
        require(allowedMrenclaves[mrenclave], "DecisionVerifier: Invalid MRENCLAVE");

        // Compute typed data hash (Domain Separated)
        bytes32 structHash = keccak256(abi.encode(REGISTER_TYPEHASH, enclaveKey, mrenclave, expiry));
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, structHash));

        address signer = digest.recover(verifierSignature);
        require(signer == attestationVerifier, "DecisionVerifier: Invalid Attestation Signature");

        verifiedEnclaves[enclaveKey] = expiry;
        emit EnclaveRegistered(enclaveKey, mrenclave, expiry);
    }

    /**
     * @notice Verifies a decision signature against trusted enclaves.
     * Fixed with:
     * - Replay Protection (usedDecisionHashes)
     * - Revocation Check
     * - Zero-address Check
     */
    /**
     * @notice Verifies a decision signature against trusted enclaves using EIP-712.
     * @param structHash The hash of the decision parameters (without Domain Separator).
     * @param signature The enclave's signature over the Typed Data Digest.
     */
    function verifyDecision(
        bytes32 structHash,
        bytes memory signature
    ) external returns (bool) {
        // 1. Replay Protection: A unique decision struct can only be verified once
        require(!usedDecisionHashes[structHash], "DecisionVerifier: Decision already replayed");
        
        // 2. EIP-712 Typed Data Verification
        // Digest = keccak256("\x19\x01" || DOMAIN_SEPARATOR || structHash)
        bytes32 digest = MessageHashUtils.toTypedDataHash(DOMAIN_SEPARATOR, structHash);
        
        address signer = ECDSA.recover(digest, signature);
        
        require(signer != address(0), "DecisionVerifier: Invalid signer");
        require(!revokedEnclaves[signer], "DecisionVerifier: Signer enclave revoked");
        require(verifiedEnclaves[signer] > block.timestamp, "DecisionVerifier: Enclave not verified or expired");

        // 3. Commit: Mark this decision hash as processed
        usedDecisionHashes[structHash] = true;
        
        return true;
    }

    /**
     * @dev Updates the domain separator if the chain ID changes (e.g., hard fork).
     */
    function _updateDomainSeparator() internal {
        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256(bytes("DecisionVerifier")),
                keccak256(bytes("1")),
                block.chainid,
                address(this)
            )
        );
    }
}
