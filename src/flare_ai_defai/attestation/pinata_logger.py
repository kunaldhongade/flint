import json
import hashlib
import requests
import structlog
from typing import Any, Dict, Tuple
from web3 import Web3

from flare_ai_defai.settings import settings

logger = structlog.get_logger(__name__)

PINATA_BASE_URL = "https://api.pinata.cloud"

class PinataLogger:
    """
    Handles logging of decision trails to IPFS via Pinata.
    """
    
    def __init__(self, api_key: str | None = None, secret_key: str | None = None):
        self.api_key = api_key or settings.pinata_api_key
        self.secret_key = secret_key or settings.pinata_secret_api_key
        
        if not self.api_key or not self.secret_key:
             logger.warning("Pinata credentials missing. IPFS logging disabled.")

    def upload_decision_trail(self, trail_data: Dict[str, Any]) -> Tuple[str, str]:
        """
        Uploads the full decision trail JSON to Pinata.
        
        Args:
            trail_data: The full dictionary containing the workflow context.
            
        Returns:
            Tuple of (CID, keccak256_hash_of_CID)
        """
        if not self.api_key or not self.secret_key:
            return ("", "")

        try:
            # Deterministic serialization
            json_str = json.dumps(trail_data, sort_keys=True, separators=(',', ':'))
            
            # Pin to IPFS
            headers = {
                "pinata_api_key": self.api_key,
                "pinata_secret_api_key": self.secret_key
            }
            
            # Identify file name 
            decision_id = trail_data.get("decision_id", "unknown")
            file_name_metadata = json.dumps({
                "name": f"flint_decision_{decision_id}.json",
                "keyvalues": {
                    "app": "flint_ai",
                    "domain": trail_data.get("domain", "DeFi")
                }
            })

            # Multipart upload
            files = {
                'file': ('decision_trail.json', json_str, 'application/json'),
                'pinataMetadata': (None, file_name_metadata),
                'pinataOptions': (None, '{"cidVersion": 1}')
            }

            response = requests.post(
                f"{PINATA_BASE_URL}/pinning/pinFileToIPFS",
                headers=headers,
                files=files
            )

            if response.status_code != 200:
                logger.error("Pinata upload failed", status=response.status_code, response=response.text)
                return ("", "")
            
            result = response.json()
            ipfs_hash = result.get("IpfsHash", "")
            
            if not ipfs_hash:
                 return ("", "")
            
            # Compute Keccak256 of the CID (for on-chain commitment)
            cid_hash = Web3.keccak(text=ipfs_hash).hex()
            
            logger.info("Decision trail pinned", cid=ipfs_hash, cid_hash=cid_hash)
            return (ipfs_hash, cid_hash)

        except Exception as e:
            logger.exception("Failed to upload decision trail", error=str(e))
            return ("", "")

# Global instance
pinata_logger = PinataLogger()
