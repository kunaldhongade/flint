import pytest
from fastapi.testclient import TestClient
from web3 import Web3
from uuid import uuid4
import time

# We need to import the app. 
# Since we have dependency issues with 'pandas' in RAG, 
# we might need to mock the ChatRouter init or just test the router in isolation.
# For simplicity, we'll try to import just the router and mount it on a dummy app if main fails.
from fastapi import FastAPI
from flare_ai_defai.api.routes.trust import router as trust_router
from flare_ai_defai.decision_packet import DecisionPacket

test_app = FastAPI()
test_app.include_router(trust_router)

client = TestClient(test_app)

TEST_WALLET = "0xd8da6bf26964af9d7eed9e03e53415d37aa96045"
TEST_SIGNER = "0x0000000000000000000000000000000000000000"

def test_log_decision_calldata():
    """Test that we generate valid calldata for logDecision."""
    
    packet = DecisionPacket(
        decision_id=uuid4(),
        wallet_address=TEST_WALLET,
        ai_action="SWAP",
        input_summary="Test",
        decision_hash="0x123456",
        model_hash="0xdeadbeef",
        timestamp=int(time.time()),
        backend_signer=TEST_SIGNER
    )
    
    payload = {
        "packet": packet.model_dump(mode='json'),
        "user_tx_hash": "0xuserhash"
    }
    
    response = client.post("/log-decision", json=payload)
    assert response.status_code == 200
    data = response.json()
    
    assert "to" in data
    assert "data" in data
    assert "chain_id" in data
    
    calldata = data["data"]
    assert calldata.startswith("0x")
    
    # Verify selector
    # logDecision(bytes32,bytes32,bytes32,uint256,bytes32,uint256,address)
    w3 = Web3()
    signature = "logDecision(bytes32,bytes32,bytes32,uint256,bytes32,uint256,address)"
    expected_selector = w3.keccak(text=signature)[:4].hex()
    
    assert calldata.startswith(expected_selector)
    # 4 bytes selector + 7 * 32 bytes args = 4 + 224 = 228 bytes (456 hex chars + '0x' = 458)
    assert len(calldata) == 2 + 8 + (7 * 64) 
