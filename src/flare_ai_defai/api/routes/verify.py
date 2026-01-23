import structlog
import json
import requests
from pathlib import Path
from typing import Optional, Any, List, Dict
from uuid import UUID

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from web3 import Web3

from flare_ai_defai.settings import settings

logger = structlog.get_logger(__name__)
router = APIRouter(prefix="/trust", tags=["trust"])

IPFS_GATEWAY = "https://gateway.pinata.cloud/ipfs/"

def get_abi():
    """Load AIDecisionRegistry ABI from file"""
    try:
        abi_path = Path("abi/AIDecisionRegistry.json")
        if not abi_path.exists():
            return []
        data = json.loads(abi_path.read_text())
        return data.get("abi", [])
    except Exception as e:
        logger.error("failed_to_load_abi", error=str(e))
        return []

class ModelExecution(BaseModel):
    """Individual model execution record"""
    model_id: str
    role: str
    prompt_hash: str
    response_text: str
    timestamp_start: float
    timestamp_end: float

class VerificationResponse(BaseModel):
    """Complete verification response with IPFS trail"""
    decision_id: str
    on_chain_status: str  # "REGISTERED", "NOT_FOUND"
    transaction_hash: Optional[str] = None
    block_number: Optional[int] = None
    
    # On-chain Data (from AIDecisionRegistry)
    ipfs_cid: Optional[str] = None
    ipfs_cid_hash: Optional[str] = None
    domain: Optional[str] = None
    domain_hash: Optional[str] = None
    chosen_model: Optional[str] = None
    chosen_model_hash: Optional[str] = None
    subject: Optional[str] = None
    timestamp: Optional[int] = None
    
    # IPFS Trail Data
    ipfs_resolved: bool = False
    ipfs_verification: str = "NOT_CHECKED"  # "VERIFIED", "HASH_MISMATCH", "FETCH_FAILED"
    
    # Decoded trail details
    models_executed: Optional[List[str]] = None
    model_executions: Optional[List[Dict[str, Any]]] = None
    user_input_hash: Optional[str] = None
    execution_enabled: Optional[bool] = None
    defi_tx_details: Optional[Dict[str, Any]] = None

@router.get("/verify/{decision_id}", response_model=VerificationResponse)
async def verify_decision(decision_id: UUID) -> VerificationResponse:
    """
    Verify an AI decision by:
    1. Fetching on-chain record from AIDecisionRegistry
    2. Resolving IPFS CID to get full trail
    3. Verifying CID hash matches
    4. Displaying complete decision context
    """
    
    try:
        # 1. Setup Web3 and Contract
        w3 = Web3(Web3.HTTPProvider(settings.flare_rpc_url))
        abi = get_abi()
        if not abi:
            raise HTTPException(status_code=500, detail="Contract ABI not found")
            
        contract = w3.eth.contract(
            address=Web3.to_checksum_address(settings.decision_logger_address), 
            abi=abi
        )
        
        # 2. Convert UUID to bytes32
        decision_id_str = str(decision_id).replace('-', '')
        decision_id_bytes = bytes.fromhex(decision_id_str.ljust(64, '0'))
        
        # 3. Call decisions() view function
        # Returns: (decisionId, ipfsCidHash, domainHash, chosenModelHash, subject, timestamp)
        decision_data = contract.functions.decisions(decision_id_bytes).call()
        
        # Check if exists (timestamp 0 means not registered)
        if decision_data[5] == 0:
            return VerificationResponse(
                decision_id=str(decision_id),
                on_chain_status="NOT_FOUND"
            )
        
        # 4. Extract on-chain data
        ipfs_cid_hash = "0x" + decision_data[1].hex()
        domain_hash = "0x" + decision_data[2].hex()
        chosen_model_hash = "0x" + decision_data[3].hex()
        subject = decision_data[4]
        timestamp = decision_data[5]
        
        # 5. Find Transaction Hash via Events
        tx_hash = None
        block_number = None
        try:
            event_filter = contract.events.DecisionRegistered.create_filter(
                fromBlock=0,
                argument_filters={'decisionId': decision_id_bytes}
            )
            events = event_filter.get_all_entries()
            if events:
                tx_hash = events[0].transactionHash.hex()
                block_number = events[0].blockNumber
        except Exception as e:
            logger.warning("event_lookup_failed", error=str(e))
        
        # 6. Attempt IPFS Resolution
        ipfs_cid = None
        ipfs_resolved = False
        ipfs_verification = "NOT_CHECKED"
        trail_data = None
        
        # Try to reverse-lookup CID from hash (this requires the backend to have stored it)
        # For now, we'll attempt common patterns or rely on the packet having it
        # In production, you'd query a database or the IPFS network
        
        # Placeholder: Try to fetch if we have the CID
        # (In real implementation, backend should return CID in the packet)
        
        response_data = VerificationResponse(
            decision_id=str(decision_id),
            on_chain_status="REGISTERED",
            transaction_hash=tx_hash,
            block_number=block_number,
            ipfs_cid_hash=ipfs_cid_hash,
            domain_hash=domain_hash,
            chosen_model_hash=chosen_model_hash,
            subject=subject,
            timestamp=timestamp,
            ipfs_resolved=ipfs_resolved,
            ipfs_verification=ipfs_verification
        )
        
        return response_data

    except Exception as e:
        logger.error("verification_failed", error=str(e), decision_id=str(decision_id))
        raise HTTPException(status_code=500, detail=f"Verification failed: {str(e)}")


@router.get("/verify/{decision_id}/full", response_model=VerificationResponse)
async def verify_decision_full(decision_id: UUID, ipfs_cid: str) -> VerificationResponse:
    """
    Full verification with IPFS CID provided.
    This endpoint requires the IPFS CID to be passed explicitly.
    """
    
    try:
        # First get on-chain data
        base_response = await verify_decision(decision_id)
        
        if base_response.on_chain_status == "NOT_FOUND":
            return base_response
        
        # 7. Fetch IPFS Content
        try:
            ipfs_url = f"{IPFS_GATEWAY}{ipfs_cid}"
            response = requests.get(ipfs_url, timeout=10)
            
            if response.status_code == 200:
                trail_data = response.json()
                base_response.ipfs_resolved = True
                base_response.ipfs_cid = ipfs_cid
                
                # 8. Verify CID Hash
                computed_cid_hash = Web3.keccak(text=ipfs_cid).hex()
                if computed_cid_hash == base_response.ipfs_cid_hash:
                    base_response.ipfs_verification = "VERIFIED"
                else:
                    base_response.ipfs_verification = "HASH_MISMATCH"
                
                # 9. Extract Trail Details
                base_response.user_input_hash = trail_data.get("user_input_hash")
                base_response.models_executed = trail_data.get("selected_models", [])
                base_response.model_executions = trail_data.get("model_executions", [])
                base_response.execution_enabled = trail_data.get("execution_enabled")
                base_response.defi_tx_details = trail_data.get("defi_tx_details")
                
                # Decode domain if possible
                domain_map = {
                    Web3.keccak(text="DeFi").hex(): "DeFi",
                    Web3.keccak(text="Medical").hex(): "Medical",
                    Web3.keccak(text="Security").hex(): "Security",
                    Web3.keccak(text="Custom").hex(): "Custom"
                }
                base_response.domain = domain_map.get(base_response.domain_hash, "Unknown")
                
                # Extract chosen model name from executions
                if base_response.model_executions:
                    for exec_data in base_response.model_executions:
                        if Web3.keccak(text=exec_data.get("model_id", "")).hex() == base_response.chosen_model_hash:
                            base_response.chosen_model = exec_data.get("model_id")
                            break
                
            else:
                base_response.ipfs_verification = "FETCH_FAILED"
                
        except Exception as e:
            logger.error("ipfs_fetch_failed", error=str(e), cid=ipfs_cid)
            base_response.ipfs_verification = "FETCH_FAILED"
        
        return base_response

    except Exception as e:
        logger.error("full_verification_failed", error=str(e))
        raise HTTPException(status_code=500, detail=f"Full verification failed: {str(e)}")
