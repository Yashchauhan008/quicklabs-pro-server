import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { DatabaseClient } from '@service/database';
import { getFilePath } from '@service/file-storage';
import fs from 'fs';
import path from 'path';
import archiver from 'archiver';
import {
  advisoryLockUser,
  incrementDailyDownloads,
  isStudentDownloadQuotaEnforced,
  isStudentRole,
  limits,
  selectDailyUsageForUpdate,
} from '@utils/studentQuota';

export const ValidationSchema = {
  params: z.object({
    id: z.string().uuid('Invalid document ID'),
  }),
};

function slugifyForFilename(title: string): string {
  const s = title
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 80);
  return s || 'document';
}

function zipEntryName(
  sortOrder: number,
  title: string,
  fileKey: string,
  used: Set<string>
): string {
  const ext = path.extname(path.basename(fileKey));
  const stem = slugifyForFilename(`${sortOrder + 1}_${title}`);
  const base = stem || `file_${sortOrder + 1}`;
  let name = `${base}${ext}`;
  let n = 1;
  while (used.has(name.toLowerCase())) {
    name = `${base}_${n}${ext}`;
    n += 1;
  }
  used.add(name.toLowerCase());
  return name;
}

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
    `SELECT d.id, d.title, d.visibility, d.uploaded_by
     FROM documents d
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

  const attachments = await db.queryMany(
    `SELECT df.sort_order, df.title, f.key
     FROM document_files df
     JOIN files f ON f.id = df.file_id
     WHERE df.document_id = $1
     ORDER BY df.sort_order, df.created_at`,
    [id]
  );

  if (!attachments.length) {
    res.status(404).json({
      success: false,
      message: 'No files attached to this document',
    });
    return;
  }

  for (const row of attachments) {
    const filePath = getFilePath(row.key as string);
    if (!fs.existsSync(filePath)) {
      res.status(500).json({
        success: false,
        message: 'One or more files are missing on the server',
      });
      return;
    }
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

  await db.query(
    'UPDATE documents SET download_count = download_count + 1 WHERE id = $1',
    [id]
  );

  const zipBase = slugifyForFilename(document.title as string);
  const asciiFallback = `${zipBase}.zip`;
  const encoded = encodeURIComponent(`${zipBase}.zip`);

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encoded}`
  );

  const archive = archiver('zip', { zlib: { level: 9 } });

  archive.pipe(res);

  const usedNames = new Set<string>();
  for (const row of attachments) {
    const filePath = getFilePath(row.key as string);
    const entryName = zipEntryName(
      row.sort_order as number,
      String(row.title ?? 'file'),
      row.key as string,
      usedNames
    );
    archive.file(filePath, { name: entryName });
  }

  await new Promise<void>((resolve, reject) => {
    archive.on('end', () => resolve());
    archive.on('error', (err) => reject(err));
    void archive.finalize();
  });
};
