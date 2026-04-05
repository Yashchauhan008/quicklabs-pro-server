import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { DatabaseClient } from '@service/database';
import logger from '@service/logger';

export const ValidationSchema = {
  params: z.object({
    peer_id: z.string().uuid('Invalid peer ID'),
  }),
};

export const Controller = async (
  req: Request,
  res: Response,
  _next: NextFunction,
  db: DatabaseClient
): Promise<void> => {
  const studentId = req.user?.userId;
  const { peer_id } = req.params;

  const deleted = await db.queryOne(
    `DELETE FROM student_peer_bookmarks
     WHERE student_id = $1 AND peer_id = $2
     RETURNING id`,
    [studentId, peer_id]
  );

  if (!deleted) {
    res.status(404).json({
      success: false,
      message: 'Pinned peer not found',
    });
    return;
  }

  logger.info('Peer bookmark removed', { studentId, peerId: peer_id });

  res.status(200).json({
    success: true,
    message: 'Peer removed from your pinned list',
  });
};
