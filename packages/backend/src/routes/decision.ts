import { AIDecision, PortfolioPosition, YieldOpportunity } from '@flint/shared';
import { Request, Response, Router } from 'express';
import { aiService } from '../services/ai';
import { blockchainService } from '../services/blockchain';
import { logger } from '../utils/logger';

export const decisionRouter = Router();

/**
 * POST /api/decision/allocate
 * Generate allocation decision
 */
decisionRouter.post('/allocate', async (req: Request, res: Response) => {
  try {
    const { userId, asset, amount, opportunities } = req.body;
    logger.info(`Generating allocation decision for user: ${userId}, asset: ${asset}`);
    
    const { decision, attestation } = await aiService.generateAllocationDecision(
      userId,
      asset,
      amount,
      opportunities as YieldOpportunity[]
    );

    const explanation = aiService.generateExplanation(decision);

    res.json({
      decision,
      explanation,
      attestation,
    });
  } catch (error) {
    logger.error('Error generating allocation decision:', error);
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
    logger.info(`Generating reallocation decision for user: ${userId}`);
    
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
    logger.error('Error generating reallocation decision:', error);
    res.status(500).json({ error: 'Failed to generate reallocation decision', message: (error as Error).message });
  }
});

/**
 * GET /api/decision
 * Get decision history from blockchain
 */
decisionRouter.get('/', async (req: Request, res: Response) => {
  try {
    logger.info('Fetching decision history from blockchain');
    const decisions = await blockchainService.getDecisionsFromChain();
    res.json(decisions);
  } catch (error) {
    logger.error('Error fetching decisions from chain:', error);
    res.status(500).json({ error: 'Failed to fetch decisions', message: (error as Error).message });
  }
});

/**
 * GET /api/decision/:decisionId
 * Get a specific decision from blockchain
 */
decisionRouter.get('/:decisionId', async (req: Request, res: Response) => {
  try {
    const { decisionId } = req.params;
    logger.info(`Fetching decision: ${decisionId}`);
    const decisions = await blockchainService.getDecisionsFromChain();
    const decision = decisions.find(d => d.id === decisionId);
    
    if (!decision) {
      return res.status(404).json({ error: 'Decision not found' });
    }
    
    res.json(decision);
  } catch (error) {
    logger.error(`Error fetching decision ${req.params.decisionId}:`, error);
    res.status(500).json({ error: 'Failed to fetch decision', message: (error as Error).message });
  }
});

