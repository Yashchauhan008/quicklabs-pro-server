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

  const row = await db.queryOne(
    `SELECT 
      u.id,
      u.name,
      u.social_profiles,
      u.role,
      f.key AS profile_picture_key,
      (SELECT COALESCE(ROUND(AVG(sr.stars)::numeric, 2), 0) FROM student_ratings sr WHERE sr.rated_student_id = u.id) AS rating_avg,
      (SELECT COUNT(*)::int FROM student_ratings sr WHERE sr.rated_student_id = u.id) AS rating_count
    FROM users u
    LEFT JOIN files f ON f.id = u.profile_picture_file_id
    WHERE u.id = $1 AND u.role = 'student'`,
    [student_id]
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
