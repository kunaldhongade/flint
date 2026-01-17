import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { DecisionLogger, DecisionVerifier } from "../typechain-types";

describe("FLINT Production Flow (Staging)", function () {
  let verifier: DecisionVerifier;
  let logger: DecisionLogger;
  let owner: any;
  let attestationVerifier: any; // The Oracle
  let enclaveWallet: any;
  let attackerWallet: any;

  const MRENCLAVE = ethers.keccak256(ethers.toUtf8Bytes("FLINT_V1_STAGING_BUILD"));

  before(async function () {
    [owner, attestationVerifier, enclaveWallet, attackerWallet] = await ethers.getSigners();

    // 1. Deploy Verifier with attestationVerifier address
    const Verifier = await ethers.getContractFactory("DecisionVerifier");
    verifier = (await upgrades.deployProxy(Verifier, [attestationVerifier.address], { kind: 'uups' })) as unknown as DecisionVerifier;
    await verifier.waitForDeployment();

    // 2. Deploy Logger with Verifier address
    const Logger = await ethers.getContractFactory("DecisionLogger");
    logger = (await upgrades.deployProxy(Logger, [await verifier.getAddress()], { kind: 'uups' })) as unknown as DecisionLogger;
    await logger.waitForDeployment();

    // 3. Governance whitelists the MRENCLAVE
    await verifier.connect(owner).setAllowedMrenclave(MRENCLAVE, true);
  });

  it("Should FAIL to register enclave without Oracle Signature", async function () {
    const expiry = Math.floor(Date.now() / 1000) + 3600;
    const fakeSignature = ethers.hexlify(ethers.randomBytes(65));
    
    // ECDSA might revert with custom error if signature is invalid structure
    await expect(verifier.registerEnclave(
      enclaveWallet.address, 
      MRENCLAVE, 
      expiry, 
      fakeSignature
    )).to.be.reverted;
  });

  it("Should Successfully Register Enclave with Oracle Signature", async function () {
    const expiry = Math.floor(Date.now() / 1000) + 3600;
    
    // Hash: keccak256(enclaveKey, mrenclave, expiry)
    // Note: Use solidityPackedKeccak256 to match contract's abi.encodePacked logic
    const payloadHash = ethers.solidityPackedKeccak256(
      ["address", "bytes32", "uint256"],
      [enclaveWallet.address, MRENCLAVE, expiry]
    );

    // Oracle signs the hash
    const signature = await attestationVerifier.signMessage(ethers.getBytes(payloadHash));

    await expect(verifier.registerEnclave(
      enclaveWallet.address,
      MRENCLAVE,
      expiry,
      signature
    )).to.emit(verifier, "EnclaveRegistered")
      .withArgs(enclaveWallet.address, MRENCLAVE, expiry);
    
    expect(await verifier.verifiedEnclaves(enclaveWallet.address)).to.equal(expiry);
  });

  it("Should Log Decision with Valid Enclave Signature", async function () {
    const id = ethers.hexlify(ethers.randomBytes(32));
    const action = 0; // ALLOCATE
    const confidence = 9900;
    const onChainHash = ethers.hexlify(ethers.randomBytes(32));
    const user = owner.address;
    const amount = 1000;
    const asset = ethers.ZeroAddress;

    const DOMAIN_SEPARATOR = await logger.DOMAIN_SEPARATOR();

    const decisionHash = ethers.solidityPackedKeccak256(
        ["bytes32", "bytes32", "address", "uint8", "address", "uint256", "uint256", "bytes32"],
        [DOMAIN_SEPARATOR, id, user, action, asset, amount, confidence, onChainHash]
    );

    const signature = await enclaveWallet.signMessage(ethers.getBytes(decisionHash));

    await expect(logger.logDecision(
        id, user, action, asset, amount,
        ethers.ZeroAddress, ethers.ZeroAddress,
        confidence,
        "{}", "{}", "{}",
        onChainHash, "cid", "cid",
        signature
    )).to.emit(logger, "DecisionLogged");
  });

  it("Should FAIL to Log Decision with Attacker Signature", async function () {
    const id = ethers.hexlify(ethers.randomBytes(32));
    const DOMAIN_SEPARATOR = await logger.DOMAIN_SEPARATOR();
    const decisionHash = ethers.solidityPackedKeccak256(
        ["bytes32", "bytes32", "address", "uint8", "address", "uint256", "uint256", "bytes32"],
        [DOMAIN_SEPARATOR, id, owner.address, 0, ethers.ZeroAddress, 100, 9000, ethers.ZeroHash]
    );

    const signature = await attackerWallet.signMessage(ethers.getBytes(decisionHash));

    await expect(logger.logDecision(
        id, owner.address, 0, ethers.ZeroAddress, 100,
        ethers.ZeroAddress, ethers.ZeroAddress,
        9000, "{}", "{}", "{}",
        ethers.ZeroHash, "cid", "cid",
        signature
    )).to.be.revertedWith("DecisionLogger: Unauthorized Enclave Signature");
  });

  it("Should Prevent Replay of Decision (Even with same signature and params)", async function () {
    // Replay logic: Contract checks decisions[id].timestamp == 0
    // So reusing the ID fails.
    // If we change ID, signature is invalid because Hash changes.
    // So replay is impossible.
    // We just test the ID reuse check here.
    
    // Use previous test's ID? No, hard to capture.
    // Let's make a new one.
    const id = ethers.hexlify(ethers.randomBytes(32));
    const DOMAIN_SEPARATOR = await logger.DOMAIN_SEPARATOR();
    const decisionHash = ethers.solidityPackedKeccak256(
        ["bytes32", "bytes32", "address", "uint8", "address", "uint256", "uint256", "bytes32"],
        [DOMAIN_SEPARATOR, id, owner.address, 0, ethers.ZeroAddress, 1000, 9900, ethers.ZeroHash]
    );
    const signature = await enclaveWallet.signMessage(ethers.getBytes(decisionHash));

    // First call success
    await logger.logDecision(
        id, owner.address, 0, ethers.ZeroAddress, 1000,
        ethers.ZeroAddress, ethers.ZeroAddress,
        9900, "{}", "{}", "{}",
        ethers.ZeroHash, "cid", "cid",
        signature
    );

    // Second call fails
    await expect(logger.logDecision(
        id, owner.address, 0, ethers.ZeroAddress, 1000,
        ethers.ZeroAddress, ethers.ZeroAddress,
        9900, "{}", "{}", "{}",
        ethers.ZeroHash, "cid", "cid",
        signature
    )).to.be.revertedWith("DecisionLogger: decision already exists");
  });
});
