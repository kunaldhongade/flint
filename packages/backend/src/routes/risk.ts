import { Router, Request, Response } from 'express';
import { YieldOpportunity } from '@flint/shared';
import { riskService } from '../services/risk';

export const riskRouter = Router();

/**
 * POST /api/risk/calculate
 * Calculate risk score for a yield opportunity
 */
riskRouter.post('/calculate', async (req: Request, res: Response) => {
  try {
    const opportunity: YieldOpportunity = req.body;
    const riskScore = await riskService.calculateRiskScore(opportunity);
    res.json(riskScore);
  } catch (error) {
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
    const adjustedAPY = riskService.calculateRiskAdjustedAPY(apy, riskScore);
    res.json({ adjustedAPY });
  } catch (error) {
    res.status(500).json({ error: 'Failed to calculate risk-adjusted APY', message: (error as Error).message });
  }
});

