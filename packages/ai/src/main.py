from fastapi import FastAPI, HTTPException, Depends
from pydantic import BaseModel
from typing import Dict, Any, List
import uvicorn
import os
from .agent import risk_agent, PortfolioInput
from .attestation import attestation_service

app = FastAPI(title="FLINT Verifiable AI Agent Service")

class DecideRequest(BaseModel):
    strategy_name: str
    portfolio: Dict[str, Any]
    market_data: Dict[str, Any]

class DecideResponse(BaseModel):
    decision_id: str
    decision: Dict[str, Any]
    attestation: Dict[str, Any]

@app.get("/health")
async def health():
    return {
        "status": "ok",
        "tee_mode": os.getenv("TEE_MODE", "simulation"),
        "flare_ai_kit_integrated": True
    }

@app.post("/decide", response_model=DecideResponse)
async def decide(request: DecideRequest):
    try:
        # 1. Run the AI Agent decision logic
        decision_result = await risk_agent.evaluate_strategy(
            request.strategy_name, 
            request.portfolio, 
            request.market_data
        )
        
        decision_dict = decision_result.model_dump()
        
        # 2. Generate the TEE Attestation (simulated for Milestone 2)
        attestation = attestation_service.generate_attestation(decision_dict)
        
        return DecideResponse(
            decision_id=attestation["attestation_id"],
            decision=decision_dict,
            attestation=attestation
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/attestation-test")
async def attestation_test():
    """
    Test endpoint for Milestone 2 to verify attestation structure.
    """
    test_decision = {"test": "data", "value": 123}
    attestation = attestation_service.generate_attestation(test_decision)
    return {
        "message": "Milestone 2 Attestation Test",
        "attestation": attestation
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8080)
