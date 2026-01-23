import structlog
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from web3 import Web3
from eth_abi import encode
from pathlib import Path
import json

from flare_ai_defai.decision_packet import DecisionPacket, hash_decision_packet
from flare_ai_defai.settings import settings

logger = structlog.get_logger(__name__)
router = APIRouter(prefix="/trust", tags=["trust"])

# Placeholder Address - In production, this comes from ENV or Config
# We now use settings.decision_logger_address
 

def get_abi():
    try:
        abi_path = Path("abi/AIDecisionRegistry.json")
        if not abi_path.exists(): return []
        return json.loads(abi_path.read_text())
    except Exception: return []

class LogDecisionRequest(BaseModel):
    packet: DecisionPacket
    user_tx_hash: str

class LogDecisionResponse(BaseModel):
    to: str
    data: str
    chain_id: int

@router.post("/log-decision", response_model=LogDecisionResponse)
async def log_decision(request: LogDecisionRequest) -> LogDecisionResponse:
    """
    Generate the calldata for the user to log the decision on-chain.
    
    The backend does NOT sign this transaction. The user (frontend) must sign 
    and submit it to the DecisionLogger contract.
    """
    packet = request.packet
    
    # 1. Integrity Check
    # Verify the packet's content hashes to the declared hash?
    # Actually, hash_decision_packet hashes the JSON.
    # We should verify that the packet is valid from our perspective.
    # Since we are stateless, we mostly check if signature/signer is correct.
    # For PoC, we assume if it parses, it's okay, but we log it.
    
    canonical_hash = hash_decision_packet(packet)
    logger.info("logging_decision_request", 
                decision_id=str(packet.decision_id), 
                calculated_hash=canonical_hash)

    # 1.5 Replay Protection (On-Chain)
    try:
        w3 = Web3(Web3.HTTPProvider(settings.flare_rpc_url))
        abi = get_abi()
        if abi:
            contract = w3.eth.contract(address=settings.decision_logger_address, abi=abi)
            # Check isDecisionLogged(bytes32)
            decision_id_bytes = packet.decision_id.bytes.ljust(32, b'\0')
            is_logged = contract.functions.isDecisionLogged(decision_id_bytes).call()
            if is_logged:
                raise HTTPException(status_code=409, detail="Decision already logged on-chain")
    except HTTPException:
        raise
    except Exception as e:
        logger.warning("replay_check_failed", error=str(e))
        # Fail open or closed? For trust layer, maybe fail open if just RPC issue, 
        # but warn. Or fail closed? 
        # Failing closed (abort) is safer against replay but bad for UX if RPC flakes.
        # We proceed with warning for PoC status.
        pass

    # 2. ABI Encode logic for:
    # function logDecision(bytes32, bytes32, bytes32, uint256, bytes32, uint256, address)
    
    # Convert IDs to bytes32 compatible formats
    # UUID to bytes32
    decision_id_bytes = packet.decision_id.bytes 
    # Or just pad the hex? UUID bytes is 16 bytes. bytes32 is 32 bytes.
    # We usually pad to the right or left?
    # Let's interpret UUID as a number? Or just raw bytes padded?
    # Best practice: UUID bytes (16) + 16 bytes padding.
    decision_id_padded = decision_id_bytes.ljust(32, b'\0')

    # Hashes are already hex strings "0x..." -> convert to bytes
    decision_hash_bytes = bytes.fromhex(packet.decision_hash[2:])
    model_hash_bytes = bytes.fromhex(packet.model_hash[2:])
    
    fdc_hash_bytes = b'\0' * 32
    if packet.fdc_proof_hash:
        fdc_hash_bytes = bytes.fromhex(packet.fdc_proof_hash[2:])
        
    # Round ID is int
    round_id = packet.ftso_round_id if packet.ftso_round_id else 0
    
    # Timestamp
    timestamp = packet.timestamp
    
    # Signer
    signer_addr = packet.backend_signer

    # Method Selector for logDecision(...)
    # Signature: logDecision(bytes32,bytes32,bytes32,uint256,bytes32,uint256,address)
    # python eth-utils or web3
    w3 = Web3()
    fn_signature = "logDecision(bytes32,bytes32,bytes32,uint256,bytes32,uint256,address)"
    fn_selector = w3.keccak(text=fn_signature)[:4]
    
    encoded_args = encode(
        ['bytes32', 'bytes32', 'bytes32', 'uint256', 'bytes32', 'uint256', 'address'],
        [
            decision_id_padded,
            decision_hash_bytes,
            model_hash_bytes,
            round_id,
            fdc_hash_bytes,
            timestamp,
            signer_addr
        ]
    )
    
    calldata = fn_selector + encoded_args
    calldata_hex = "0x" + calldata.hex()

    return LogDecisionResponse(
        to=settings.decision_logger_address,
        data=calldata_hex,
        chain_id=114 # Coston2 Default. TODO: moved to settings "chain_id"?
    )
