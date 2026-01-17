import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { DatabaseClient } from '@service/database';
import logger from '@service/logger';

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
  const user = (req as any).user;
  const userId = user?.userId;
  const { id } = req.params;

  // Check if subject exists
  const existingSubject = await db.queryOne(
    'SELECT id, created_by, name FROM subjects WHERE id = $1 AND deleted_at IS NULL',
    [id]
  );

  if (!existingSubject) {
    res.status(404).json({
      success: false,
      message: 'Subject not found',
    });
    return;
  }

  // Check if user is the creator
  if (existingSubject.created_by !== userId) {
    res.status(403).json({
      success: false,
      message: 'You are not authorized to delete this subject',
    });
    return;
  }

  // Soft delete the subject
  await db.query(
    'UPDATE subjects SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1',
    [id]
  );

  // Also soft delete all documents under this subject
  await db.query(
    'UPDATE documents SET deleted_at = CURRENT_TIMESTAMP WHERE subject_id = $1 AND deleted_at IS NULL',
    [id]
  );

  logger.info('Subject deleted successfully', {
    subjectId: id,
    subjectName: existingSubject.name,
    userId,
  });

  res.status(200).json({
    success: true,
    message: 'Subject deleted successfully',
  });
};
