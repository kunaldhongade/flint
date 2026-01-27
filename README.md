# 🦅 Flint: The Trust Layer for AI-native DeFi on Flare

Flint is an advanced AI Agent platform designed for the Flare Network, providing a secure and verifiable "Trust Layer" for autonomous DeFi operations. Built using the Flare AI Kit, Flint enables AI agents to perform complex financial actions—like swaps, staking, and strategy execution—within a Trusted Execution Environment (TEE).

## 🛡️ The Trust Layer

Flint's core innovation is its multi-layered security and verifiability model:

- **TEE-Secured Execution**: All AI reasoning and wallet operations occur within AMD SEV-based Trusted Execution Environments.
- **Remote Attestation**: Users can verify the integrity of the code running in the TEE via hardware-level proofs.
- **On-chain Decision Registry**: Every significant AI decision is cryptographically signed and logged to the `AIDecisionRegistry` smart contract, providing an immutable audit trail.
- **Provable Intelligence**: Integrates with the Flare Time Series Oracle (FTSO) for low-latency, decentralized price data.

## 🚀 Key Features

- **BlazeSwap Integration**: Native support for token swaps and liquidity provision via BlazeSwap.
- **sFLR Liquid Staking**: Automated staking of FLR tokens into sFLR for yield optimization.
- **Strategy Visualizer**: A sophisticated React-based frontend that visualizes AI-driven DeFi strategies and portfolio distributions.
- **Dynamic RAG**: A Retrieval-Augmented Generation system powered by a curated knowledge base of Flare ecosystem protocols.
- **Reown AppKit**: Seamless wallet connection supporting MetaMask, Bifrost, and other Flare-compatible wallets.

## 📁 Repository Structure

```plaintext
src/flare_ai_defai/
├── ai/                # AI Provider (Gemini 2.0)
├── api/               # FastAPI layer (Chat, Trust, RAG, Verify)
├── attestation/       # TEE hardware attestation (vTPM)
├── blockchain/        # BlazeSwap, sFLR Staking, FTSO integration
├── prompts/           # Specialized DeFi system prompts
smart_contracts/       # AIDecisionRegistry and on-chain logic
frontend/              # React + TypeScript Strategy Interface
```

## 🎯 Getting Started

### 1. Environment Setup

Clone the repository and prepare your environment:

```bash
cp .env.example .env
# Edit .env with your GEMINI_API_KEY and FLARE_RPC_URL
```

### 2. Backend Installation (Python 3.12+)

We use `uv` for lightning-fast dependency management:

```bash
uv sync --all-extras
uv run start-backend
```

### 3. Frontend Installation

```bash
cd frontend
npm install
npm run dev
```

## 🛠 Deployment (Confidential Space)

Flint is designed to run in Google Cloud Confidential Space. The TEE provides the hardware root of trust required for secure wallet management.

1. **Build the TEE Image**:
   ```bash
   docker build -t flint-tee .
   ```
2. **Deploy with Remote Attestation**:
   Refer to the `DOCKER_COMPOSE.md` and TEE deployment scripts for detailed instructions on launching Flint within an AMD SEV VM.

## 💡 Example Interactions

- _"Show me my sFLR balance and the current FTSO price of FLR."_
- _"Swap 100 FLR to WC2FLR on BlazeSwap if the price is above $X."_
- _"Verify your remote attestation and show me the latest on-chain decision log."_

---

Built with ❤️ by the Flint Team on [Flare Network](https://flare.network).
