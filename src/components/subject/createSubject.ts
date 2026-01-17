import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { DatabaseClient } from '@service/database';
import logger from '@service/logger';

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
  const user = (req as any).user;
  const userId = user?.userId;

  const { name, description } = req.body;

  // Check if subject with same name already exists
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