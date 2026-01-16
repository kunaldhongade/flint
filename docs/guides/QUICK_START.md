# FLINT MVP Quick Start Guide

## 🚀 Getting Started in 30 Minutes

### Step 1: Install Dependencies (5 min)
```bash
# Install root dependencies
npm install

# Install workspace dependencies
cd packages/shared && npm install && cd ../..
cd packages/contracts && npm install && cd ../..
cd packages/backend && npm install && cd ../..
cd packages/frontend && npm install && cd ../..
```

### Step 2: Configure Flare Testnet (5 min)

**Add to `packages/contracts/.env`:**
```
PRIVATE_KEY=your_testnet_private_key_here
FLARE_RPC_URL=https://coston2-api.flare.network/ext/bc/C/rpc
```

**Add to `packages/backend/.env`:**
```
PORT=3001
FLARE_RPC_URL=https://coston2-api.flare.network/ext/bc/C/rpc
FDC_API_URL=https://api.flare.network/fdc
```

**Add to `packages/frontend/.env.local`:**
```
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### Step 3: Get Testnet Tokens (5 min)
1. Visit: https://faucet.flare.network
2. Request testnet FLR tokens
3. Add Coston2 network to MetaMask:
   - Network Name: Flare Coston2
   - RPC URL: https://coston2-api.flare.network/ext/bc/C/rpc
   - Chain ID: 114
   - Currency Symbol: C2FLR

### Step 4: Compile & Deploy Contracts (10 min)
```bash
cd packages/contracts

# Compile contracts
npm run compile

# Deploy to testnet
npm run deploy:testnet

# Save contract addresses to .env files
```

### Step 5: Start Development Servers (5 min)
```bash
# Terminal 1: Backend
cd packages/backend
npm run dev

# Terminal 2: Frontend
cd packages/frontend
npm run dev
```

**You're ready!** Open http://localhost:3000

---

## 📝 Development Workflow

### Daily Development Flow

1. **Morning: Pull latest changes**
   ```bash
   git pull
   npm install  # If dependencies changed
   ```

2. **Work on feature**
   - Make changes
   - Test locally
   - Commit frequently

3. **Evening: Push changes**
   ```bash
   git add .
   git commit -m "feat: description"
   git push
   ```

### Testing Flow

```bash
# Test contracts
cd packages/contracts && npm test

# Test backend (if tests exist)
cd packages/backend && npm test

# Test frontend
cd packages/frontend && npm test
```

---

## 🔧 Common Tasks

### Add New API Endpoint
1. Create route in `packages/backend/src/routes/`
2. Add handler logic
3. Test with curl/Postman
4. Update frontend to call it

### Add New Smart Contract Function
1. Add function to contract
2. Compile: `npm run compile`
3. Write test
4. Deploy: `npm run deploy:testnet`

### Add New Frontend Component
1. Create component in `packages/frontend/src/components/`
2. Import and use in page
3. Style with Tailwind
4. Test in browser

---

## 🐛 Troubleshooting

### Contracts won't compile
```bash
cd packages/contracts
rm -rf cache artifacts
npm run compile
```

### Backend won't start
- Check if port 3001 is available
- Check .env file exists
- Check node_modules installed

### Frontend won't start
- Check if port 3000 is available
- Check .env.local exists
- Clear .next folder: `rm -rf .next`

### Can't connect to Flare
- Check RPC URL is correct
- Check network is Coston2
- Try different RPC endpoint

---

## 📚 Learning Resources

- **Flare Docs:** https://dev.flare.network
- **FTSOv2:** https://docs.flare.network/ftso
- **FDC:** https://docs.flare.network/fdc
- **Hardhat:** https://hardhat.org/docs
- **Ethers.js:** https://docs.ethers.org/v6/

---

## ✅ MVP Checklist

Track your progress:

### Week 1-2: Setup
- [ ] Development environment setup
- [ ] All packages installed
- [ ] Testnet access configured
- [ ] Git repository initialized

### Week 3-4: Contracts
- [ ] FeeManager contract deployed
- [ ] DecisionLogger contract deployed
- [ ] PortfolioManager contract deployed
- [ ] All contracts tested

### Week 5-6: Backend
- [ ] FTSOv2 integration working
- [ ] FDC integration working
- [ ] Risk scoring service working
- [ ] API endpoints tested

### Week 7-8: Frontend
- [ ] Yield dashboard working
- [ ] Portfolio tracker working
- [ ] Risk scoring display working
- [ ] Wallet connection working

### Week 9-12: Integration
- [ ] End-to-end flow working
- [ ] Beta testing started
- [ ] User feedback collected
- [ ] Iterations made

---

**Start with Step 1 and work through systematically!**


