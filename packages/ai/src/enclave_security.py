import os
import hashlib
import json
from typing import Dict, Any
from eth_account import Account
from eth_account.messages import encode_defunct

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
        print("[Enclave Security] Initializing Ephemeral Identity...")
        # Enable Mnemonic features if needed, but create() is sufficient for ephemeral
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

    def sign_decision(self, decision_data: Dict[str, Any]) -> str:
        """
        Signs the canonical JSON representation of the decision with the Enclave Private Key.
        Returns a hex string of the signature (r, s, v).
        """
        canonical_json = json.dumps(decision_data, sort_keys=True, separators=(',', ':'))
        
        # EIP-191 signing (standard "Ethereum Signed Message")
        message = encode_defunct(text=canonical_json)
        signed_message = self._account.sign_message(message)
        
        return signed_message.signature.hex()

    def get_identity(self) -> Dict[str, str]:
        return {
            "address": self.address,
            "report_data_hash": self.get_report_data()
        }

# Global Singleton
enclave_security = EnclaveSecurity()
