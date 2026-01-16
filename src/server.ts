import dotenv from 'dotenv';
import app from './app';
import { pool } from './service/database';
import logger from './service/logger';
import env from './config/env';
import fs from 'fs';
import path from 'path';

dotenv.config();

const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

const PORT = env.server.port;

pool.query('SELECT NOW()', (err: Error | null) => {
  if (err) {
    logger.error('Database connection failed', { error: err.message });
    process.exit(1);
  }
  logger.info('Database connected successfully');
});

const server = app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`Environment: ${env.server.nodeEnv}`);
  logger.info(`API available at http://${env.server.host}:${PORT}/api`);
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received, closing server...');
  server.close(() => {
    pool.end(() => {
      logger.info('Database pool closed');
      process.exit(0);
    });
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, closing server...');
  server.close(() => {
    pool.end(() => {
      logger.info('Database pool closed');
      process.exit(0);
    });
  });
});