import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { DatabaseClient } from '@service/database';

export const ValidationSchema = {
  params: z.object({
    id: z.string().uuid(),
  }),
};

export const Controller = async (
  req: Request,
  res: Response,
  _next: NextFunction,
  db: DatabaseClient
): Promise<void> => {
  const { id } = req.params;
  const existing = await db.queryOne(
    'SELECT id FROM universities WHERE id = $1 AND deleted_at IS NULL',
    [id]
  );
  if (!existing) {
    res.status(404).json({ success: false, message: 'University not found' });
    return;
  }
  await db.query('UPDATE universities SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1', [id]);
  await db.query(
    'UPDATE branches SET deleted_at = CURRENT_TIMESTAMP WHERE university_id = $1 AND deleted_at IS NULL',
    [id]
  );
  res.status(204).send();
};
