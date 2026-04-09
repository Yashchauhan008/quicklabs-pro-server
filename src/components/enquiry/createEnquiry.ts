import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { DatabaseClient } from '@service/database';
import logger from '@service/logger';

export const ValidationSchema = {
  body: z.object({
    title: z.string().min(2).max(255).trim(),
    description: z.string().min(10).max(5000).trim(),
    topic: z.enum(['subject', 'document', 'report', 'other']),
    subject_id: z.string().uuid().optional(),
    document_id: z.string().uuid().optional(),
    is_private: z.boolean().optional().default(false),
  }),
};

export const Controller = async (
  req: Request,
  res: Response,
  _next: NextFunction,
  db: DatabaseClient
): Promise<void> => {
  const userId = req.user?.userId;
  const { title, description, topic, subject_id, document_id, is_private } =
    req.body;

  const enquiry = await db.queryOne(
    `INSERT INTO enquiries (
      student_id,
      title,
      description,
      topic,
      subject_id,
      document_id,
      is_private
    )
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING
      id,
      student_id,
      title,
      description,
      topic,
      subject_id,
      document_id,
      is_private,
      status,
      created_at,
      updated_at`,
    [userId, title, description, topic, subject_id ?? null, document_id ?? null, is_private]
  );

  logger.info('Enquiry created', { enquiryId: enquiry.id, userId });

  res.status(201).json({
    success: true,
    message: 'Enquiry submitted',
    data: enquiry,
  });
};
