import { YieldOpportunity } from '@flint/shared';
import { Request, Response, Router } from 'express';
import { riskService } from '../services/risk';
import { logger } from '../utils/logger';

export const riskRouter = Router();

/**
 * POST /api/risk/calculate
 * Calculate risk score for a yield opportunity
 */
riskRouter.post('/calculate', async (req: Request, res: Response) => {
  try {
    const opportunity: YieldOpportunity = req.body;
    logger.info('Calculating risk score for opportunity', { opportunityId: opportunity.id, protocol: opportunity.protocol });
    const riskScore = await riskService.calculateRiskScore(opportunity);
    res.json(riskScore);
  } catch (error) {
    logger.error('Error calculating risk score:', error);
    res.status(500).json({ error: 'Failed to calculate risk score', message: (error as Error).message });
  }
});

/**
 * POST /api/risk/adjusted-apy
 * Calculate risk-adjusted APY
 */
riskRouter.post('/adjusted-apy', async (req: Request, res: Response) => {
  try {
    const { apy, riskScore } = req.body;
    logger.info('Calculating risk-adjusted APY', { apy, riskScore });
    const adjustedAPY = riskService.calculateRiskAdjustedAPY(apy, riskScore);
    res.json({ adjustedAPY });
  } catch (error) {
    logger.error('Error calculating risk-adjusted APY:', error);
    res.status(500).json({ error: 'Failed to calculate risk-adjusted APY', message: (error as Error).message });
  }
});

