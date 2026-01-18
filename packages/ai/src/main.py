from fastapi import FastAPI, HTTPException, Depends
from pydantic import BaseModel
from typing import Dict, Any, List
import uvicorn
import os
from agent import risk_agent, PortfolioInput
from universal_agent import universal_trust_agent
from chaos_agent import chaos_agent
from attestation import attestation_service

app = FastAPI(title="FLINT Verifiable AI Trust Layer")

class DecideRequest(BaseModel):
    strategy_name: str
    portfolio: Dict[str, Any]
    market_data: Dict[str, Any]

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
        "integrated_products": ["Flare vTPM", "ChaosChain Agent Relay"]
    }

@app.post("/decide", response_model=DecideResponse)
async def decide(request: DecideRequest):
    try:
        decision_result = await risk_agent.evaluate_strategy(
            request.strategy_name, 
            request.portfolio, 
            request.market_data
        )
        decision_dict = decision_result.model_dump()
        attestation = attestation_service.generate_attestation(decision_dict)
        return DecideResponse(
            decision_id=attestation["quote"]["report_data_hash"],
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
        
        # 3. Flare TEE Attestation (Flare AI Kit / vTPM)
        attestation = attestation_service.generate_attestation(final_decision)
        
        return DecideResponse(
            decision_id=attestation["quote"]["report_data_hash"],
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
