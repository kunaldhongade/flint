// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MaliciousERC20 is ERC20 {
    bool public feeOnTransferMode;
    bool public noReturnMode;
    bool public falseReturnMode;
    bool public reentrancyMode;
    
    mapping(address => bool) public isBlacklisted;

    constructor() ERC20("Malicious", "MAL") {
        _mint(msg.sender, 1000000 * 10**18);
    }

    function setFeeOnTransfer(bool _enable) external {
        feeOnTransferMode = _enable;
    }

    function setFalseReturn(bool _enable) external {
        falseReturnMode = _enable;
    }

    // Shadowing transferFrom to implement malicious logic
    function transferFrom(address from, address to, uint256 amount) public override returns (bool) {
        if (falseReturnMode) {
            return false;
        }
        
        uint256 transferAmount = amount;
        if (feeOnTransferMode) {
            // Burn 10%
            transferAmount = amount * 90 / 100;
        }

        return super.transferFrom(from, to, transferAmount);
    }
}
