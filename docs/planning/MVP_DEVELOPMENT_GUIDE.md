# FLINT MVP Development Guide

## 🎯 MVP Scope (6 Months)

**Core Features to Build:**
1. Yield Dashboard (aggregate yields from Flare protocols)
2. Risk Scoring (using FTSOv2 data)
3. Decision Logging System (AI Trust Layer)
4. Basic Portfolio Tracker
5. Smart Contracts (fee management, decision logging)

**Out of Scope for MVP:**
- Full AI model training (start with rule-based)
- Advanced compliance features (basic only)
- Multi-sig approvals (v2)
- Premium tier (basic structure)

---

## 📋 Prerequisites

### Required Knowledge
- React/TypeScript (frontend)
- Node.js/Express (backend)
- Solidity (smart contracts)
- Flare Network basics (FTSOv2, FDC, FAssets)

### Required Accounts/Tools
- Flare Testnet (Coston2) account
- MetaMask configured for Flare
- GitHub account
- Development environment setup

### Required Access
- Flare Developer Hub access
- FTSOv2 API access
- FDC API access
- Testnet FLR tokens (from faucet)

---

## 🏗️ Phase-by-Phase Development Plan

### **PHASE 1: Setup & Foundation (Week 1-2)**

#### 1.1 Project Setup
```bash
# Clone/create project
cd flint
npm install

# Setup workspaces
cd packages/shared && npm install
cd ../contracts && npm install
cd ../backend && npm install
cd ../frontend && npm install
```

#### 1.2 Flare Network Configuration
```bash
# Add to packages/contracts/.env
FLARE_RPC_URL=https://coston2-api.flare.network/ext/bc/C/rpc
PRIVATE_KEY=your_testnet_private_key

# Add to packages/backend/.env
FLARE_RPC_URL=https://coston2-api.flare.network/ext/bc/C/rpc
FDC_API_URL=https://api.flare.network/fdc
PORT=3001

# Add to packages/frontend/.env.local
NEXT_PUBLIC_API_URL=http://localhost:3001
```

#### 1.3 Get Testnet Tokens
- Visit Flare Testnet Faucet
- Get testnet FLR tokens
- Get testnet XRPfi/BTCfi/DOGEfi (if available)

#### 1.4 Development Environment
- Install Hardhat globally: `npm install -g hardhat`
- Install MetaMask and configure for Coston2
- Setup VS Code with Solidity extension
- Configure Git repository

**Deliverable:** Working development environment, all packages installed, testnet access

---

### **PHASE 2: Smart Contracts (Week 3-6)**

#### 2.1 FeeManager Contract
**Location:** `packages/contracts/contracts/FeeManager.sol`

**Steps:**
1. Create FeeManager.sol using OpenZeppelin Ownable
2. Implement management fee calculation (1% annual, pro-rata)
3. Implement performance fee calculation (20% on profits)
4. Add treasury address management
5. Write tests in `test/FeeManager.test.ts`
6. Deploy to Coston2 testnet

**Key Functions:**
```solidity
- recordDeposit(user, asset, amount, usdValue)
- recordWithdrawal(user, asset, amount)
- collectManagementFee(user, asset) -> returns fee
- collectPerformanceFee(user, asset, currentValueUSD) -> returns fee
```

**Testing:**
```bash
cd packages/contracts
npm run compile
npm test
```

#### 2.2 DecisionLogger Contract
**Location:** `packages/contracts/contracts/DecisionLogger.sol`

**Steps:**
1. Create DecisionLogger.sol
2. Implement decision storage structure
3. Add decision logging function
4. Add query functions (getDecision, getUserDecisions)
5. Write tests
6. Deploy to testnet

**Key Functions:**
```solidity
- logDecision(id, user, action, asset, amount, ...)
- getDecision(id) -> returns Decision
- getUserDecisions(user) -> returns Decision[]
```

#### 2.3 PortfolioManager Contract
**Location:** `packages/contracts/contracts/PortfolioManager.sol`

**Steps:**
1. Create PortfolioManager.sol
2. Integrate with FeeManager and DecisionLogger
3. Implement position tracking
4. Add position CRUD operations
5. Write tests
6. Deploy to testnet

**Deployment Script:**
```bash
cd packages/contracts
npm run deploy:testnet
```

**Deliverable:** All 3 contracts deployed and tested on Coston2

---

### **PHASE 3: Backend API (Week 7-10)**

#### 3.1 FTSOv2 Integration Service
**Location:** `packages/backend/src/services/ftso.ts`

**Implementation Steps:**
1. Install Flare FTSOv2 SDK or use direct API calls
2. Subscribe to BTC/USD, XRP/USD, DOGE/USD price feeds
3. Implement price caching (update every 90 seconds)
4. Add volatility calculation
5. Create API endpoint: `GET /api/yield/prices`

**Example Code:**
```typescript
// Subscribe to FTSOv2 price feeds
const ftsoRegistry = new ethers.Contract(
  FTSO_REGISTRY_ADDRESS,
  FTSO_ABI,
  provider
);

// Get latest price
const price = await ftsoRegistry.getCurrentPrice(symbol);
```

**Test:**
```bash
cd packages/backend
npm run dev
curl http://localhost:3001/api/yield/prices
```

#### 3.2 FDC Integration Service
**Location:** `packages/backend/src/services/fdc.ts`

**Implementation Steps:**
1. Setup FDC API client
2. Implement cross-chain event querying
3. Add attestation verification
4. Create API endpoint: `GET /api/fdc/verify/:chain/:txHash`

**Example Code:**
```typescript
// Query FDC for cross-chain events
const response = await axios.get(`${FDC_API_URL}/events`, {
  params: { chain: 'BTC', txHash }
});
```

#### 3.3 Risk Scoring Service
**Location:** `packages/backend/src/services/risk.ts`

**Implementation Steps:**
1. Start with rule-based risk scoring (not ML yet)
2. Use FTSOv2 data for market risk
3. Use protocol TVL for liquidity risk
4. Use FDC data for cross-chain verification risk
5. Combine into overall risk score (0-100)
6. Create API endpoint: `POST /api/risk/calculate`

**Risk Factors:**
- Smart Contract Risk: Based on TVL, audits, age
- Protocol Risk: Based on TVL, team, governance
- Liquidity Risk: Based on TVL, market depth
- Market Risk: Based on FTSOv2 volatility

**Test:**
```bash
curl -X POST http://localhost:3001/api/risk/calculate \
  -H "Content-Type: application/json" \
  -d '{"protocol": "earnXRP", "asset": "XRPfi", "apy": 8.5, "tvl": 5000000}'
```

#### 3.4 AI Decision Service (Rule-Based MVP)
**Location:** `packages/backend/src/services/ai.ts`

**Implementation Steps:**
1. Start with rule-based decision engine (not ML)
2. Calculate risk-adjusted APY for each opportunity
3. Select best opportunity based on risk-adjusted APY
4. Generate explanation (why this decision)
5. Log decision (on-chain + off-chain)
6. Create API endpoint: `POST /api/decision/allocate`

**Decision Logic (MVP):**
```typescript
// Simple rule-based approach
function generateDecision(opportunities) {
  // Calculate risk-adjusted APY for each
  const scored = opportunities.map(opp => ({
    ...opp,
    riskAdjustedAPY: opp.apy * (1 - opp.riskScore / 100)
  }));
  
  // Select best
  const best = scored.reduce((a, b) => 
    a.riskAdjustedAPY > b.riskAdjustedAPY ? a : b
  );
  
  // Generate explanation
  return {
    decision: best,
    explanation: `Selected ${best.protocol} because...`,
    confidence: calculateConfidence(best)
  };
}
```

**Deliverable:** Working backend API with FTSOv2, FDC, risk scoring, and decision generation

---

### **PHASE 4: Frontend Dashboard (Week 11-14)**

#### 4.1 Yield Dashboard Component
**Location:** `packages/frontend/src/components/YieldDashboard.tsx`

**Implementation Steps:**
1. Create table component showing yield opportunities
2. Fetch data from backend API: `GET /api/yield/opportunities`
3. Display: Protocol, Asset, APY, Risk Score, TVL
4. Add sorting/filtering
5. Add "View Details" modal

**Features:**
- Real-time APY updates
- Risk score color coding (green/yellow/red)
- Protocol logos/icons
- Sort by APY, Risk, TVL

#### 4.2 Portfolio Tracker Component
**Location:** `packages/frontend/src/components/PortfolioTracker.tsx`

**Implementation Steps:**
1. Create portfolio summary cards (Total Value, APY, Risk)
2. Create positions table
3. Fetch from API: `GET /api/portfolio/:userId`
4. Add charts (using Recharts)
5. Show performance over time

**Features:**
- Portfolio value chart
- Asset allocation pie chart
- Position details
- Performance metrics

#### 4.3 Risk Scoring Component
**Location:** `packages/frontend/src/components/RiskScoring.tsx`

**Implementation Steps:**
1. Display risk breakdown for each opportunity
2. Show risk factors (Smart Contract, Protocol, Liquidity, Market)
3. Visual risk score indicator
4. Risk-adjusted APY display

#### 4.4 Decision Logs Component
**Location:** `packages/frontend/src/components/DecisionLogs.tsx`

**Implementation Steps:**
1. Display list of AI decisions
2. Show decision details (action, reasons, data sources)
3. Add filters (by date, asset, action)
4. Show on-chain verification status

**Deliverable:** Working frontend dashboard with all core features

---

### **PHASE 5: Integration & Testing (Week 15-18)**

#### 5.1 End-to-End Integration
**Steps:**
1. Connect frontend to backend API
2. Connect backend to smart contracts
3. Test full flow: User → Frontend → Backend → Contracts
4. Test FTSOv2 price feed integration
5. Test FDC cross-chain verification
6. Test decision logging (on-chain)

#### 5.2 Wallet Integration
**Implementation:**
1. Add MetaMask connection
2. Add wallet balance display
3. Add transaction signing
4. Add transaction status tracking

**Code:**
```typescript
// Connect wallet
const provider = new ethers.BrowserProvider(window.ethereum);
const signer = await provider.getSigner();

// Get user address
const address = await signer.getAddress();
```

#### 5.3 Testing Checklist
- [ ] FTSOv2 price feeds updating correctly
- [ ] FDC cross-chain verification working
- [ ] Risk scores calculating correctly
- [ ] Decisions being logged on-chain
- [ ] Frontend displaying data correctly
- [ ] Wallet connection working
- [ ] Transactions executing successfully

**Deliverable:** Fully integrated MVP ready for beta testing

---

### **PHASE 6: Beta Testing & Iteration (Week 19-22)**

#### 6.1 Beta User Onboarding
1. Create beta signup form
2. Onboard 10-20 beta users
3. Provide testnet tokens
4. Setup feedback collection system

#### 6.2 Feedback Collection
- User interviews (weekly)
- In-app feedback forms
- Analytics tracking
- Error logging

#### 6.3 Iteration Based on Feedback
- Fix bugs
- Improve UI/UX
- Adjust risk scoring
- Refine decision logic

**Deliverable:** Improved MVP based on user feedback

---

### **PHASE 7: Security Audit & Launch Prep (Week 23-26)**

#### 7.1 Security Audit
1. Internal security review
2. Code review checklist
3. Professional audit (if budget allows)
4. Fix all critical/high issues

#### 7.2 Documentation
1. User documentation
2. Developer documentation
3. API documentation
4. Smart contract documentation

#### 7.3 Launch Preparation
1. Final testing
2. Marketing materials
3. Community announcements
4. Launch on testnet first, then mainnet

**Deliverable:** Production-ready MVP

---

## 🛠️ Technical Implementation Details

### FTSOv2 Integration

**Step 1: Get FTSOv2 Contract Address**
```typescript
// Coston2 Testnet FTSO Registry
const FTSO_REGISTRY = "0x..."; // Get from Flare docs
```

**Step 2: Subscribe to Price Feeds**
```typescript
import { ethers } from 'ethers';

const provider = new ethers.JsonRpcProvider(FLARE_RPC_URL);
const ftsoRegistry = new ethers.Contract(
  FTSO_REGISTRY,
  FTSO_ABI,
  provider
);

// Get price for symbol
async function getPrice(symbol: string) {
  const priceData = await ftsoRegistry.getCurrentPrice(symbol);
  return {
    price: priceData.price,
    timestamp: priceData.timestamp,
    decimals: priceData.decimals
  };
}
```

**Step 3: Update Prices Every 90 Seconds**
```typescript
setInterval(async () => {
  const prices = await Promise.all([
    getPrice('BTC'),
    getPrice('XRP'),
    getPrice('DOGE')
  ]);
  // Update cache
}, 90000); // 90 seconds
```

### FDC Integration

**Step 1: Setup FDC Client**
```typescript
import axios from 'axios';

const FDC_API = 'https://api.flare.network/fdc';

async function verifyCrossChainEvent(chain: string, txHash: string) {
  const response = await axios.get(`${FDC_API}/verify`, {
    params: { chain, txHash }
  });
  return response.data.verified;
}
```

**Step 2: Query Cross-Chain Data**
```typescript
async function getCrossChainData(chain: string) {
  const response = await axios.get(`${FDC_API}/events`, {
    params: { chain, limit: 10 }
  });
  return response.data.events;
}
```

### Smart Contract Deployment

**Step 1: Deploy FeeManager**
```typescript
// scripts/deploy.ts
const FeeManager = await ethers.getContractFactory("FeeManager");
const feeManager = await FeeManager.deploy(treasuryAddress);
await feeManager.waitForDeployment();
console.log("FeeManager deployed to:", await feeManager.getAddress());
```

**Step 2: Deploy DecisionLogger**
```typescript
const DecisionLogger = await ethers.getContractFactory("DecisionLogger");
const decisionLogger = await DecisionLogger.deploy();
await decisionLogger.waitForDeployment();
```

**Step 3: Deploy PortfolioManager**
```typescript
const PortfolioManager = await ethers.getContractFactory("PortfolioManager");
const portfolioManager = await PortfolioManager.deploy(
  await feeManager.getAddress(),
  await decisionLogger.getAddress()
);
```

### Frontend-Backend Integration

**Step 1: API Client Setup**
```typescript
// packages/frontend/src/lib/api.ts
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' }
});
```

**Step 2: Fetch Yield Opportunities**
```typescript
// In component
const [opportunities, setOpportunities] = useState([]);

useEffect(() => {
  api.get('/api/yield/opportunities')
    .then(res => setOpportunities(res.data))
    .catch(err => console.error(err));
}, []);
```

---

## 📊 Development Timeline

### Month 1: Foundation
- Week 1-2: Setup, research, architecture
- Week 3-4: Smart contract development

### Month 2: Core Development
- Week 5-6: Backend API development
- Week 7-8: FTSOv2/FDC integration

### Month 3: Frontend & Integration
- Week 9-10: Frontend dashboard
- Week 11-12: Integration and testing

### Month 4: Beta Testing
- Week 13-18: Beta testing, feedback, iteration

### Month 5: Features & Polish
- Week 19-22: Feature expansion, UI/UX improvements

### Month 6: Launch Prep
- Week 23-26: Security audit, documentation, launch

---

## 🔧 Tools & Resources Needed

### Development Tools
- **IDE:** VS Code with Solidity extension
- **Version Control:** Git + GitHub
- **Package Manager:** npm/yarn
- **Blockchain:** Hardhat, Ethers.js v6
- **Testing:** Jest, Hardhat tests

### Flare Resources
- **Documentation:** https://dev.flare.network
- **FTSOv2 Docs:** https://docs.flare.network/ftso
- **FDC Docs:** https://docs.flare.network/fdc
- **Testnet Faucet:** https://faucet.flare.network
- **Explorer:** https://coston2-explorer.flare.network

### APIs & Services
- **FTSOv2:** Direct contract calls or SDK
- **FDC:** REST API
- **RPC:** Flare Testnet RPC endpoint
- **Indexer:** (Optional) The Graph or similar

---

## 🧪 Testing Strategy

### Unit Tests
- Smart contract functions
- Backend service functions
- Frontend components

### Integration Tests
- API endpoints
- Contract interactions
- FTSOv2/FDC integration

### End-to-End Tests
- Full user flows
- Wallet connections
- Transaction flows

### Test Commands
```bash
# Contracts
cd packages/contracts && npm test

# Backend
cd packages/backend && npm test

# Frontend
cd packages/frontend && npm test
```

---

## 🚀 Deployment Steps

### Testnet Deployment
1. Deploy contracts to Coston2
2. Update contract addresses in backend
3. Deploy backend to test server
4. Deploy frontend to Vercel/Netlify
5. Test end-to-end on testnet

### Mainnet Deployment (After Audit)
1. Deploy contracts to Flare Mainnet
2. Update RPC URLs
3. Deploy backend to production
4. Deploy frontend to production
5. Announce launch

---

## 📝 MVP Checklist

### Smart Contracts
- [ ] FeeManager deployed and tested
- [ ] DecisionLogger deployed and tested
- [ ] PortfolioManager deployed and tested
- [ ] All contracts audited

### Backend
- [ ] FTSOv2 integration working
- [ ] FDC integration working
- [ ] Risk scoring service operational
- [ ] AI decision service operational
- [ ] API endpoints tested

### Frontend
- [ ] Yield dashboard functional
- [ ] Portfolio tracker functional
- [ ] Risk scoring display working
- [ ] Decision logs viewer working
- [ ] Wallet connection working

### Integration
- [ ] Frontend ↔ Backend connected
- [ ] Backend ↔ Contracts connected
- [ ] FTSOv2 data flowing
- [ ] FDC data flowing
- [ ] Decisions logging on-chain

### Testing
- [ ] Unit tests passing
- [ ] Integration tests passing
- [ ] Beta user testing complete
- [ ] Security audit complete

---

## 💡 Quick Start Commands

```bash
# Install all dependencies
npm install

# Start development
npm run dev

# Compile contracts
cd packages/contracts && npm run compile

# Test contracts
cd packages/contracts && npm test

# Deploy to testnet
cd packages/contracts && npm run deploy:testnet

# Start backend
cd packages/backend && npm run dev

# Start frontend
cd packages/frontend && npm run dev
```

---

## 🎯 Success Criteria

**MVP is successful when:**
- ✅ Users can view yield opportunities
- ✅ Risk scores are calculated using FTSOv2 data
- ✅ AI decisions are logged on-chain
- ✅ Portfolio tracking works
- ✅ At least 3 Flare protocols integrated
- ✅ 10+ beta users providing positive feedback

---

This guide provides a practical roadmap for building your MVP. Start with Phase 1 and work through each phase systematically!


