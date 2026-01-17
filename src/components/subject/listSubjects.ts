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
    search: z.string().optional(),
    created_by: z.string().uuid().optional(),
  }),
};

export const Controller = async (
  req: Request,
  res: Response,
  _next: NextFunction,
  db: DatabaseClient
): Promise<void> => {
  const { page, limit, search, created_by } = req.query as any;

  const offset = (page - 1) * limit;

  let whereConditions = ['s.deleted_at IS NULL'];
  const params: any[] = [];
  let paramCount = 0;

  if (search) {
    paramCount++;
    params.push(`%${search}%`);
    whereConditions.push(`(s.name ILIKE $${paramCount} OR s.description ILIKE $${paramCount})`);
  }

  if (created_by) {
    paramCount++;
    params.push(created_by);
    whereConditions.push(`s.created_by = $${paramCount}`);
  }

  const whereClause = whereConditions.join(' AND ');

  // Get total count
  const countResult = await db.queryOne(
    `SELECT COUNT(*) as total FROM subjects s WHERE ${whereClause}`,
    params
  );

  const totalCount = parseInt(countResult.total, 10);

  // Get subjects with creator info and document count
  params.push(limit, offset);
  const subjects = await db.queryMany(
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
    WHERE ${whereClause}
    GROUP BY s.id, u.name, u.email
    ORDER BY s.created_at DESC
    LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`,
    params
  );

  res.status(200).json({
    success: true,
    data: subjects,
    pagination: {
      page,
      limit,
      total: totalCount,
      totalPages: Math.ceil(totalCount / limit),
    },
  });
};