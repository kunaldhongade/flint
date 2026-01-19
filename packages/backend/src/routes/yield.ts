import { AssetType, YieldOpportunity } from '@flint/shared';
import { Request, Response, Router } from 'express';
import { ftsoService } from '../services/ftso';
import { riskService } from '../services/risk';
import { logger } from '../utils/logger';

export const yieldRouter = Router();

/**
 * GET /api/yield/opportunities
 * Get all available yield opportunities
 */
yieldRouter.get('/opportunities', async (req: Request, res: Response) => {
  try {
    logger.info('Fetching all yield opportunities');
    // TODO: Fetch from actual protocols and databases
    // This is a placeholder with mock data
    const opportunities: YieldOpportunity[] = [
      {
        id: '1',
        protocol: 'earnXRP',
        asset: AssetType.FXRP,
        apy: 8.5,
        riskScore: 35,
        tvl: 5000000,
        source: 'FTSO',
        lastUpdated: new Date(),
      },
      {
        id: '2',
        protocol: 'Flare DEX',
        asset: AssetType.FXRP,
        apy: 12.3,
        riskScore: 45,
        tvl: 3000000,
        source: 'FTSO',
        lastUpdated: new Date(),
      },
      {
        id: '3',
        protocol: 'Flare Finance',
        asset: AssetType.BTCFI,
        apy: 15.2,
        riskScore: 50,
        tvl: 8000000,
        source: 'FDC',
        lastUpdated: new Date(),
      },
    ];

    // Calculate risk scores for each opportunity
    const opportunitiesWithRisk = await Promise.all(
      opportunities.map(async (opp) => {
        const riskScore = await riskService.calculateRiskScore(opp);
        return {
          ...opp,
          riskScore: riskScore.overall,
          riskDetails: riskScore,
        };
      })
    );

    res.json(opportunitiesWithRisk);
  } catch (error) {
    logger.error('Error fetching yield opportunities:', error);
    res.status(500).json({ error: 'Failed to fetch yield opportunities', message: (error as Error).message });
  }
});

/**
 * GET /api/yield/opportunities/:asset
 * Get yield opportunities for a specific asset
 */
yieldRouter.get('/opportunities/:asset', async (req: Request, res: Response) => {
  try {
    const { asset } = req.params;
    logger.info(`Fetching yield opportunities for asset: ${asset}`);
    
    // TODO: Filter opportunities by asset
    // For now, return all opportunities
    const opportunities = await getYieldOpportunities();
    const filtered = opportunities.filter((opp) => opp.asset === asset.toUpperCase());
    
    res.json(filtered);
  } catch (error) {
    logger.error(`Error fetching yield opportunities for asset ${req.params.asset}:`, error);
    res.status(500).json({ error: 'Failed to fetch yield opportunities', message: (error as Error).message });
  }
});

/**
 * GET /api/yield/prices
 * Get current prices from FTSO
 */
yieldRouter.get('/prices', async (req: Request, res: Response) => {
  try {
    logger.info('Fetching FTSO prices');
    const prices = ftsoService.getAllPrices();
    const priceArray = Array.from(prices.values());
    res.json(priceArray);
  } catch (error) {
    logger.error('Error fetching FTSO prices:', error);
    res.status(500).json({ error: 'Failed to fetch prices', message: (error as Error).message });
  }
});

async function getYieldOpportunities(): Promise<YieldOpportunity[]> {
  // Placeholder - would fetch from actual protocols
  return [];
}

