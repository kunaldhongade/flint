const { ethers } = require("ethers");
require("dotenv").config({ path: "../../.env" });

async function main() {
  const provider = new ethers.JsonRpcProvider(process.env.FLARE_RPC_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  
  const verifierAddress = process.env.DECISION_VERIFIER_ADDRESS;
  const enclaveKey = process.argv[2]; // Passed from command line
  
  if (!enclaveKey) {
    console.error("Please provide an enclave key address");
    process.exit(1);
  }

  const abi = [
    "function setAllowedMrenclave(bytes32 mrenclave, bool allowed) external",
    "function registerEnclave(address enclaveKey, bytes32 mrenclave, uint256 expiry, bytes memory verifierSignature) external",
    "function DOMAIN_SEPARATOR() external view returns (bytes32)",
    "function verifiedEnclaves(address) external view returns (uint256)"
  ];
  const contract = new ethers.Contract(verifierAddress, abi, wallet);

  const mrenclave = ethers.keccak256(ethers.toUtf8Bytes("MOCK_ENCLAVE_MEASUREMENT"));
  const expiry = Math.floor(Date.now() / 1000) + 86400 * 30; // 30 days

  console.log(`Whitelisting MRENCLAVE: ${mrenclave}`);
  const tx1 = await contract.setAllowedMrenclave(mrenclave, true);
  await tx1.wait();
  console.log("MRENCLAVE Whitelisted.");

  const domainSeparator = await contract.DOMAIN_SEPARATOR();
  console.log(`Domain Separator: ${domainSeparator}`);

  const REGISTER_TYPEHASH = ethers.keccak256(ethers.toUtf8Bytes("RegisterEnclave(address enclaveKey,bytes32 mrenclave,uint256 expiry)"));
  const abiCoder = ethers.AbiCoder.defaultAbiCoder();
  const structHash = ethers.keccak256(abiCoder.encode(
    ["bytes32", "address", "bytes32", "uint256"],
    [REGISTER_TYPEHASH, enclaveKey, mrenclave, expiry]
  ));

  const contentHash = ethers.keccak256(ethers.solidityPacked(
    ["string", "bytes32", "bytes32"],
    ["\x19\x01", domainSeparator, structHash]
  ));

  console.log(`Signing registration for key: ${enclaveKey}`);
  
  // Ensure private key has 0x prefix for Ethers v6
  const pKey = process.env.PRIVATE_KEY.startsWith("0x") ? process.env.PRIVATE_KEY : "0x" + process.env.PRIVATE_KEY;
  const signingKey = new ethers.SigningKey(pKey);
  const signatureObj = signingKey.sign(contentHash);
  const finalSignature = ethers.Signature.from(signatureObj).serialized;

  console.log("Submitting registration...");
  const tx2 = await contract.registerEnclave(enclaveKey, mrenclave, expiry, finalSignature);
  await tx2.wait();

  const registeredExpiry = await contract.verifiedEnclaves(enclaveKey);
  console.log(`SUCCESS: Enclave registered! Expiry: ${new Date(Number(registeredExpiry) * 1000)}`);
}

main().catch(console.error);
