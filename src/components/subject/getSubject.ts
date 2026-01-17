import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { DatabaseClient } from '@service/database';

export const ValidationSchema = {
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
  const { id } = req.params;

  const subject = await db.queryOne(
    `SELECT 
      s.id,
      s.name,
      s.description,
      s.created_by,
      s.created_at,
      s.updated_at,
      u.name as creator_name,
      u.email as creator_email,
      COUNT(d.id) as document_count
    FROM subjects s
    LEFT JOIN users u ON s.created_by = u.id
    LEFT JOIN documents d ON s.id = d.subject_id AND d.deleted_at IS NULL
    WHERE s.id = $1 AND s.deleted_at IS NULL
    GROUP BY s.id, u.name, u.email`,
    [id]
  );

  if (!subject) {
    res.status(404).json({
      success: false,
      message: 'Subject not found',
    });
    return;
  }

  // Get recent documents for this subject
  const user = (req as any).user;
  const userId = user?.userId;

  const recentDocuments = await db.queryMany(
    `SELECT 
      d.id,
      d.title,
      d.visibility,
      d.download_count,
      d.created_at,
      u.name as uploader_name,
      f.key as file_key,
      f.size as file_size,
      f.mime_type as file_mime_type
    FROM documents d
    LEFT JOIN users u ON d.uploaded_by = u.id
    LEFT JOIN files f ON d.file_id = f.id
    WHERE d.subject_id = $1 
      AND d.deleted_at IS NULL
      AND (d.visibility = 'PUBLIC' OR d.uploaded_by = $2)
    ORDER BY d.created_at DESC
    LIMIT 5`,
    [id, userId]
  );

  res.status(200).json({
    success: true,
    data: {
      ...subject,
      recent_documents: recentDocuments,
    },
  });
};
