import json
import time
from typing import Literal, Optional
from uuid import UUID, uuid4

from eth_utils import to_checksum_address
from pydantic import BaseModel, Field, field_validator
from web3 import Web3


class DecisionPacket(BaseModel):
    """
    A deterministic schema for AI decision logic in the Flint Trust Layer.
    This packet serves as a verifiable record of what the AI decided, for whom, and based on what inputs.
    """
    decision_id: UUID = Field(default_factory=uuid4, description="Unique ID for this decision event")
    wallet_address: str = Field(..., description="The user's wallet address")
    ai_action: str = Field(
        ..., 
        description="The action type (e.g., SWAP, STAKE, LP, HOLD)"
    )
    input_summary: str = Field(..., description="A summary of the user input/intent (sanitized)")
    decision_hash: str = Field(..., description="Keccak256 hash of the raw AI text output")
    model_hash: str = Field(..., description="Hash of the Model ID + Prompt Template used")
    ftso_feed_id: Optional[str] = Field(None, description="Flare Time Series Oracle Feed ID if relevant")
    ftso_round_id: Optional[int] = Field(None, description="FTSO Round ID for price validity")
    fdc_proof_hash: Optional[str] = Field(None, description="Flare Data Connector proof hash if used")
    timestamp: int = Field(default_factory=lambda: int(time.time()), description="Unix timestamp of decision")
    backend_signer: str = Field(..., description="Address of the backend TEE/Signer that authorized this packet")
    subject: str = Field(default="AI Decision", description="Human-readable summary of the decision")
    subject: str = Field(default="AI Decision", description="Human-readable summary of the decision")

    @field_validator("wallet_address", "backend_signer")
    @classmethod
    def validate_eth_address(cls, v: str) -> str:
        try:
            return to_checksum_address(v)
        except ValueError:
            raise ValueError(f"Invalid Ethereum address: {v}")

    @field_validator("decision_hash", "model_hash", "fdc_proof_hash")
    @classmethod
    def validate_hex_hash(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        if not v.startswith("0x"):
            raise ValueError(f"Hash must start with 0x: {v}")
        # Basic hex character check
        try:
            int(v, 16)
        except ValueError:
            raise ValueError(f"Invalid hex string: {v}")
        return v

    def to_canonical_json(self) -> str:
        """
        Produce a deterministic JSON string representation.
        - Sorts keys
        - Uses minimal separators (',', ':')
        - Serializes UUIDs to hex strings
        """
        # model_dump(mode='json') handles UUID->str and Enum->str conversion automatically
        data = self.model_dump(mode='json')
        return json.dumps(data, sort_keys=True, separators=(',', ':'))


def hash_decision_packet(packet: DecisionPacket) -> str:
    """
    Compute the Keccak256 hash of the canonical JSON representation of the packet.
    This hash can be signed by the TEE or used for on-chain verification.
    """
    json_str = packet.to_canonical_json()
    return Web3.keccak(text=json_str).hex()
