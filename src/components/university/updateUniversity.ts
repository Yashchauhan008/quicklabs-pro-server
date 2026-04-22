import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { DatabaseClient } from '@service/database';
import { saveProfilePicture } from '@service/file-storage';

export const ValidationSchema = {
  params: z.object({
    id: z.string().uuid(),
  }),
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
  const { id } = req.params;
  const { name } = req.body as z.infer<typeof ValidationSchema.body>;
  const logo = req.file;

  const existing = await db.queryOne(
    'SELECT id, logo_file_id FROM universities WHERE id = $1 AND deleted_at IS NULL',
    [id]
  );
  if (!existing) {
    res.status(404).json({ success: false, message: 'University not found' });
    return;
  }

  const duplicate = await db.queryOne(
    'SELECT id FROM universities WHERE LOWER(name) = LOWER($1) AND id <> $2 AND deleted_at IS NULL',
    [name, id]
  );
  if (duplicate) {
    res.status(400).json({ success: false, message: 'University already exists' });
    return;
  }

  let logoFileId = existing.logo_file_id ?? null;
  if (logo) {
    const logoKey = await saveProfilePicture(logo.filename);
    const logoFile = await db.queryOne(
      'INSERT INTO files (key, size, mime_type) VALUES ($1, $2, $3) RETURNING id',
      [logoKey, logo.size, logo.mimetype]
    );
    logoFileId = logoFile.id;
  }

  const data = await db.queryOne(
    `UPDATE universities
     SET name = $1, logo_file_id = $2
     WHERE id = $3
     RETURNING id, name, logo_file_id, created_at, updated_at`,
    [name, logoFileId, id]
  );

  res.status(200).json({ success: true, data });
};
