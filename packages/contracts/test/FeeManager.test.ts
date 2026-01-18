import { expect } from "chai";
import { ethers } from "hardhat";
import { FeeManager } from "../typechain-types";

describe("FeeManager", function () {
  let feeManager: FeeManager;
  let mockToken: any;
  let owner: any;
  let treasury: any;
  let user: any;

  beforeEach(async function () {
    [owner, treasury, user] = await ethers.getSigners();

    // Deploy MockERC20 (Standard, not upgradeable for this test)
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    mockToken = await MockERC20.deploy("Test Token", "TEST", ethers.parseEther("1000000"));

    // Deploy FeeManager (Upgradeable)
    const FeeManagerFactory = await ethers.getContractFactory("FeeManager");
    feeManager = (await upgrades.deployProxy(FeeManagerFactory, [treasury.address], { kind: 'uups' })) as unknown as FeeManager;
    await feeManager.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the correct treasury address", async function () {
      expect(await feeManager.treasury()).to.equal(treasury.address);
    });

    it("Should have correct fee rates", async function () {
      expect(await feeManager.MANAGEMENT_FEE_BPS()).to.equal(100); // 1%
      expect(await feeManager.PERFORMANCE_FEE_BPS()).to.equal(2000); // 20%
    });
  });

  describe("Fee Collection", function () {
    beforeEach(async function () {
      // Transfer ownership to owner for testing
      await feeManager.transferOwnership(owner.address);
      
      // Give user some tokens
      await mockToken.transfer(user.address, ethers.parseEther("1000"));
      await mockToken.connect(user).approve(feeManager.target, ethers.parseEther("1000"));
    });

    it("Should record deposits correctly", async function () {
      await feeManager.recordDeposit(
        user.address,
        mockToken.target,
        ethers.parseEther("100"),
        1000 * 1e6 // $1000 USD value (6 decimals)
      );

      const balance = await feeManager.getUserBalance(user.address, mockToken.target);
      expect(balance).to.equal(ethers.parseEther("100"));
    });
  });
});

// Mock ERC20 for testing
const MockERC20Artifact = `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockERC20 is ERC20 {
    constructor(string memory name, string memory symbol, uint256 totalSupply) ERC20(name, symbol) {
        _mint(msg.sender, totalSupply);
    }
}
`;

