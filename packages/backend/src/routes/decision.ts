import { Router, Request, Response } from 'express';
import { AIDecision, YieldOpportunity, PortfolioPosition } from '@flint/shared';
import { aiService } from '../services/ai';

export const decisionRouter = Router();

/**
 * POST /api/decision/allocate
 * Generate allocation decision
 */
decisionRouter.post('/allocate', async (req: Request, res: Response) => {
  try {
    const { userId, asset, amount, opportunities } = req.body;
    
    const decision = await aiService.generateAllocationDecision(
      userId,
      asset,
      amount,
      opportunities as YieldOpportunity[]
    );

    const explanation = aiService.generateExplanation(decision);

    res.json({
      decision,
      explanation,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate allocation decision', message: (error as Error).message });
  }
});

/**
 * POST /api/decision/reallocate
 * Generate reallocation decision
 */
decisionRouter.post('/reallocate', async (req: Request, res: Response) => {
  try {
    const { userId, positions, opportunities } = req.body;
    
    const decision = await aiService.generateReallocationDecision(
      userId,
      positions as PortfolioPosition[],
      opportunities as YieldOpportunity[]
    );

    if (!decision) {
      return res.json({ message: 'No reallocation recommended', decision: null });
    }

    const explanation = aiService.generateExplanation(decision);

    res.json({
      decision,
      explanation,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate reallocation decision', message: (error as Error).message });
  }
});

/**
 * GET /api/decision/:decisionId
 * Get a specific decision
 */
decisionRouter.get('/:decisionId', async (req: Request, res: Response) => {
  try {
    const { decisionId } = req.params;
    
    // TODO: Fetch from database/blockchain
    res.status(501).json({ error: 'Not implemented' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch decision', message: (error as Error).message });
  }
});

