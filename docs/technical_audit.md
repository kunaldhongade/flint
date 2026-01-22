# Flint (Flare AI DeFAI) - Technical Documentation & Audit

> [!CAUTION]
> **AUDIT STATUS: BETA / PROTOTYPE**
> This project is evaluated as a **Proof of Concept (PoC)** in its current state. It is **NOT** ready for production financial use due to critical gaps in testing, security, and data persistence.

## 1. Executive Summary

**Problem**: Traditional investors struggle to navigate DeFi protocols due to complexity and UI friction.
**Solution**: An AI-powered "Chat-First" agent (Flint) that translates natural language and screenshot analysis into executable DeFi transactions (Swaps, Staking, Liquidity) on the Flare Network.
**Not Solved**: This system does **not** hold custody of user funds (Non-custodial) and does **not** execute transactions automatically (User must sign).

**Maturity**: **Prototype (Alpha)**
**Limitations**:
-   No persistent user database (stateless session).
-   Zero unit test coverage (existing tests are stubs).
-   No rate limiting or API authentication.
-   Relying on "Happy Path" execution.

## 2. System Architecture

### High-Level Components
1.  **Frontend (User Trust Boundary)**: React/Vite app. Manages wallet keys via Reown AppKit. All signing happens here.
2.  **Backend (Untrusted/TEE)**: FastAPI Python service. Stateless.
    -   **Role**: Intent classification, Transaction construction (Calldata generation), Attestation.
    -   **Trust**: Designed to run in Google Confidential Space (TEE).
3.  **Artificial Intelligence**:
    -   **Gemini 1.5 Flash**: Main reasoning engine.
    -   **RAG**: Local `chromadb` or file-based retrieval from `src/data`.
4.  **Blockchain**:
    -   **Read**: Web3.py via Flare/Coston RPC.
    -   **Write**: Frontend via WalletConnect/Viem.

### Interaction Flow
`User` -> `Frontend (Chat UI)` -> `Backend API` -> `Gemini AI` -> `Backend (Tx Builder)` -> `Frontend` -> `User Wallet (Sign)` -> `Blockchain`

## 3. Tech Stack Breakdown

-   **Language**: Python 3.10+ (Backend), TypeScript (Frontend).
-   **Framework**: FastAPI (High performance, async), React (Component ecosystem).
-   **AI**: `google-generativeai` (Gemini).
    -   *Trade-off*: cheaper/faster than OpenAI, but "Vision" capabilities for portfolio analysis are critical.
-   **Blockchain**: `web3.py` (Backend), `wagmi`/`viem` (Frontend).
-   **Infra**: Docker, Supervisord (Running combined frontend/backend container).
    -   *Critique*: Running 2 services in 1 container is an anti-pattern for production scalability.

## 4. Data Models & Schemas

> [!WARNING]
> **NO STATEREFUL DATABASE DETECTED.**
> The project relies on in-memory chat history and file-based RAG (`.csv` files).

-   **User Data**: None stored. Ephemeral chat sessions.
-   **Migration Strategy**: N/A (No DB to migrate).
-   **Risk**: If the server restarts, all context is lost instantly.

## 5. API Documentation

### `POST /api/routes/chat/`
-   **Auth**: **NONE** (Open endpoint).
-   **Request**: `Multipart/Form-Data`
    -   `message` (str)
    -   `image` (file, optional)
    -   `walletAddress` (str)
-   **Response**: `JSON`
    -   `response` (str): Conversational text.
    -   `transaction` (object, optional): Unsigned ETH transaction params.
-   **Idempotency**: None.
-   **Rate Limits**: **NOT IMPLEMENTED**.

## 6. Core Business Logic

### Token Swap Flow
1.  **Input**: "Swap 10 FLR to USDC".
2.  **Parse**: AI parses source/dest token and amount.
3.  **Validation**: Backend checks local `blazeswap.py` token list.
4.  **Construction**: Queries BlazeSwap Router for `getAmountsOut` to calculate slippage (`min_amount_out` usually set to 95%).
5.  **Return**: Returns unsigned TX.
6.  **Edge Case**: 
    -   *Slippage*: Hardcoded 5% slippage is high.
    -   *Liquidity*: Fails silently if pool doesn't exist.

## 7. Smart Contracts

> [!NOTE]
> **NO CUSTOM CONTRACTS.**
> This project acts as a "Frontend/Middleware" for existing protocols.

-   **Interact With**:
    -   `BlazeSwapRouter`: `0xe3A...`
    -   `WFLR`: `0x1D8...`
    -   `SFLR` (Staking): `0x...`
-   **Storage**: N/A.
-   **Upgrade Strategy**: N/A.

## 8. Security Analysis

### Threat Model
-   **Malicious Backend**: Could construct a TX that drains funds (e.g., `approve` all to attacker).
    -   *Mitigation*: User must verify TX in wallet before signing. (Low user verification rate in practice).
-   **Replay Attacks**: TEE Attestation uses nonces, but the *API itself* has no replay protection for standard chat messages.
-   **DoS**: Open API with no auth/rate-limiting = Trivial to crash.

### Critical Vulnerabilities
1.  **Middleware Gap**: `api/middleware` is empty.
2.  **Input Validation**: Relies on LLM to sanitize inputs. Prompt Injection could trick the bot into suggesting malicious transactions.

## 9. Testing Strategy

> [!CRITICAL]
> **TESTING IS NON-EXISTENT.**

-   **Unit Tests**: `tests/test_ai_service.py` is a stub that calls a mock-less provider.
-   **Integration Tests**: None.
-   **Coverage**: ~1%.
-   **Missing**:
    -   Mocks for Gemini API.
    -   Forking tests for Blockchain interaction (Anvil/Hardhat).
    -   Frontend component tests.

## 10. Deployment & DevOps

-   **Environment**: Dockerized.
-   **CI/CD**: GitHub Actions (`build_and_push.yml`).
    -   *Status*: Builds image, pushes to GHCR.
    -   *Missing*: Automated testing gate, Staging deploy.
-   **Secrets**: Environment variables (`.env`).
-   **Monitoring**: `structlog` implemented, but no aggregator (Prometheus/Grafana/Datadog) configured.

## 11. Known Gaps & Technical Debt

1.  **Dead Code**: `frontend/src/services/StrategyService.ts` implements endpoints (`/api/stake`) that do not exist.
2.  **Hardcoded Values**: Token addresses are hardcoded in python dictionaries. If BlazeSwap updates, app breaks.
3.  **Concurrency**: Python `async` is used, but RAG implementation (Pandas CSV read) is blocking/synchronous in parts.

## 12. Roadmap (Recommendations)

**Immediate (Short-term)**
1.  Add `RateLimitMiddleware` to API.
2.  Implement `pytest` with `vcr.py` or `respx` to mock Gemini calls.
3.  Remove dead frontend service code.

**Medium-term**
1.  Migrate CSV-based RAG to robust Vector DB (Qdrant/Chroma).
2.  Add User Session handling via Redis/Postgres.
3.  Implement backend signature verification (SIWE - Sign In With Ethereum).

**Long-term**
1.  Full TEE Remote Attestation verification on frontend side.
2.  Decentralize the "Agent" logic (run on FTSO or similar).

---
**Verification Quote**: *"Trust, but verify. Currently, verification fails due to lack of tests."*
