/**
 * Shared types for FLINT platform
 */

export enum AssetType {
  FXRP = 'FXRP',
  FUSD = 'FUSD',
  BTCFI = 'BTCFI',
  DOGEFI = 'DOGEFI',
  FLR = 'FLR',
}

export interface YieldOpportunity {
  id: string;
  protocol: string;
  asset: AssetType;
  apy: number;
  riskScore: number;
  tvl: number;
  source: 'FTSO' | 'FDC' | 'MANUAL';
  lastUpdated: Date;
}

export interface PortfolioPosition {
  asset: AssetType;
  amount: string;
  valueUSD: number;
  yieldAPY: number;
  riskScore: number;
  protocol: string;
}

export interface AIDecision {
  id: string;
  timestamp: Date;
  user?: string;
  action: 'ALLOCATE' | 'REALLOCATE' | 'DEALLOCATE' | 'HOLD';
  asset: AssetType;
  amount: string;
  fromProtocol?: string;
  toProtocol?: string;
  confidenceScore: number;
  reasons: string[];
  dataSources: string[];
  alternatives: string[];
  onChainHash?: string;
  modelCid?: string;
  xaiTrace?: any;
}

export interface RiskScore {
  overall: number;
  smartContractRisk: number;
  protocolRisk: number;
  liquidityRisk: number;
  marketRisk: number;
  factors: {
    name: string;
    score: number;
    weight: number;
  }[];
}

export interface FTSOPriceData {
  symbol: string;
  price: number;
  timestamp: Date;
  provider: string;
  confidence: number;
}

export interface FDCAttestation {
  chain: string;
  event: string;
  blockNumber: number;
  transactionHash: string;
  timestamp: Date;
  verified: boolean;
}

export interface UserPortfolio {
  userId: string;
  totalValueUSD: number;
  positions: PortfolioPosition[];
  totalYieldAPY: number;
  averageRiskScore: number;
  lastUpdated: Date;
}

export interface ComplianceReport {
  userId: string;
  period: {
    start: Date;
    end: Date;
  };
  decisions: AIDecision[];
  totalTransactions: number;
  totalValue: number;
  riskMetrics: RiskScore;
  auditTrail: string[];
}

