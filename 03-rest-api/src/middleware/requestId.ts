import { Request, Response, NextFunction } from 'express';
import { generateRequestId } from '../utils/logger.js';

declare global {
  namespace Express {
    interface Request {
      id: string;
    }
  }
}

export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction) => {
  req.id = generateRequestId();
  res.setHeader('X-Request-Id', req.id);
  next();
};
