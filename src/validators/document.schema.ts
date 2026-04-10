import { z } from 'zod';

export const uploadDocumentSchema = z.object({
  subject_id: z.string().uuid('Invalid subject ID'),
  title: z
    .string({ message: 'Title is required' })
    .min(2, 'Title must be at least 2 characters')
    .max(255, 'Title cannot exceed 255 characters')
    .trim(),
  description: z
    .string()
    .max(1000, 'Description cannot exceed 1000 characters')
    .trim()
    .optional(),
  visibility: z
    .enum(['PUBLIC', 'PRIVATE'], {
      message: 'Visibility must be either PUBLIC or PRIVATE',
    })
    .optional()
    .default('PRIVATE'),
  kind: z.enum(['informational', 'lab_solutions']).optional().default('informational'),
  main_index: z.coerce.number().int().min(0).optional(),
  file_descriptions: z.string().optional(),
  file_titles: z
    .string({ message: 'file_titles is required' })
    .min(1, 'file_titles is required'),
});

export const updateDocumentSchema = z.object({
  title: z
    .string()
    .min(2, 'Title must be at least 2 characters')
    .max(255, 'Title cannot exceed 255 characters')
    .trim()
    .optional(),
  description: z
    .string()
    .max(1000, 'Description cannot exceed 1000 characters')
    .trim()
    .optional(),
  visibility: z
    .enum(['PUBLIC', 'PRIVATE'], {
      message: 'Visibility must be either PUBLIC or PRIVATE',
    })
    .optional(),
  kind: z.enum(['informational', 'lab_solutions']).optional(),
});

export const documentIdParamSchema = z.object({
  id: z.string().uuid('Invalid document ID'),
});

export const listDocumentsQuerySchema = z.object({
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
  subject_id: z.string().uuid().optional(),
  kind: z.enum(['informational', 'lab_solutions']).optional(),
  visibility: z.enum(['PUBLIC', 'PRIVATE']).optional(),
  uploaded_by: z.string().uuid().optional(),
  search: z.string().optional(),
});

export type UploadDocumentInput = z.infer<typeof uploadDocumentSchema>;
export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>;
export type ListDocumentsQuery = z.infer<typeof listDocumentsQuerySchema>;
