import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { DatabaseClient } from '@service/database';
import { stripProfilePictureKey } from '@utils/profilePictureUrl';

export const ValidationSchema = {
  params: z.object({
    student_id: z.string().uuid('Invalid student ID'),
  }),
};

export const Controller = async (
  req: Request,
  res: Response,
  _next: NextFunction,
  db: DatabaseClient
): Promise<void> => {
  const { student_id } = req.params;
  const viewerId = req.user?.userId;

  const row = await db.queryOne(
    `SELECT 
      u.id,
      u.name,
      u.social_profiles,
      u.bio,
      u.created_at,
      u.batch_year,
      u.semester,
      u.university_id,
      u.branch_id,
      uni.name AS university_name,
      ulf.key AS university_logo_key,
      br.name AS branch_name,
      u.role,
      f.key AS profile_picture_key,
      (SELECT COALESCE(ROUND(AVG(sr.stars)::numeric, 2), 0) FROM student_ratings sr WHERE sr.rated_student_id = u.id) AS rating_avg,
      (SELECT COUNT(*)::int FROM student_ratings sr WHERE sr.rated_student_id = u.id) AS rating_count,
      (
        SELECT sr2.stars
        FROM student_ratings sr2
        WHERE sr2.rated_student_id = u.id
          AND sr2.rated_by = $2::uuid
        LIMIT 1
      ) AS my_rating_stars,
      (
        SELECT COUNT(*)::int
        FROM subjects s
        WHERE s.created_by = u.id AND s.deleted_at IS NULL
      ) AS total_courses,
      (
        SELECT COUNT(*)::int
        FROM documents d
        WHERE d.uploaded_by = u.id AND d.deleted_at IS NULL
      ) AS total_files
    FROM users u
    LEFT JOIN files f ON f.id = u.profile_picture_file_id
    LEFT JOIN universities uni ON uni.id = u.university_id
    LEFT JOIN files ulf ON ulf.id = uni.logo_file_id
    LEFT JOIN branches br ON br.id = u.branch_id
    WHERE u.id = $1 AND u.role = 'student'`,
    [student_id, viewerId]
  );

  if (!row) {
    res.status(404).json({ success: false, message: 'Student not found' });
    return;
  }

  res.status(200).json({
    success: true,
    data: stripProfilePictureKey(row as Record<string, unknown>),
  });
};
