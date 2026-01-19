# FLINT Go-Live Checklist

This checklist outlines the steps required to transition FLINT from prototype to production deployment on Flare Network.

## 1. TEE / Confidential Space Readiness
- [ ] Build production Docker image: `docker build -t flint-agent-prod .`
- [ ] Push to private registry (GCR/GAR).
- [ ] Configure Workload Identity Pool on GCP.
- [ ] Verify `TEE_MODE` is set to `production` (uses real vTPM, not simulation).
- [ ] Audit `attestation.py` for RA-TLS certificate binding.

## 2. Flare On-Chain Deployment
- [ ] Deploy `DecisionLogger.sol` to Flare Mainnet/Coston2.
- [ ] Transfer ownership to the TEE-managed hot wallet or a Multi-sig.
- [ ] Set fee parameters in `FeeManager.sol`.
- [ ] Verify contracts on block explorer.

## 3. API & Security
- [ ] Secure `8080` and `3001` ports with mTLS or VPC-internal routing.
- [ ] Rotate `GOOGLE_API_KEY` and store in GCP Secret Manager.
- [ ] Enable rate limiting on `/consensus-decide` endpoint.

## 4. Monitoring & Compliance
- [ ] Set up structured logging for `ChaosChain` audit trails.
- [ ] Configure dashboard for tracking consensus success rates.
- [ ] Validate MiCA/HIPAA compliance flags in `UniversalPolicyAgent`.

## 5. User Onboarding
- [ ] Deploy frontend to Vercel/Cloudflare Pages.
- [ ] Initialize `IdentityRegistry` with approved institutional partners.
