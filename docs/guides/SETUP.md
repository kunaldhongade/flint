# FLINT Setup Guide

This guide will help you set up and run the FLINT project locally.

## Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- Git

## Installation

1. **Clone the repository** (if not already done)
   ```bash
   git clone <repository-url>
   cd flint
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

   This will install dependencies for all packages (frontend, backend, contracts, shared).

## Configuration

1. **Copy environment files**
   ```bash
   cp .env.example .env
   cp packages/backend/.env.example packages/backend/.env
   cp packages/frontend/.env.local.example packages/frontend/.env.local
   ```

2. **Update environment variables**
   - Edit `.env` files with your configuration
   - For testnet development, use Coston2 RPC URL
   - Add your private key for contract deployment (keep it secure!)

## Development

### Start all services

```bash
npm run dev
```

This will start:
- Frontend on http://localhost:3000
- Backend API on http://localhost:3001

### Start services individually

**Frontend only:**
```bash
npm run dev:frontend
```

**Backend only:**
```bash
npm run dev:backend
```

**Smart Contracts:**
```bash
cd packages/contracts
npm run compile
npm test
```

## Smart Contract Deployment

### Deploy to Coston2 Testnet

1. Set up your `.env` file in `packages/contracts/`:
   ```
   PRIVATE_KEY=your_testnet_private_key
   ```

2. Deploy contracts:
   ```bash
   cd packages/contracts
   npm run deploy:testnet
   ```

### Deploy to Flare Mainnet

⚠️ **Warning**: Only deploy to mainnet after thorough testing!

```bash
cd packages/contracts
npm run deploy:mainnet
```

## Project Structure

```
flint/
├── packages/
│   ├── frontend/       # Next.js React application
│   ├── backend/        # Express API server
│   ├── contracts/      # Solidity smart contracts
│   └── shared/         # Shared TypeScript types and utilities
├── details.md          # Project documentation
└── README.md
```

## Key Features

- **Yield Dashboard**: View and compare yield opportunities
- **Portfolio Tracker**: Monitor your positions and performance
- **Risk Scoring**: AI-powered risk assessment using FTSO and FDC data
- **Decision Logs**: Complete audit trail of AI decisions

## Flare Network Integration

FLINT integrates with:
- **FTSO**: Price feeds for risk assessment
- **FDC**: Cross-chain event verification
- **FAssets**: FXRP, FUSD, BTCfi, DOGEfi support
- **Flare Stake**: Staking integration

## Troubleshooting

### Port already in use
If port 3000 or 3001 is already in use, update the ports in:
- `packages/frontend/.env.local` (NEXT_PUBLIC_API_URL)
- `packages/backend/.env` (PORT)

### Contract compilation errors
Make sure you have the correct Solidity version and Hardhat setup:
```bash
cd packages/contracts
npm install
npm run compile
```

### Type errors
Ensure all packages are built:
```bash
npm run build
```

## Next Steps

1. Review the `details.md` file for project specifications
2. Set up your Flare Network wallet (MetaMask recommended)
3. Connect to Coston2 testnet for testing
4. Start developing features according to the MVP roadmap

## Support

For issues or questions:
- Check Flare Network documentation: https://dev.flare.network
- Review project details in `details.md`

