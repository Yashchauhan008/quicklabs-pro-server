import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { DatabaseClient } from '@service/database';
import logger from '@service/logger';
import { userProfileWithPictureSql } from '../user/userProfileSelect';
import { stripProfilePictureKey } from '@utils/profilePictureUrl';

const socialEntrySchema = z.object({
  key: z.string().min(1, 'Key is required').max(64).trim(),
  value: z.string().min(1, 'Value is required').max(500).trim(),
});

export const ValidationSchema = {
  body: z.object({
    social_profiles: z
      .array(socialEntrySchema)
      .max(30, 'At most 30 social entries'),
  }),
};

export const Controller = async (
  req: Request,
  res: Response,
  _next: NextFunction,
  db: DatabaseClient
): Promise<void> => {
  const userId = req.user?.userId;
  const { social_profiles } = req.body;

  await db.query(
    `UPDATE users SET social_profiles = $1::jsonb WHERE id = $2`,
    [JSON.stringify(social_profiles), userId]
  );

  const updated = await db.queryOne(userProfileWithPictureSql, [userId]);

  logger.info('Student profile social links updated', { userId });

  res.status(200).json({
    success: true,
    message: 'Profile updated',
    data: stripProfilePictureKey(updated as Record<string, unknown>),
  });
};
