import { Request, Response, NextFunction } from 'express';
import { DatabaseClient } from '@service/database';
import logger from '@service/logger';
import { deleteProfilePictureFile } from '@service/file-storage';

export const Controller = async (
  req: Request,
  res: Response,
  _next: NextFunction,
  db: DatabaseClient
): Promise<void> => {
  const userId = req.user?.userId;

  const userRow = await db.queryOne(
    `SELECT profile_picture_file_id FROM users WHERE id = $1`,
    [userId]
  );

  if (!userRow?.profile_picture_file_id) {
    res.status(404).json({
      success: false,
      message: 'No profile picture to remove',
    });
    return;
  }

  const oldFile = await db.queryOne(`SELECT key FROM files WHERE id = $1`, [
    userRow.profile_picture_file_id,
  ]);

  await db.query(
    `UPDATE users SET profile_picture_file_id = NULL WHERE id = $1`,
    [userId]
  );
  await db.query(`DELETE FROM files WHERE id = $1`, [userRow.profile_picture_file_id]);

  if (oldFile?.key) {
    await deleteProfilePictureFile(oldFile.key);
  }

  logger.info('Profile picture removed', { userId });

  res.status(200).json({
    success: true,
    message: 'Profile picture removed',
  });
};
