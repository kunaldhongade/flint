# Architecture Deep Dive: Flint (Flare AI DeFAI)

This document provides an end-to-end technical analysis of the Flint architecture, confirming a deep understanding of the system's "Chat-First" design, security model, and data flow.

## 1. The Core Design: "Chat-First" Architecture

Unlike traditional DApps that use direct API calls for every action, Flint aggregates all functionality through a single **Natural Language Interface**.

### How it works (End-to-End Flow)
1.  **User Action**: A user clicks "Execute Step" in the `StrategyVisualizer` or types "Stake 100 FLR".
2.  **Frontend Translation**: The `StrategyVisualizer` does **not** call an API. It injects a text command (e.g., `stake 100 FLR`) into the Chat Input (`ChatInterface.tsx`).
3.  **Command Transmission**: `ChatInterface` sends the text to `POST /api/routes/chat/`.
4.  **Backend Routing**:
    *   `ChatRouter` (`src/flare_ai_defai/api/routes/chat.py`) receives the text.
    *   **Direct Match**: Checks for keywords (`stake`, `swap`, `balance`).
    *   **Semantic Match**: If no keyword, uses **Gemini AI** (`src/flare_ai_defai/ai/gemini.py`) to classify intent (e.g., `STAKE_FLR`).
5.  **Transaction Construction**:
    *   The backend **never signs** transactions.
    *   It constructs the **unsigned transaction object** (calldata, gas, to, value) using `Web3.py`.
    *   Example: `BlazeSwapHandler` builds the swap calldata.
6.  **Response**: The backend returns a JSON object containing the `transaction` data and a conversational response.
7.  **Execution**:
    *   Frontend receives the JSON.
    *   It uses `wagmi` / `viem` to prompt the user's wallet (MetaMask/Reown) to sign and broadcast the transaction.

> **Correction**: `frontend/src/services/StrategyService.ts` appears to be **dead code**. It defines direct API calls (`/api/stake`, `/api/swap`) that **do not exist** in the backend. The actual application logic relies entirely on the chat endpoint (`/api/routes/chat/`).

## 2. Security & Attestation (TEE)

The backend is designed to run in a **Trusted Execution Environment (TEE)**, specifically Google Cloud Confidential Space.

*   **Attestation Client**: `src/flare_ai_defai/attestation/vtpm_attestation.py` connects to a local Unix socket (`/run/container_launcher/teeserver.sock`) to request a signed Attestation Token.
*   **Nonce Validation**: It enforces a nonce length (10-74 bytes) to prevent replay attacks.
*   **Verification**: Users can verify this token (e.g., via `jwt.io` or on-chain verifiers) to prove that the AI agent is running unmodified code inside a secure enclave.

## 3. AI & RAG Pipeline

The AI layer is not just a wrapper around Gemini; it includes a specific context pipeline.

*   **Persona**: "Artemis", defined in `src/flare_ai_defai/ai/gemini.py`.
*   **RAG (Retrieval Augmented Generation)**:
    *   Module: `src/flare_ai_defai/ai/rag.py`.
    *   Data Source: Loads `.csv` files from `src/data` into a vector store.
    *   Process: User Query -> Retrieve relevant CSV rows -> Augment Prompt with context -> Send to Gemini -> Response.
*   **Vision**: `send_message_with_image` capability allows analyzing screenshots (e.g., Robinhood portfolios) to generate investment strategies.

## 4. Blockchain Integration Layer

The backend acts as a **Read/Construct** layer, while the frontend is the **Sign/Write** layer.

*   **Provider**: `FlareProvider` (`src/flare_ai_defai/blockchain/flare.py`) manages Web3 connections to Flare networks (Mainnet/Coston2).
*   **BlazeSwap**: `src/flare_ai_defai/blockchain/blazeswap.py` contains specific ABI and logic for:
    *   Token Swaps (FLR <-> Token, Token <-> Token).
    *   Native Wrapping (FLR <-> WFLR).
    *   Liquidity Provision (addLiquidityNAT).
    *   **Logic**: It queries the Router contract to calculate `min_amount_out` (slippage protection) before constructing the transaction transaction.

## 5. Critical Data Flows

| Feature | Input Mechanism | Backend Handler | Output |
| :--- | :--- | :--- | :--- |
| **Strategy Execution** | User clicks button -> Text "stake X FLR" | `handle_stake_command` | TX Object (Call `sFLR` contract) |
| **Portfolio Analysis** | Image Upload | `analyze-portfolio` (Magic string) -> Gemini Vision | JSON Risk Score (Used to select strategy) |
| **Swaps** | Text "Swap 10 FLR to USDC" | `handle_swap_token` -> `BlazeSwapHandler` | TX Object (Call `BlazeSwapRouter`) |

This architecture ensures the user **always retains custody**. The AI proposes (constructs) actions, but the user disposes (signs) them.
