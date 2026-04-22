import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { DatabaseClient } from '@service/database';
import { profilePicturePublicUrl } from '@utils/profilePictureUrl';

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

  const where: string[] = ['u.deleted_at IS NULL'];
  const params: unknown[] = [];
  let idx = 0;

  if (search) {
    idx += 1;
    params.push(`%${search}%`);
    where.push(`u.name ILIKE $${idx}`);
  }

  const whereClause = where.join(' AND ');
  const count = await db.queryOne(
    `SELECT COUNT(*)::int AS total FROM universities u WHERE ${whereClause}`,
    params
  );
  const total = count?.total ?? 0;

  params.push(limit, offset);
  const data = await db.queryMany(
    `SELECT u.id, u.name, u.created_at, u.updated_at, f.key AS logo_key,
      (SELECT COUNT(*)::int FROM branches b WHERE b.university_id = u.id AND b.deleted_at IS NULL) AS branch_count
     FROM universities u
     LEFT JOIN files f ON f.id = u.logo_file_id
     WHERE ${whereClause}
     ORDER BY u.name ASC
     LIMIT $${idx + 1} OFFSET $${idx + 2}`,
    params
  );

  const mapped = data.map((row: Record<string, unknown>) => {
    const { logo_key: logoKey, ...rest } = row;
    return {
      ...rest,
      logo_url: profilePicturePublicUrl(logoKey as string | null | undefined),
    };
  });

  res.status(200).json({
    success: true,
    data: mapped,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
};
