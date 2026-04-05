import { Request, Response, NextFunction } from 'express';
import { DatabaseClient } from '@service/database';
import { pinnedPeersFromBookmarks } from '../student/peerBookmarkQueries';
import { userProfileWithPictureSql } from '../user/userProfileSelect';
import { stripProfilePictureKey } from '@utils/profilePictureUrl';

export const Controller = async (
  req: Request,
  res: Response,
  _next: NextFunction,
  db: DatabaseClient
): Promise<void> => {
  const userId = req.user?.userId;

  const userRecord = await db.queryOne(userProfileWithPictureSql, [userId]);

  if (!userRecord) {
    res.status(404).json({
      success: false,
      message: 'User not found',
    });
    return;
  }

  const base = stripProfilePictureKey(userRecord as Record<string, unknown>);

  if (userRecord.role === 'student') {
    const pinnedRows = await db.queryMany(pinnedPeersFromBookmarks, [userId]);
    const pinned_peers = pinnedRows.map((r) =>
      stripProfilePictureKey(r as Record<string, unknown>)
    );
    res.status(200).json({
      success: true,
      data: {
        ...base,
        pinned_peers,
      },
    });
    return;
  }

  res.status(200).json({
    success: true,
    data: {
      ...base,
      pinned_peers: [],
    },
  });
};