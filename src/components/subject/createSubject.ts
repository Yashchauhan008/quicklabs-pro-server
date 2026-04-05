import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { DatabaseClient } from '@service/database';
import logger from '@service/logger';
import {
  advisoryLockUser,
  countActiveSubjectsForUser,
  isStudentRole,
  limits,
} from '@utils/studentQuota';

export const ValidationSchema = {
  body: z.object({
    name: z
      .string({ message: 'Name is required' })
      .min(2, 'Name must be at least 2 characters')
      .max(255, 'Name cannot exceed 255 characters')
      .trim(),
    description: z
      .string()
      .max(1000, 'Description cannot exceed 1000 characters')
      .trim()
      .optional(),
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
  const role = user?.role;

  const { name, description } = req.body;

  const existingSubject = await db.queryOne(
    'SELECT id FROM subjects WHERE LOWER(name) = LOWER($1) AND deleted_at IS NULL',
    [name]
  );

  if (existingSubject) {
    res.status(400).json({
      success: false,
      message: 'Subject with this name already exists',
    });
    return;
  }

  if (isStudentRole(role)) {
    await db.query('BEGIN');
    try {
      await advisoryLockUser(db, userId!);
      const subjectCount = await countActiveSubjectsForUser(db, userId!);
      if (subjectCount >= limits().maxSubjects) {
        await db.query('ROLLBACK');
        res.status(400).json({
          success: false,
          message: `Students may create at most ${limits().maxSubjects} subjects`,
        });
        return;
      }

      const subject = await db.queryOne(
        `INSERT INTO subjects (name, description, created_by)
         VALUES ($1, $2, $3)
         RETURNING id, name, description, created_by, created_at, updated_at`,
        [name, description || null, userId]
      );

      await db.query('COMMIT');

      logger.info('Subject created successfully', {
        subjectId: subject.id,
        userId,
      });

      res.status(201).json({
        success: true,
        message: 'Subject created successfully',
        data: subject,
      });
    } catch (err) {
      await db.query('ROLLBACK');
      throw err;
    }
    return;
  }

  const subject = await db.queryOne(
    `INSERT INTO subjects (name, description, created_by)
     VALUES ($1, $2, $3)
     RETURNING id, name, description, created_by, created_at, updated_at`,
    [name, description || null, userId]
  );

  logger.info('Subject created successfully', {
    subjectId: subject.id,
    userId,
  });

  res.status(201).json({
    success: true,
    message: 'Subject created successfully',
    data: subject,
  });
};
