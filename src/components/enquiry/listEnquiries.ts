import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { DatabaseClient } from '@service/database';

export const ValidationSchema = {
  query: z.object({
    page: z
      .string()
      .optional()
      .default('1')
      .transform((v) => parseInt(v, 10)),
    limit: z
      .string()
      .optional()
      .default('10')
      .transform((v) => parseInt(v, 10)),
    status: z.enum(['open', 'in_progress', 'resolved', 'closed']).optional(),
  }),
};

export const Controller = async (
  req: Request,
  res: Response,
  _next: NextFunction,
  db: DatabaseClient
): Promise<void> => {
  const userId = req.user?.userId;
  const { page, limit, status } = req.query as unknown as {
    page: number;
    limit: number;
    status?: string;
  };

  const offset = (page - 1) * limit;
  const params: unknown[] = [userId];
  let where = 'student_id = $1';
  let p = 1;

  if (status) {
    p += 1;
    params.push(status);
    where += ` AND status = $${p}`;
  }

  const countRow = await db.queryOne(
    `SELECT COUNT(*)::int AS total FROM enquiries WHERE ${where}`,
    params
  );
  const total = countRow?.total ?? 0;

  params.push(limit, offset);
  const rows = await db.queryMany(
    `SELECT id, student_id, title, message, status, created_at, updated_at
     FROM enquiries WHERE ${where}
     ORDER BY created_at DESC
     LIMIT $${p + 1} OFFSET $${p + 2}`,
    params
  );

  res.status(200).json({
    success: true,
    data: rows,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
};
