import dotenv from 'dotenv';

dotenv.config();

export const jwtConfig = {
  secret: process.env.JWT_SECRET || '',
  expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  refreshSecret: process.env.JWT_REFRESH_SECRET || '',
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
};

if (!jwtConfig.secret || jwtConfig.secret.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters');
}

if (!jwtConfig.refreshSecret || jwtConfig.refreshSecret.length < 32) {
  throw new Error('JWT_REFRESH_SECRET must be at least 32 characters');
}