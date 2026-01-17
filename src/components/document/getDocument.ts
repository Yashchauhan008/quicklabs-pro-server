import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { DatabaseClient } from '@service/database';

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

  const document = await db.queryOne(
    `SELECT 
      d.*,
      s.name as subject_name,
      u.name as uploader_name,
      u.email as uploader_email,
      f.key as file_key,
      f.size as file_size,
      f.mime_type as file_mime_type
    FROM documents d
    LEFT JOIN subjects s ON d.subject_id = s.id
    LEFT JOIN users u ON d.uploaded_by = u.id
    LEFT JOIN files f ON d.file_id = f.id
    WHERE d.id = $1 AND d.deleted_at IS NULL`,
    [id]
  );

  if (!document) {
    res.status(404).json({
      success: false,
      message: 'Document not found',
    });
    return;
  }

  if (document.visibility === 'PRIVATE' && document.uploaded_by !== userId) {
    res.status(403).json({
      success: false,
      message: 'You do not have permission to access this document',
    });
    return;
  }

  res.status(200).json({
    success: true,
    data: document,
  });
};