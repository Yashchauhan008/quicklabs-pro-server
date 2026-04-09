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
    sort: z.enum(['recent', 'priority']).optional().default('recent'),
  }),
};

export const Controller = async (
  req: Request,
  res: Response,
  _next: NextFunction,
  db: DatabaseClient
): Promise<void> => {
  const userId = req.user?.userId;
  const { page, limit, status, sort } = req.query as unknown as {
    page: number;
    limit: number;
    status?: string;
    sort: 'recent' | 'priority';
  };

  const offset = (page - 1) * limit;
  const countParams: unknown[] = [];
  let countWhere = '1 = 1';

  if (status) {
    countParams.push(status);
    countWhere += ' AND e.status = $1';
  }

  const countRow = await db.queryOne(
    `SELECT COUNT(*)::int AS total FROM enquiries e WHERE ${countWhere}`,
    countParams
  );
  const total = countRow?.total ?? 0;

  const params: unknown[] = [userId, ...countParams, limit, offset];
  const listWhere = status ? '1 = 1 AND e.status = $2' : '1 = 1';
  const limitParamPosition = params.length - 1;
  const offsetParamPosition = params.length;
  const orderBy =
    sort === 'priority'
      ? `COALESCE(v.upvotes, 0) - COALESCE(v.downvotes, 0) DESC, e.created_at DESC`
      : 'e.created_at DESC';

  const rows = await db.queryMany(
    `SELECT
      e.id,
      e.student_id,
      e.title,
      e.description,
      e.topic,
      e.subject_id,
      e.document_id,
      e.is_private,
      e.status,
      e.created_at,
      e.updated_at,
      (e.student_id = $1) AS is_owner,
      COALESCE(v.upvotes, 0)::int AS upvotes,
      COALESCE(v.downvotes, 0)::int AS downvotes,
      (COALESCE(v.upvotes, 0) - COALESCE(v.downvotes, 0))::int AS score,
      uv.vote::int AS my_vote
     FROM enquiries e
     LEFT JOIN (
       SELECT
        enquiry_id,
        COUNT(*) FILTER (WHERE vote = 1) AS upvotes,
        COUNT(*) FILTER (WHERE vote = -1) AS downvotes
       FROM enquiry_votes
       GROUP BY enquiry_id
     ) v ON v.enquiry_id = e.id
     LEFT JOIN enquiry_votes uv
      ON uv.enquiry_id = e.id
      AND uv.student_id = $1
     WHERE ${listWhere}
     ORDER BY ${orderBy}
     LIMIT $${limitParamPosition} OFFSET $${offsetParamPosition}`,
    params
  );

  res.status(200).json({
    success: true,
    data: rows,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
};
