import { Request, Response, NextFunction } from 'express';
import { DatabaseClient } from '@service/database';
import logger from '@service/logger';
import { deleteProfilePictureFile, saveProfilePicture } from '@service/file-storage';
import { profilePicturePublicUrl } from '@utils/profilePictureUrl';
import fs from 'fs';

export const Controller = async (
  req: Request,
  res: Response,
  _next: NextFunction,
  db: DatabaseClient
): Promise<void> => {
  const userId = req.user?.userId;
  const file = req.file;

  const cleanupTemp = (): void => {
    if (file && fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }
  };

  if (!file) {
    res.status(400).json({ success: false, message: 'Image file is required' });
    return;
  }

  let savedKey: string | null = null;
  await db.query('BEGIN');
  try {
    const userRow = await db.queryOne(
      `SELECT profile_picture_file_id FROM users WHERE id = $1 FOR UPDATE`,
      [userId]
    );

    if (!userRow) {
      await db.query('ROLLBACK');
      cleanupTemp();
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    savedKey = await saveProfilePicture(file.filename);

    const fileRecord = await db.queryOne(
      `INSERT INTO files (key, size, mime_type) VALUES ($1, $2, $3) RETURNING id, key`,
      [savedKey, file.size, file.mimetype]
    );

    await db.query(
      `UPDATE users SET profile_picture_file_id = $1 WHERE id = $2`,
      [fileRecord.id, userId]
    );

    const oldFileId = userRow.profile_picture_file_id;
    if (oldFileId) {
      const oldFile = await db.queryOne(`SELECT key FROM files WHERE id = $1`, [oldFileId]);
      await db.query(`DELETE FROM files WHERE id = $1`, [oldFileId]);
      if (oldFile?.key) {
        await deleteProfilePictureFile(oldFile.key);
      }
    }

    await db.query('COMMIT');

    logger.info('Profile picture updated', { userId });

    const updated = await db.queryOne(
      `SELECT
        u.id,
        u.name,
        u.email,
        u.role,
        u.social_profiles,
        u.created_at,
        u.updated_at,
        f.key AS profile_picture_key
      FROM users u
      LEFT JOIN files f ON f.id = u.profile_picture_file_id
      WHERE u.id = $1`,
      [userId]
    );

    const { profile_picture_key: key, ...rest } = updated;

    res.status(200).json({
      success: true,
      message: 'Profile picture updated',
      data: {
        ...rest,
        profile_picture_url: profilePicturePublicUrl(key),
      },
    });
  } catch (err) {
    await db.query('ROLLBACK');
    cleanupTemp();
    if (savedKey) {
      await deleteProfilePictureFile(savedKey).catch(() => undefined);
    }
    throw err;
  }
};
