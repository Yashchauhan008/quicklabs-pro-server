import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { DatabaseClient } from '@service/database';
import { getFilePath } from '@service/file-storage';
import fs from 'fs';
import path from 'path';
import {
  advisoryLockUser,
  incrementDailyDownloads,
  isStudentRole,
  limits,
  selectDailyUsageForUpdate,
} from '@utils/studentQuota';

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
  const role = user?.role;
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

  if (isStudentRole(role)) {
    await db.query('BEGIN');
    try {
      await advisoryLockUser(db, userId!);
      const usage = await selectDailyUsageForUpdate(db, userId!);
      const downloads = usage?.downloads_count ?? 0;
      if (downloads >= limits().maxDownloadsPerDay) {
        await db.query('ROLLBACK');
        res.status(429).json({
          success: false,
          message: `Daily download limit reached (${limits().maxDownloadsPerDay} downloads per day)`,
        });
        return;
      }
      await incrementDailyDownloads(db, userId!);
      await db.query('COMMIT');
    } catch (err) {
      await db.query('ROLLBACK');
      throw err;
    }
  }

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
