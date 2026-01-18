import pytest
from src.universal_agent import universal_trust_agent
from src.main import app
from fastapi.testclient import TestClient

client = TestClient(app)

@pytest.mark.asyncio
async def test_universal_agent_simulated():
    context = {"data": "test_medical_record", "privacy": "high"}
    policy = "Minimize data exposure"
    result = await universal_trust_agent.evaluate("Healthcare", context, policy)
    assert result.sector == "Healthcare"
    assert result.decision in ["approve", "reject"]

def test_evaluate_endpoint():
    response = client.post(
        "/evaluate",
        json={
            "sector": "Healthcare",
            "context": {"patient_id": "123", "lab_result": "normal"},
            "policy_version": "v1"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert "attestation" in data
    assert data["decision"]["sector"] == "Healthcare"
