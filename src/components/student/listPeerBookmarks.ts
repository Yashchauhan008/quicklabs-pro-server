import { Request, Response, NextFunction } from 'express';
import { DatabaseClient } from '@service/database';
import { stripProfilePictureKey } from '@utils/profilePictureUrl';
import { pinnedPeersFromBookmarks } from './peerBookmarkQueries';

export const ValidationSchema = {};

export const Controller = async (
  req: Request,
  res: Response,
  _next: NextFunction,
  db: DatabaseClient
): Promise<void> => {
  const studentId = req.user?.userId;

  const peers = await db.queryMany(pinnedPeersFromBookmarks, [studentId]);
  const data = peers.map((r) => stripProfilePictureKey(r as Record<string, unknown>));

  res.status(200).json({
    success: true,
    data,
  });
};
