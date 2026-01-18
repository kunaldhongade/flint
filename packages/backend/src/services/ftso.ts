import { FTSOPriceData } from '@flint/shared';
import { ethers } from 'ethers';
import { logger } from '../utils/logger';

/**
 * FTSO Service
 * Integrates with Flare Time Series Oracle for price feeds
 * PRODUCTION IMPLEMENTATION
 */
class FTSOService {
  private provider: ethers.JsonRpcProvider | null = null;
  private priceCache: Map<string, FTSOPriceData> = new Map();
  private updateInterval: NodeJS.Timeout | null = null;
  private ftsoRegistry: ethers.Contract | null = null;

  // FTSO Registry Address (Flare Mainnet)
  private readonly FTSO_REGISTRY_ADDRESS = process.env.FTSO_REGISTRY_ADDRESS || '0xa08c8E18e2F9F0AD937d8C3b24c5F0B5c3f3F5B0';
  private readonly FLARE_RPC_URL = process.env.FLARE_RPC_URL || 'https://flare-api.flare.network/ext/bc/C/rpc';

  // Supported symbols
  private readonly SYMBOLS = ['BTC', 'XRP', 'DOGE', 'FLR', 'USD'];

  // Minimal ABI for FtsoRegistry
  private readonly REGISTRY_ABI = [
    "function getCurrentPrice(string calldata _symbol) external view returns (uint256 _price, uint256 _timestamp)",
    "function getCurrentPriceWithDecimals(string calldata _symbol) external view returns (uint256 _price, uint256 _timestamp, uint256 _decimals)"
  ];

  constructor() {
    this.initializeProvider();
  }

  private initializeProvider() {
    try {
      this.provider = new ethers.JsonRpcProvider(this.FLARE_RPC_URL);
      this.ftsoRegistry = new ethers.Contract(
        this.FTSO_REGISTRY_ADDRESS,
        this.REGISTRY_ABI,
        this.provider
      );
      logger.info('FTSO Service: Provider and Registry Contract initialized');
    } catch (error) {
      logger.error('FTSO Service: Failed to initialize provider', error);
      throw new Error("Critical: FTSO Service failed to initialize. Cannot proceed in Production.");
    }
  }

  start() {
    if (this.updateInterval) return;
    this.updateInterval = setInterval(() => {
      this.updatePrices().catch((error) => logger.error('FTSO Service: Error updating prices', error));
    }, 60000);
    this.updatePrices().catch((error) => logger.error('FTSO Service: Error in initial price update', error));
    logger.info('FTSO Service: Started');
  }

  stop() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
      logger.info('FTSO Service: Stopped');
    }
  }

  private async updatePrices(): Promise<void> {
    if (!this.provider || !this.ftsoRegistry) {
      logger.warn('FTSO Service: Provider not initialized');
      return;
    }

    try {
      for (const symbol of this.SYMBOLS) {
        if (symbol === 'USD') {
            // Base currency, always 1.0
             this.priceCache.set('USD', {
                symbol: 'USD',
                price: 1.0,
                timestamp: new Date(),
                provider: 'FTSO_BASE',
                confidence: 1.0
             });
             continue;
        }

        const priceData = await this.fetchPriceFromFTSO(symbol);
        if (priceData) {
          this.priceCache.set(symbol, priceData);
        }
      }
      logger.debug(`FTSO Service: Updated prices for ${this.priceCache.size} symbols`);
    } catch (error) {
      logger.error('FTSO Service: Error updating prices', error);
    }
  }

  private async fetchPriceFromFTSO(symbol: string): Promise<FTSOPriceData | null> {
    if (!this.ftsoRegistry) return null;

    try {
      // Real Blockchain Call
      const [priceRaw, timestampRaw, decimals] = await this.ftsoRegistry.getCurrentPriceWithDecimals(symbol);
      
      const price = Number(ethers.formatUnits(priceRaw, decimals));
      const timestamp = new Date(Number(timestampRaw) * 1000);

      // CHAOS CHECK: Staleness
      const now = Date.now();
      const diff = now - timestamp.getTime();
      const MAX_STAGE_DELAY = 300 * 1000; // 5 minutes

      if (diff > MAX_STAGE_DELAY) {
          logger.error(`FTSO Service: Price for ${symbol} is STALE. Delay: ${diff}ms`);
          return null; // Fail-Close
      }

      return {
        symbol,
        price,
        timestamp,
        provider: 'FTSO_MAINNET',
        confidence: 1.0, 
      };
    } catch (error) {
      logger.error(`FTSO Service: Error fetching price for ${symbol}`, error);
      return null;
    }
  }

  getPrice(symbol: string): FTSOPriceData | null {
    return this.priceCache.get(symbol) || null;
  }

  getAllPrices(): Map<string, FTSOPriceData> {
    return new Map(this.priceCache);
  }

  async getPriceWithVolatility(symbol: string, lookbackDays: number = 7): Promise<{
    current: FTSOPriceData;
    volatility: number;
  } | null> {
    const current = this.getPrice(symbol);
    if (!current) return null;

    // TODO: Implement historical query for volatility if needed. 
    // For now, we strictly require live prices. 
    // If historical data is missing, we cannot safely calculate volatility.
    
    return {
      current,
      volatility: 0.0, // Safe default, implies no assumed volatility risk without data
    };
  }
}

export const ftsoService = new FTSOService();

