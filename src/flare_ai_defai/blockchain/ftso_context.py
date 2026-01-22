from typing import Optional
import binascii
import structlog
from web3 import Web3
from flare_ai_defai.blockchain.flare import FlareProvider

logger = structlog.get_logger(__name__)

# Standard FTSO v2 Feed IDs are 21 bytes.
# Category 01 = Crypto.
# Format: 01 + Hex("TOKEN/USD") + Padding
# FLR/USD  = 464c522f555344 -> 0x01464c522f55534400000000000000000000000000
# USDC/USD = 555344432f555344 -> 0x01555344432f555344000000000000000000000000
# USDT/USD = 555344542f555344 -> 0x01555344542f555344000000000000000000000000
# ETH/USD  = 4554482f555344 -> 0x014554482f55534400000000000000000000000000
# BTC/USD  = 4254432f555344 -> 0x014254432f55534400000000000000000000000000

FTSO_FEED_IDS = {
    "FLR": "0x01464c522f55534400000000000000000000000000", 
    "WFLR": "0x01464c522f55534400000000000000000000000000",
    "USDC": "0x01555344432f555344000000000000000000000000",
    "USDT": "0x01555344542f555344000000000000000000000000",
    "ETH": "0x014554482f55534400000000000000000000000000",
    "WETH": "0x014554482f55534400000000000000000000000000",
    "BTC": "0x014254432f55534400000000000000000000000000",
}

def get_feed_id(symbol: str) -> Optional[str]:
    """
    Get the FTSO Feed ID for a given token symbol.
    """
    symbol = symbol.upper()
    # Handle wrapped tokens or synonyms if needed
    if symbol == "USDC.E":
        symbol = "USDC"
    
    return FTSO_FEED_IDS.get(symbol)

async def get_ftso_context(
    blockchain_provider: FlareProvider, 
    symbol: str
) -> dict[str, Optional[str | int]]:
    """
    Fetch the current FTSO context (Feed ID, Round ID) for a symbol.
    
    Args:
        blockchain_provider: The FlareProvider instance to use for RPC calls.
        symbol: The asset symbol (e.g. "FLR", "USDC").
        
    Returns:
        dict: {
            "ftso_feed_id": str | None,
            "ftso_round_id": int | None
        }
    """
    feed_id = get_feed_id(symbol)
    if not feed_id:
        return {"ftso_feed_id": None, "ftso_round_id": None}
        
    # In a production environment, we would call the FTSO Registry or FastUpdater
    # to get the current round and price.
    # For this implementation, we attempt to get the latest block number as a proxy 
    # for the "Round ID" if the actual FTSO contract call is not fully configured,
    # OR we return a mocked round ID if we can't connect, to ensure the decision flows.
    
    # NOTE: FTSO rounds are time-based (e.g. 90s or 1.8s blocks). 
    # Real implementations would query the Relay contract.
    
    try:
        # Placeholder: Fetch block number as a rough proxy for "time/round" context
        # This proves we have *some* blockchain context at the time of decision.
        block_number = blockchain_provider.w3.eth.block_number
        
        # If we had the FTSO contract address:
        # round_id = contract.functions.getCurrentVotingRoundId().call()
        
        return {
            "ftso_feed_id": feed_id,
            "ftso_round_id": block_number # Using block number as verifiable timestamp context
        }
    except Exception as e:
        logger.warning("ftso_context_fetch_failed", error=str(e))
        return {"ftso_feed_id": feed_id, "ftso_round_id": None}
