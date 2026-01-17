import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { DatabaseClient } from '@service/database';
import { getFilePath } from '@service/file-storage';
import fs from 'fs';
import path from 'path';

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
      f.key as file_key
    FROM documents d
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
      message: 'You do not have permission to download this document',
    });
    return;
  }

  const filePath = getFilePath(document.file_key);

  if (!fs.existsSync(filePath)) {
    res.status(404).json({
      success: false,
      message: 'File not found on server',
    });
    return;
  }

  // Increment download count
  await db.query(
    'UPDATE documents SET download_count = download_count + 1 WHERE id = $1',
    [id]
  );

  const fileName = document.title + path.extname(document.file_key);

  res.download(filePath, fileName, (err) => {
    if (err) {
      console.error('Error downloading file:', err);
    }
  });
};