// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "./interfaces/IReputationRegistry.sol";
import "./interfaces/IIdentityRegistry.sol";

contract ReputationRegistry is Initializable, UUPSUpgradeable, OwnableUpgradeable, IReputationRegistry {
    IIdentityRegistry public identityRegistry;
    mapping(bytes32 => bool) private _feedbackAuthorizations;
    mapping(uint256 => mapping(uint256 => bytes32)) private _clientServerToAuthId;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address _identityRegistry) public initializer {
        __Ownable_init(msg.sender);
        __UUPSUpgradeable_init();
        identityRegistry = IIdentityRegistry(_identityRegistry);
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    function acceptFeedback(uint256 agentClientId, uint256 agentServerId) external {
        if (!identityRegistry.agentExists(agentClientId)) revert AgentNotFound();
        if (!identityRegistry.agentExists(agentServerId)) revert AgentNotFound();
        
        IIdentityRegistry.AgentInfo memory serverAgent = identityRegistry.getAgent(agentServerId);
        if (msg.sender != serverAgent.agentAddress) revert UnauthorizedFeedback();
        if (agentClientId == agentServerId) revert SelfFeedbackNotAllowed();
        
        if (_clientServerToAuthId[agentClientId][agentServerId] != bytes32(0)) {
            revert FeedbackAlreadyAuthorized();
        }
        
        bytes32 feedbackAuthId = _generateFeedbackAuthId(agentClientId, agentServerId);
        _feedbackAuthorizations[feedbackAuthId] = true;
        _clientServerToAuthId[agentClientId][agentServerId] = feedbackAuthId;
        
        emit AuthFeedback(agentClientId, agentServerId, feedbackAuthId);
    }

    function isFeedbackAuthorized(
        uint256 agentClientId,
        uint256 agentServerId
    ) external view returns (bool isAuthorized, bytes32 feedbackAuthId) {
        feedbackAuthId = _clientServerToAuthId[agentClientId][agentServerId];
        isAuthorized = feedbackAuthId != bytes32(0) && _feedbackAuthorizations[feedbackAuthId];
    }
    
    function getFeedbackAuthId(
        uint256 agentClientId,
        uint256 agentServerId
    ) external view returns (bytes32 feedbackAuthId) {
        feedbackAuthId = _clientServerToAuthId[agentClientId][agentServerId];
    }

    function _generateFeedbackAuthId(
        uint256 agentClientId,
        uint256 agentServerId
    ) private view returns (bytes32 feedbackAuthId) {
        feedbackAuthId = keccak256(
            abi.encodePacked(
                agentClientId,
                agentServerId,
                block.timestamp,
                block.prevrandao,
                msg.sender
            )
        );
    }
}
