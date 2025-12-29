import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';

const VALID_API_KEYS = new Set([
  process.env.API_KEY || 'dev-api-key-12345'
]);

export const authenticateApiKey = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-api-key'] as string;

  if (!apiKey || !VALID_API_KEYS.has(apiKey)) {
    logger.warn({ requestId: req.id, ip: req.ip }, 'Invalid API key attempt');
    return res.status(401).json({ error: 'Invalid API key' });
  }

  next();
};
