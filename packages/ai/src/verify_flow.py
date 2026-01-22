
import asyncio
import json
from src.consensus_engine import consensus_engine
from src.attestation import attestation_service

async def simulate_flow():
    print("--- Simulating End-to-End Flow ---")
    
    # 1. Simulate Task
    task = "Allocation of 100 USDC to Aave"
    print(f"Task: {task}")
    
    # 2. Run Consensus (Simulated)
    # We must ensure MOCK_MODE is NOT interfering if we want to test real logic, 
    # but for structure verification, mock is safer.
    import sys
    from unittest.mock import MagicMock
    sys.modules["google.adk"] = MagicMock()
    sys.modules["google.adk.tools"] = MagicMock()
    sys.modules["google.adk.tools.function_tool"] = MagicMock()
    
    import os
    os.environ["MOCK_MODE"] = "true" 
    os.environ["GOOGLE_API_KEY"] = "dummy_key_for_mock_execution"
    
    consensus_result = await consensus_engine.run_consensus(task)
    print("\n[Python] Consensus Result generated:")
    print(json.dumps(consensus_result, indent=2))
    
    # 3. Generate Attestation
    # Enclave Security expects specific fields (id, user, action, etc.) in the decision data.
    # The consensus result might be missing these if it's just the raw output.
    # We need to enrich it to match the Decision struct.
    
    import uuid
    enriched_decision = consensus_result.copy()
    enriched_decision["id"] = "0x" + uuid.uuid4().hex + uuid.uuid4().hex # 64 chars
    enriched_decision["user"] = "0x71C7656EC7ab88b098defB751B7401B5f6d8976F"
    enriched_decision["action"] = 1 # ALLOCATE
    enriched_decision["asset"] = "0x0000000000000000000000000000000000000000"
    enriched_decision["amount"] = 100
    enriched_decision["fromProtocol"] = "0x0000000000000000000000000000000000000000" # Zero address
    enriched_decision["toProtocol"] = "0x0000000000000000000000000000000000000000"
    enriched_decision["confidenceScore"] = 9000
    enriched_decision["reasons"] = "Consensus Reached"
    enriched_decision["dataSources"] = "Consensus Engine"
    enriched_decision["alternatives"] = "None"
    enriched_decision["onChainHash"] = "0x0000000000000000000000000000000000000000000000000000000000000000"
    
    # Model CID and XAI Trace are already in consensus_result?
    # consensus_result has:
    # "final_decision", "individual_decisions", "consensus_reached", "method", "model_cid", "compliance_status", "xai_trace"
    # We need to map these to the schema if names differ.
    
    enriched_decision["modelCid"] = consensus_result.get("model_cid", "QmMock")
    enriched_decision["xaiCid"] = "QmXai" # Trace is complex object, here we need string CID
    
    attestation = attestation_service.generate_attestation(enriched_decision)
    print("\n[Python] Attestation generated:")
    # print(json.dumps(attestation, indent=2))
    print(f"Signature: {attestation['signature']}")
    
    # 4. Simulate Backend Extraction
    # In services/ai.ts:
    # const consensusData = ... (the whole response from main.py)
    # main.py returns { decision_id, decision, attestation }
    
    response_payload = {
        "decision_id": attestation["quote"]["report_data"],
        "decision": consensus_result,
        "attestation": attestation
    }
    
    print("\n[Node.js Logic] Simulating extraction...")
    model_cid = response_payload["decision"]["model_cid"]
    xai_trace = response_payload["decision"]["xai_trace"]
    signature = response_payload["attestation"]["signature"] # Node expects this path
    
    print(f"Extracted Model CID: {model_cid}")
    print(f"Extracted Signature: {signature}")
    
    if not model_cid or not signature:
        print("FAIL: Missing critical fields")
        exit(1)
        
    print("SUCCESS: Data structure matches backend expectations.")

if __name__ == "__main__":
    asyncio.run(simulate_flow())
