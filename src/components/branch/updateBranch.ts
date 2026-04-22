import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { DatabaseClient } from '@service/database';

export const ValidationSchema = {
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    name: z.string().min(2).max(255).trim(),
    university_id: z.string().uuid().optional().nullable(),
  }),
};

export const Controller = async (
  req: Request,
  res: Response,
  _next: NextFunction,
  db: DatabaseClient
): Promise<void> => {
  const { id } = req.params;
  const { name } = req.body as z.infer<typeof ValidationSchema.body>;

  const existing = await db.queryOne(
    'SELECT id FROM branches WHERE id = $1 AND deleted_at IS NULL',
    [id]
  );
  if (!existing) {
    res.status(404).json({ success: false, message: 'Branch not found' });
    return;
  }

  const duplicate = await db.queryOne(
    `SELECT id FROM branches
     WHERE LOWER(name) = LOWER($1) AND id <> $2 AND deleted_at IS NULL`,
    [name, id]
  );
  if (duplicate) {
    res.status(400).json({ success: false, message: 'Branch already exists' });
    return;
  }

  const data = await db.queryOne(
    `UPDATE branches
     SET name = $1, university_id = NULL
     WHERE id = $2
     RETURNING id, name, university_id, created_at, updated_at`,
    [name, id]
  );
  res.status(200).json({ success: true, data });
};
