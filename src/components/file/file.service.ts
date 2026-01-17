// import { DatabaseClient } from '@service/database';
// import { CreateFileDTO, File } from '@types/file.type';

// export async function CreateNewFile(
//   db: DatabaseClient,
//   { key, size, mime_type }: CreateFileDTO
// ): Promise<File> {
//   const file = await db.queryOne(
//     'INSERT INTO files (key, size, mime_type) VALUES ($1, $2, $3) RETURNING *',
//     [key, size || null, mime_type || null]
//   );
//   return file;
// }

// export async function GetFileById(db: DatabaseClient, fileId: string): Promise<File | null> {
//   const file = await db.queryOne('SELECT * FROM files WHERE id = $1', [fileId]);
//   return file;
// }

// export async function GetFileByKey(db: DatabaseClient, key: string): Promise<File | null> {
//   const file = await db.queryOne('SELECT * FROM files WHERE key = $1', [key]);
//   return file;
// }

// export async function DeleteFile(db: DatabaseClient, fileId: string): Promise<void> {
//   await db.query('DELETE FROM files WHERE id = $1', [fileId]);
// }
