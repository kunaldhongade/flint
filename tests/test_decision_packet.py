import pytest
from uuid import UUID
from web3 import Web3
from flare_ai_defai.decision_packet import DecisionPacket, hash_decision_packet

# Constants for testing
TEST_WALLET = "0xd8da6bf26964af9d7eed9e03e53415d37aa96045"  # vitalik.eth
TEST_SIGNER = "0x0000000000000000000000000000000000000000"
DECISION_ID_STR = "123e4567-e89b-12d3-a456-426614174000"

def test_decision_packet_creation():
    """Test that we can create a valid packet."""
    packet = DecisionPacket(
        wallet_address=TEST_WALLET,
        ai_action="SWAP",
        input_summary="Swap 100 FLR for USDC",
        decision_hash="0x123",
        model_hash="0xabc",
        backend_signer=TEST_SIGNER
    )
    assert packet.wallet_address == Web3.to_checksum_address(TEST_WALLET)
    assert packet.ai_action == "SWAP"
    assert isinstance(packet.decision_id, UUID)
    assert packet.timestamp > 0

def test_address_validation():
    """Test that invalid addresses raise ValueError."""
    with pytest.raises(ValueError):
        DecisionPacket(
            wallet_address="0xinvalid",
            ai_action="SWAP",
            input_summary="test",
            decision_hash="0x123",
            model_hash="0xabc",
            backend_signer=TEST_SIGNER
        )

def test_deterministic_hashing():
    """Test that two identical packets produce the exact same hash."""
    
    # Fixed timestamp and ID for reproducibility
    ts = 1700000000
    u_id = UUID(DECISION_ID_STR)
    
    packet1 = DecisionPacket(
        decision_id=u_id,
        wallet_address=TEST_WALLET,
        ai_action="STAKE",
        input_summary="Stake FLR",
        decision_hash="0x123456",
        model_hash="0xgemini15",
        ftso_feed_id="FLR/USD",
        ftso_round_id=100,
        timestamp=ts,
        backend_signer=TEST_SIGNER
    )
    
    packet2 = DecisionPacket(
        decision_id=u_id,
        wallet_address=TEST_WALLET,
        ai_action="STAKE",
        input_summary="Stake FLR",
        decision_hash="0x123456",
        model_hash="0xgemini15",
        ftso_feed_id="FLR/USD",
        ftso_round_id=100,
        timestamp=ts,
        backend_signer=TEST_SIGNER
    )
    
    # Check canonical JSON equality
    assert packet1.to_canonical_json() == packet2.to_canonical_json()
    
    # Check hash equality
    hash1 = hash_decision_packet(packet1)
    hash2 = hash_decision_packet(packet2)
    assert hash1 == hash2

    # Verify that changing one field changes the hash
    packet3 = packet1.model_copy()
    packet3.ftso_round_id = 101
    hash3 = hash_decision_packet(packet3)
    assert hash1 != hash3

def test_serialization_structure():
    """Verify the JSON structure contains expected keys."""
    packet = DecisionPacket(
        wallet_address=TEST_WALLET,
        ai_action="LP",
        input_summary="test",
        decision_hash="0x1",
        model_hash="0x2",
        backend_signer=TEST_SIGNER
    )
    json_str = packet.to_canonical_json()
    assert "wallet_address" in json_str
    assert "ai_action" in json_str
    assert "backend_signer" in json_str
    # Verify no spaces in separators
    assert ", " not in json_str
    assert ", " not in json_str
    assert ": " not in json_str

def test_interceptor():
    """Test the DecisionInterceptor logic."""
    from flare_ai_defai.interceptor import DecisionInterceptor
    
    interceptor = DecisionInterceptor()
    packet = interceptor.intercept(
        wallet_address=TEST_WALLET,
        ai_action="SWAP",
        user_input="Swap 10 FLR",
        ai_response_text="Swapping...",
        transaction_data={"to": "0x123", "value": 100}
    )
    
    assert packet.ai_action == "SWAP"
    assert packet.input_summary == "Swap 10 FLR"
    assert packet.decision_hash.startswith("0x")
    assert packet.decision_hash.startswith("0x")
    assert packet.backend_signer != ""

def test_fdc_validation():
    """Test FDC proof hash validation"""
    # Valid case
    packet = DecisionPacket(
        wallet_address=TEST_WALLET,
        ai_action="SWAP",
        input_summary="Test",
        decision_hash="0x123",
        model_hash="0xabc",
        backend_signer=TEST_SIGNER,
        fdc_proof_hash="0xdeadbeef"
    )
    assert packet.fdc_proof_hash == "0xdeadbeef"

    # Invalid case - no 0x
    with pytest.raises(ValueError, match="Hash must start with 0x"):
        DecisionPacket(
            wallet_address=TEST_WALLET,
            ai_action="SWAP",
            input_summary="Test",
            decision_hash="0x123",
            model_hash="0xabc",
            backend_signer=TEST_SIGNER,
            fdc_proof_hash="deadbeef"
        )
    
    # Invalid case - bad hex
    with pytest.raises(ValueError, match="Invalid hex string"):
        DecisionPacket(
            wallet_address=TEST_WALLET,
            ai_action="SWAP",
            input_summary="Test",
            decision_hash="0x123",
            model_hash="0xabc",
            backend_signer=TEST_SIGNER,
            fdc_proof_hash="0xzzzz"
        )

