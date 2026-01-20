# FLINT Architecture Documentation - Summary

## 📚 Documentation Files Created

Your FLINT project now has comprehensive architecture documentation in the `docs/` folder:

### 1. **ARCHITECTURE_DIAGRAM.md** (Updated)
**10 Mermaid Diagrams** showing:
- High-level system architecture
- AI decision flow with TEE attestation
- Multi-agent consensus mechanism
- Flare ecosystem integration map
- Security & attestation architecture
- FTSO price feed data flow
- Technology stack layers
- **NEW:** Complete decision logging & smart contract flow
- **NEW:** Smart contract architecture
- **NEW:** Data structure mapping (TypeScript ↔ Solidity)

### 2. **DECISION_LOGGING_FLOW.md** (New)
**Detailed implementation guide** covering:
- Complete end-to-end decision flow
- Code snippets from actual implementation
- Security guarantees and fail-close design
- Environment variables
- Deployment checklist
- Monitoring & observability

### 3. **ARCHITECTURE_PROMPT.md** (Existing)
**Complete technical specification** with:
- All 7 system layers
- Flare component integration details
- Technology stack for each component
- Data flow architectures
- Deployment topology

---

## 🔑 Key Components Documented

### Decision Logging Flow

```
User Request
  ↓
Backend API (/api/decision/allocate)
  ↓
AI Service (TypeScript)
  ├─ Gather FTSO prices
  ├─ Fetch FDC attestations
  ├─ Calculate risk scores
  └─ Create initial decision
  ↓
Python AI Service (/consensus-decide)
  ├─ Risk Agent (weight: 0.4)
  ├─ Universal Agent (weight: 0.3)
  ├─ Chaos Agent (weight: 0.3)
  └─ Consensus Engine (weighted aggregation)
  ↓
TEE (GCP Confidential Space)
  ├─ Generate enclave key pair (RSA 2048)
  ├─ Create report data (SHA256 of public key)
  ├─ Request vTPM token (nonce-bound)
  └─ Sign decision hash (ECDSA)
  ↓
Attestation Package
  {token, signature, public_key, report_data}
  ↓
Backend extracts signature
  ↓
Blockchain Service (blockchain.ts)
  ├─ Convert to Solidity types
  ├─ Call DecisionLogger.logDecision()
  └─ Pass enclave signature
  ↓
DecisionLogger Smart Contract
  ├─ Validate inputs
  ├─ Create decision hash (with DOMAIN_SEPARATOR)
  └─ Call DecisionVerifier.verifyDecision()
  ↓
DecisionVerifier Smart Contract
  ├─ ECDSA recover signer from signature
  ├─ Check trustedEnclaves registry
  └─ Return true/false
  ↓
If Verified:
  ├─ Store decision on-chain
  ├─ Emit DecisionLogged event
  └─ Return transaction hash
  ↓
Frontend displays success + TX hash
```

---

## 🛡️ Security Features Highlighted

### 1. **TEE Attestation**
- Enclave runs in GCP Confidential Space (Intel TDX)
- vTPM binds signature to hardware-attested execution
- Report data links signature to enclave's public key

### 2. **On-Chain Verification**
- `DecisionVerifier` checks signature came from registered enclave
- Domain separation (EIP-712) prevents replay attacks
- Only verified decisions are stored

### 3. **Fail-Close Design**
```typescript
// Backend throws error if consensus agent unreachable
if (!consensusResponse.ok) {
  throw new Error("Security Violation: Enclave Unreachable");
}

// Backend throws error if signature missing
if (!enclaveSignature) {
  throw new Error("FATAL: Enclave Signature missing");
}

// Smart contract reverts if signature invalid
require(
  verifier.verifyDecision(decisionHash, signature),
  "Unauthorized Enclave Signature"
);
```

### 4. **Immutable Audit Trail**
- All decisions stored permanently on Flare Network
- `DecisionLogged` events for efficient querying
- IPFS CIDs for versioned model and XAI data

---

## 📊 Flare Components Integration

### FTSO (Flare Time Series Oracle)
- **Purpose:** Real-time decentralized price feeds
- **Assets:** BTC, XRP, DOGE, FLR, USD
- **Update Frequency:** 60 seconds
- **Staleness Check:** 5-minute maximum delay
- **Integration Points:**
  - AI Agent: `get_ftso_latest_price()` via Flare AI Kit
  - Backend: Direct contract calls via ethers.js

### FDC (Flare Data Connector)
- **Purpose:** Cross-chain state attestation
- **Use Cases:** Event verification, cross-chain data validation
- **Integration:** Backend FDC service

### Flare AI Kit
- **Modules:**
  - TEE Module (VtpmAttestation)
  - Agent Tools (FTSO, Explorer, Social)
  - Ecosystem utilities
- **Location:** `packages/ai/src/lib/flare_ai_kit/`

### Smart Contracts on Flare Network
- **DecisionLogger.sol** - Immutable decision storage (UUPS upgradeable)
- **DecisionVerifier.sol** - Enclave signature verification
- **PortfolioManager.sol** - On-chain portfolio management
- **ReputationRegistry.sol** - Agent reputation (ERC-8004)

---

## 🔄 Data Structure Mapping

### TypeScript → Solidity

| TypeScript | Solidity | Conversion |
|------------|----------|------------|
| `id: string` | `bytes32 id` | `ethers.id(id)` |
| `action: 'ALLOCATE'` | `uint8 action` | `0` (mapping) |
| `amount: '100'` | `uint256 amount` | `ethers.parseEther('100')` |
| `reasons: string[]` | `string reasons` | `JSON.stringify(reasons)` |
| `dataSources: string[]` | `string dataSources` | `JSON.stringify(dataSources)` |
| `confidenceScore: 8500` | `uint256 confidenceScore` | `8500` (0-10000 scale) |

---

## 🚀 Quick Reference

### Environment Variables

**Backend:**
```bash
FLARE_RPC_URL=https://coston2-api.flare.network/ext/C/rpc
PRIVATE_KEY=0x...
DECISION_LOGGER_ADDRESS=0x...
AI_AGENT_URL=http://localhost:8080
```

**AI Service:**
```bash
TEE_MODE=production  # or "simulation"
GOOGLE_API_KEY=...
FLARE_RPC_URL=https://coston2-api.flare.network/ext/C/rpc
```

### Key Files

| Component | File | Purpose |
|-----------|------|---------|
| Backend AI Service | `packages/backend/src/services/ai.ts` | Decision generation + consensus |
| Blockchain Service | `packages/backend/src/services/blockchain.ts` | Smart contract interaction |
| Decision Routes | `packages/backend/src/routes/decision.ts` | API endpoints |
| DecisionLogger | `packages/contracts/contracts/DecisionLogger.sol` | On-chain storage |
| DecisionVerifier | `packages/contracts/contracts/DecisionVerifier.sol` | Signature verification |
| Consensus Engine | `packages/ai/src/consensus_engine.py` | Multi-agent consensus |
| Attestation Service | `packages/ai/src/attestation.py` | TEE attestation |

---

## 📖 How to Use These Docs

### For Presentations
Use **ARCHITECTURE_DIAGRAM.md** - render the Mermaid diagrams with:
- [Mermaid Live Editor](https://mermaid.live)
- VS Code Mermaid Preview extension
- GitHub (renders automatically)

### For Development
Use **DECISION_LOGGING_FLOW.md** - detailed code flow with:
- Actual code snippets
- Line number references
- Security considerations
- Deployment steps

### For Architecture Design
Use **ARCHITECTURE_PROMPT.md** - complete specification with:
- All component details
- Technology stack
- Integration points
- Diagram creation guidelines

---

## ✅ What's Documented

- [x] Complete system architecture (7 layers)
- [x] AI decision flow with TEE attestation
- [x] Multi-agent consensus mechanism
- [x] Flare ecosystem integration (FTSO, FDC, Flare AI Kit)
- [x] Security & attestation architecture
- [x] **Decision logging with smart contract verification**
- [x] **On-chain storage and event emission**
- [x] **Enclave signature verification flow**
- [x] **Data structure conversion (TS ↔ Solidity)**
- [x] Technology stack breakdown
- [x] Deployment topology
- [x] Environment configuration
- [x] Monitoring & observability

---

## 🎯 Next Steps

1. **Review the diagrams** in `ARCHITECTURE_DIAGRAM.md`
2. **Understand the flow** in `DECISION_LOGGING_FLOW.md`
3. **Deploy contracts** using the deployment checklist
4. **Test end-to-end** on Coston2 testnet
5. **Monitor logs** for decision logging events

---

## 📝 Notes

- All diagrams use Mermaid syntax (renders on GitHub)
- Code snippets reference actual implementation
- Security features are highlighted throughout
- Fail-close design ensures institutional-grade trust
- Complete audit trail from user request to on-chain storage

---

**Generated:** 2026-01-19  
**Project:** FLINT (Flare Intelligence Network for Trust)  
**Team:** Kunal Dhongade, Vidip Ghosh, Fredrik Parker, Swarnil Kokulwar
