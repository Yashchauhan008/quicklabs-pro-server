import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { DatabaseClient } from '@service/database';

export const ValidationSchema = {
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
  const { name } = req.body as z.infer<typeof ValidationSchema.body>;

  const duplicate = await db.queryOne(
    'SELECT id FROM branches WHERE LOWER(name) = LOWER($1) AND deleted_at IS NULL',
    [name]
  );
  if (duplicate) {
    res.status(400).json({ success: false, message: 'Branch already exists' });
    return;
  }

  const data = await db.queryOne(
    `INSERT INTO branches (name, university_id)
     VALUES ($1, NULL)
     RETURNING id, name, university_id, created_at, updated_at`,
    [name]
  );

  res.status(201).json({ success: true, data });
};
