import { Pool, QueryResult } from 'pg';
import env from '../../config/env';
import logger from '../logger';

export const pool = new Pool({
  host: env.database.host,
  port: env.database.port,
  database: env.database.name,
  user: env.database.user,
  password: env.database.password,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err: Error) => {
  logger.error('Unexpected database error:', err);
});

export interface DatabaseClient {
  query: (text: string, params?: any[]) => Promise<QueryResult>;
  queryOne: (text: string, params?: any[]) => Promise<any>;
  queryMany: (text: string, params?: any[]) => Promise<any[]>;
}

export const query = (text: string, params?: any[]) => {
  return pool.query(text, params);
};

export const queryOne = async (text: string, params?: any[]) => {
  const result = await pool.query(text, params);
  return result.rows[0] || null;
};

export const queryMany = async (text: string, params?: any[]) => {
  const result = await pool.query(text, params);
  return result.rows;
};