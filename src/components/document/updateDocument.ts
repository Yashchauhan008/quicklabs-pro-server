import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { DatabaseClient } from '@service/database';
import logger from '@service/logger';

export const ValidationSchema = {
  body: z.object({
    title: z
      .string()
      .min(2, 'Title must be at least 2 characters')
      .max(255, 'Title cannot exceed 255 characters')
      .trim()
      .optional(),
    description: z
      .string()
      .max(1000, 'Description cannot exceed 1000 characters')
      .trim()
      .optional(),
    visibility: z
      .enum(['PUBLIC', 'PRIVATE'], {
        message: 'Visibility must be either PUBLIC or PRIVATE',
      })
      .optional(),
    kind: z.enum(['informational', 'lab_solutions']).optional(),
    university_id: z.string().uuid().nullable().optional(),
    branch_id: z.string().uuid().nullable().optional(),
    batch_year: z.coerce.number().int().min(2000).max(2100).nullable().optional(),
    semester: z.coerce.number().int().min(1).max(12).nullable().optional(),
  }),
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
  const { title, description, visibility, kind, university_id, branch_id, batch_year, semester } = req.body;
  if (branch_id) {
    const branch = await db.queryOne(
      'SELECT id FROM branches WHERE id = $1 AND deleted_at IS NULL',
      [branch_id]
    );
    if (!branch) {
      res.status(400).json({ success: false, message: 'Invalid branch_id' });
      return;
    }
  }


  const existingDocument = await db.queryOne(
    'SELECT id, uploaded_by FROM documents WHERE id = $1 AND deleted_at IS NULL',
    [id]
  );

  if (!existingDocument) {
    res.status(404).json({
      success: false,
      message: 'Document not found',
    });
    return;
  }

  if (existingDocument.uploaded_by !== userId) {
    res.status(403).json({
      success: false,
      message: 'You are not authorized to update this document',
    });
    return;
  }

  const updates: string[] = [];
  const params: unknown[] = [];
  let paramCount = 0;

  if (title !== undefined) {
    paramCount += 1;
    params.push(title);
    updates.push(`title = $${paramCount}`);
  }

  if (description !== undefined) {
    paramCount += 1;
    params.push(description);
    updates.push(`description = $${paramCount}`);
  }

  if (visibility !== undefined) {
    paramCount += 1;
    params.push(visibility);
    updates.push(`visibility = $${paramCount}`);
  }

  if (kind !== undefined) {
    paramCount += 1;
    params.push(kind);
    updates.push(`kind = $${paramCount}`);
  }
  if (university_id !== undefined) {
    paramCount += 1;
    params.push(university_id);
    updates.push(`university_id = $${paramCount}`);
  }
  if (branch_id !== undefined) {
    paramCount += 1;
    params.push(branch_id);
    updates.push(`branch_id = $${paramCount}`);
  }
  if (batch_year !== undefined) {
    paramCount += 1;
    params.push(batch_year);
    updates.push(`batch_year = $${paramCount}`);
  }
  if (semester !== undefined) {
    paramCount += 1;
    params.push(semester);
    updates.push(`semester = $${paramCount}`);
  }

  if (updates.length === 0) {
    res.status(400).json({
      success: false,
      message: 'No fields to update',
    });
    return;
  }

  params.push(id);
  const document = await db.queryOne(
    `UPDATE documents SET ${updates.join(', ')} WHERE id = $${paramCount + 1} RETURNING *`,
    params
  );

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

  logger.info('Document updated successfully', {
    documentId: document.id,
    userId,
  });

  res.status(200).json({
    success: true,
    message: 'Document updated successfully',
    data: {
      ...document,
      files,
    },
  });
};
