import { AIDecision } from '@flint/shared';
import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger';

/**
 * Blockchain Service
 * Handles interaction with Flare Network smart contracts
 */
export class BlockchainService {
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  private loggerContract: ethers.Contract;

  constructor() {
    const rpcUrl = process.env.FLARE_RPC_URL || 'https://coston2-api.flare.network/ext/C/rpc';
    const privateKey = process.env.PRIVATE_KEY || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'; // Default Hardhat #1
    const contractAddress = process.env.DECISION_LOGGER_ADDRESS || '0x467193cdd01875451d57FC333643a4D2E991Da2f';

    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.wallet = new ethers.Wallet(privateKey, this.provider);

    // Load real ABI from shared package
    const artifactPath = path.resolve(__dirname, '../../../shared/src/abi/DecisionLogger.json');
    let abi;
    try {
        const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
        abi = artifact.abi;
        logger.info(`Loaded DecisionLogger ABI from ${artifactPath}`);
    } catch (e) {
        logger.error(`Failed to load DecisionLogger artifact from ${artifactPath}, falling back to minimal ABI. Error: ${e}`);
        // Fallback or throw? User said "dont use dummy abi". But if file missing (e.g. docker), we might crash.
        // For staging, we throw to enforce correctness.
        throw new Error("Failed to load DecisionLogger ABI: " + e);
    }
    
    this.loggerContract = new ethers.Contract(contractAddress, abi, this.wallet);
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

      // Helper to ensure valid address (or ZeroAddress for names like "Aave")
      const safeAddress = (addr: string | undefined): string => {
        if (addr && ethers.isAddress(addr)) return addr;
        return ethers.ZeroAddress;
      };

      // Use dynamic user address from decision object
      const userAddr = safeAddress(decision.user);
      const assetAddr = safeAddress(decision.asset); 
      const amount = ethers.parseEther(decision.amount.replace(/[^0-9.]/g, '') || '0');

      console.log("DEBUG: logDecision parameters:", {
        idBytes32,
        userAddr,
        action: actionMap[decision.action],
        assetAddr,
        amount: amount.toString(),
        fromProtocol: safeAddress(decision.fromProtocol),
        toProtocol: safeAddress(decision.toProtocol),
        confidenceScore: Math.floor(decision.confidenceScore),
        reasons: JSON.stringify(decision.reasons),
        onChainHashBytes32,
        signature
      });

      const tx = await this.loggerContract.logDecision(
        idBytes32,
        userAddr,
        actionMap[decision.action],
        assetAddr,
        amount,
        safeAddress(decision.fromProtocol),
        safeAddress(decision.toProtocol),
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
