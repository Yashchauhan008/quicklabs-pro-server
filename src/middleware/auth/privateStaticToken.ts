import { NextFunction, Request, Response } from 'express';
import env from '@config/env';

export default function privateStaticToken(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authorization = req.headers.authorization;
  if (!authorization || !authorization.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      message: 'Missing static access token',
    });
    return;
  }

  const token = authorization.slice('Bearer '.length).trim();
  if (!token || token !== env.security.privateStaticAccessToken) {
    res.status(403).json({
      success: false,
      message: 'Invalid static access token',
    });
    return;
  }

  next();
}
