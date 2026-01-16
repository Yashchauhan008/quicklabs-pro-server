import { Request, Response, NextFunction } from 'express';
import { DatabaseClient } from '@service/database';

export const Controller = async (
  req: Request,
  res: Response,
  _next: NextFunction,
  db: DatabaseClient
): Promise<void> => {
  // ✅ Type assertion
  const user = (req as any).user;
  const userId = user?.userId;

  const userRecord = await db.queryOne(
    'SELECT id, name, email, created_at, updated_at FROM users WHERE id = $1',
    [userId]
  );

  if (!userRecord) {
    res.status(404).json({
      success: false,
      message: 'User not found',
    });
    return;
  }

  res.status(200).json({
    success: true,
    data: userRecord,
  });
};