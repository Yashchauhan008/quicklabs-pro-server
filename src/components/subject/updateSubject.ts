import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { DatabaseClient } from '@service/database';
import logger from '@service/logger';

export const ValidationSchema = {
  body: z.object({
    name: z
      .string()
      .min(2, 'Name must be at least 2 characters')
      .max(255, 'Name cannot exceed 255 characters')
      .trim()
      .optional(),
    description: z
      .string()
      .max(1000, 'Description cannot exceed 1000 characters')
      .trim()
      .optional(),
  }),
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
  const { name, description } = req.body;

  // Check if subject exists
  const existingSubject = await db.queryOne(
    'SELECT id, created_by FROM subjects WHERE id = $1 AND deleted_at IS NULL',
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
      message: 'You are not authorized to update this subject',
    });
    return;
  }

  // Check if new name already exists (if name is being updated)
  if (name) {
    const duplicateSubject = await db.queryOne(
      'SELECT id FROM subjects WHERE LOWER(name) = LOWER($1) AND id != $2 AND deleted_at IS NULL',
      [name, id]
    );

    if (duplicateSubject) {
      res.status(400).json({
        success: false,
        message: 'Subject with this name already exists',
      });
      return;
    }
  }

  // Build update query dynamically
  const updates: string[] = [];
  const params: any[] = [];
  let paramCount = 0;

  if (name !== undefined) {
    paramCount++;
    params.push(name);
    updates.push(`name = $${paramCount}`);
  }

  if (description !== undefined) {
    paramCount++;
    params.push(description);
    updates.push(`description = $${paramCount}`);
  }

  if (updates.length === 0) {
    res.status(400).json({
      success: false,
      message: 'No fields to update',
    });
    return;
  }

  params.push(id);
  const subject = await db.queryOne(
    `UPDATE subjects 
     SET ${updates.join(', ')}
     WHERE id = $${paramCount + 1}
     RETURNING id, name, description, created_by, created_at, updated_at`,
    params
  );

  logger.info('Subject updated successfully', {
    subjectId: subject.id,
    userId,
  });

  res.status(200).json({
    success: true,
    message: 'Subject updated successfully',
    data: subject,
  });
};
