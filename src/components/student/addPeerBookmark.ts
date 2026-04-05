import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { DatabaseClient } from '@service/database';
import logger from '@service/logger';
import { QueryResult } from 'pg';

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

  if (peer_id === studentId) {
    res.status(400).json({ success: false, message: 'You cannot pin your own profile' });
    return;
  }

  const peer = await db.queryOne(
    `SELECT id, role FROM users WHERE id = $1`,
    [peer_id]
  );

  if (!peer || peer.role !== 'student') {
    res.status(404).json({ success: false, message: 'Student not found' });
    return;
  }

  let result: QueryResult;
  try {
    result = await db.query(
      `INSERT INTO student_peer_bookmarks (student_id, peer_id)
       VALUES ($1, $2)
       RETURNING id, student_id, peer_id, created_at`,
      [studentId, peer_id]
    );
  } catch (err: unknown) {
    const code = err && typeof err === 'object' && 'code' in err ? (err as { code: string }).code : '';
    if (code === '23505') {
      res.status(409).json({
        success: false,
        message: 'This student is already in your pinned list',
      });
      return;
    }
    throw err;
  }

  const row = result.rows[0];
  logger.info('Peer bookmarked', { studentId, peerId: peer_id });

  res.status(201).json({
    success: true,
    message: 'Peer pinned to your profile',
    data: row,
  });
};
