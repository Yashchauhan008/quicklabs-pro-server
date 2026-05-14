import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { DatabaseClient } from '@service/database';

export const ValidationSchema = {
  params: z.object({
    id: z.string().uuid(),
  }),
};

export const Controller = async (
  req: Request,
  res: Response,
  _next: NextFunction,
  db: DatabaseClient
): Promise<void> => {
  const { id } = req.params;

  const result = await db.query(
    'UPDATE tools SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1 AND deleted_at IS NULL',
    [id]
  );

  if (result.rowCount === 0) {
    res.status(404).json({ success: false, message: 'Tool not found' });
    return;
  }

  res.status(200).json({
    success: true,
    message: 'Tool deleted successfully',
  });
};
