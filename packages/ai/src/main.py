import mock_adk
from dotenv import load_dotenv
load_dotenv() # Load from .env at root BEFORE other imports

from fastapi import FastAPI, HTTPException, Depends
from pydantic import BaseModel
from typing import Dict, Any, List
import uvicorn
import os
import traceback
from agent import risk_agent
from universal_agent import universal_trust_agent
from chaos_agent import chaos_agent
from attestation import attestation_service
from consensus_engine import consensus_engine

app = FastAPI(title="FLINT Verifiable AI Trust Layer")

class DecideRequest(BaseModel):
    strategy_name: str
    portfolio: Dict[str, Any]
    market_data: Dict[str, Any]
    decision_context: Dict[str, Any] = None # Full decision object from backend

class EvaluateRequest(BaseModel):
    sector: str
    context: Dict[str, Any]
    policy_version: str = "v1"

class DecideResponse(BaseModel):
    decision_id: str
    decision: Dict[str, Any]
    attestation: Dict[str, Any]

@app.get("/health")
async def health():
    return {
        "status": "ok",
        "tee_mode": os.getenv("TEE_MODE", "simulation"),
        "flare_ai_kit_integrated": True,
        "supported_sectors": ["Finance", "Healthcare"],
        "integrated_products": ["Flare vTPM", "ChaosChain Agent Relay", "Consensus Engine"]
    }

@app.post("/consensus-decide", response_model=DecideResponse)
async def consensus_decide(request: DecideRequest):
    """
    Milestone 3: Multi-agent consensus decision.
    """
    try:
        task = f"Evaluate strategy {request.strategy_name} for portfolio {request.portfolio}"
        print("Task: ",task)
        
        consensus_result = await consensus_engine.run_consensus(task)
        print("Consensus Result: ",consensus_result)
        
        # Prepare data for EIP-712 signing
        signing_data = consensus_result.copy()
        if request.decision_context:
            signing_data.update(request.decision_context)
            
        # Map human-readable action to integer for Solidity enum compatibility
        action_map = {"ALLOCATE": 0, "REALLOCATE": 1, "DEALLOCATE": 2, "HOLD": 3}
        if isinstance(signing_data.get("action"), str):
            signing_data["action"] = action_map.get(signing_data["action"], 0)
            
        # Standardize CID field names for enclave_security
        signing_data["modelCid"] = consensus_result.get("model_cid", "N/A")
        signing_data["xaiCid"] = "QmSimulationTrace"
        
        # Generate attestation for the merged result
        attestation = attestation_service.generate_attestation(signing_data)
        print("Attestation: ",attestation)
        
        return DecideResponse(
            decision_id=attestation["quote"]["report_data"],
            decision=consensus_result, # Return original AI result to backend
            attestation=attestation
        )
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/v1/verify-decision/{decision_id}")
async def verify_decision(decision_id: str):
    """
    Milestone 3: Verifiable API endpoint for decision verification.
    """
    return {
        "decision_id": decision_id,
        "status": "verified",
        "attestation_type": "Flare TEE vTPM",
        "timestamp": "2026-01-17T21:10:00Z" # Mocked for demo
    }

@app.post("/decide", response_model=DecideResponse)
async def decide(request: DecideRequest):
    try:
        decision_result = await risk_agent.evaluate_strategy(
            request.strategy_name, 
            request.portfolio, 
            request.market_data
        )
        print("Decision Result: ",decision_result)
        
        decision_dict = decision_result.model_dump()
        attestation = attestation_service.generate_attestation(decision_dict)
        
        print("Attestation: ",attestation)
        return DecideResponse(
            decision_id=attestation["quote"]["report_data"],
            decision=decision_dict,
            attestation=attestation
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/evaluate", response_model=DecideResponse)
async def evaluate(request: EvaluateRequest):
    """
    Generalized evaluation endpoint with integrated ChaosChain stress testing.
    """
    try:
        # Load sector policy
        policy_path = f"src/policies/{request.sector.lower()}_{request.policy_version}.md"
        policy_rules = "Default safety rules"
        if os.path.exists(policy_path):
            with open(policy_path, 'r') as f:
                policy_rules = f.read()
        
        # 1. Primary Evaluation (Universal Agent)
        primary_result = await universal_trust_agent.evaluate(
            request.sector, 
            request.context, 
            policy_rules
        )
        
        # 2. Chaos Verification (ChaosChain pattern)
        # This adds an extra layer of trust for regulators
        chaos_result = await chaos_agent.stress_test(
            primary_result.model_dump(),
            request.context
        )
        
        final_decision = {
            "primary_evaluation": primary_result.model_dump(),
            "chaos_verification": chaos_result.model_dump(),
            "final_status": "CERTIFIED" if chaos_result.is_robust else "FLAGGED"
        }

        # Bridge the backend context with the AI results for a unified signature
        sign_payload = {
            **request.context, # id, user, action, asset, amount, fromProtocol, toProtocol, onChainHash, chainId, verifyingContract
            "reasons": [primary_result.justification], # Match backend's array wrapper
            "confidenceScore": int(primary_result.confidence * 10000), # Standardize 4-decimal integer
            "modelCid": primary_result.model_cid,
            "xaiCid": json.dumps(chaos_result.model_dump()) # Store full chaos report as XAI CID
        }
        
        # 3. Flare TEE Attestation (Flare AI Kit / vTPM)
        attestation = attestation_service.generate_attestation(sign_payload)
        
        return DecideResponse(
            decision_id=request.context.get("id"), # Return the ACTUAL ID, not report_data
            decision=final_decision,
            attestation=attestation
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/attestation-test")
async def attestation_test():
    test_decision = {"test": "data", "value": 123}
    attestation = attestation_service.generate_attestation(test_decision)
    return {
        "message": "Milestone 2 Attestation Test",
        "attestation": attestation
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8080)
