import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { DatabaseClient } from '@service/database';
import logger from '@service/logger';

export const ValidationSchema = {
  body: z.object({
    title: z.string().min(2).max(255).trim(),
    message: z.string().min(10).max(5000).trim(),
  }),
};

export const Controller = async (
  req: Request,
  res: Response,
  _next: NextFunction,
  db: DatabaseClient
): Promise<void> => {
  const userId = req.user?.userId;
  const { title, message } = req.body;

  const enquiry = await db.queryOne(
    `INSERT INTO enquiries (student_id, title, message)
     VALUES ($1, $2, $3)
     RETURNING id, student_id, title, message, status, created_at, updated_at`,
    [userId, title, message]
  );

  logger.info('Enquiry created', { enquiryId: enquiry.id, userId });

  res.status(201).json({
    success: true,
    message: 'Enquiry submitted',
    data: enquiry,
  });
};
