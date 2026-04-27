import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { DatabaseClient } from '@service/database';
import logger from '@service/logger';
import { saveProfilePicture, deleteProfilePictureFile } from '@service/file-storage';
import fs from 'fs';

export const ValidationSchema = {
  body: z.object({
    name: z
      .string({ message: 'Name is required' })
      .min(2, 'Name must be at least 2 characters')
      .max(255, 'Name cannot exceed 255 characters')
      .trim(),
    description: z
      .string()
      .max(1000, 'Description cannot exceed 1000 characters')
      .trim()
      .optional(),
  }),
};

export const Controller = async (
  req: Request,
  res: Response,
  _next: NextFunction,
  db: DatabaseClient
): Promise<void> => {
  const user = req.user;
  const userId = user?.userId;
  const banner = req.file;

  const { name, description } = req.body;
  const cleanupTemp = (): void => {
    if (banner?.path && fs.existsSync(banner.path)) {
      fs.unlinkSync(banner.path);
    }
  };
  let savedBannerKey: string | null = null;

  const existingSubject = await db.queryOne(
    'SELECT id FROM subjects WHERE LOWER(name) = LOWER($1) AND deleted_at IS NULL',
    [name]
  );

  if (existingSubject) {
    cleanupTemp();
    res.status(400).json({
      success: false,
      message: 'Subject with this name already exists',
    });
    return;
  }

  try {
    let bannerFileId: string | null = null;
    if (banner) {
      savedBannerKey = await saveProfilePicture(banner.filename);
      const fileRow = await db.queryOne(
        'INSERT INTO files (key, size, mime_type) VALUES ($1, $2, $3) RETURNING id',
        [savedBannerKey, banner.size, banner.mimetype]
      );
      bannerFileId = fileRow.id;
    }

    const subject = await db.queryOne(
      `INSERT INTO subjects (name, description, banner_file_id, created_by)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, description, banner_file_id, created_by, created_at, updated_at`,
      [name, description || null, bannerFileId, userId]
    );

    logger.info('Subject created successfully', {
      subjectId: subject.id,
      userId,
    });

    res.status(201).json({
      success: true,
      message: 'Subject created successfully',
      data: subject,
    });
  } catch (error) {
    if (savedBannerKey) {
      await deleteProfilePictureFile(savedBannerKey).catch(() => undefined);
    }
    cleanupTemp();
    throw error;
  }
};
