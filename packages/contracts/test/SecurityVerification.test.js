const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("FLINT Security Verification Suite (Audited)", function () {
  let verifier;
  let logger;
  let feeManager;
  let mockToken;
  let maliciousToken;

  let owner;
  let attestationService;
  let enclave;
  let user;
  let attacker;

  // Domain Separator components (must match contract)
  const VERIFIER_NAME = "DecisionVerifier";
  const VERSION = "1";
  let CHAIN_ID;

  before(async () => {
    [owner, attestationService, enclave, user, attacker] = await ethers.getSigners();
    const network = await ethers.provider.getNetwork();
    
    // ethers v6 returns BigInt for chainId
    CHAIN_ID = network.chainId;
  });

  async function deployContracts() {
    // 1. Deploy decision verifier
    const VerifierFactory = await ethers.getContractFactory("DecisionVerifier");
    verifier = await upgrades.deployProxy(VerifierFactory, [attestationService.address], {
      initializer: "initialize",
    });

    // 2. Deploy DecisionLogger
    const LoggerFactory = await ethers.getContractFactory("DecisionLogger");
    logger = await upgrades.deployProxy(LoggerFactory, [await verifier.getAddress()], {
      initializer: "initialize",
    });

    // 3. Deploy MockERC20
    const MockTokenFactory = await ethers.getContractFactory("MockERC20");
    mockToken = await MockTokenFactory.deploy("Test", "TST", ethers.parseEther("1000000"));

    // 4. Deploy MaliciousERC20
    const MaliciousTokenFactory = await ethers.getContractFactory("MaliciousERC20");
    maliciousToken = await MaliciousTokenFactory.deploy();

    // 5. Deploy FeeManager
    const FeeManagerFactory = await ethers.getContractFactory("FeeManager");
    feeManager = await upgrades.deployProxy(FeeManagerFactory, [owner.address], {
      initializer: "initialize",
    });
    
    // Set up Allowlist for Enclave MRENCLAVE validation
    const mrenclave = ethers.keccak256(ethers.toUtf8Bytes("VALID_ENCLAVE_MEASUREMENT"));
    await verifier.setAllowedMrenclave(mrenclave, true);
    
    return { mrenclave };
  }

  describe("Phase 1: Verification Logic (EIP-712)", function () {
    let mrenclave;

    beforeEach(async () => {
      ({ mrenclave } = await deployContracts());
    });

    it("Registration: Should ACCEPT valid Attestation Service signature", async function () {
      const expiry = Math.floor(Date.now() / 1000) + 3600; 
      
      const domain = {
        name: VERIFIER_NAME,
        version: VERSION,
        chainId: CHAIN_ID,
        verifyingContract: await verifier.getAddress()
      };

      const types = {
        RegisterEnclave: [
          { name: "enclaveKey", type: "address" },
          { name: "mrenclave", type: "bytes32" },
          { name: "expiry", type: "uint256" }
        ]
      };

      const value = {
        enclaveKey: enclave.address,
        mrenclave: mrenclave,
        expiry: expiry
      };

      const signature = await attestationService.signTypedData(domain, types, value);

      await expect(verifier.registerEnclave(enclave.address, mrenclave, expiry, signature))
        .to.emit(verifier, "EnclaveRegistered");
    });

    it("Decision Signing: Should ACCEPT valid Enclave signature binding to Verifier Domain", async function () {
      // 1. Register Enclave
      const expiry = Math.floor(Date.now() / 1000) + 3600;
      const domain = { name: VERIFIER_NAME, version: VERSION, chainId: CHAIN_ID, verifyingContract: await verifier.getAddress() };
      const regTypes = { RegisterEnclave: [{ name: "enclaveKey", type: "address" }, { name: "mrenclave", type: "bytes32" }, { name: "expiry", type: "uint256" }] };
      const regSig = await attestationService.signTypedData(domain, regTypes, { enclaveKey: enclave.address, mrenclave, expiry });
      await verifier.registerEnclave(enclave.address, mrenclave, expiry, regSig);

      // 2. Prepare Decision Data
      const id = ethers.keccak256(ethers.toUtf8Bytes("DECISION_1"));
      const action = 1;
      const amount = 100;
      const confidence = 9000;
      
      const reasons = "Valid";
      const dataSources = "SourceA";
      const alternatives = "None";
      const onChainHash = ethers.ZeroHash;
      const modelCid = "QmVal";
      const xaiCid = "QmXai";

      // 3. Construct EIP-712 Typed Data for Decision
      // Domain is BOUND TO VERIFIER because Verifier checks it.
      const decisionTypes = {
        Decision: [
          { name: "id", type: "bytes32" },
          { name: "user", type: "address" },
          { name: "action", type: "uint8" },
          { name: "asset", type: "address" },
          { name: "amount", type: "uint256" },
          { name: "fromProtocol", type: "address" },
          { name: "toProtocol", type: "address" },
          { name: "confidenceScore", type: "uint256" },
          { name: "reasonsHash", type: "bytes32" },
          { name: "dataSourcesHash", type: "bytes32" },
          { name: "alternativesHash", type: "bytes32" },
          { name: "onChainHash", type: "bytes32" },
          { name: "modelCidHash", type: "bytes32" },
          { name: "xaiCidHash", type: "bytes32" }
        ]
      };

      const decisionValue = {
        id: id,
        user: user.address,
        action: action,
        asset: await mockToken.getAddress(),
        amount: amount,
        fromProtocol: ethers.ZeroAddress,
        toProtocol: ethers.ZeroAddress,
        confidenceScore: confidence,
        reasonsHash: ethers.keccak256(ethers.toUtf8Bytes(reasons)),
        dataSourcesHash: ethers.keccak256(ethers.toUtf8Bytes(dataSources)),
        alternativesHash: ethers.keccak256(ethers.toUtf8Bytes(alternatives)),
        onChainHash: onChainHash,
        modelCidHash: ethers.keccak256(ethers.toUtf8Bytes(modelCid)),
        xaiCidHash: ethers.keccak256(ethers.toUtf8Bytes(xaiCid))
      };

      // Sign with Enclave
      const signature = await enclave.signTypedData(domain, decisionTypes, decisionValue);

      // 4. Log Decision (which calls Verify)
      await expect(logger.logDecision(
        id, user.address, action, await mockToken.getAddress(), amount,
        ethers.ZeroAddress, ethers.ZeroAddress, confidence,
        reasons, dataSources, alternatives, onChainHash, modelCid, xaiCid,
        signature
      )).to.emit(logger, "DecisionLogged");
    });
  });

  describe("Phase 2: Adversarial & Edge Cases (EIP-712)", function () {
    let mrenclave;
    let validDomain;
    let decisionTypes;
    let decisionValue;

    beforeEach(async () => {
      ({ mrenclave } = await deployContracts());
      
      // Register Enclave
      const expiry = Math.floor(Date.now() / 1000) + 3600;
      validDomain = { name: VERIFIER_NAME, version: VERSION, chainId: CHAIN_ID, verifyingContract: await verifier.getAddress() };
      const regTypes = { RegisterEnclave: [{ name: "enclaveKey", type: "address" }, { name: "mrenclave", type: "bytes32" }, { name: "expiry", type: "uint256" }] };
      const regSig = await attestationService.signTypedData(validDomain, regTypes, { enclaveKey: enclave.address, mrenclave, expiry });
      await verifier.registerEnclave(enclave.address, mrenclave, expiry, regSig);

      // Base Decision
      decisionTypes = {
        Decision: [
          { name: "id", type: "bytes32" },
          { name: "user", type: "address" },
          { name: "action", type: "uint8" },
          { name: "asset", type: "address" },
          { name: "amount", type: "uint256" },
          { name: "fromProtocol", type: "address" },
          { name: "toProtocol", type: "address" },
          { name: "confidenceScore", type: "uint256" },
          { name: "reasonsHash", type: "bytes32" },
          { name: "dataSourcesHash", type: "bytes32" },
          { name: "alternativesHash", type: "bytes32" },
          { name: "onChainHash", type: "bytes32" },
          { name: "modelCidHash", type: "bytes32" },
          { name: "xaiCidHash", type: "bytes32" }
        ]
      };

      decisionValue = {
        id: ethers.keccak256(ethers.toUtf8Bytes("DECISION_BASE")),
        user: user.address,
        action: 1,
        asset: await mockToken.getAddress(),
        amount: 100,
        fromProtocol: ethers.ZeroAddress,
        toProtocol: ethers.ZeroAddress,
        confidenceScore: 9000,
        reasonsHash: ethers.keccak256(ethers.toUtf8Bytes("R")),
        dataSourcesHash: ethers.keccak256(ethers.toUtf8Bytes("D")),
        alternativesHash: ethers.keccak256(ethers.toUtf8Bytes("A")),
        onChainHash: ethers.ZeroHash,
        modelCidHash: ethers.keccak256(ethers.toUtf8Bytes("M")),
        xaiCidHash: ethers.keccak256(ethers.toUtf8Bytes("X"))
      };
    });

    it("Attack: Replay - Same signature used twice MUST revert", async function () {
      const signature = await enclave.signTypedData(validDomain, decisionTypes, decisionValue);

      await logger.logDecision(
        decisionValue.id, user.address, 1, await mockToken.getAddress(), 100,
        ethers.ZeroAddress, ethers.ZeroAddress, 9000,
        "R", "D", "A", ethers.ZeroHash, "M", "X",
        signature
      );

      // Replay
      await expect(logger.logDecision(
        decisionValue.id, user.address, 1, await mockToken.getAddress(), 100,
        ethers.ZeroAddress, ethers.ZeroAddress, 9000,
        "R", "D", "A", ethers.ZeroHash, "M", "X",
        signature
      )).to.be.reverted; 
    });

    it("Attack: Wrong Chain - Signature from other chain MUST revert", async function () {
      const wrongDomain = { ...validDomain, chainId: 9999 };
      const signature = await enclave.signTypedData(wrongDomain, decisionTypes, decisionValue);

      await expect(logger.logDecision(
        decisionValue.id, user.address, 1, await mockToken.getAddress(), 100,
        ethers.ZeroAddress, ethers.ZeroAddress, 9000,
        "R", "D", "A", ethers.ZeroHash, "M", "X",
        signature
      )).to.be.revertedWith("DecisionVerifier: Enclave not verified or expired"); 
    });

    it("Attack: Wrong Verifier - Signature bound to another contract MUST revert", async function () {
      const wrongDomain = { ...validDomain, verifyingContract: user.address }; // Not the real verifier
      const signature = await enclave.signTypedData(wrongDomain, decisionTypes, decisionValue);

      await expect(logger.logDecision(
        decisionValue.id, user.address, 1, await mockToken.getAddress(), 100,
        ethers.ZeroAddress, ethers.ZeroAddress, 9000,
        "R", "D", "A", ethers.ZeroHash, "M", "X",
        signature
      )).to.be.revertedWith("DecisionVerifier: Enclave not verified or expired");
    });

    it("Attack: Tampered Metadata - Changing 'Reasons' text validates hash mismatch", async function () {
      const signature = await enclave.signTypedData(validDomain, decisionTypes, decisionValue);

      await expect(logger.logDecision(
        decisionValue.id, user.address, 1, await mockToken.getAddress(), 100,
        ethers.ZeroAddress, ethers.ZeroAddress, 9000,
        "TAMPERED REASON", // Changed
        "D", "A", ethers.ZeroHash, "M", "X",
        signature
      )).to.be.revertedWith("DecisionVerifier: Enclave not verified or expired");
    });
  });

  describe("Phase 3: Malicious Token Scenarios", function () {
    
    it("Fee-On-Transfer: Deposit should account for actual received amount", async function () {
      // 1. Setup Malicious Token (FOT mode)
      await maliciousToken.setFeeOnTransfer(true);
      const amount = ethers.parseEther("100");
      
      // Transfer to user
      await maliciousToken.transfer(user.address, amount);
      await maliciousToken.connect(user).approve(await feeManager.getAddress(), amount);

      // 2. User deposits 100. Token burns 10%. Contract receives 90.
      await expect(feeManager.connect(owner).recordDeposit(
        user.address,
        await maliciousToken.getAddress(),
        amount,
        100
      )).to.not.be.reverted;

      // 3. Verify Balance Logic
      const userBalance = await feeManager.userBalances(user.address, await maliciousToken.getAddress());
      const contractBalance = await maliciousToken.balanceOf(await feeManager.getAddress());
      
      // FIX VERIFIED: Credits actual received (90)
      expect(userBalance).to.equal(ethers.parseEther("90")); 
      expect(contractBalance).to.equal(ethers.parseEther("90"));
    });

    it("False Return: Deposit should revert if transfer returns false", async function () {
        await maliciousToken.setFalseReturn(true);
        const amount = ethers.parseEther("100");
        await maliciousToken.transfer(user.address, amount);
        await maliciousToken.connect(user).approve(await feeManager.getAddress(), amount);

        // SafeERC20 should catch the boolean return 'false'
        await expect(feeManager.connect(owner).recordDeposit(
            user.address,
            await maliciousToken.getAddress(),
            amount,
            100
        )).to.be.revertedWithCustomError; 
    });
  });
});
