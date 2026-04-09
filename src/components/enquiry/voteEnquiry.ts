import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { DatabaseClient } from '@service/database';
import logger from '@service/logger';

export const ValidationSchema = {
  params: z.object({
    enquiry_id: z.string().uuid('Invalid enquiry ID'),
  }),
  body: z.object({
    vote: z.enum(['up', 'down']),
  }),
};

export const Controller = async (
  req: Request,
  res: Response,
  _next: NextFunction,
  db: DatabaseClient
): Promise<void> => {
  const userId = req.user?.userId;
  const { enquiry_id } = req.params;
  const { vote } = req.body as { vote: 'up' | 'down' };

  const enquiry = await db.queryOne('SELECT id FROM enquiries WHERE id = $1', [
    enquiry_id,
  ]);

  if (!enquiry) {
    res.status(404).json({ success: false, message: 'Enquiry not found' });
    return;
  }

  const numericVote = vote === 'up' ? 1 : -1;
  const existingVote = await db.queryOne(
    `SELECT id, vote FROM enquiry_votes
     WHERE enquiry_id = $1 AND student_id = $2`,
    [enquiry_id, userId]
  );

  if (existingVote?.vote === numericVote) {
    res.status(409).json({
      success: false,
      message: `You already ${vote === 'up' ? 'upvoted' : 'downvoted'} this enquiry`,
    });
    return;
  }

  const result = await db.query(
    `INSERT INTO enquiry_votes (enquiry_id, student_id, vote)
     VALUES ($1, $2, $3)
     ON CONFLICT (enquiry_id, student_id)
     DO UPDATE SET vote = EXCLUDED.vote
     RETURNING id, enquiry_id, student_id, vote, created_at`,
    [enquiry_id, userId, numericVote]
  );

  logger.info('Enquiry vote recorded', { enquiryId: enquiry_id, userId, vote });
  res.status(201).json({
    success: true,
    message: 'Vote recorded',
    data: result.rows[0],
  });
};
