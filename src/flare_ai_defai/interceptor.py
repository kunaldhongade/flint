from __future__ import annotations
import json
import structlog
from typing import Any, Optional
from web3 import Web3
from flare_ai_defai.decision_packet import DecisionPacket, hash_decision_packet
from flare_ai_defai.settings import settings

logger = structlog.get_logger(__name__)

class DecisionInterceptor:
    """
    Intercepts AI decisions to generate a verifiable DecisionPacket.
    Acts as a middleware layer between the reasoning engine and the API response.
    """

    def __init__(self, signing_address: str = "0x0000000000000000000000000000000000000000"):
        # In a real TEE, this would form the attestation signature.
        # For now, we use a configured signer address.
        self.signing_address = signing_address
        self.logger = logger.bind(component="DecisionInterceptor")

    def intercept(
        self,
        wallet_address: str,
        ai_action: str,
        user_input: str,
        ai_response_text: str,
        transaction_data: Optional[str | dict] = None,
        model_id: str = "gemini-1.5-flash",
        ftso_feed_id: Optional[str] = None,
        ftso_round_id: Optional[int] = None,
    ) -> DecisionPacket:
        """
        Capture the decision context and generate a signed packet.

        Args:
            wallet_address: User's wallet
            ai_action: The classification (SWAP, STAKE, etc)
            user_input: Raw user prompt
            ai_response_text: The text reply from the AI
            transaction_data: The JSON string or dict of the constructed tx
            model_id: ID of the model used

        Returns:
            DecisionPacket: The verifiable decision record
        """
        
        # 1. Sanitize/Summarize Input
        # For this PoC, we use the raw input as summary, but stripped of whitespace
        input_summary = user_input.strip()

        # 2. Compute Decision Hash
        # We hash the combination of the text response and the transaction data
        # This ensures that what the user sees and signs is exactly what we attested to.
        decision_payload = {
            "text": ai_response_text,
            "transaction": transaction_data
        }
        payload_str = json.dumps(decision_payload, sort_keys=True)
        decision_hash = Web3.to_hex(Web3.keccak(text=payload_str))

        # 3. Compute Model Hash
        # Deterministic hash of model ID + action (template)
        model_context = f"{model_id}:{ai_action}"
        model_hash = Web3.to_hex(Web3.keccak(text=model_context))

        # 4. Generate human-readable subject
        subject = f"{ai_action}: {input_summary[:50]}{'...' if len(input_summary) > 50 else ''}"
        
        # 5. Create Packet
        packet = DecisionPacket(
            wallet_address=wallet_address,
            ai_action=ai_action,
            input_summary=input_summary,
            decision_hash=decision_hash,
            model_hash=model_hash,
            backend_signer=self.signing_address,
            ftso_feed_id=ftso_feed_id,
            ftso_round_id=ftso_round_id,
            subject=subject
        )
        
        # 5. Log the interception
        packet_hash = hash_decision_packet(packet)
        self.logger.info(
            "decision_intercepted",
            decision_id=str(packet.decision_id),
            packet_hash=packet_hash,
            action=ai_action,
            wallet=wallet_address
        )

        return packet
