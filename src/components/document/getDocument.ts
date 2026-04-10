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
  const user = req.user;
  const userId = user?.userId;
  const { id } = req.params;

  const document = await db.queryOne(
    `SELECT
      d.id,
      d.subject_id,
      d.title,
      d.description,
      d.kind,
      d.visibility,
      d.uploaded_by,
      d.download_count,
      d.created_at,
      d.updated_at,
      d.deleted_at,
      s.name as subject_name,
      u.name as uploader_name,
      u.email as uploader_email,
      (SELECT COALESCE(ROUND(AVG(dr.stars)::numeric, 2), 0) FROM document_ratings dr WHERE dr.document_id = d.id) AS rating_avg,
      (SELECT COUNT(*)::int FROM document_ratings dr WHERE dr.document_id = d.id) AS rating_count
    FROM documents d
    LEFT JOIN subjects s ON d.subject_id = s.id
    LEFT JOIN users u ON d.uploaded_by = u.id
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

  const files = await db.queryMany(
    `SELECT
      df.id,
      df.file_id,
      df.title,
      df.is_main,
      df.description,
      df.sort_order,
      f.key as file_key,
      f.size as file_size,
      f.mime_type as file_mime_type
    FROM document_files df
    JOIN files f ON f.id = df.file_id
    WHERE df.document_id = $1
    ORDER BY df.sort_order ASC, df.created_at ASC`,
    [id]
  );

  res.status(200).json({
    success: true,
    data: {
      ...document,
      files,
    },
  });
};
