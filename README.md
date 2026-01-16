# FLINT: Flare Intelligence Network for Trust

**Verifiable AI Agent Infrastructure for Institutional DeFi on Flare**

FLINT is a high-integrity infrastructure layer providing verifiable AI agents for DeFi yield optimization, risk management, and compliance on the Flare Network. Built on the **Flare AI Kit**, FLINT enables institutions to deploy capital with confidence through cryptographically attested AI decisions and human-readable audit trails.

---

## ✨ Core Pillars

### 🤖 Verifiable AI Agents
Agents run within **Trusted Execution Environments (TEEs)** via GCP Confidential Space. Every decision is backed by a **vTPM-bound attestation**, ensuring the AI logic has not been tampered with.

### 📊 Institutional Yield & Risk
Unified intelligence across Flare core protocols (**FAssets, FTSO, FDC, Stake**). FLINT's Risk & Policy agents evaluate strategies against custom institutional constraints in real-time.

### 🔒 Transparent Governance (FYIP)
The Flare Yield Intelligence Platform (FYIP) is our flagship interface, providing explainable AI logs, real-time risk scoring, and a complete audit trail for compliance officers.

---

## 🏗️ Monorepo Architecture

```bash
flint/
├── packages/
│   ├── ai/          # Verifiable AI Agents (Python + Flare AI Kit + PydanticAI)
│   ├── backend/     # Institutional API Gateway (Node.js + TypeScript)
│   ├── frontend/    # FYIP Dashboard (React + TypeScript)
│   ├── contracts/   # On-chain Attestation & Governance (Solidity)
│   └── shared/      # Common Domain Models & Types
├── docs/            # Comprehensive Technical Documentation
└── infra/           # TEE Manifests & Container Orchestration
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js >= 18.0.0
- Python >= 3.12 (with `uv` recommended)
- Docker (for TEE simulation)
- Flare Network RPC Access

### Rapid Development
```bash
# Install core dependencies
npm install

# Start all services (Frontend, Backend, AI Agent)
npm run dev
```

### Component Commands
| Component | Dev Command | Test Command |
| :--- | :--- | :--- |
| **AI Agents** | `npm run dev:ai` | `npm run test:ai` |
| **Backend** | `npm run dev:backend` | `npm run test:backend` |
| **Frontend** | `npm run dev:frontend` | `npm test` |
| **Contracts** | `cd packages/contracts && npx hardhat compile` | `npm run test:contracts` |

---

## 🛠️ Flare Ecosystem Integration

FLINT is purpose-built to leverage the full Flare stack:

- **FAssets**: Multi-asset yield strategies (FXRP, FUSD, BTC, DOGE).
- **FTSO**: High-fidelity, real-time price feeds for Risk Agent evaluation.
- **FDC**: Cross-chain state attestation and event verification.
- **Confidential Space**: Verifiable execution using Flare AI Kit patterns.

---

## 👥 Professional Team

- **Kunal Dhongade** – Full-Stack Blockchain Engineer
- **Vidip Ghosh** – AI Engineer & Full-Stack Developer
- **Fredrik Parker** – UI/UX Designer
- **Swarnil Kokulwar** – Smart Contract Engineer

---

## 📜 License & Compliance

Licensed under the [Apache License 2.0](LICENSE). 
*FLINT is designed to assist in regulatory compliance (MiCA, SOC2) through its immutable decision logging architecture.*
