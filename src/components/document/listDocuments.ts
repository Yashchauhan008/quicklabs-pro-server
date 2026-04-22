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
    subject_id: z.string().uuid().optional(),
    kind: z.enum(['informational', 'lab_solutions']).optional(),
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
  const user = req.user;
  const userId = user?.userId;

  const { page, limit, subject_id, kind, visibility, uploaded_by, search } =
    req.query as unknown as {
      page: number;
      limit: number;
      subject_id?: string;
      kind?: 'informational' | 'lab_solutions';
      visibility?: 'PUBLIC' | 'PRIVATE';
      uploaded_by?: string;
      search?: string;
    };

  const offset = (page - 1) * limit;

  const whereConditions = ['d.deleted_at IS NULL'];
  const params: unknown[] = [];
  let paramCount = 0;

  if (subject_id) {
    paramCount += 1;
    params.push(subject_id);
    whereConditions.push(`d.subject_id = $${paramCount}`);
  }

  if (kind) {
    paramCount += 1;
    params.push(kind);
    whereConditions.push(`d.kind = $${paramCount}`);
  }

  if (visibility) {
    paramCount += 1;
    params.push(visibility);
    whereConditions.push(`d.visibility = $${paramCount}`);
  } else {
    paramCount += 1;
    params.push(userId);
    whereConditions.push(`(d.visibility = 'PUBLIC' OR d.uploaded_by = $${paramCount})`);
  }

  if (uploaded_by) {
    paramCount += 1;
    params.push(uploaded_by);
    whereConditions.push(`d.uploaded_by = $${paramCount}`);
  }

  if (search) {
    paramCount += 1;
    params.push(`%${search}%`);
    whereConditions.push(`(d.title ILIKE $${paramCount} OR d.description ILIKE $${paramCount})`);
  }

  const whereClause = whereConditions.join(' AND ');

  const countResult = await db.queryOne(
    `SELECT COUNT(*) as total FROM documents d
     LEFT JOIN subjects s ON d.subject_id = s.id
     WHERE ${whereClause}`,
    params
  );

  const totalCount = parseInt(countResult.total, 10);

  params.push(limit, offset);
  const documents = await db.queryMany(
    `SELECT
      d.id,
      d.title,
      d.description,
      d.kind,
      d.visibility,
      d.uploaded_by AS uploader_id,
      d.download_count,
      d.university_id,
      d.branch_id,
      d.batch_year,
      d.semester,
      d.created_at,
      d.updated_at,
      s.name AS subject_name,
      s.id AS subject_id,
      u.name AS uploader_name,
      u.email AS uploader_email,
      upf.key AS uploader_profile_picture_key,
      f.key AS file_key,
      df.title AS file_name,
      f.size AS file_size,
      f.mime_type AS file_mime_type,
      uni.name AS university_name,
      br.name AS branch_name,
      (SELECT COUNT(*)::int FROM document_files df_c WHERE df_c.document_id = d.id) AS file_count,
      (SELECT COALESCE(ROUND(AVG(dr.stars)::numeric, 2), 0) FROM document_ratings dr WHERE dr.document_id = d.id) AS rating_avg,
      (SELECT COUNT(*)::int FROM document_ratings dr WHERE dr.document_id = d.id) AS rating_count
    FROM documents d
    LEFT JOIN subjects s ON d.subject_id = s.id
    LEFT JOIN users u ON d.uploaded_by = u.id
    LEFT JOIN files upf ON upf.id = u.profile_picture_file_id
    LEFT JOIN document_files df ON df.document_id = d.id AND df.is_main = true
    LEFT JOIN files f ON df.file_id = f.id
    LEFT JOIN universities uni ON uni.id = d.university_id
    LEFT JOIN branches br ON br.id = d.branch_id
    WHERE ${whereClause}
    ORDER BY d.created_at DESC
    LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`,
    params
  );

  const data = documents.map((row: Record<string, unknown>) => {
    const { uploader_profile_picture_key: key, ...rest } = row;
    return {
      ...rest,
      uploader_profile_picture_url: profilePicturePublicUrl(key as string | null | undefined),
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
