import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { DatabaseClient } from '@service/database';
import { profilePicturePublicUrl } from '@utils/profilePictureUrl';

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
  const { page, limit, search, created_by } = req.query as unknown as {
    page: number;
    limit: number;
    search?: string;
    created_by?: string;
  };

  const offset = (page - 1) * limit;

  const whereConditions = ['s.deleted_at IS NULL'];
  const params: unknown[] = [];
  let paramCount = 0;

  if (search) {
    paramCount += 1;
    params.push(`%${search}%`);
    whereConditions.push(`(s.name ILIKE $${paramCount} OR s.description ILIKE $${paramCount})`);
  }

  if (created_by) {
    paramCount += 1;
    params.push(created_by);
    whereConditions.push(`s.created_by = $${paramCount}`);
  }

  const whereClause = whereConditions.join(' AND ');

  const countResult = await db.queryOne(
    `SELECT COUNT(*) as total FROM subjects s WHERE ${whereClause}`,
    params
  );

  const totalCount = parseInt(countResult.total, 10);

  params.push(limit, offset);
  const subjects = await db.queryMany(
    `SELECT
      s.id,
      s.name,
      s.description,
      bf.key AS banner_key,
      s.created_by,
      s.created_at,
      s.updated_at,
      u.id AS creator_id,
      u.name AS creator_name,
      u.email AS creator_email,
      cpf.key AS creator_profile_picture_key,
      COUNT(d.id) AS document_count
    FROM subjects s
    LEFT JOIN users u ON s.created_by = u.id
    LEFT JOIN files bf ON bf.id = s.banner_file_id
    LEFT JOIN files cpf ON cpf.id = u.profile_picture_file_id
    LEFT JOIN documents d ON s.id = d.subject_id AND d.deleted_at IS NULL
    WHERE ${whereClause}
    GROUP BY s.id, s.name, s.description, s.created_by, s.created_at, s.updated_at,
      u.id, u.name, u.email, cpf.key, bf.key
    ORDER BY s.created_at DESC
    LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`,
    params
  );

  const data = subjects.map((row: Record<string, unknown>) => {
    const { creator_profile_picture_key: key, banner_key: bannerKey, ...rest } = row;
    return {
      ...rest,
      creator_profile_picture_url: profilePicturePublicUrl(key as string | null | undefined),
      banner_url: profilePicturePublicUrl(bannerKey as string | null | undefined),
    };
  });

  res.status(200).json({
    success: true,
    data,
    pagination: {
      page,
      limit,
      total: totalCount,
      totalPages: Math.ceil(totalCount / limit),
    },
  });
};
