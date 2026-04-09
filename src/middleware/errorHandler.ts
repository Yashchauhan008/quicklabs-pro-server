import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import logger from '@service/logger';
import env from '@config/env';

export default function errorHandler(
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(413).json({
        success: false,
        message: 'File size exceeds 75MB limit',
      });
      return;
    }

    res.status(400).json({
      success: false,
      message: err.message || 'File upload failed',
    });
    return;
  }

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