import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { DatabaseClient } from '@service/database';

export const ValidationSchema = {
  query: z.object({
    page: z
      .string()
      .optional()
      .default('1')
      .transform((val) => parseInt(val, 10)),
    limit: z
      .string()
      .optional()
      .default('10')
      .transform((val) => parseInt(val, 10)),
    subject_id: z.string().uuid().optional(),
    visibility: z.enum(['PUBLIC', 'PRIVATE']).optional(),
    uploaded_by: z.string().uuid().optional(),
    search: z.string().optional(),
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

  const { page, limit, subject_id, visibility, uploaded_by, search } = req.query as any;

  const offset = (page - 1) * limit;

  let whereConditions = ['d.deleted_at IS NULL'];
  const params: any[] = [];
  let paramCount = 0;

  if (subject_id) {
    paramCount++;
    params.push(subject_id);
    whereConditions.push(`d.subject_id = $${paramCount}`);
  }

  if (visibility) {
    paramCount++;
    params.push(visibility);
    whereConditions.push(`d.visibility = $${paramCount}`);
  } else {
    paramCount++;
    params.push(userId);
    whereConditions.push(`(d.visibility = 'PUBLIC' OR d.uploaded_by = $${paramCount})`);
  }

  if (uploaded_by) {
    paramCount++;
    params.push(uploaded_by);
    whereConditions.push(`d.uploaded_by = $${paramCount}`);
  }

  if (search) {
    paramCount++;
    params.push(`%${search}%`);
    whereConditions.push(`(d.title ILIKE $${paramCount} OR d.description ILIKE $${paramCount})`);
  }

  const whereClause = whereConditions.join(' AND ');

  const countResult = await db.queryOne(
    `SELECT COUNT(*) as total FROM documents d WHERE ${whereClause}`,
    params
  );

  const totalCount = parseInt(countResult.total, 10);

  params.push(limit, offset);
  const documents = await db.queryMany(
    `SELECT 
      d.id,
      d.title,
      d.description,
      d.visibility,
      d.download_count,
      d.created_at,
      d.updated_at,
      s.name as subject_name,
      s.id as subject_id,
      u.name as uploader_name,
      u.email as uploader_email,
      f.key as file_key,
      f.size as file_size,
      f.mime_type as file_mime_type
    FROM documents d
    LEFT JOIN subjects s ON d.subject_id = s.id
    LEFT JOIN users u ON d.uploaded_by = u.id
    LEFT JOIN files f ON d.file_id = f.id
    WHERE ${whereClause}
    ORDER BY d.created_at DESC
    LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`,
    params
  );

  res.status(200).json({
    success: true,
    data: documents,
    pagination: {
      page,
      limit,
      total: totalCount,
      totalPages: Math.ceil(totalCount / limit),
    },
  });
};
