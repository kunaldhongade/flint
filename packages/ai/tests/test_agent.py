import pytest
from src.attestation import attestation_service
from src.agent import risk_agent
import asyncio

def test_attestation_structure():
    """
    Verifies that the attestation object has all required fields for Milestone 2.
    """
    decision_data = {"decision": "approve", "risk_score": 0.1}
    attestation = attestation_service.generate_attestation(decision_data)
    
    assert "attestation_id" in attestation
    assert attestation["tee_provider"] == "gcp_confidential_space"
    assert "vtpm_quote" in attestation
    assert "measurement" in attestation
    assert attestation["verified"] is True

@pytest.mark.asyncio
async def test_agent_decision_pipeline():
    """
    Verifies the agent can evaluate a strategy and produce a valid response.
    """
    portfolio = {"assets": [{"symbol": "XRP", "amount": 1000}], "total_value_usd": 650}
    market_data = {"XRP": {"price": 0.65, "volatility": 0.1}}
    
    result = await risk_agent.evaluate_strategy("XRP Earn", portfolio, market_data)
    
    assert hasattr(result, "decision")
    assert result.decision in ["approve", "reject"]
    assert hasattr(result, "risk_score")
    assert 0.0 <= result.risk_score <= 1.0

def test_attestation_binding():
    """
    Verifies that different decisions produce different attestation hashes.
    """
    d1 = {"val": 1}
    d2 = {"val": 2}
    
    a1 = attestation_service.generate_attestation(d1)
    a2 = attestation_service.generate_attestation(d2)
    
    assert a1["decision_binding_hash"] != a2["decision_binding_hash"]
    assert a1["vtpm_quote"] != a2["vtpm_quote"]
