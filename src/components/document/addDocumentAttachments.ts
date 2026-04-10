import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { DatabaseClient } from '@service/database';
import logger from '@service/logger';
import { deleteFile, saveFile } from '@service/file-storage';
import fs from 'fs';
import {
  advisoryLockUser,
  incrementDailyUploads,
  isStudentRole,
  limits,
  selectDailyUsageForUpdate,
} from '@utils/studentQuota';
import { parseAndValidateFileTitles } from '@utils/documentFileTitles';

export const ValidationSchema = {
  params: z.object({
    id: z.string().uuid('Invalid document ID'),
  }),
  body: z.object({
    main_index: z.coerce.number().int().min(0).optional(),
    file_descriptions: z.string().optional(),
    file_titles: z
      .string({ message: 'file_titles is required' })
      .min(1, 'file_titles is required'),
  }),
};

function parseFileDescriptions(raw: unknown): (string | null)[] {
  if (raw == null || raw === '') return [];
  if (typeof raw !== 'string') return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) => {
      if (item == null) return null;
      if (typeof item !== 'string') return null;
      const t = item.trim();
      return t.length ? t : null;
    });
  } catch {
    return [];
  }
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
  const { id: documentId } = req.params;
  const files = req.files as Express.Multer.File[] | undefined;
  const { main_index, file_descriptions, file_titles } = req.body as z.infer<
    typeof ValidationSchema.body
  >;

  const cleanupTemps = (): void => {
    if (!files?.length) return;
    for (const f of files) {
      if (f?.path && fs.existsSync(f.path)) {
        fs.unlinkSync(f.path);
      }
    }
  };

  const cleanupKeys = async (keys: string[]): Promise<void> => {
    for (const k of keys) {
      await deleteFile(k).catch(() => undefined);
    }
  };

  if (!files?.length) {
    res.status(400).json({
      success: false,
      message: 'At least one file is required',
    });
    return;
  }

  if (!userId || !role) {
    cleanupTemps();
    res.status(401).json({
      success: false,
      message: 'Unauthorized request',
    });
    return;
  }

  const savedKeys: string[] = [];

  try {
    const doc = await db.queryOne(
      'SELECT id, uploaded_by FROM documents WHERE id = $1 AND deleted_at IS NULL',
      [documentId]
    );

    if (!doc) {
      cleanupTemps();
      res.status(404).json({
        success: false,
        message: 'Document not found',
      });
      return;
    }

    if (doc.uploaded_by !== userId) {
      cleanupTemps();
      res.status(403).json({
        success: false,
        message: 'You are not authorized to update this document',
      });
      return;
    }

    const countRow = await db.queryOne(
      'SELECT COUNT(*)::int AS c FROM document_files WHERE document_id = $1',
      [documentId]
    );
    const existingCount = countRow?.c ?? 0;

    if (existingCount + files.length > 10) {
      cleanupTemps();
      res.status(400).json({
        success: false,
        message: `You can attach at most 10 files per document (${existingCount} already attached)`,
      });
      return;
    }

    const mainIdxNew = main_index;
    if (mainIdxNew !== undefined && (mainIdxNew < 0 || mainIdxNew >= files.length)) {
      cleanupTemps();
      res.status(400).json({
        success: false,
        message: 'main_index must refer to one of the newly uploaded files',
      });
      return;
    }

    const descList = parseFileDescriptions(file_descriptions);
    const titlesParsed = parseAndValidateFileTitles(file_titles, files.length);
    if (!titlesParsed.ok) {
      cleanupTemps();
      res.status(400).json({
        success: false,
        message: titlesParsed.message,
      });
      return;
    }
    const titleList = titlesParsed.titles;

    const maxSortRow = await db.queryOne(
      'SELECT COALESCE(MAX(sort_order), -1)::int AS m FROM document_files WHERE document_id = $1',
      [documentId]
    );
    let sortBase = (maxSortRow?.m ?? -1) + 1;

    const runAdd = async (): Promise<void> => {
      const newAttachmentIds: string[] = [];

      for (let i = 0; i < files.length; i += 1) {
        const file = files[i];
        const newFileName = await saveFile(file.filename);
        savedKeys.push(newFileName);
        const fileRecord = await db.queryOne(
          'INSERT INTO files (key, size, mime_type) VALUES ($1, $2, $3) RETURNING id',
          [newFileName, file.size, file.mimetype]
        );
        if (!fileRecord) {
          throw new Error('Failed to create file record');
        }
        const fileDesc = descList[i] ?? null;
        const fileTitle = titleList[i];
        const dfRow = await db.queryOne(
          `INSERT INTO document_files (document_id, file_id, title, is_main, description, sort_order)
           VALUES ($1, $2, $3, false, $4, $5)
           RETURNING id`,
          [documentId, (fileRecord as { id: string }).id, fileTitle, fileDesc, sortBase]
        );
        if (!dfRow) {
          throw new Error('Failed to create attachment row');
        }
        newAttachmentIds.push((dfRow as { id: string }).id);
        sortBase += 1;
      }

      if (mainIdxNew !== undefined) {
        await db.query('UPDATE document_files SET is_main = false WHERE document_id = $1', [
          documentId,
        ]);
        await db.query('UPDATE document_files SET is_main = true WHERE id = $1', [
          newAttachmentIds[mainIdxNew],
        ]);
      }
    };

    if (isStudentRole(role)) {
      await db.query('BEGIN');
      try {
        await advisoryLockUser(db, userId);
        const usage = await selectDailyUsageForUpdate(db, userId);
        const uploads = usage?.uploads_count ?? 0;
        const maxU = limits().maxUploadsPerDay;
        if (uploads + files.length > maxU) {
          await db.query('ROLLBACK');
          cleanupTemps();
          res.status(400).json({
            success: false,
            message: `Daily upload limit reached (${maxU} files per day)`,
          });
          return;
        }

        await runAdd();

        for (let u = 0; u < files.length; u += 1) {
          await incrementDailyUploads(db, userId);
        }

        await db.query('COMMIT');
      } catch (innerErr) {
        await db.query('ROLLBACK');
        await cleanupKeys(savedKeys);
        throw innerErr;
      }
    } else {
      await db.query('BEGIN');
      try {
        await runAdd();
        await db.query('COMMIT');
      } catch (innerErr) {
        await db.query('ROLLBACK');
        await cleanupKeys(savedKeys);
        throw innerErr;
      }
    }

    const attachmentRows = await db.queryMany(
      `SELECT df.id, df.file_id, df.title, df.is_main, df.description, df.sort_order,
              f.key AS file_key, f.size AS file_size, f.mime_type AS file_mime_type
       FROM document_files df
       JOIN files f ON f.id = df.file_id
       WHERE df.document_id = $1
       ORDER BY df.sort_order, df.created_at`,
      [documentId]
    );

    logger.info('Document attachments added', {
      documentId,
      added: files.length,
      userId,
    });

    res.status(201).json({
      success: true,
      message: 'Files added successfully',
      data: { files: attachmentRows },
    });
  } catch (error) {
    await cleanupKeys(savedKeys);
    cleanupTemps();
    throw error;
  }
};
