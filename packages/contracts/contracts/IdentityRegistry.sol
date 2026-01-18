// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "./interfaces/IIdentityRegistry.sol";

contract IdentityRegistry is Initializable, UUPSUpgradeable, OwnableUpgradeable, IIdentityRegistry {
    uint256 private _agentIdCounter;
    mapping(uint256 => AgentInfo) private _agents;
    mapping(string => uint256) private _domainToAgentId;
    mapping(address => uint256) private _addressToAgentId;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize() public initializer {
        __Ownable_init(msg.sender);
        __UUPSUpgradeable_init();
        _agentIdCounter = 1;
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    function newAgent(
        string calldata agentDomain, 
        address agentAddress
    ) external returns (uint256 agentId) {
        if (msg.sender != agentAddress) revert UnauthorizedRegistration();
        if (bytes(agentDomain).length == 0) revert InvalidDomain();
        if (agentAddress == address(0)) revert InvalidAddress();
        
        string memory normalizedDomain = _toLowercase(agentDomain);
        if (_domainToAgentId[normalizedDomain] != 0) revert DomainAlreadyRegistered();
        if (_addressToAgentId[agentAddress] != 0) revert AddressAlreadyRegistered();
        
        agentId = _agentIdCounter++;
        _agents[agentId] = AgentInfo({
            agentId: agentId,
            agentDomain: agentDomain,
            agentAddress: agentAddress
        });
        
        _domainToAgentId[normalizedDomain] = agentId;
        _addressToAgentId[agentAddress] = agentId;
        
        emit AgentRegistered(agentId, agentDomain, agentAddress);
    }
    
    function updateAgent(
        uint256 agentId,
        string calldata newAgentDomain,
        address newAgentAddress
    ) external returns (bool success) {
        AgentInfo storage agent = _agents[agentId];
        if (agent.agentId == 0) revert AgentNotFound();
        if (msg.sender != agent.agentAddress) revert UnauthorizedUpdate();
        
        if (bytes(newAgentDomain).length > 0) {
            string memory normalizedNewDomain = _toLowercase(newAgentDomain);
            if (_domainToAgentId[normalizedNewDomain] != 0) revert DomainAlreadyRegistered();
            
            string memory oldNormalizedDomain = _toLowercase(agent.agentDomain);
            delete _domainToAgentId[oldNormalizedDomain];
            agent.agentDomain = newAgentDomain;
            _domainToAgentId[normalizedNewDomain] = agentId;
        }
        
        if (newAgentAddress != address(0)) {
            if (_addressToAgentId[newAgentAddress] != 0) revert AddressAlreadyRegistered();
            delete _addressToAgentId[agent.agentAddress];
            agent.agentAddress = newAgentAddress;
            _addressToAgentId[newAgentAddress] = agentId;
        }
        
        emit AgentUpdated(agentId, agent.agentDomain, agent.agentAddress);
        return true;
    }

    function getAgent(uint256 agentId) external view returns (AgentInfo memory agentInfo) {
        agentInfo = _agents[agentId];
        if (agentInfo.agentId == 0) revert AgentNotFound();
    }
    
    function resolveByDomain(string calldata agentDomain) external view returns (AgentInfo memory agentInfo) {
        string memory normalizedDomain = _toLowercase(agentDomain);
        uint256 agentId = _domainToAgentId[normalizedDomain];
        if (agentId == 0) revert AgentNotFound();
        agentInfo = _agents[agentId];
    }
    
    function resolveByAddress(address agentAddress) external view returns (AgentInfo memory agentInfo) {
        uint256 agentId = _addressToAgentId[agentAddress];
        if (agentId == 0) revert AgentNotFound();
        agentInfo = _agents[agentId];
    }
    
    function getAgentCount() external view returns (uint256 count) {
        return _agentIdCounter - 1;
    }
    
    function agentExists(uint256 agentId) external view returns (bool exists) {
        return _agents[agentId].agentId != 0;
    }

    function _toLowercase(string memory str) internal pure returns (string memory result) {
        bytes memory strBytes = bytes(str);
        bytes memory resultBytes = new bytes(strBytes.length);
        for (uint256 i = 0; i < strBytes.length; i++) {
            if (strBytes[i] >= 0x41 && strBytes[i] <= 0x5A) {
                resultBytes[i] = bytes1(uint8(strBytes[i]) + 32);
            } else {
                resultBytes[i] = strBytes[i];
            }
        }
        result = string(resultBytes);
    }
}
