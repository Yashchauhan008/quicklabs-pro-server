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
    category: z.string().optional(),
  }),
};

export const Controller = async (
  req: Request,
  res: Response,
  _next: NextFunction,
  db: DatabaseClient
): Promise<void> => {
  const { page, limit, search, category } = req.query as unknown as {
    page: number;
    limit: number;
    search?: string;
    category?: string;
  };

  const offset = (page - 1) * limit;

  const whereConditions = ['t.deleted_at IS NULL'];
  const params: unknown[] = [];
  let paramCount = 0;

  if (search) {
    paramCount += 1;
    params.push(`%${search}%`);
    whereConditions.push(`(t.title ILIKE $${paramCount} OR t.description ILIKE $${paramCount})`);
  }

  if (category) {
    paramCount += 1;
    params.push(category);
    whereConditions.push(`t.category = $${paramCount}`);
  }

  const whereClause = whereConditions.join(' AND ');

  const countResult = await db.queryOne(
    `SELECT COUNT(*) as total FROM tools t WHERE ${whereClause}`,
    params
  );

  const totalCount = parseInt(countResult.total, 10);

  params.push(limit, offset);
  const toolsRaw = await db.queryMany(
    `SELECT
      t.id,
      t.title,
      t.description,
      fl.key as logo_key,
      (
        SELECT COALESCE(
          array_agg(f.key ORDER BY array_position(t.banner_file_ids, f.id)),
          ARRAY[]::text[]
        )
        FROM files f
        WHERE f.id = ANY(COALESCE(t.banner_file_ids, '{}'::uuid[]))
      ) as banner_keys,
      t.banner_file_ids,
      t.link,
      t.category,
      t.status,
      t.created_at,
      t.updated_at
    FROM tools t
    LEFT JOIN files fl ON t.logo_file_id = fl.id
    WHERE ${whereClause}
    ORDER BY t.created_at DESC
    LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`,
    params
  );

  const tools = toolsRaw.map(tool => ({
    ...tool,
    logo_url: profilePicturePublicUrl(tool.logo_key),
    banner_urls: (tool.banner_keys || []).map((key: string) => profilePicturePublicUrl(key)),
    banner_file_ids: Array.isArray(tool.banner_file_ids) ? tool.banner_file_ids : [],
    logo_key: undefined,
    banner_keys: undefined,
  }));

  res.status(200).json({
    success: true,
    data: tools,
    pagination: {
      page,
      limit,
      total: totalCount,
      totalPages: Math.ceil(totalCount / limit),
    },
  });
};
