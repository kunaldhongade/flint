
import os
import sys
import json
from eth_account import Account
from eth_account.messages import encode_typed_data
from src.enclave_security import enclave_security

def verify_signature():
    print("Verifying EIP-712 Signing...")
    
    # 1. Mock Data
    decision_data = {
        "id": "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
        "user": "0x71C7656EC7ab88b098defB751B7401B5f6d8976F", # Example user
        "action": 1,
        "asset": "0x0000000000000000000000000000000000000000",
        "amount": 100,
        "fromProtocol": "0x0000000000000000000000000000000000000000",
        "toProtocol": "0x0000000000000000000000000000000000000000",
        "confidenceScore": 9500,
        "reasons": "Analysis complete",
        "dataSources": "Internal DB",
        "alternatives": "None",
        "onChainHash": "0x0000000000000000000000000000000000000000000000000000000000000000",
        "modelCid": "QmHash",
        "xaiCid": "QmXai"
    }
    
    chain_id = 31337
    verifying_contract = "0x5FbDB2315678afecb367f032d93F642f64180aa3" # Hardhat default first contract?
    
    # 2. Sign
    signature = enclave_security.sign_decision(decision_data, chain_id, verifying_contract)
    print(f"Signature: {signature}")
    
    # 3. Verify locally
    # We reconstruct the full_data exactly as inside the class
    
    from eth_utils import keccak
    def hash_str(s: str) -> bytes:
            return keccak(text=s) if s else keccak(text="")

    reasons_hash = hash_str(decision_data.get("reasons", ""))
    datasources_hash = hash_str(decision_data.get("dataSources", ""))
    alternatives_hash = hash_str(decision_data.get("alternatives", ""))
    model_cid_hash = hash_str(decision_data.get("modelCid", ""))
    xai_cid_hash = hash_str(decision_data.get("xaiCid", ""))

    message = {
        "id": decision_data["id"],
        "user": decision_data["user"],
        "action": decision_data["action"],
        "asset": decision_data["asset"],
        "amount": decision_data["amount"],
        "fromProtocol": decision_data["fromProtocol"],
        "toProtocol": decision_data["toProtocol"],
        "confidenceScore": decision_data["confidenceScore"],
        "reasonsHash": reasons_hash,
        "dataSourcesHash": datasources_hash,
        "alternativesHash": alternatives_hash,
        "onChainHash": decision_data["onChainHash"],
        "modelCidHash": model_cid_hash,
        "xaiCidHash": xai_cid_hash
    }
    
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
    
    domain = {
        "name": "FLINT_DECISION_LOGGER",
        "version": "1",
        "chainId": chain_id,
        "verifyingContract": verifying_contract
    }
    
    full_data = {
            "types": types,
            "domain": domain,
            "primaryType": "Decision",
            "message": message
    }
    
    recovered_address = Account.recover_message(encode_typed_data(full_message=full_data), signature=signature)
    
    print(f"Signer Address: {enclave_security.address}")
    print(f"Recovered Address: {recovered_address}")
    
    if recovered_address == enclave_security.address:
        print("SUCCESS: Signature verified locally!")
    else:
        print("FAILURE: Signature mismatch!")
        exit(1)

if __name__ == "__main__":
    verify_signature()
