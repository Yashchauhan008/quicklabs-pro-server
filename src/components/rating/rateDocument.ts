import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { DatabaseClient } from '@service/database';
import logger from '@service/logger';
import { QueryResult } from 'pg';

export const ValidationSchema = {
  params: z.object({
    document_id: z.string().uuid('Invalid document ID'),
  }),
  body: z.object({
    stars: z.coerce.number().int().min(1).max(5),
  }),
};

export const Controller = async (
  req: Request,
  res: Response,
  _next: NextFunction,
  db: DatabaseClient
): Promise<void> => {
  const userId = req.user?.userId;
  const { document_id } = req.params;
  const { stars } = req.body;

  const document = await db.queryOne(
    `SELECT id, visibility, uploaded_by FROM documents WHERE id = $1 AND deleted_at IS NULL`,
    [document_id]
  );

  if (!document) {
    res.status(404).json({ success: false, message: 'Document not found' });
    return;
  }

  if (document.visibility === 'PRIVATE' && document.uploaded_by !== userId) {
    res.status(403).json({ success: false, message: 'You cannot rate this document' });
    return;
  }

  if (document.uploaded_by === userId) {
    res.status(400).json({ success: false, message: 'You cannot rate your own document' });
    return;
  }

  let result: QueryResult;
  try {
    result = await db.query(
      `INSERT INTO document_ratings (document_id, rated_by, stars)
       VALUES ($1, $2, $3)
       RETURNING id, document_id, rated_by, stars, created_at`,
      [document_id, userId, stars]
    );
  } catch (err: unknown) {
    const code = err && typeof err === 'object' && 'code' in err ? (err as { code: string }).code : '';
    if (code === '23505') {
      res.status(409).json({
        success: false,
        message: 'You have already rated this document',
      });
      return;
    }
    throw err;
  }

  const row = result.rows[0];
  logger.info('Document rated', { documentId: document_id, userId });

  res.status(201).json({
    success: true,
    message: 'Rating recorded',
    data: row,
  });
};
