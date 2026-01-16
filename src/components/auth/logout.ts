import { Request, Response, NextFunction } from 'express';
import { DatabaseClient } from '../../service/database';
import logger from '../../service/logger';

export const Controller = async (
  req: Request,
  res: Response,
  _next: NextFunction,
  _db: DatabaseClient
): Promise<void> => {
  // ✅ Type assertion
  const user = (req as any).user;
  logger.info('User logged out', { userId: user?.userId });

  res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
};