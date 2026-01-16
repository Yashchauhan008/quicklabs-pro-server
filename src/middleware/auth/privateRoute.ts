import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '@utils/jwtToken';
import logger from '@service/logger';

export default async function privateRoute(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
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
    const payload = verifyToken(token);

    // ✅ Type assertion as workaround
    (req as any).user = payload;
    
    next();
  } catch (error: any) {
    logger.error('Authentication error', { error: error.message });
    res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
    });
  }
}