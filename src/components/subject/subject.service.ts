// // File Path: src/components/subject/subject.service.ts

// import { DatabaseClient } from '@service/database';
// import { CreateSubjectDTO, UpdateSubjectDTO, Subject } from '@types/subject.type';

// export async function CreateSubject(
//   db: DatabaseClient,
//   userId: string,
//   data: CreateSubjectDTO
// ): Promise<Subject> {
//   const subject = await db.queryOne(
//     `INSERT INTO subjects (name, description, created_by)
//      VALUES ($1, $2, $3)
//      RETURNING *`,
//     [data.name, data.description || null, userId]
//   );
//   return subject;
// }

// export async function GetSubjectById(db: DatabaseClient, subjectId: string): Promise<Subject | null> {
//   const subject = await db.queryOne(
//     'SELECT * FROM subjects WHERE id = $1 AND deleted_at IS NULL',
//     [subjectId]
//   );
//   return subject;
// }

// export async function UpdateSubjectById(
//   db: DatabaseClient,
//   subjectId: string,
//   data: UpdateSubjectDTO
// ): Promise<Subject> {
//   const updates: string[] = [];
//   const params: any[] = [];
//   let paramCount = 0;

//   if (data.name !== undefined) {
//     paramCount++;
//     params.push(data.name);
//     updates.push(`name = $${paramCount}`);
//   }

//   if (data.description !== undefined) {
//     paramCount++;
//     params.push(data.description);
//     updates.push(`description = $${paramCount}`);
//   }

//   params.push(subjectId);
//   const subject = await db.queryOne(
//     `UPDATE subjects SET ${updates.join(', ')} WHERE id = $${paramCount + 1} RETURNING *`,
//     params
//   );
//   return subject;
// }

// export async function DeleteSubjectById(db: DatabaseClient, subjectId: string): Promise<void> {
//   await db.query('UPDATE subjects SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1', [subjectId]);
// }   