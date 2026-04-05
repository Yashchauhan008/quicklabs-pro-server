import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { DatabaseClient } from '@service/database';
import { comparePassword } from '@utils/password';
import { generateToken } from '@utils/jwtToken';
import logger from '@service/logger';
import { profilePicturePublicUrl } from '@utils/profilePictureUrl';

export const ValidationSchema = {
  body: z.object({
    email: z.string().email().trim().toLowerCase(),
    password: z.string().min(1),
  }),
};

export const Controller = async (
  req: Request,
  res: Response,
  _next: NextFunction,
  db: DatabaseClient
): Promise<void> => { 
  const { email, password } = req.body;

  const user = await db.queryOne(
    `SELECT u.*, f.key AS profile_picture_key
     FROM users u
     LEFT JOIN files f ON f.id = u.profile_picture_file_id
     WHERE u.email = $1`,
    [email]
  );

  if (!user) {
    logger.warn('Login failed: user not found', { email });
    res.status(401).json({
      success: false,
      message: 'Invalid credentials',
    });
    return;  
  }

  const isValidPassword = await comparePassword(password, user.password_hash);

  if (!isValidPassword) {
    logger.warn('Login failed: invalid password', { email });
    res.status(401).json({
      success: false,
      message: 'Invalid credentials',
    });
    return;  // ✅ Just return
  }

  const token = generateToken({
    userId: user.id,
    email: user.email,
    role: user.role,
  });

  const {
    password_hash: _pw,
    profile_picture_file_id: _fid,
    profile_picture_key,
    ...userRest
  } = user;

  logger.info('User logged in successfully', { userId: user.id, email: user.email });

  res.status(200).json({
    success: true,
    data: {
      user: {
        ...userRest,
        profile_picture_url: profilePicturePublicUrl(profile_picture_key),
      },
      token,
    },
  });
};