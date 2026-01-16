import winston from 'winston';
import path from 'path';
import env from '../../config/env';

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message }) => {
    return `${timestamp} [${level}]: ${message}`;
  })
);

const logger = winston.createLogger({
  level: env.logging.level,
  format: logFormat,
  transports: [
    new winston.transports.File({
      filename: path.join('logs', 'error.log'),
      level: 'error',
      maxsize: 5242880,
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: path.join('logs', 'app.log'),
      maxsize: 5242880,
      maxFiles: 5,
    }),
  ],
});

if (env.server.isDevelopment) {
  logger.add(new winston.transports.Console({
    format: consoleFormat,
  }));
}

export default logger;