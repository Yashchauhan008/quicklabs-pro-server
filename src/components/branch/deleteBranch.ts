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
    'SELECT id FROM branches WHERE id = $1 AND deleted_at IS NULL',
    [id]
  );
  if (!existing) {
    res.status(404).json({ success: false, message: 'Branch not found' });
    return;
  }

  await db.query('UPDATE branches SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1', [id]);
  res.status(204).send();
};
