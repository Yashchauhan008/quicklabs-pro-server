import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { DatabaseClient } from '@service/database';
import { generateToken } from '@utils/jwtToken';
import logger from '@service/logger';
import { profilePicturePublicUrl } from '@utils/profilePictureUrl';
import { OAuth2Client } from 'google-auth-library';
import env from '@config/env';

const googleClient = new OAuth2Client();

export const ValidationSchema = {
  body: z.object({
    token: z.string().trim().min(1).max(5000),
  }),
};

export const Controller = async (
  req: Request,
  res: Response,
  _next: NextFunction,
  db: DatabaseClient
): Promise<void> => { 
  const { token: idToken } = req.body as z.infer<typeof ValidationSchema.body>;

  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: env.google.clientId,
  });

  const payload = ticket.getPayload();
  const email = payload?.email?.trim().toLowerCase();

  if (!email) {
    res.status(400).json({
      success: false,
      message: 'Invalid Google token',
    });
    return;
  }

  const user = await db.queryOne(
    `SELECT u.*, f.key AS profile_picture_key
     FROM users u
     LEFT JOIN files f ON f.id = u.profile_picture_file_id
     WHERE u.email = $1`,
    [email]
  );

  let resolvedUser = user;
  if (!resolvedUser) {
    const inferredName = payload?.name?.trim() || email.split('@')[0];
    /**
     * Legacy schema keeps password_hash NOT NULL, so Google accounts use a placeholder
     * hash and authenticate only via verified Google tokens.
     */
    resolvedUser = await db.queryOne(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [inferredName, email, 'GOOGLE_AUTH_ONLY']
    );
  }

  if (!resolvedUser) {
    res.status(500).json({
      success: false,
      message: 'Unable to authenticate user',
    });
    return;
  }

  const authToken = generateToken({
    userId: resolvedUser.id,
    email: resolvedUser.email,
    role: resolvedUser.role,
  });

  const {
    password_hash: _pw,
    profile_picture_file_id: _fid,
    profile_picture_key,
    ...userRest
  } = resolvedUser;

  logger.info('User logged in successfully', { userId: resolvedUser.id, email: resolvedUser.email });

  res.status(200).json({
    success: true,
    data: {
      user: {
        ...userRest,
        profile_picture_url: profilePicturePublicUrl(profile_picture_key),
      },
      token: authToken,
    },
  });
};