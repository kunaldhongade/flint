import { NextFunction, Request, Response } from 'express';
import { logger } from '../utils/logger';

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_REQUESTS = 100; // Limit each IP to 100 requests per window

interface RateLimitData {
  count: number;
  resetTime: number;
}

const ipLimits = new Map<string, RateLimitData>();

/**
 * Cleanup interval to remove old IPs from memory (every 10 mins)
 */
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of ipLimits.entries()) {
    if (now > data.resetTime) {
      ipLimits.delete(ip);
    }
  }
}, 10 * 60 * 1000);

export const rateLimiter = (req: Request, res: Response, next: NextFunction) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();

  let data = ipLimits.get(ip);

  if (!data || now > data.resetTime) {
    data = { count: 0, resetTime: now + WINDOW_MS };
    ipLimits.set(ip, data);
  }

  data.count++;

  if (data.count > MAX_REQUESTS) {
    logger.warn(`Rate limit exceeded for IP: ${ip}`);
    return res.status(429).json({
      error: 'Too Many Requests',
      message: 'Please try again later.'
    });
  }

  next();
};
