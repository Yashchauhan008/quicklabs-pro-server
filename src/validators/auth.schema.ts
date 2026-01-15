import { z } from 'zod';

/**
 * Schema for user registration
 */
export const registerSchema = z.object({
  name: z
    .string({ message: 'Name is required' })
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name cannot exceed 100 characters')
    .trim(),
  email: z
    .string({ message: 'Email is required' })
    .email('Please provide a valid email')
    .toLowerCase()
    .trim(),
  password: z
    .string({ message: 'Password is required' })
    .min(6, 'Password must be at least 6 characters')
    .max(100, 'Password cannot exceed 100 characters'),
});

/**
 * Schema for user login
 */
export const loginSchema = z.object({
  email: z
    .string({ message: 'Email is required' })
    .email('Please provide a valid email')
    .toLowerCase()
    .trim(),
  password: z
    .string({ message: 'Password is required' })
    .min(1, 'Password is required'),
});

/**
 * Schema for password update
 */
export const updatePasswordSchema = z.object({
  currentPassword: z
    .string({ message: 'Current password is required' })
    .min(1, 'Current password is required'),
  newPassword: z
    .string({ message: 'New password is required' })
    .min(6, 'New password must be at least 6 characters')
    .max(100, 'New password cannot exceed 100 characters'),
});

/**
 * Schema for user profile update
 */
export const updateProfileSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name cannot exceed 100 characters')
    .trim()
    .optional(),
  email: z
    .string()
    .email('Please provide a valid email')
    .toLowerCase()
    .trim()
    .optional(),
});

/**
 * Schema for email verification
 */
export const emailSchema = z.object({
  email: z
    .string({ message: 'Email is required' })
    .email('Please provide a valid email')
    .toLowerCase()
    .trim(),
});

// Type exports for TypeScript
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type EmailInput = z.infer<typeof emailSchema>;