import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { logger } from '../config/logger';

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: 'No token provided',
      });
      return;
    }

    const token = authHeader.substring(7);

    const { userId } = AuthService.verifyToken(token);
    (req as any).userId = userId;

    next();
  } catch (error: any) {
    logger.error('Authentication error', { error: error.message });

    res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
    });
  }
};