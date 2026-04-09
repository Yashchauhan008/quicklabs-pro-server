import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { DatabaseClient } from '@service/database';
import logger from '@service/logger';

export const ValidationSchema = {
  params: z.object({
    enquiry_id: z.string().uuid('Invalid enquiry ID'),
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

  const deleted = await db.queryOne(
    `DELETE FROM enquiries
     WHERE id = $1 AND student_id = $2
     RETURNING id`,
    [enquiry_id, userId]
  );

  if (!deleted) {
    const enquiry = await db.queryOne('SELECT id FROM enquiries WHERE id = $1', [
      enquiry_id,
    ]);

    if (!enquiry) {
      res.status(404).json({ success: false, message: 'Enquiry not found' });
      return;
    }

    res.status(403).json({
      success: false,
      message: 'You can only delete your own enquiries',
    });
    return;
  }

  logger.info('Enquiry deleted', { enquiryId: enquiry_id, userId });
  res.status(204).send();
};
