import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { DecisionLogger, DecisionVerifier } from "../typechain-types";

describe("FLINT Production Security Flow", function () {
  let verifier: DecisionVerifier;
  let logger: DecisionLogger;
  let owner: any;
  let enclaveWallet: any;
  let attackerWallet: any;

  // Mock MRENCLAVE (32 bytes)
  const MRENCLAVE = ethers.keccak256(ethers.toUtf8Bytes("FLINT_V1_PRODUCTION_BUILD"));

  before(async function () {
    [owner, enclaveWallet, attackerWallet] = await ethers.getSigners();

    // 1. Deploy Verifier (Upgradeable)
    const Verifier = await ethers.getContractFactory("DecisionVerifier");
    verifier = (await upgrades.deployProxy(Verifier, [], { kind: 'uups' })) as unknown as DecisionVerifier;
    await verifier.waitForDeployment();

    // 2. Deploy Logger (Upgradeable, linked to Verifier)
    const Logger = await ethers.getContractFactory("DecisionLogger");
    logger = (await upgrades.deployProxy(Logger, [await verifier.getAddress()], { kind: 'uups' })) as unknown as DecisionLogger;
    await logger.waitForDeployment();
  });

  it("Should allow governance to whitelist an MRENCLAVE", async function () {
    await verifier.setAllowedMrenclave(MRENCLAVE, true);
    expect(await verifier.allowedMrenclaves(MRENCLAVE)).to.be.true;
  });

  it("Should register an Enclave Key with valid binding", async function () {
    // Simulate Enclave Key Generation (done by enclaveWallet)
    const enclaveAddress = enclaveWallet.address;
    
    // Simulate Report Data Binding: Hash of the public address (simplified for test)
    // In real TEE, this is hash of the public key bytes.
    // The contract expects: sha256(abi.encodePacked(enclaveKey))
    // We need to calculate this exact hash in JS.
    
    // ABI Encode Packed equivalent
    const packed = ethers.solidityPacked(["address"], [enclaveAddress]);
    const expectedReportData = ethers.sha256(packed);

    // Register
    await expect(verifier.registerEnclave(enclaveAddress, MRENCLAVE, expectedReportData))
      .to.emit(verifier, "EnclaveRegistered")
      .withArgs(enclaveAddress, MRENCLAVE);

    expect(await verifier.verifiedEnclaves(enclaveAddress)).to.be.true;
  });

  it("Should FAIL to register with invalid binding", async function () {
    const fakeReportData = ethers.hexlify(ethers.randomBytes(32));
    await expect(verifier.registerEnclave(enclaveWallet.address, MRENCLAVE, fakeReportData))
      .to.be.revertedWith("Verifier: Key binding mismatch");
  });

  it("Should log a decision signed by the Verified Enclave", async function () {
    const id = ethers.hexlify(ethers.randomBytes(32));
    const action = 0; // ALLOCATE
    const confidence = 9500;
    const onChainHash = ethers.hexlify(ethers.randomBytes(32));
    
    // Construct the Hash that needs signing
    // keccak256(abi.encodePacked(id, user, action, asset, amount, confidenceScore, onChainHash))
    // Note: user, asset, protocol addresses are needed.
    const user = owner.address;
    const asset = ethers.ZeroAddress;
    const amount = 1000;
    
    const payloadHash = ethers.solidityPackedKeccak256(
      ["bytes32", "address", "uint8", "address", "uint256", "uint256", "bytes32"],
      [id, user, action, asset, amount, confidence, onChainHash]
    );

    // Sign with Enclave Key
    // Ethers wallet.signMessage automatically adds the "\x19Ethereum Signed Message:\n32" prefix
    // But ECDSA.recover in OpenZeppelin handles that if using toEthSignedMessageHash().
    // Our contract calls: decisionHash.toEthSignedMessageHash().recover(signature)
    // So wallet.signMessage is correct.
    const signature = await enclaveWallet.signMessage(ethers.getBytes(payloadHash));

    await expect(logger.logDecision(
      id, user, action, asset, amount, 
      ethers.ZeroAddress, ethers.ZeroAddress,
      confidence, 
      "{}", "{}", "{}", 
      onChainHash, "cid", "cid",
      signature
    )).to.emit(logger, "DecisionLogged");
  });

  it("Should REJECT a decision signed by an Unverified Key", async function () {
    const id = ethers.hexlify(ethers.randomBytes(32));
    const action = 0;
    const confidence = 9500;
    const onChainHash = ethers.hexlify(ethers.randomBytes(32));
    
    const user = owner.address;
    const asset = ethers.ZeroAddress;
    const amount = 1000;
    
    const payloadHash = ethers.solidityPackedKeccak256(
      ["bytes32", "address", "uint8", "address", "uint256", "uint256", "bytes32"],
      [id, user, action, asset, amount, confidence, onChainHash]
    );

    // Sign with Attacker Key
    const signature = await attackerWallet.signMessage(ethers.getBytes(payloadHash));

    await expect(logger.logDecision(
      id, user, action, asset, amount, 
      ethers.ZeroAddress, ethers.ZeroAddress,
      confidence, 
      "{}", "{}", "{}", 
      onChainHash, "cid", "cid",
      signature
    )).to.be.revertedWith("DecisionLogger: Unauthorized Enclave Signature");
  });
});
