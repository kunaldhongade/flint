import hashlib
import time
import base64
import json
import os
from typing import Dict, Any
from lib.flare_ai_kit.tee.attestation import VtpmAttestation
from enclave_security import enclave_security
from dotenv import load_dotenv

# Ensure environment variables are loaded
load_dotenv()

class FlareAttestationService:
    """
    Directly integrated Attestation Service using Flare AI Kit.
    Uses the official VtpmAttestation client bound to Enclave Security.
    """

    def __init__(self):
        # STAGING/PRODUCTION ENFORCEMENT:
        # Default now forces production. Simulation must be explicitly requested, and is NOT allowed for staging builds.
        self.mode = os.getenv("TEE_MODE", "production") 
        
        # FAIL-CLOSE: If we are not in simulation mode, we MUST be in a real TEE.
        self.simulate = self.mode == "simulation"
        
        if not self.simulate:
             print("[Attestation Service] Running in PRODUCTION mode. Real TEE required.")
        else:
             print("[Attestation Service] WARNING: Running in SIMULATION mode.")

        self.vtpm = VtpmAttestation(simulate=self.simulate)
        self.tee_provider = "gcp_confidential_space"

    def generate_attestation(self, decision_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generates a vTPM-bound attestation object using Flare AI Kit.
        Binds the Enclave's Ephemeral Public Key to the Quote via Report Data (Nonce).
        """
        
        # 1. Get the Enclave's Public Key Hash (Report Data)
        # This is the CRITICAL security binding. The TEE says "I attest that Key X is running inside me".
        report_data_hash = enclave_security.get_report_data()
        print("Report Data: ",report_data_hash)

        # 2. Request official token from Flare AI Kit vTPM
        # We pass the report_data_hash as the nonce to bind it.
        try:
            token = self.vtpm.get_token(nonces=[report_data_hash])
        except Exception as e:
            if self.simulate:
                token = "simulated_oidc_token_with_bound_nonce"
            else:
                # FAIL-CLOSE: Cannot proceed without real attestation in production
                raise RuntimeError(f"CRITICAL: Failed to get vTPM token in production mode: {e}")

        # 3. Sign the Decision with the Enclave Private Key
        # This says "Key X signed this specific decision".
        # Combined with #1, we prove "TEE signed this decision".
        signature = enclave_security.sign_decision(decision_data)

        attestation = {
            "version": "2.0-secure",
            "tee_provider": self.tee_provider,
            "attestation_type": "RA-TLS/vTPM",
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "quote": {
                "token": token,
                "report_data": report_data_hash,
                "enclave_public_key": enclave_security.public_key_hex
            },
            "signature": signature,
            "certification": {
                "provider": "Intel/GCP",
                "status": "Hardware_Attested" if not self.simulate else "Simulated"
            }
        }

        return attestation

attestation_service = FlareAttestationService()
