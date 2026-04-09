import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { DatabaseClient } from '@service/database';
import logger from '@service/logger';
import { deleteFile, saveFile } from '@service/file-storage';
import fs from 'fs';
import {
  advisoryLockUser,
  incrementDailyUploads,
  isStudentRole,
  limits,
  selectDailyUsageForUpdate,
} from '@utils/studentQuota';

export const ValidationSchema = {
  body: z.object({
    subject_id: z.string().uuid('Invalid subject ID'),
    title: z
      .string({ message: 'Title is required' })
      .min(2, 'Title must be at least 2 characters')
      .max(255, 'Title cannot exceed 255 characters')
      .trim(),
    description: z
      .string()
      .max(1000, 'Description cannot exceed 1000 characters')
      .trim()
      .optional(),
    visibility: z
      .enum(['PUBLIC', 'PRIVATE'], {
        message: 'Visibility must be either PUBLIC or PRIVATE',
      })
      .optional()
      .default('PRIVATE'),
    kind: z.enum(['informational', 'lab_solutions']).optional().default('informational'),
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
  const role = user?.role;
  const file = req.file;

  const { subject_id, title, description, visibility, kind } = req.body;

  if (!file) {
    res.status(400).json({
      success: false,
      message: 'File is required',
    });
    return;
  }

  if (!userId || !role) {
    res.status(401).json({
      success: false,
      message: 'Unauthorized request',
    });
    return;
  }

  const cleanupTemp = (): void => {
    if (file && fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }
  };

  try {
    const subject = await db.queryOne(
      'SELECT id FROM subjects WHERE id = $1 AND deleted_at IS NULL',
      [subject_id]
    );

    if (!subject) {
      cleanupTemp();
      res.status(404).json({
        success: false,
        message: 'Subject not found',
      });
      return;
    }

    if (isStudentRole(role)) {
      let savedKey: string | null = null;
      await db.query('BEGIN');
      try {
        await advisoryLockUser(db, userId);
        const usage = await selectDailyUsageForUpdate(db, userId);
        const uploads = usage?.uploads_count ?? 0;
        if (uploads >= limits().maxUploadsPerDay) {
          await db.query('ROLLBACK');
          cleanupTemp();
          res.status(400).json({
            success: false,
            message: `Daily upload limit reached (${limits().maxUploadsPerDay} files per day)`,
          });
          return;
        }

        savedKey = await saveFile(file.filename);

        const fileRecord = await db.queryOne(
          'INSERT INTO files (key, size, mime_type) VALUES ($1, $2, $3) RETURNING *',
          [savedKey, file.size, file.mimetype]
        );

        const document = await db.queryOne(
          `INSERT INTO documents (subject_id, file_id, title, description, visibility, uploaded_by, kind)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING id, subject_id, file_id, title, description, visibility, uploaded_by, kind,
                     download_count, created_at, updated_at`,
          [subject_id, fileRecord.id, title, description || null, visibility || 'PRIVATE', userId, kind]
        );

        await incrementDailyUploads(db, userId);
        await db.query('COMMIT');

        logger.info('Document uploaded successfully', {
          documentId: document.id,
          fileId: fileRecord.id,
          subjectId: subject_id,
          userId,
        });

        res.status(201).json({
          success: true,
          message: 'Document uploaded successfully',
          data: {
            ...document,
            file: fileRecord,
          },
        });
      } catch (innerErr) {
        await db.query('ROLLBACK');
        if (savedKey) {
          await deleteFile(savedKey).catch(() => undefined);
        }
        throw innerErr;
      }
      return;
    }

    const newFileName = await saveFile(file.filename);

    const fileRecord = await db.queryOne(
      'INSERT INTO files (key, size, mime_type) VALUES ($1, $2, $3) RETURNING *',
      [newFileName, file.size, file.mimetype]
    );

    const document = await db.queryOne(
      `INSERT INTO documents (subject_id, file_id, title, description, visibility, uploaded_by, kind)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, subject_id, file_id, title, description, visibility, uploaded_by, kind,
                 download_count, created_at, updated_at`,
      [subject_id, fileRecord.id, title, description || null, visibility || 'PRIVATE', userId, kind]
    );

    logger.info('Document uploaded successfully', {
      documentId: document.id,
      fileId: fileRecord.id,
      subjectId: subject_id,
      userId,
    });

    res.status(201).json({
      success: true,
      message: 'Document uploaded successfully',
      data: {
        ...document,
        file: fileRecord,
      },
    });
  } catch (error) {
    cleanupTemp();
    throw error;
  }
};
