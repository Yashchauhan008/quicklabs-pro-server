import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { DatabaseClient } from '@service/database';
import logger from '@service/logger';
import { saveFile } from '@service/file-storage';
import fs from 'fs';

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
  const file = req.file;

  const { subject_id, title, description, visibility } = req.body;

  if (!file) {
    res.status(400).json({
      success: false,
      message: 'File is required',
    });
    return;
  }

  try {
    // Check if subject exists
    const subject = await db.queryOne(
      'SELECT id FROM subjects WHERE id = $1 AND deleted_at IS NULL',
      [subject_id]
    );

    if (!subject) {
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      res.status(404).json({
        success: false,
        message: 'Subject not found',
      });
      return;
    }

    // Move file from temp to permanent storage
    const newFileName = await saveFile(file.filename);

    // Create file record in database
    const fileRecord = await db.queryOne(
      'INSERT INTO files (key, size, mime_type) VALUES ($1, $2, $3) RETURNING *',
      [newFileName, file.size, file.mimetype]
    );

    // Create document record
    const document = await db.queryOne(
      `INSERT INTO documents (subject_id, file_id, title, description, visibility, uploaded_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, subject_id, file_id, title, description, visibility, uploaded_by, 
                 download_count, created_at, updated_at`,
      [subject_id, fileRecord.id, title, description || null, visibility || 'PRIVATE', userId]
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
    if (file && fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }
    throw error;
  }
};
