import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { DatabaseClient } from '@service/database';
import logger from '@service/logger';
import { deleteFile } from '@service/file-storage';

export const ValidationSchema = {
  params: z.object({
    id: z.string().uuid('Invalid document ID'),
    attachmentId: z.string().uuid('Invalid attachment ID'),
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
    'SELECT id, is_main, file_id FROM document_files WHERE id = $1 AND document_id = $2',
    [attachmentId, documentId]
  );

  if (!att) {
    res.status(404).json({
      success: false,
      message: 'Attachment not found',
    });
    return;
  }

  const countRow = await db.queryOne(
    'SELECT COUNT(*)::int AS c FROM document_files WHERE document_id = $1',
    [documentId]
  );
  const total = countRow?.c ?? 0;

  if (total <= 1) {
    res.status(400).json({
      success: false,
      message: 'Cannot remove the only file from a document',
    });
    return;
  }

  const fileRow = await db.queryOne('SELECT key FROM files WHERE id = $1', [att.file_id]);

  await db.query('BEGIN');
  try {
    if (att.is_main) {
      const successor = await db.queryOne(
        `SELECT id FROM document_files
         WHERE document_id = $1 AND id <> $2
         ORDER BY sort_order ASC, created_at ASC
         LIMIT 1`,
        [documentId, attachmentId]
      );
      if (successor) {
        await db.query('UPDATE document_files SET is_main = false WHERE document_id = $1', [
          documentId,
        ]);
        await db.query('UPDATE document_files SET is_main = true WHERE id = $1', [
          (successor as { id: string }).id,
        ]);
      }
    }

    await db.query('DELETE FROM document_files WHERE id = $1', [attachmentId]);
    await db.query('COMMIT');
  } catch (e) {
    await db.query('ROLLBACK');
    throw e;
  }

  if (fileRow?.key) {
    try {
      await deleteFile(fileRow.key as string);
    } catch (error) {
      console.error('Error deleting file from storage:', error);
    }
  }

  await db.query('DELETE FROM files WHERE id = $1', [att.file_id]);

  logger.info('Document attachment deleted', { documentId, attachmentId, userId });

  res.status(200).json({
    success: true,
    message: 'Attachment removed',
  });
};
