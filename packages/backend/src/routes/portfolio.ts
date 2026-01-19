import { AssetType, PortfolioPosition, UserPortfolio } from '@flint/shared';
import { Request, Response, Router } from 'express';
import { prisma } from '../utils/db';

export const portfolioRouter = Router();

/**
 * GET /api/portfolio/:userId
 * Get user's portfolio from database
 */
portfolioRouter.get('/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    
    // Fetch user and portfolio including positions
    const portfolioData = await prisma.portfolio.findUnique({
      where: { userId },
      include: { positions: true }
    });

    if (!portfolioData) {
      // Return empty portfolio structure if not found
      return res.json({
        userId,
        totalValueUSD: 0,
        positions: [],
        totalYieldAPY: 0,
        averageRiskScore: 0,
        lastUpdated: new Date(),
      });
    }

    // Map to shared type
    const portfolio: UserPortfolio = {
      userId: portfolioData.userId,
      totalValueUSD: portfolioData.totalValueUSD,
      positions: portfolioData.positions.map(p => ({
        protocol: p.protocol,
        asset: p.asset as AssetType,
        amount: p.amount,
        yieldAPY: p.yieldAPY,
        riskScore: p.riskScore,
        valueUSD: 0, // Calculated value
      })),
      totalYieldAPY: portfolioData.totalYieldAPY,
      averageRiskScore: portfolioData.averageRiskScore,
      lastUpdated: portfolioData.lastUpdated,
    };

    res.json(portfolio);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch portfolio', message: (error as Error).message });
  }
});

/**
 * POST /api/portfolio/:userId/positions
 * Add a position to user's portfolio in database
 */
portfolioRouter.post('/:userId/positions', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const positionData: PortfolioPosition = req.body;

    // Ensure user and portfolio exist
    let portfolio = await prisma.portfolio.findUnique({
      where: { userId }
    });

    if (!portfolio) {
      // Create user if not exists (simple auth assumption for prototype)
      await prisma.user.upsert({
        where: { walletAddress: userId }, // Using userId as walletAddress for now
        update: {},
        create: {
          walletAddress: userId,
          portfolio: {
            create: {}
          }
        }
      });
      
      portfolio = await prisma.portfolio.findUnique({
        where: { userId }
      });
    }

    if (!portfolio) throw new Error("Failed to initialize portfolio");

    // Add position
    const position = await prisma.position.create({
      data: {
        portfolioId: portfolio.id,
        asset: positionData.asset,
        amount: positionData.amount,
        protocol: positionData.protocol,
        yieldAPY: positionData.yieldAPY,
        riskScore: positionData.riskScore,
      }
    });

    res.status(201).json({ message: 'Position added', position });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add position', message: (error as Error).message });
  }
});

