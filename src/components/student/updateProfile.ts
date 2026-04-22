import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { DatabaseClient } from '@service/database';
import logger from '@service/logger';
import { userProfileWithPictureSql } from '../user/userProfileSelect';
import { stripProfilePictureKey } from '@utils/profilePictureUrl';
import { BIO_MAX_WORDS, countWords } from '@utils/wordCount';

const socialEntrySchema = z.object({
  key: z.string().min(1, 'Key is required').max(64).trim(),
  value: z.string().min(1, 'Value is required').max(500).trim(),
});

export const ValidationSchema = {
  body: z.object({
    social_profiles: z
      .array(socialEntrySchema)
      .max(30, 'At most 30 social entries'),
    bio: z
      .union([
        z
          .string()
          .max(20000)
          .refine((s) => countWords(s) <= BIO_MAX_WORDS, {
            message: `Bio must be at most ${BIO_MAX_WORDS} words`,
          }),
        z.null(),
      ])
      .optional(),
    batch_year: z.coerce.number().int().min(2000).max(2100).nullable().optional(),
    semester: z.coerce.number().int().min(0).max(12).nullable().optional(),
    university_id: z.string().uuid().nullable().optional(),
    branch_id: z.string().uuid().nullable().optional(),
  }),
};

export const Controller = async (
  req: Request,
  res: Response,
  _next: NextFunction,
  db: DatabaseClient
): Promise<void> => {
  const userId = req.user?.userId;
  const { social_profiles, bio, batch_year, semester, university_id, branch_id } = req.body;

  if (branch_id) {
    const branch = await db.queryOne(
      'SELECT id FROM branches WHERE id = $1 AND deleted_at IS NULL',
      [branch_id]
    );
    if (!branch) {
      res.status(400).json({ success: false, message: 'Invalid branch_id' });
      return;
    }
  }

  await db.query(
    `UPDATE users
     SET social_profiles = $1::jsonb,
         bio = $2,
         batch_year = $3,
         semester = $4,
         university_id = $5,
         branch_id = $6
     WHERE id = $7`,
    [
      JSON.stringify(social_profiles),
      bio ?? null,
      batch_year ?? null,
      semester ?? null,
      university_id ?? null,
      branch_id ?? null,
      userId,
    ]
  );

  const updated = await db.queryOne(userProfileWithPictureSql, [userId]);

  logger.info('Student profile social links updated', { userId });

  res.status(200).json({
    success: true,
    message: 'Profile updated',
    data: stripProfilePictureKey(updated as Record<string, unknown>),
  });
};
