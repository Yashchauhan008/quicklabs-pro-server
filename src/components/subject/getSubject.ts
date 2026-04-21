import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { DatabaseClient } from '@service/database';
import { profilePicturePublicUrl } from '@utils/profilePictureUrl';

export const ValidationSchema = {
  params: z.object({
    id: z.string().uuid('Invalid subject ID'),
  }),
};

export const Controller = async (
  req: Request,
  res: Response,
  _next: NextFunction,
  db: DatabaseClient
): Promise<void> => {
  const { id } = req.params;

  const subject = await db.queryOne(
    `SELECT
      s.id,
      s.name,
      s.description,
      s.created_by,
      u.id as creator_id,
      s.created_at,
      s.updated_at,
      u.name as creator_name,
      u.email as creator_email,
      cpf.key as creator_profile_picture_key,
      bf.key as banner_key,
      COUNT(d.id) as document_count
    FROM subjects s
    LEFT JOIN users u ON s.created_by = u.id
    LEFT JOIN files cpf ON cpf.id = u.profile_picture_file_id
    LEFT JOIN files bf ON bf.id = s.banner_file_id
    LEFT JOIN documents d ON s.id = d.subject_id AND d.deleted_at IS NULL
    WHERE s.id = $1 AND s.deleted_at IS NULL
    GROUP BY s.id, s.name, s.description, s.created_by, u.id, s.created_at, s.updated_at, u.name, u.email, cpf.key, bf.key`,
    [id]
  );

  if (!subject) {
    res.status(404).json({
      success: false,
      message: 'Subject not found',
    });
    return;
  }

  const user = req.user;
  const userId = user?.userId;

  const recentDocuments = await db.queryMany(
    `SELECT
      d.id,
      d.title,
      d.kind,
      d.visibility,
      d.download_count,
      d.created_at,
      u.name as uploader_name,
      f.key as file_key,
      df.title as file_name,
      f.size as file_size,
      f.mime_type as file_mime_type,
      (SELECT COUNT(*)::int FROM document_files df_c WHERE df_c.document_id = d.id) AS file_count
    FROM documents d
    LEFT JOIN users u ON d.uploaded_by = u.id
    LEFT JOIN document_files df ON df.document_id = d.id AND df.is_main = true
    LEFT JOIN files f ON df.file_id = f.id
    WHERE d.subject_id = $1
      AND d.deleted_at IS NULL
      AND (d.visibility = 'PUBLIC' OR d.uploaded_by = $2)
    ORDER BY d.created_at DESC
    LIMIT 5`,
    [id, userId]
  );

  const {
    banner_key: bannerKey,
    creator_profile_picture_key: creatorProfilePictureKey,
    ...subjectData
  } = subject as Record<string, unknown>;

  res.status(200).json({
    success: true,
    data: {
      ...subjectData,
      banner_url: profilePicturePublicUrl(bannerKey as string | null | undefined),
      creator_profile_picture_url: profilePicturePublicUrl(
        creatorProfilePictureKey as string | null | undefined
      ),
      recent_documents: recentDocuments,
    },
  });
};
