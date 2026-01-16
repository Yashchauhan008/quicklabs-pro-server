import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { DatabaseClient } from '@service/database';
import { comparePassword } from '@utils/password';
import { generateToken } from '@utils/jwtToken';
import logger from '@service/logger';

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
    'SELECT * FROM users WHERE email = $1',
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
  });

  const { password_hash, ...userWithoutPassword } = user;

  logger.info('User logged in successfully', { userId: user.id, email: user.email });

  res.status(200).json({
    success: true,
    data: {
      user: userWithoutPassword,
      token,
    },
  });
};