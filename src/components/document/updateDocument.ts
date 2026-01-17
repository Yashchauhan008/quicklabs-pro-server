import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { DatabaseClient } from '@service/database';
import logger from '@service/logger';
import { replaceOldFile } from '@service/file-storage';
import fs from 'fs';

export const ValidationSchema = {
  body: z.object({
    title: z
      .string()
      .min(2, 'Title must be at least 2 characters')
      .max(255, 'Title cannot exceed 255 characters')
      .trim()
      .optional(),
    description: z
      .string()
      .max(1000, 'Description cannot exceed 1000 characters')
      .trim()
      .optional(),
    visibility: z
      .enum(['PUBLIC', 'PRIVATE'], {
        message: 'Visibility must be either PUBLIC or PRIVATE',
      })
      .optional(),
  }),
  params: z.object({
    id: z.string().uuid('Invalid document ID'),
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
  const { title, description, visibility } = req.body;
  const file = req.file;

  try {
    const existingDocument = await db.queryOne(
      'SELECT id, uploaded_by, file_id FROM documents WHERE id = $1 AND deleted_at IS NULL',
      [id]
    );

    if (!existingDocument) {
      if (file && fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      res.status(404).json({
        success: false,
        message: 'Document not found',
      });
      return;
    }

    if (existingDocument.uploaded_by !== userId) {
      if (file && fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      res.status(403).json({
        success: false,
        message: 'You are not authorized to update this document',
      });
      return;
    }

    const updates: string[] = [];
    const params: any[] = [];
    let paramCount = 0;

    if (title !== undefined) {
      paramCount++;
      params.push(title);
      updates.push(`title = $${paramCount}`);
    }

    if (description !== undefined) {
      paramCount++;
      params.push(description);
      updates.push(`description = $${paramCount}`);
    }

    if (visibility !== undefined) {
      paramCount++;
      params.push(visibility);
      updates.push(`visibility = $${paramCount}`);
    }

    if (file) {
      const oldFile = await db.queryOne('SELECT key FROM files WHERE id = $1', [existingDocument.file_id]);
      
      if (oldFile) {
        const newFileName = await replaceOldFile(oldFile.key, file.filename);

        const newFileRecord = await db.queryOne(
          'INSERT INTO files (key, size, mime_type) VALUES ($1, $2, $3) RETURNING id',
          [newFileName, file.size, file.mimetype]
        );

        paramCount++;
        params.push(newFileRecord.id);
        updates.push(`file_id = $${paramCount}`);
      }
    }

    if (updates.length === 0) {
      res.status(400).json({
        success: false,
        message: 'No fields to update',
      });
      return;
    }

    params.push(id);
    const document = await db.queryOne(
      `UPDATE documents SET ${updates.join(', ')} WHERE id = $${paramCount + 1} RETURNING *`,
      params
    );

    logger.info('Document updated successfully', {
      documentId: document.id,
      userId,
      fileReplaced: !!file,
    });

    res.status(200).json({
      success: true,
      message: 'Document updated successfully',
      data: document,
    });
  } catch (error) {
    if (file && fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }
    throw error;
  }
};