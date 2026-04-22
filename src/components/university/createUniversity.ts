import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { DatabaseClient } from '@service/database';
import { saveProfilePicture } from '@service/file-storage';
import fs from 'fs';

export const ValidationSchema = {
  body: z.object({
    name: z.string().min(2).max(255).trim(),
  }),
};

export const Controller = async (
  req: Request,
  res: Response,
  _next: NextFunction,
  db: DatabaseClient
): Promise<void> => {
  const { name } = req.body as z.infer<typeof ValidationSchema.body>;
  const logo = req.file;

  if (!logo) {
    res.status(400).json({ success: false, message: 'University logo is required' });
    return;
  }

  const cleanupTemp = (): void => {
    if (logo.path && fs.existsSync(logo.path)) fs.unlinkSync(logo.path);
  };

  const existing = await db.queryOne(
    'SELECT id FROM universities WHERE LOWER(name) = LOWER($1) AND deleted_at IS NULL',
    [name]
  );
  if (existing) {
    cleanupTemp();
    res.status(400).json({ success: false, message: 'University already exists' });
    return;
  }

  const logoKey = await saveProfilePicture(logo.filename);
  const logoFile = await db.queryOne(
    'INSERT INTO files (key, size, mime_type) VALUES ($1, $2, $3) RETURNING id',
    [logoKey, logo.size, logo.mimetype]
  );

  const data = await db.queryOne(
    `INSERT INTO universities (name, logo_file_id)
     VALUES ($1, $2)
     RETURNING id, name, logo_file_id, created_at, updated_at`,
    [name, logoFile.id]
  );

  res.status(201).json({ success: true, data });
};
