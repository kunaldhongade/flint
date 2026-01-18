import { FDCAttestation } from '@flint/shared';
import { logger } from '../utils/logger';

/**
 * FDC Service
 * Integrates with Flare Data Connector for cross-chain event verification
 */
class FDCService {
  private attestationCache: Map<string, FDCAttestation[]> = new Map();
  private updateInterval: NodeJS.Timeout | null = null;
  private readonly FDC_API_URL = process.env.FDC_API_URL || 'https://api.flare.network/fdc';

  /**
   * Start periodic attestation updates
   */
  start() {
    if (this.updateInterval) {
      return;
    }

    // Update attestations every 30 seconds
    this.updateInterval = setInterval(() => {
      this.updateAttestations().catch((error) => {
        logger.error('FDC Service: Error updating attestations', error);
      });
    }, 30000);

    // Initial update
    this.updateAttestations().catch((error) => {
      logger.error('FDC Service: Error in initial attestation update', error);
    });

    logger.info('FDC Service: Started');
  }

  /**
   * Stop periodic updates
   */
  stop() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
      logger.info('FDC Service: Stopped');
    }
  }

  /**
   * Update attestations from FDC
   */
  private async updateAttestations(): Promise<void> {
    try {
    } catch (error) {
      logger.error('FDC Service: Error updating attestations', error);
      // Fail-close handled by downstream consumers checking for empty/missing attestations
    }
  }
  }

  /**
   * Fetch attestations from FDC API
   */
  private async fetchAttestations(chain: string): Promise<FDCAttestation[]> {
    try {
      // SECURITY VERIFICATION:
      // We do NOT use mocks in production.
      // If FDC API is not connected, we return empty list.
      // Downstream logic must handle "Verification Failed".
      
      const isTest = process.env.NODE_ENV === 'test';
      if (!isTest) {
          if (!this.FDC_API_URL) {  
             logger.warn(`FDC Service: No FDC_API_URL configured. Returning empty attestations.`);
             return [];
          }
          // Real implementation would go here (fetch from API)
          // For now, in staging, we return empty list to FAIL-CLOSE if not implemented
          return [];
      }

      // ONLY FOR LOCAL TESTING SUITE (Simulated Chaos)
      return []; 
    } catch (error) {
      logger.error(`FDC Service: Error fetching attestations for ${chain}`, error);
      return [];
    }
  }

  /**
   * Verify a cross-chain event
   */
  async verifyEvent(chain: string, txHash: string): Promise<FDCAttestation | null> {
    const attestations = this.attestationCache.get(chain) || [];
    return attestations.find((att) => att.transactionHash === txHash) || null;
  }

  /**
   * Get latest attestations for a chain
   */
  getLatestAttestations(chain: string, limit: number = 10): FDCAttestation[] {
    const attestations = this.attestationCache.get(chain) || [];
    return attestations.slice(0, limit);
  }

  /**
   * Get all cached attestations
   */
  getAllAttestations(): Map<string, FDCAttestation[]> {
    return new Map(this.attestationCache);
  }

  /**
   * Check if a chain event is verified
   */
  isVerified(chain: string, txHash: string): boolean {
    const attestation = this.attestationCache
      .get(chain)
      ?.find((att) => att.transactionHash === txHash);
    return attestation?.verified || false;
  }
}

export const fdcService = new FDCService();

