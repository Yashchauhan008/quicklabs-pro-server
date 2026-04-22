import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { DatabaseClient } from '@service/database';

export const ValidationSchema = {
  query: z.object({
    page: z.string().optional().default('1').transform((v) => parseInt(v, 10)),
    limit: z.string().optional().default('20').transform((v) => parseInt(v, 10)),
    search: z.string().optional(),
  }),
};

export const Controller = async (
  req: Request,
  res: Response,
  _next: NextFunction,
  db: DatabaseClient
): Promise<void> => {
  const { page, limit, search } = req.query as unknown as {
    page: number;
    limit: number;
    search?: string;
  };
  const offset = (page - 1) * limit;
  const where: string[] = ['b.deleted_at IS NULL'];
  const params: unknown[] = [];
  let idx = 0;

  if (search) {
    idx += 1;
    params.push(`%${search}%`);
    where.push(`b.name ILIKE $${idx}`);
  }
  const whereClause = where.join(' AND ');
  const count = await db.queryOne(
    `SELECT COUNT(*)::int AS total
     FROM branches b
     LEFT JOIN universities u ON u.id = b.university_id
     WHERE ${whereClause}`,
    params
  );
  const total = count?.total ?? 0;

  params.push(limit, offset);
  const data = await db.queryMany(
    `SELECT b.id, b.name, b.university_id, u.name AS university_name, b.created_at, b.updated_at
     FROM branches b
     LEFT JOIN universities u ON u.id = b.university_id
     WHERE ${whereClause}
     ORDER BY b.name ASC
     LIMIT $${idx + 1} OFFSET $${idx + 2}`,
    params
  );

  res.status(200).json({
    success: true,
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
};
