import { DatabaseClient } from '@service/database';
import env from '@config/env';

/** Use in SQL as expression, not a bound param (calendar date in UTC). */
export const sqlTodayUtc = `(timezone('utc', now()))::date`;

export function isStudentRole(role: string | undefined): boolean {
  return role === 'student';
}

export async function advisoryLockUser(db: DatabaseClient, userId: string): Promise<void> {
  await db.query(`SELECT pg_advisory_xact_lock(hashtext($1::text))`, [userId]);
}

export async function countActiveSubjectsForUser(
  db: DatabaseClient,
  userId: string
): Promise<number> {
  const row = await db.queryOne(
    `SELECT COUNT(*)::int AS c FROM subjects WHERE created_by = $1 AND deleted_at IS NULL`,
    [userId]
  );
  return row?.c ?? 0;
}

export async function ensureDailyUsageRow(db: DatabaseClient, userId: string): Promise<void> {
  await db.query(
    `INSERT INTO user_daily_usage (user_id, usage_date, uploads_count, downloads_count)
     VALUES ($1, ${sqlTodayUtc}, 0, 0)
     ON CONFLICT (user_id, usage_date) DO NOTHING`,
    [userId]
  );
}

/** Call inside an open transaction before FOR UPDATE. */
export async function selectDailyUsageForUpdate(
  db: DatabaseClient,
  userId: string
): Promise<{ uploads_count: number; downloads_count: number } | null> {
  await ensureDailyUsageRow(db, userId);
  return db.queryOne(
    `SELECT uploads_count, downloads_count FROM user_daily_usage
     WHERE user_id = $1 AND usage_date = ${sqlTodayUtc}
     FOR UPDATE`,
    [userId]
  );
}

export async function incrementDailyUploads(db: DatabaseClient, userId: string): Promise<number> {
  const row = await db.queryOne(
    `UPDATE user_daily_usage
     SET uploads_count = uploads_count + 1
     WHERE user_id = $1 AND usage_date = ${sqlTodayUtc}
     RETURNING uploads_count`,
    [userId]
  );
  return row?.uploads_count ?? 0;
}

export async function incrementDailyDownloads(db: DatabaseClient, userId: string): Promise<number> {
  const row = await db.queryOne(
    `UPDATE user_daily_usage
     SET downloads_count = downloads_count + 1
     WHERE user_id = $1 AND usage_date = ${sqlTodayUtc}
     RETURNING downloads_count`,
    [userId]
  );
  return row?.downloads_count ?? 0;
}

export const limits = (): {
  maxSubjects: number;
  maxUploadsPerDay: number;
  maxDownloadsPerDay: number;
} => env.studentLimits;

/** When false, students are not blocked by daily download count (still no increment for that quota). */
export function isStudentDownloadQuotaEnforced(): boolean {
  return limits().maxDownloadsPerDay > 0;
}
