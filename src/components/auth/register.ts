import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { DatabaseClient } from '@service/database';
import { hashPassword } from '@utils/password';
import { generateToken } from '@utils/jwtToken';
import logger from '@service/logger';

export const ValidationSchema = {
  body: z.object({
    name: z.string().min(2).max(100).trim(),
    email: z.string().email().trim().toLowerCase(),
    password: z.string().min(6).max(100),
  }),
};

export const Controller = async (
  req: Request,
  res: Response,
  _next: NextFunction,
  db: DatabaseClient
): Promise<void> => {  // ✅ Explicit void return
  const { name, email, password } = req.body;

  const existingUser = await db.queryOne(
    'SELECT id FROM users WHERE email = $1',
    [email]
  );

  if (existingUser) {
    res.status(400).json({
      success: false,
      message: 'Email already registered',
    });
    return;  // ✅ Just return
  }

  const passwordHash = await hashPassword(password);

  const user = await db.queryOne(
    `INSERT INTO users (name, email, password_hash)
     VALUES ($1, $2, $3)
     RETURNING id, name, email, created_at, updated_at`,
    [name, email, passwordHash]
  );

  const token = generateToken({
    userId: user.id,
    email: user.email,
  });

  logger.info('User registered successfully', { userId: user.id, email: user.email });

  res.status(201).json({
    success: true,
    data: {
      user,
      token,
    },
  });
  // ✅ No return statement
};