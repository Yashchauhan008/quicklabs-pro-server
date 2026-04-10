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

export const ValidationSchema = {
  body: z.object({
    subject_id: z.string().uuid('Invalid subject ID'),
    title: z
      .string({ message: 'Title is required' })
      .min(2, 'Title must be at least 2 characters')
      .max(255, 'Title cannot exceed 255 characters')
      .trim(),
    description: z
      .string()
      .max(1000, 'Description cannot exceed 1000 characters')
      .trim()
      .optional(),
    visibility: z
      .enum(['PUBLIC', 'PRIVATE'], {
        message: 'Visibility must be either PUBLIC or PRIVATE',
      })
      .optional()
      .default('PRIVATE'),
    kind: z.enum(['informational', 'lab_solutions']).optional().default('informational'),
    main_index: z.coerce.number().int().min(0).optional(),
    file_descriptions: z.string().optional(),
    file_titles: z
      .string({ message: 'file_titles is required' })
      .min(1, 'file_titles is required'),
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
  const files = req.files as Express.Multer.File[] | undefined;

  const { subject_id, title, description, visibility, kind, main_index, file_descriptions, file_titles } =
    req.body as z.infer<typeof ValidationSchema.body>;

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

  if (files.length > 10) {
    cleanupTemps();
    res.status(400).json({
      success: false,
      message: 'A maximum of 10 files per document is allowed',
    });
    return;
  }

  const mainIdx = main_index ?? 0;
  if (mainIdx < 0 || mainIdx >= files.length) {
    cleanupTemps();
    res.status(400).json({
      success: false,
      message: 'main_index must be between 0 and the number of files minus 1',
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
    const subject = await db.queryOne(
      'SELECT id FROM subjects WHERE id = $1 AND deleted_at IS NULL',
      [subject_id]
    );

    if (!subject) {
      cleanupTemps();
      res.status(404).json({
        success: false,
        message: 'Subject not found',
      });
      return;
    }

    const runUpload = async (): Promise<Record<string, unknown>> => {
      const fileRecords: { id: string; key: string; size: number | null; mime_type: string | null }[] =
        [];

      for (const file of files) {
        const newFileName = await saveFile(file.filename);
        savedKeys.push(newFileName);
        const fileRecord = await db.queryOne(
          'INSERT INTO files (key, size, mime_type) VALUES ($1, $2, $3) RETURNING id, key, size, mime_type',
          [newFileName, file.size, file.mimetype]
        );
        if (!fileRecord) {
          throw new Error('Failed to create file record');
        }
        fileRecords.push(fileRecord as typeof fileRecords[0]);
      }

      const document = await db.queryOne(
        `INSERT INTO documents (subject_id, title, description, visibility, uploaded_by, kind)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, subject_id, title, description, visibility, uploaded_by, kind,
                   download_count, created_at, updated_at`,
        [subject_id, title, description || null, visibility || 'PRIVATE', userId, kind]
      );

      if (!document) {
        throw new Error('Failed to create document');
      }

      const docId = (document as { id: string }).id;

      for (let i = 0; i < fileRecords.length; i += 1) {
        const fr = fileRecords[i];
        const fileDesc = descList[i] ?? null;
        const fileTitle = titleList[i];
        const isMain = i === mainIdx;
        await db.query(
          `INSERT INTO document_files (document_id, file_id, title, is_main, description, sort_order)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [docId, fr.id, fileTitle, isMain, fileDesc, i]
        );
      }

      const attachmentRows = await db.queryMany(
        `SELECT df.id, df.file_id, df.title, df.is_main, df.description, df.sort_order,
                f.key AS file_key, f.size AS file_size, f.mime_type AS file_mime_type
         FROM document_files df
         JOIN files f ON f.id = df.file_id
         WHERE df.document_id = $1
         ORDER BY df.sort_order, df.created_at`,
        [docId]
      );

      return { ...document, files: attachmentRows };
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

        const data = await runUpload();

        for (let u = 0; u < files.length; u += 1) {
          await incrementDailyUploads(db, userId);
        }

        await db.query('COMMIT');

        logger.info('Document uploaded successfully', {
          documentId: (data as { id: string }).id,
          fileCount: files.length,
          subjectId: subject_id,
          userId,
        });

        res.status(201).json({
          success: true,
          message: 'Document uploaded successfully',
          data,
        });
      } catch (innerErr) {
        await db.query('ROLLBACK');
        await cleanupKeys(savedKeys);
        throw innerErr;
      }
      return;
    }

    await db.query('BEGIN');
    try {
      const data = await runUpload();
      await db.query('COMMIT');

      logger.info('Document uploaded successfully', {
        documentId: (data as { id: string }).id,
        fileCount: files.length,
        subjectId: subject_id,
        userId,
      });

      res.status(201).json({
        success: true,
        message: 'Document uploaded successfully',
        data,
      });
    } catch (innerErr) {
      await db.query('ROLLBACK');
      await cleanupKeys(savedKeys);
      throw innerErr;
    }
  } catch (error) {
    await cleanupKeys(savedKeys);
    cleanupTemps();
    throw error;
  }
};
