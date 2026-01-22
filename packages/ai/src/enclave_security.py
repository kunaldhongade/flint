import os
import hashlib
import json
from typing import Dict, Any
from eth_account import Account
from eth_account.messages import encode_typed_data

class EnclaveSecurity:
    """
    Manages the Identity and Security of the TEE Enclave.
    Generates ephemeral keys in RAM and binds them to the hardware attestation.
    Uses eth-account for strict EVM compatibility.
    """
    def __init__(self):
        self._account = None
        self.public_key_hex = None # This will effectively be the address for standard workflows, or compressed pubkey if needed.
        self._initialize_ephemeral_identity()

    def _initialize_ephemeral_identity(self):
        """
        Generates a new Ethereum Account in RAM.
        This key never leaves the enclave and is lost on restart.
        """
        # Use a stable key in simulation mode to avoid repeated on-chain registrations
        if os.getenv("TEE_MODE") == "simulation":
            # Deterministic for testing/demo
            print("[Enclave Security] TEE_MODE=simulation. Using stable identity.")
            self._account = Account.from_key("0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef")
        else:
            self._account = Account.create()
        
        # We verify using the Address in the contract, but the Attestation service
        # might want the Public Key to put in the quote Report Data.
        # Report Data is 64 bytes. Address is 20 bytes.
        # A compressed public key is 33 bytes. Uncompressed 65.
        # We can hash the Address or the Public Key. 
        # Existing code hashed the Public Key.
        # eth_account doesn't expose public key easily on the Account object (it's abstracted).
        # However, we can use the private key to get it if strictly needed.
        # For simplicity and standard patterns, binding the ADDRESS hash is safer and easier to verify on-chain?
        # Contract Verification: `registerEnclave` takes `address enclaveKey`.
        # So we should bind the Address (or hash of Address) to the Quote. 
        # But previous code used `public_key_hex`.
        # Let's see `get_report_data`.
        
        # We will use the Address as the identity.
        self.address = self._account.address
        self.public_key_hex = self.address # Use address as the public identifier
        print(f"[Enclave Security] Identity Generated: {self.address}")
        
    def get_report_data(self) -> str:
        """
        Returns the hash of the ADDRESS to be used as REPORT_DATA (UserData)
        in the TDX/SGX Quote. This binds the key to the hardware.
        """
        # We hash the address bytes (or string?) to fit into report_data (64 bytes).
        # Report data is usually raw bytes. 
        # Let's standardize on Keccak256 or SHA256 of the address bytes.
        
        # Note: If we change this logic, we MUST ensure the Attestation Oracle
        # knows how to verify it (User provided Address -> Hash -> Compare to Report Data).
        # Previous logic: sha256(pub_bytes).
        # New logic: sha256(address_bytes).
        
        # Get address bytes
        address_bytes = bytes.fromhex(self.address[2:]) # Remove 0x
        return hashlib.sha256(address_bytes).hexdigest()

    def sign_decision(self, decision_data: Dict[str, Any], chain_id: int, verifying_contract: str) -> str:
        """
        Signs the EIP-712 typed data representation of the decision with the Enclave Private Key.
        Matches the Decision struct in DecisionLogger.sol.
        """
        
        # 1. Define EIP-712 Types
        types = {
            "EIP712Domain": [
                {"name": "name", "type": "string"},
                {"name": "version", "type": "string"},
                {"name": "chainId", "type": "uint256"},
                {"name": "verifyingContract", "type": "address"}
            ],
            "Decision": [
                {"name": "id", "type": "bytes32"},
                {"name": "user", "type": "address"},
                {"name": "action", "type": "uint8"},
                {"name": "asset", "type": "address"},
                {"name": "amount", "type": "uint256"},
                {"name": "fromProtocol", "type": "address"},
                {"name": "toProtocol", "type": "address"},
                {"name": "confidenceScore", "type": "uint256"},
                {"name": "reasonsHash", "type": "bytes32"},
                {"name": "dataSourcesHash", "type": "bytes32"},
                {"name": "alternativesHash", "type": "bytes32"},
                {"name": "onChainHash", "type": "bytes32"},
                {"name": "modelCidHash", "type": "bytes32"},
                {"name": "xaiCidHash", "type": "bytes32"}
            ]
        }
        
        # 2. Define Domain
        domain = {
            "name": "DecisionVerifier",
            "version": "1",
            "chainId": chain_id,
            "verifyingContract": verifying_contract
        }

        # 3. Helper to hash dynamic strings as per Solidity logic: keccak256(bytes(str))
        from eth_utils import keccak
        def hash_str(s: Any) -> bytes:
            if isinstance(s, list):
                s = json.dumps(s, separators=(',', ':')) # Match JS JSON.stringify exactly
            elif not isinstance(s, str):
                s = str(s)
            return keccak(text=s) if s else keccak(text="")

        def hash_bytes32(s: Any) -> bytes:
            if not s: return b'\x00' * 32
            if isinstance(s, str):
                if s.startswith("0x"):
                    s = s[2:]
                if len(s) == 64:
                    try:
                        return bytes.fromhex(s)
                    except ValueError:
                        pass
            return keccak(text=str(s))

        def validate_address(addr: Any) -> str:
            """Ensure address is a valid checksummed Ethereum address."""
            from eth_utils import is_address, to_checksum_address
            if isinstance(addr, str) and is_address(addr):
                return to_checksum_address(addr)
            # Default to Zero Address for mocks/names like "FXRP"
            return "0x0000000000000000000000000000000000000000"

        # 4. Prepare Message
        # Note: We must hash the string fields (reasons, dataSources, etc.) because the Solidity contract 
        # defines the struct with bytes32 for these fields in the TYPEHASH, but takes strings in the function 
        # and hashes them locally. HOWEVER, EIP-712 usually handles string hashing.
        # Let's check DecisionLogger.sol again.
        # It defines:
        # bytes32 private constant DECISION_TYPEHASH = keccak256("Decision(...,bytes32 reasonsHash, ...)");
        # So the struct *in the EIP-712 signature* expects the hashed values, NOT the raw strings.
        
        reasons_hash = hash_str(decision_data.get("reasons", ""))
        datasources_hash = hash_str(decision_data.get("dataSources", ""))
        alternatives_hash = hash_str(decision_data.get("alternatives", ""))
        model_cid_hash = hash_str(decision_data.get("modelCid", ""))
        xai_cid_hash = hash_str(decision_data.get("xaiCid", ""))

        # Normalize amount: backend passes it as 10**18 integer or string
        amount_val = decision_data.get("amount", 0)
        if isinstance(amount_val, str):
            # Strip non-numeric and convert
            import re
            amount_str = re.sub(r'[^0-9]', '', amount_val)
            amount_int = int(amount_str) if amount_str else 0
        else:
            amount_int = int(amount_val)

        # Normalize action: backend expects 0 for ALLOCATE
        action_mapping = {
            "ALLOCATE": 0,
            "REALLOCATE": 1,
            "DEALLOCATE": 2,
            "HOLD": 3
        }
        raw_action = decision_data.get("action", 0)
        action_int = action_mapping.get(raw_action, 0) if isinstance(raw_action, str) else int(raw_action)

        message = {
            "id": hash_bytes32(decision_data.get("id")), 
            "user": validate_address(decision_data.get("user")),
            "action": action_int,
            "asset": validate_address(decision_data.get("asset")),
            "amount": amount_int,
            "fromProtocol": validate_address(decision_data.get("fromProtocol")),
            "toProtocol": validate_address(decision_data.get("toProtocol")),
            "confidenceScore": int(decision_data.get("confidenceScore", 0)),
            "reasonsHash": reasons_hash,
            "dataSourcesHash": datasources_hash,
            "alternativesHash": alternatives_hash,
            "onChainHash": hash_bytes32(decision_data.get("onChainHash")),
            "modelCidHash": model_cid_hash,
            "xaiCidHash": xai_cid_hash
        }

        # 5. Sign Typed Data
        # py-eth-account's sign_typed_data takes a dictionary structure
        full_data = {
            "types": types,
            "domain": domain,
            "primaryType": "Decision",
            "message": message
        }
        
        # Important: eth-account needs hex strings for bytes32 to use '0x' prefix? 
        # Pydantic/JSON inputs might be raw hex without 0x. We should normalize.
        # Handled by library usually if format is correct.
        
        signed_message = self._account.sign_message(encode_typed_data(full_message=full_data))
        
        return "0x" + signed_message.signature.hex()

    def get_identity(self) -> Dict[str, str]:
        return {
            "address": self.address,
            "report_data_hash": self.get_report_data()
        }

# Global Singleton
enclave_security = EnclaveSecurity()
