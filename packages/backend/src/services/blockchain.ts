import { AIDecision } from '@flint/shared';
import { ethers } from 'ethers';
import { logger } from '../utils/logger';

/**
 * Blockchain Service
 * Handles interaction with Flare Network smart contracts
 */
export class BlockchainService {
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  private loggerContract: ethers.Contract;

  // DecisionLogger ABI (Fragment for the methods we use)
  private readonly ABI = [
    "function logDecision(bytes32 id, address user, uint8 action, address asset, uint256 amount, address fromProtocol, address toProtocol, uint256 confidenceScore, string memory reasons, string memory dataSources, string memory alternatives, bytes32 onChainHash, string memory modelCid, string memory xaiCid) external",
    "function getDecisions(uint256 offset, uint256 limit) external view returns (bytes32[] memory)",
    "function getDecision(bytes32 id) external view returns (tuple(bytes32 id, uint256 timestamp, uint8 action, address user, address asset, uint256 amount, address fromProtocol, address toProtocol, uint256 confidenceScore, string reasons, string dataSources, string alternatives, bytes32 onChainHash, string modelCid, string xaiCid))"
  ];

  constructor() {
    const rpcUrl = process.env.FLARE_RPC_URL || 'https://coston2-api.flare.network/ext/C/rpc';
    const privateKey = process.env.PRIVATE_KEY || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'; // Default Hardhat #1
    const contractAddress = process.env.DECISION_LOGGER_ADDRESS || '0x5FbDB2315678afecb367f032d93F642f64180aa3';

    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.wallet = new ethers.Wallet(privateKey, this.provider);
    this.loggerContract = new ethers.Contract(contractAddress, this.ABI, this.wallet);
  }

  /**
   * Log an AI decision on-chain
   */
  async logDecisionOnChain(decision: AIDecision, signature: string): Promise<string | null> {
    try {
      logger.info(`Submitting decision ${decision.id} to Flare Network...`);
      
      const actionMap = {
        'ALLOCATE': 0,
        'REALLOCATE': 1,
        'DEALLOCATE': 2,
        'HOLD': 3
      };

      // Convert ID to bytes32 (padded)
      const idBytes32 = ethers.id(decision.id);
      const onChainHashBytes32 = decision.onChainHash ? (decision.onChainHash.startsWith('0x') ? decision.onChainHash : ethers.id(decision.onChainHash)) : ethers.ZeroHash;

      // Mock addresses for simulation if not present
      const userAddr = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
      const assetAddr = ethers.ZeroAddress; 
      const amount = ethers.parseEther(decision.amount.replace(/[^0-9.]/g, '') || '0');

      const tx = await this.loggerContract.logDecision(
        idBytes32,
        userAddr,
        actionMap[decision.action],
        assetAddr,
        amount,
        decision.fromProtocol || ethers.ZeroAddress,
        decision.toProtocol || ethers.ZeroAddress,
        Math.floor(decision.confidenceScore),
        JSON.stringify(decision.reasons),
        JSON.stringify(decision.dataSources),
        JSON.stringify(decision.alternatives),
        onChainHashBytes32,
        decision.modelCid || "",
        JSON.stringify(decision.xaiTrace || {}),
        signature // Pass the Enclave Signature
      );

      const receipt = await tx.wait();
      logger.info(`Decision ${decision.id} successfully logged on-chain. Tx: ${receipt.hash}`);
      return receipt.hash;
    } catch (error) {
      logger.error('Failed to log decision on-chain:', error);
      return null;
    }
  }

  /**
   * Get all decisions from the chain
   */
  async getDecisionsFromChain(): Promise<AIDecision[]> {
    try {
      const ids = await this.loggerContract.getDecisions(0, 50);
      const decisions = await Promise.all(ids.map(async (id: string) => {
        const raw = await this.loggerContract.getDecision(id);
        return this.mapContractDecisionToShared(raw);
      }));
      return decisions;
    } catch (error) {
      logger.error('Failed to fetch decisions from chain:', error);
      return [];
    }
  }

  private mapContractDecisionToShared(raw: any): AIDecision {
    const actionRevMap = ['ALLOCATE', 'REALLOCATE', 'DEALLOCATE', 'HOLD'];
    return {
      id: raw.id,
      timestamp: new Date(Number(raw.timestamp) * 1000),
      action: actionRevMap[raw.action] as any,
      asset: 'FXRP' as any, // Mock
      amount: ethers.formatEther(raw.amount),
      fromProtocol: raw.fromProtocol,
      toProtocol: raw.toProtocol,
      confidenceScore: Number(raw.confidenceScore),
      reasons: JSON.parse(raw.reasons),
      dataSources: JSON.parse(raw.dataSources),
      alternatives: JSON.parse(raw.alternatives),
      onChainHash: raw.onChainHash,
      modelCid: raw.modelCid,
      xaiTrace: JSON.parse(raw.xaiCid || '{}')
    };
  }
}

export const blockchainService = new BlockchainService();
