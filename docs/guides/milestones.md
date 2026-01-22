Team: FLINT Labs
Project Title: FLINT: Flare Intelligence Network for Trust - Verifiable AI Agent Infrastructure on Flare

Milestone 1: Flare AI Kit Integration & Risk & Policy Agent MVP

Set up Flare AI Kit locally and implement a working Risk & Policy Agent using PydanticAI (Agent Framework). Deliverables include agent codebase with mocked portfolio input/FTSO data, structured decisions (approve/reject + reasons), working CLI demo, and architecture documentation showing Flare AI Kit integration points.
​

Milestone 2: Confidential Space / TEE Integration & Attestation API

Integrate Flare AI Kit's Secure Enclave connectors and prepare agent for Confidential Space deployment. Containerize agent with proper vTPM/RA-TLS attestation fields. Deliverables include decision reports with attestation objects, Docker container ready for Confidential Space, integration guide, and test suite.

Milestone 3: Multi-Agent Consensus Engine & Decision Routing

Implement multi-agent consensus using Flare AI Kit's Consensus Engine (Majority voting / Tournament mode). Deploy 3 independent strategy agents (conservative, neutral, aggressive) that reach consensus on policy decisions. Deliverables include three parallel Risk Agents running in separate TEEs, consensus voting logic, final attestation showing all 3 agent decisions, and verifiable API endpoint (/v1/verify-decision).

Milestone 4: FYIP Frontend Demo & DeFi Tracker Integration Path

Build a complete FYIP frontend demo showing portfolio input UI, run agent button triggering FLINT verifiable decision, decision + explanation + attestation proof display, and safe vs policy violation scenarios. Begin scoping DeFi Tracker API integration. Deliverables include functional FYIP demo deployable to Vercel/GitHub Pages, OpenAPI 3.0 API specification, sample integration code snippet, and pitch deck slide showing FLINT as infra layer.

Milestone 5: On-Chain Integration & Go-Live Readiness

Write attestations to Flare on-chain via a simple FLINT contract that logs decision events with hashes. Document compliance story for institutions. Deliverables include Flare smart contract storing decision attestations, on-chain verification function for TEE proof integrity, full technical documentation, go-live checklist, and Phase 2 roadmap.