import { Request, Response, NextFunction } from 'express';
import { pool, DatabaseClient } from '../service/database';
import logger from '../service/logger';

type ControllerFunction = (
  req: Request,
  res: Response,
  next: NextFunction,
  db: DatabaseClient
) => Promise<void>;

export default function WithDatabase(controller: ControllerFunction) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const client = await pool.connect();

    try {
      const db: DatabaseClient = {
        query: (text, params) => client.query(text, params),
        queryOne: async (text, params) => {
          const result = await client.query(text, params);
          return result.rows[0] || null;
        },
        queryMany: async (text, params) => {
          const result = await client.query(text, params);
          return result.rows;
        },
      };

      await controller(req, res, next, db);
    } catch (error) {
      logger.error('Database operation failed:', error);
      next(error);
    } finally {
      client.release();
    }
  };
}