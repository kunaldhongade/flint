import { NextFunction, Request, Response } from 'express';
import { logger } from '../utils/logger';

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-api-key'];
  const validApiKey = process.env.API_KEY || 'flint-staging-key-123';

  if (!apiKey || apiKey !== validApiKey) {
    logger.warn(`Unauthorized access attempt from ${req.ip}`);
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid API Key'
    });
  }

  next();
};
