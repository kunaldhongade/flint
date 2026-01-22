const { ethers } = require("ethers");
require("dotenv").config({ path: "../../.env" });

async function main() {
  const provider = new ethers.JsonRpcProvider(process.env.FLARE_RPC_URL);
  const abi = [
    "function getDecision(bytes32 id) external view returns (tuple(bytes32 id, uint256 timestamp, uint8 action, address user, address asset, uint256 amount, address fromProtocol, address toProtocol, uint256 confidenceScore, string reasons, string dataSources, string alternatives, bytes32 onChainHash, string modelCid, string xaiCid))"
  ];
  const contract = new ethers.Contract(process.env.DECISION_LOGGER_ADDRESS, abi, provider);
  
  const decisionId = process.argv[2];
  if (!decisionId) {
    console.error("Please provide a decision ID");
    process.exit(1);
  }

  // decision.id in backend is uuid. In contract it's bytes32.
  // Backend uses ethers.id(decision.id) to pad/hash it.
  const idBytes32 = ethers.id(decisionId);
  console.log(`Checking decision ID: ${decisionId} (Bytes32: ${idBytes32})`);

  try {
    const decision = await contract.getDecision(idBytes32);
    console.log("SUCCESS: Decision found on-chain!");
    console.log(JSON.stringify(decision, (key, value) => typeof value === 'bigint' ? value.toString() : value, 2));
  } catch (error) {
    console.error("FAILURE: Decision not found on-chain or error occurred.");
    console.error(error.message);
  }
}

main();
