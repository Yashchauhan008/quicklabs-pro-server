import { Request, Response, NextFunction } from 'express';
import logger from '@service/logger';
import env from '@config/env';

export default function errorHandler(
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(env.server.isDevelopment && { stack: err.stack }),
  });
}