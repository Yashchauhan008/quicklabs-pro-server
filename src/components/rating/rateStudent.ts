import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { DatabaseClient } from '@service/database';
import logger from '@service/logger';
import { QueryResult } from 'pg';

export const ValidationSchema = {
  params: z.object({
    student_id: z.string().uuid('Invalid student ID'),
  }),
  body: z.object({
    stars: z.coerce.number().int().min(1).max(5),
  }),
};

export const Controller = async (
  req: Request,
  res: Response,
  _next: NextFunction,
  db: DatabaseClient
): Promise<void> => {
  const userId = req.user?.userId;
  const { student_id } = req.params;
  const { stars } = req.body;

  if (student_id === userId) {
    res.status(400).json({ success: false, message: 'You cannot rate yourself' });
    return;
  }

  const target = await db.queryOne(
    `SELECT id, role FROM users WHERE id = $1`,
    [student_id]
  );

  if (!target || target.role !== 'student') {
    res.status(404).json({
      success: false,
      message: 'Student not found',
    });
    return;
  }

  let result: QueryResult;
  try {
    result = await db.query(
      `INSERT INTO student_ratings (rated_student_id, rated_by, stars)
       VALUES ($1, $2, $3)
       RETURNING id, rated_student_id, rated_by, stars, created_at`,
      [student_id, userId, stars]
    );
  } catch (err: unknown) {
    const code = err && typeof err === 'object' && 'code' in err ? (err as { code: string }).code : '';
    if (code === '23505') {
      res.status(409).json({
        success: false,
        message: 'You have already rated this student',
      });
      return;
    }
    if (code === '23514') {
      res.status(400).json({
        success: false,
        message: 'Invalid rating',
      });
      return;
    }
    throw err;
  }

  const row = result.rows[0];
  logger.info('Student rated', { ratedStudentId: student_id, userId });

  res.status(201).json({
    success: true,
    message: 'Rating recorded',
    data: row,
  });
};
