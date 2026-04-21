import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { DatabaseClient } from '@service/database';
import logger from '@service/logger';
import { saveProfilePicture, deleteProfilePictureFile } from '@service/file-storage';
import fs from 'fs';

export const ValidationSchema = {
  body: z.object({
    name: z
      .string()
      .min(2, 'Name must be at least 2 characters')
      .max(255, 'Name cannot exceed 255 characters')
      .trim()
      .optional(),
    description: z
      .string()
      .max(1000, 'Description cannot exceed 1000 characters')
      .trim()
      .optional(),
    clear_banner: z
      .union([z.literal('true'), z.literal('false')])
      .optional()
      .transform((v) => v === 'true'),
  }),
  params: z.object({
    id: z.string().uuid('Invalid subject ID'),
  }),
};

export const Controller = async (
  req: Request,
  res: Response,
  _next: NextFunction,
  db: DatabaseClient
): Promise<void> => {
  const user = (req as any).user;
  const userId = user?.userId;
  const { id } = req.params;
  const { name, description, clear_banner } = req.body;
  const banner = req.file;
  const normalizedDescription =
    description === undefined
      ? undefined
      : typeof description === 'string' && description.trim() === ''
        ? null
        : description;
  const shouldClearBanner = clear_banner === true || clear_banner === 'true';
  const cleanupTemp = (): void => {
    if (banner?.path && fs.existsSync(banner.path)) {
      fs.unlinkSync(banner.path);
    }
  };
  let savedBannerKey: string | null = null;

  // Check if subject exists
  const existingSubject = await db.queryOne(
    'SELECT id, created_by, banner_file_id FROM subjects WHERE id = $1 AND deleted_at IS NULL',
    [id]
  );

  if (!existingSubject) {
    cleanupTemp();
    res.status(404).json({
      success: false,
      message: 'Subject not found',
    });
    return;
  }

  // Check if user is the creator
  if (existingSubject.created_by !== userId) {
    cleanupTemp();
    res.status(403).json({
      success: false,
      message: 'You are not authorized to update this subject',
    });
    return;
  }

  try {
    // Check if new name already exists (if name is being updated)
    if (name) {
      const duplicateSubject = await db.queryOne(
        'SELECT id FROM subjects WHERE LOWER(name) = LOWER($1) AND id != $2 AND deleted_at IS NULL',
        [name, id]
      );

      if (duplicateSubject) {
        cleanupTemp();
        res.status(400).json({
          success: false,
          message: 'Subject with this name already exists',
        });
        return;
      }
    }

    // Build update query dynamically
    const updates: string[] = [];
    const params: any[] = [];
    let paramCount = 0;

    if (name !== undefined) {
      paramCount++;
      params.push(name);
      updates.push(`name = $${paramCount}`);
    }

    if (normalizedDescription !== undefined) {
      paramCount++;
      params.push(normalizedDescription);
      updates.push(`description = $${paramCount}`);
    }

    let nextBannerFileId = existingSubject.banner_file_id ?? null;
    if (banner) {
      savedBannerKey = await saveProfilePicture(banner.filename);
      const fileRow = await db.queryOne(
        'INSERT INTO files (key, size, mime_type) VALUES ($1, $2, $3) RETURNING id',
        [savedBannerKey, banner.size, banner.mimetype]
      );
      nextBannerFileId = fileRow.id;
      paramCount++;
      params.push(nextBannerFileId);
      updates.push(`banner_file_id = $${paramCount}`);
    } else if (shouldClearBanner && existingSubject.banner_file_id) {
      nextBannerFileId = null;
      paramCount++;
      params.push(null);
      updates.push(`banner_file_id = $${paramCount}`);
    }

    if (updates.length === 0) {
      cleanupTemp();
      res.status(400).json({
        success: false,
        message: 'No fields to update',
      });
      return;
    }

    params.push(id);
    const subject = await db.queryOne(
      `UPDATE subjects
       SET ${updates.join(', ')}
       WHERE id = $${paramCount + 1}
       RETURNING id, name, description, banner_file_id, created_by, created_at, updated_at`,
      params
    );

    if (
      existingSubject.banner_file_id &&
      existingSubject.banner_file_id !== nextBannerFileId
    ) {
      const oldFile = await db.queryOne(
        'SELECT key FROM files WHERE id = $1',
        [existingSubject.banner_file_id]
      );
      await db.query('DELETE FROM files WHERE id = $1', [existingSubject.banner_file_id]);
      if (oldFile?.key) {
        await deleteProfilePictureFile(oldFile.key).catch(() => undefined);
      }
    }

    logger.info('Subject updated successfully', {
      subjectId: subject.id,
      userId,
    });

    res.status(200).json({
      success: true,
      message: 'Subject updated successfully',
      data: subject,
    });

    cleanupTemp();
  } catch (error) {
    if (savedBannerKey) {
      await deleteProfilePictureFile(savedBannerKey).catch(() => undefined);
    }
    cleanupTemp();
    throw error;
  }
};
