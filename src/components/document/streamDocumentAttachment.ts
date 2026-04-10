import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { DatabaseClient } from '@service/database';
import { getFilePath } from '@service/file-storage';
import fs from 'fs';
import {
  advisoryLockUser,
  incrementDailyDownloads,
  isStudentDownloadQuotaEnforced,
  isStudentRole,
  limits,
  selectDailyUsageForUpdate,
} from '@utils/studentQuota';
import { attachmentDownloadBasename } from '@utils/documentFileTitles';

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
  const user = req.user;
  const userId = user?.userId;
  const role = user?.role;
  const { id: documentId, attachmentId } = req.params;

  const row = await db.queryOne(
    `SELECT d.id, d.visibility, d.uploaded_by, f.key, df.title
     FROM document_files df
     JOIN documents d ON d.id = df.document_id AND d.deleted_at IS NULL
     JOIN files f ON f.id = df.file_id
     WHERE df.id = $1 AND df.document_id = $2`,
    [attachmentId, documentId]
  );

  if (!row) {
    res.status(404).json({
      success: false,
      message: 'Attachment not found',
    });
    return;
  }

  if (row.visibility === 'PRIVATE' && row.uploaded_by !== userId) {
    res.status(403).json({
      success: false,
      message: 'You do not have permission to access this file',
    });
    return;
  }

  const filePath = getFilePath(row.key as string);

  if (!fs.existsSync(filePath)) {
    res.status(404).json({
      success: false,
      message: 'File not found on server',
    });
    return;
  }

  if (isStudentRole(role) && isStudentDownloadQuotaEnforced()) {
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

  const downloadName = attachmentDownloadBasename(
    String(row.title ?? 'file'),
    row.key as string
  );

  res.download(filePath, downloadName, (err) => {
    if (err) {
      console.error('Error streaming attachment:', err);
    }
  });
};
