const { ethers } = require("ethers");
require("dotenv").config({ path: "../../.env" });

async function main() {
  const provider = new ethers.JsonRpcProvider(process.env.FLARE_RPC_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  
  const abi = [
    "function logDecision(bytes32 id, address user, uint8 action, address asset, uint256 amount, address fromProtocol, address toProtocol, uint256 confidenceScore, string reasons, string dataSources, string alternatives, bytes32 onChainHash, string modelCid, string xaiCid, bytes signature) external"
  ];
  const contract = new ethers.Contract(process.env.DECISION_LOGGER_ADDRESS, abi, wallet);

  const params = {
    id: "0x49e06cf1a47ce66b90d2ff39943424ba36601156c367fff9ad2f7eee73e67b68",
    user: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    action: 0,
    asset: "0x0000000000000000000000000000000000000000",
    amount: "100000000000000000000",
    fromProtocol: "0x0000000000000000000000000000000000000000",
    toProtocol: "0x0000000000000000000000000000000000000000",
    confidenceScore: 7075,
    reasons: '["Risk score: 31.25/100 (lower is better)","Protocol TVL: $10,000,000","APY: 5.50%","Consensus: approve","Compliance: PASS","Industry Model CID: bgl_2a1d1c0d4c89d732"]',
    dataSources: '[]',
    alternatives: '[]',
    onChainHash: "0xfc11702edd789d8ad7e8e09bb496fa96fa189f6aee6b085d449f8773301801c0",
    modelCid: "bgl_2a1d1c0d4c89d732",
    xaiCid: "{\"primary_evaluation\": {\"agent_id\": \"Conservative\", \"prediction\": \"approve\", \"justification\": \"MOCK: Strategy aligns with low-risk profile.\", \"confidence\": 0.95, \"risk_score\": 20.0}, \"chaos_verification\": {\"is_robust\": true, \"confidence_impact\": 0.05, \"stress_notes\": \"MOCK: Robust under simulated volatility.\", \"recommendation\": \"Proceed with caution.\"}, \"final_status\": \"CERTIFIED\"}",
    signature: "0x659b2ba63e4cdca8d96034653e391073075c9d1405e34ef4d8f9c61e6813689c13b11e7a3ee203c4170a226ae2e9709c98d57f38230954d6e030733c466e2a301b"
  };

  console.log("Attempting manual logDecision...");
  try {
    const tx = await contract.logDecision(
      params.id,
      params.user,
      params.action,
      params.asset,
      params.amount,
      params.fromProtocol,
      params.toProtocol,
      params.confidenceScore,
      params.reasons,
      params.dataSources,
      params.alternatives,
      params.onChainHash,
      params.modelCid,
      params.xaiCid,
      params.signature,
      { gasLimit: 1000000 } // Manually Set gas to avoid check if needed, but let's see error
    );
    console.log("Transaction sent! Hash:", tx.hash);
    const receipt = await tx.wait();
    console.log("Transaction SUCCESS! Block:", receipt.blockNumber);
  } catch (error) {
    console.error("Transaction FAILED!");
    console.error(error);
  }
}

main();
