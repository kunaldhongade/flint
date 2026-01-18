import { ethers } from "hardhat";

// Mock Enclave Identity (In production, this comes from the TEE Quote)
// MRENCLAVE must match the logic in DecisionVerifier
const MRENCLAVE = ethers.keccak256(ethers.toUtf8Bytes("FLINT_V1_STAGING_BUILD"));

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Registering Enclave with account:", deployer.address);

  const verifierAddress = process.env.VERIFIER_ADDRESS;
  if (!verifierAddress) {
    throw new Error("VERIFIER_ADDRESS not set in environment");
  }

  const Verifier = await ethers.getContractFactory("DecisionVerifier");
  const verifier = Verifier.attach(verifierAddress);

  // 1. Governance Whitelists the Code
  console.log(`Whitelisting MRENCLAVE: ${MRENCLAVE}...`);
  // const tx1 = await verifier.setAllowedMrenclave(MRENCLAVE, true);
  // await tx1.wait(); // Assuming deployer is owner

  // 2. Register the Enclave Key
  // In a real flow, the Enclave generates a key and sends a Quote.
  // The Oracle (Attestation Service) verifies it and signs it.
  // Here we simulate the Oracle signature.
  
  // Create a new random enclave key
  const enclaveWallet = ethers.Wallet.createRandom();
  console.log(`Generated Enclave Key: ${enclaveWallet.address}`);

  const expiry = Math.floor(Date.now() / 1000) + 3600 * 24; // 24 hours
  
  // Oracle signs
  const payloadHash = ethers.solidityPackedKeccak256(
      ["address", "bytes32", "uint256"],
      [enclaveWallet.address, MRENCLAVE, expiry]
  );
  
  console.log("Oracle signing attestation...");
  // Deployer acts as Oracle in this Staging setup
  const signature = await deployer.signMessage(ethers.getBytes(payloadHash));

  console.log("Submitting registration...");
  const tx2 = await verifier.registerEnclave(
    enclaveWallet.address,
    MRENCLAVE,
    expiry,
    signature
  );
  await tx2.wait();
  
  console.log("Enclave Registered Successfully!");
  console.log("You can now sign decisions with PRIVATE_KEY:", enclaveWallet.privateKey);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
