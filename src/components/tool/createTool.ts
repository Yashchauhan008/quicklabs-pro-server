import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { DatabaseClient } from '@service/database';
import { saveProfilePicture } from '@service/file-storage';
import fs from 'fs';

export const ValidationSchema = {
  body: z.object({
    title: z.string().min(1).max(255),
    description: z.string().optional(),
    link: z.string().url(),
    category: z.string().max(100).optional(),
    status: z.enum(['online', 'beta', 'new']).optional().default('online'),
  }),
};

export const Controller = async (
  req: Request,
  res: Response,
  _next: NextFunction,
  db: DatabaseClient
): Promise<void> => {
  const { title, description, link, category, status } = req.body;
  const files = req.files as { [fieldname: string]: Express.Multer.File[] };
  
  const logoFile = files?.logo?.[0];
  const bannerFiles = files?.banners || [];

  const cleanupTemp = (): void => {
    if (logoFile?.path && fs.existsSync(logoFile.path)) fs.unlinkSync(logoFile.path);
    bannerFiles.forEach(f => {
      if (f.path && fs.existsSync(f.path)) fs.unlinkSync(f.path);
    });
  };

  try {
    let logoFileId: string | null = null;
    if (logoFile) {
      const savedLogoName = await saveProfilePicture(logoFile.filename);
      const fileRow = await db.queryOne(
        'INSERT INTO files (key, size, mime_type) VALUES ($1, $2, $3) RETURNING id',
        [savedLogoName, logoFile.size, logoFile.mimetype]
      );
      logoFileId = fileRow.id;
    }

    const bannerFileIds: string[] = [];
    for (const file of bannerFiles) {
      const savedBannerName = await saveProfilePicture(file.filename);
      const fileRow = await db.queryOne(
        'INSERT INTO files (key, size, mime_type) VALUES ($1, $2, $3) RETURNING id',
        [savedBannerName, file.size, file.mimetype]
      );
      bannerFileIds.push(fileRow.id);
    }

    const tool = await db.queryOne(
      `INSERT INTO tools (title, description, logo_file_id, banner_file_ids, link, category, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [title, description || null, logoFileId, bannerFileIds, link, category || null, status]
    );

    res.status(201).json({
      success: true,
      data: tool,
    });
  } catch (error) {
    cleanupTemp();
    throw error;
  }
};
