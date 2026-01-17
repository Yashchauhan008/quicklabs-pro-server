import { z } from 'zod';

export const createSubjectSchema = z.object({
  name: z
    .string({ message: 'Name is required' })
    .min(2, 'Name must be at least 2 characters')
    .max(255, 'Name cannot exceed 255 characters')
    .trim(),
  description: z
    .string()
    .max(1000, 'Description cannot exceed 1000 characters')
    .trim()
    .optional(),
});

export const updateSubjectSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(255, 'Name cannot exceed 255 characters')
    .trim()
    .optional(),
  description: z
    .string()
    .max(1000, 'Description cannot exceed 1000 characters')
    .trim()
    .optional(),
});

export const subjectIdParamSchema = z.object({
  id: z.string().uuid('Invalid subject ID'),
});

export const listSubjectsQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .default('1')
    .transform((val) => parseInt(val, 10)),
  limit: z
    .string()
    .optional()
    .default('10')
    .transform((val) => parseInt(val, 10)),
  search: z.string().optional(),
  created_by: z.string().uuid().optional(),
});

export type CreateSubjectInput = z.infer<typeof createSubjectSchema>;
export type UpdateSubjectInput = z.infer<typeof updateSubjectSchema>;
export type ListSubjectsQuery = z.infer<typeof listSubjectsQuerySchema>;
