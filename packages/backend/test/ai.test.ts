import { YieldOpportunity } from '@flint/shared';
import { aiService } from '../src/services/ai';

// Mock dependencies
jest.mock('../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }
}));

jest.mock('../src/services/blockchain', () => ({
  blockchainService: {
    logDecisionOnChain: jest.fn().mockResolvedValue('0xhash')
  }
}));

jest.mock('../src/services/risk', () => ({
  riskService: {
    calculateRiskScore: jest.fn().mockResolvedValue({ overall: 10 }),
    calculateRiskAdjustedAPY: jest.fn().mockImplementation((apy, risk) => apy - (risk/10))
  }
}));

// Mock fetch for consensus agent
global.fetch = jest.fn();

describe('AI Service Security (Fail-Close)', () => {
  const mockOpportunity: YieldOpportunity = {
    id: 'opp-1',
    source: 'FTSO' as any,
    lastUpdated: new Date(),
    protocol: 'Aave',
    asset: 'USDC' as any,
    apy: 5.0,
    tvl: 1000000,
    riskScore: 10
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('Should FAIL (Throw Error) if Consensus Agent is Unreachable', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Connection Refused'));

    await expect(aiService.generateAllocationDecision(
      'user1', 'USDC', '1000', [mockOpportunity]
    )).rejects.toThrow('Security Violation: Enclave Unreachable');
  });

  it('Should FAIL (Throw Error) if Enclave Signature is Missing in Response', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        decision_id: '123',
        decision: { final_decision: 'approve', compliance_status: 'PASS', model_cid: 'cid', xai_trace: {} },
        attestation: { signature: null } // MISSING SIGNATURE
      })
    });

    await expect(aiService.generateAllocationDecision(
      'user1', 'USDC', '1000', [mockOpportunity]
    )).rejects.toThrow('Security Violation: Enclave Unreachable or Corrupt. Decision Aborted.');
  });

  it('Should SUCCEED if Enclave Signature is Present', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        decision_id: '123',
        decision: { final_decision: 'approve', compliance_status: 'PASS', model_cid: 'cid', xai_trace: {} },
        attestation: { signature: '0xvalidSignature' }
      })
    });

    const decision = await aiService.generateAllocationDecision(
      'user1', 'USDC', '1000', [mockOpportunity]
    );

    expect(decision).toBeDefined();
    expect(decision.reasons).toContain('Consensus: approve');
  });
});
