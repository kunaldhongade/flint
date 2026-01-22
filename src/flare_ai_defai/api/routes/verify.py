import structlog
import json
from pathlib import Path
from typing import Optional, Any
from uuid import UUID

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from web3 import Web3

from flare_ai_defai.settings import settings

logger = structlog.get_logger(__name__)
router = APIRouter(prefix="/trust", tags=["trust"])

# Placeholder Address - matching trust.py
# Using settings.decision_logger_address


def get_abi():
    """Load ABI from file"""
    try:
        # Assuming running from root, verify path
        abi_path = Path("abi/DecisionLogger.json")
        if not abi_path.exists():
             # Fallback location relative to src if needed, or error
             return []
        return json.loads(abi_path.read_text())
    except Exception as e:
        logger.error("failed_to_load_abi", error=str(e))
        return []

class VerificationResponse(BaseModel):
    decision_id: str
    on_chain_status: str # "LOGGED", "NOT_FOUND"
    transaction_hash: Optional[str] = None
    block_number: Optional[int] = None
    timestamp: Optional[int] = None
    
    # On-chain Data
    decision_hash: Optional[str] = None
    model_hash: Optional[str] = None
    ftso_round_id: Optional[int] = None
    fdc_proof_hash: Optional[str] = None
    backend_signer: Optional[str] = None
    
    verification_status: str # "VERIFIED" (if signer matches), "UNKNOWN_SIGNER"

@router.get("/verify/{decision_id}", response_model=VerificationResponse)
async def verify_decision(decision_id: UUID) -> VerificationResponse:
    """
    Verify an AI decision by querying the Flare blockchain.
    Retreives the immutable log from the DecisionLogger contract.
    """
    
    # 1. Setup Web3 and Contract
    try:
        w3 = Web3(Web3.HTTPProvider(settings.flare_rpc_url))
        abi = get_abi()
        if not abi:
             raise HTTPException(status_code=500, detail="Contract ABI not found")
             
        contract = w3.eth.contract(address=settings.decision_logger_address, abi=abi)
        
        # 2. Convert UUID to bytes32 for lookup
        # ID is 16 bytes. We left-justify to 32 bytes in trust.py logic.
        decision_id_bytes = decision_id.bytes.ljust(32, b'\0')
        
        # 3. Call getDecision view function
        # struct Decision { ... } regex: (bytes32,bytes32,bytes32,uint256,bytes32,uint256,address)
        # Returns tuple
        decision_data = contract.functions.getDecision(decision_id_bytes).call()
        
        # Check if empty (timestamp 0 usually means not existent)
        # Tuple index 5 is timestamp
        if decision_data[5] == 0:
            return VerificationResponse(
                decision_id=str(decision_id),
                on_chain_status="NOT_FOUND",
                verification_status="N/A"
            )
            
        # 4. Find Transaction Hash via Events
        # This is expensive on mainnet node without indexer, but strictly required by prompt
        # "Response must include... Flare tx hash"
        tx_hash = None
        block_number = None
        
        try:
            # Create filter for DecisionLogged event with indexed decisionId
            event_filter = contract.events.DecisionLogged.create_filter(
                fromBlock=0, 
                argument_filters={'decisionId': decision_id_bytes}
            )
            events = event_filter.get_all_entries()
            if events:
                tx_hash = events[0].transactionHash.hex()
                block_number = events[0].blockNumber
        except Exception as e:
            logger.warning("event_lookup_failed", error=str(e))
            # Proceed with view data even if event lookup fails (e.g. RPC limits)

        # 5. Construct Response
        # Reconstruct fields from the tuple result of getDecision
        # Schema: (id, decisionHash, modelHash, ftsoRound, fdcHash, timestamp, signer)
        stored_signer = decision_data[6]
        
        # Simple verification logic
        # In this PoC, we check if signer is non-zero
        is_verified = "VERIFIED" if stored_signer != "0x0000000000000000000000000000000000000000" else "INVALID"

        return VerificationResponse(
            decision_id=str(decision_id),
            on_chain_status="LOGGED",
            transaction_hash=tx_hash,
            block_number=block_number,
            timestamp=decision_data[5],
            decision_hash="0x" + decision_data[1].hex(),
            model_hash="0x" + decision_data[2].hex(),
            ftso_round_id=decision_data[3],
            fdc_proof_hash="0x" + decision_data[4].hex(),
            backend_signer=stored_signer,
            verification_status=is_verified
        )

    except Exception as e:
        logger.error("verification_failed", error=str(e))
        raise HTTPException(status_code=500, detail=f"Verification failed: {str(e)}")
