import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { DatabaseClient } from '@service/database';
import logger from '@service/logger';
import { deleteFile } from '@service/file-storage';

export const ValidationSchema = {
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
  const { permanent } = req.query;

  const existingDocument = await db.queryOne(
    'SELECT id, uploaded_by, file_id, title FROM documents WHERE id = $1 AND deleted_at IS NULL',
    [id]
  );

  if (!existingDocument) {
    res.status(404).json({
      success: false,
      message: 'Document not found',
    });
    return;
  }

  if (existingDocument.uploaded_by !== userId) {
    res.status(403).json({
      success: false,
      message: 'You are not authorized to delete this document',
    });
    return;
  }

  if (permanent === 'true') {
    const fileRecord = await db.queryOne(
      'SELECT key FROM files WHERE id = $1',
      [existingDocument.file_id]
    );
    
    if (fileRecord) {
      try {
        await deleteFile(fileRecord.key);
      } catch (error) {
        console.error('Error deleting file:', error);
      }

      await db.query('DELETE FROM files WHERE id = $1', [fileRecord.id]);
    }

    await db.query('DELETE FROM documents WHERE id = $1', [id]);

    logger.info('Document permanently deleted', {
      documentId: id,
      documentTitle: existingDocument.title,
      userId,
    });

    res.status(200).json({
      success: true,
      message: 'Document permanently deleted',
    });
  } else {
    await db.query(
      'UPDATE documents SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1',
      [id]
    );

    logger.info('Document soft deleted', {
      documentId: id,
      documentTitle: existingDocument.title,
      userId,
    });

    res.status(200).json({
      success: true,
      message: 'Document deleted successfully',
    });
  }
};