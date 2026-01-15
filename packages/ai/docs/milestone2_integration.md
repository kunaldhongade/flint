# Milestone 2: Confidential Space & Attestation Integration

This document outlines how FLINT integrates with Flare AI Kit's Verifiable Agent patterns.

## Architecture Overview

FLINT Agents run in a Trusted Execution Environment (TEE) provided by **GCP Confidential Space**. 

1. **Risk Agent**: Evaluates DeFi strategies using PydanticAI.
2. **Attestation Service**: Generates a vTPM-backed attestation object that binds the AI decision to the specific TEE hardware and image.
3. **Verifiable API**: Exposes decisions along with their cryptographic proofs.

## Attestation Object Schema

Every decision from the `/decide` endpoint includes an `attestation` object:

```json
{
  "attestation_id": "attest_1737030...",
  "tee_provider": "gcp_confidential_space",
  "timestamp": "2026-01-16T12:00:00Z",
  "measurement": {
    "image_digest": "sha256:...",
    "instance_name": "flint-agent-tee-1"
  },
  "vtpm_quote": "...",
  "decision_binding_hash": "...",
  "verified": true
}
```

## Local Simulation

For developers, setting `TEE_MODE=simulation` (default in dev) allows the agent to run locally while providing a validly structured attestation object.

## Deployment to Confidential Space

To deploy the production-ready container:

1. Build the image: `docker build -t gcr.io/PROJECT_ID/flint-agent:latest -f packages/ai/Dockerfile packages/ai`
2. Push to Registry: `docker push gcr.io/PROJECT_ID/flint-agent:latest`
3. Deploy as a Confidential Space workload following Flare AI Kit guidelines.

## Verification

Run the test suite to verify attestation field integrity:
```bash
cd packages/ai
pytest tests/
```
