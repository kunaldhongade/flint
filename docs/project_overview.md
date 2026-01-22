# Project Overview: Flint (Flare AI DeFAI)

Flint (rebranded from Flare AI DeFAI) is a sophisticated AI-powered DeFi agent designed to bridge the gap between Traditional Finance (TradFi) and Decentralized Finance (DeFi) on the **Flare Network**. It provides a secure, conversational interface for managing assets, executing trades, and analyzing investment strategies.

## 🏗 Architecture Overview

The project is built with a dual-layer architecture: a **FastAPI backend** for AI coordination and blockchain logic, and a **Vite/React frontend** for a premium user experience.

### 1. Backend: AI Orchestration & Logic
- **Framework**: FastAPI (Python).
- **Core Orchestrator**: `ChatRouter` (`src/flare_ai_defai/api/routes/chat.py`) manages the flow between user input, AI decisions, and blockchain execution.
- **AI Providers**: 
  - **Gemini**: Primary provider for semantic routing and image analysis (e.g., analyzing Robinhood screenshots).
  - **OpenRouter**: Optional fallback for alternative LLMs.
- **Semantic Routing**: Instead of simple keyword matching, it uses LLMs to classify user intent (Swap, Stake, Balance, Send, etc.).
- **Security**: Designed for **Trusted Execution Environments (TEEs)** using Google Cloud Confidential Space, featuring remote attestation via **vTPM**.

### 2. Frontend: Modern DeFi Interface
- **Technology Stack**: React, TypeScript, Tailwind CSS, Vite.
- **Wallet Connection**: Integrated with **Reown AppKit** (formerly WalletConnect) for seamless Flare/Coston2 connectivity.
- **Key Features**:
  - **TradFi Bridge**: Allows users to upload screenshots of traditional portfolios (like Robinhood) for AI-driven DeFi strategy recommendations.
  - **Strategy Visualizer**: A custom component to visualize proposed DeFi allocations (Conservative, Moderate, Aggressive).
  - **Interactive Chat**: A polished, real-time chat interface with markdown support and typing animations.

### 3. Blockchain & DeFi Integration
- **Network**: Native support for **Flare** and **Coston2** Testnet.
- **Core Operations**:
  - **Swaps**: Integrated with **BlazeSwap** for on-chain token exchanges.
  - **Staking**: Supports staking FLR for **sFLR** to earn rewards.
  - **Liquidity**: Automated liquidity provision (LP) tools.
  - **Explorer**: Integrated with **Flarescan** for transaction verification.

## 🚀 Key User Flows

### A. Portfolio Analysis & Strategy Generation
1. User uploads an image of their TradFi portfolio.
2. AI analyzes the asset allocation and risk profile.
3. System generates a matching DeFi strategy (Conservative, Moderate, or Aggressive).
4. User can visualize the strategy and execute it step-by-step through the chat.

### B. Intelligent Trading
Users can use natural language commands or structured syntax:
- *"Swap 10 FLR to USDC.E"*
- *"What's my balance?"*
- *"Stake 500 FLR for me"*
- *"Send 100 FLR to 0x..."*

## 🛠 Tech Stack Summary

| Component | Technology |
| :--- | :--- |
| **Backend** | Python, FastAPI, Pydantic, Web3.py |
| **Frontend** | React, TypeScript, Tailwind CSS, Vite, Radix UI |
| **AI** | Google Gemini 2.0, OpenRouter |
| **Web3** | Reown AppKit, Wagmi, Viem |
| **Deployment** | Docker, Nginx, Supervisor, Google Confidential Space |

---
*Created by Alex & Hitarth (Waterloo Blockchain)*
