import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { DatabaseClient } from '@service/database';
import logger from '@service/logger';

export const ValidationSchema = {
  params: z.object({
    id: z.string().uuid('Invalid document ID'),
    attachmentId: z.string().uuid('Invalid attachment ID'),
  }),
  body: z.object({
    title: z
      .string()
      .min(1, 'Title is required')
      .max(50, 'Title cannot exceed 50 characters')
      .trim()
      .optional(),
    description: z
      .string()
      .max(1000, 'Description cannot exceed 1000 characters')
      .trim()
      .optional(),
    is_main: z.boolean().optional(),
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
  const { id: documentId, attachmentId } = req.params;
  const { title, description, is_main } = req.body as z.infer<typeof ValidationSchema.body>;

  if (title === undefined && description === undefined && is_main !== true) {
    res.status(400).json({
      success: false,
      message: 'No fields to update',
    });
    return;
  }

  const doc = await db.queryOne(
    'SELECT id, uploaded_by FROM documents WHERE id = $1 AND deleted_at IS NULL',
    [documentId]
  );

  if (!doc) {
    res.status(404).json({
      success: false,
      message: 'Document not found',
    });
    return;
  }

  if (doc.uploaded_by !== userId) {
    res.status(403).json({
      success: false,
      message: 'You are not authorized to update this document',
    });
    return;
  }

  const att = await db.queryOne(
    'SELECT id FROM document_files WHERE id = $1 AND document_id = $2',
    [attachmentId, documentId]
  );

  if (!att) {
    res.status(404).json({
      success: false,
      message: 'Attachment not found',
    });
    return;
  }

  await db.query('BEGIN');
  try {
    if (is_main === true) {
      await db.query('UPDATE document_files SET is_main = false WHERE document_id = $1', [
        documentId,
      ]);
      await db.query('UPDATE document_files SET is_main = true WHERE id = $1', [attachmentId]);
    }

    if (title !== undefined) {
      await db.query('UPDATE document_files SET title = $1 WHERE id = $2', [
        title,
        attachmentId,
      ]);
    }

    if (description !== undefined) {
      await db.query('UPDATE document_files SET description = $1 WHERE id = $2', [
        description || null,
        attachmentId,
      ]);
    }

    await db.query('COMMIT');
  } catch (e) {
    await db.query('ROLLBACK');
    throw e;
  }

  const row = await db.queryOne(
    `SELECT df.id, df.file_id, df.title, df.is_main, df.description, df.sort_order,
            f.key as file_key, f.size as file_size, f.mime_type as file_mime_type
     FROM document_files df
     JOIN files f ON f.id = df.file_id
     WHERE df.id = $1`,
    [attachmentId]
  );

  logger.info('Document attachment updated', { documentId, attachmentId, userId });

  res.status(200).json({
    success: true,
    message: 'Attachment updated',
    data: row,
  });
};
