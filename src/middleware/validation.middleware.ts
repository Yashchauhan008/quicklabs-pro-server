import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { logger } from '../config/logger';

/**
 * Middleware to validate request data against a Zod schema
 * @param schema - Zod schema to validate against
 * @param property - Which part of the request to validate ('body' | 'query' | 'params')
 */
export const validate = (
  schema: z.ZodTypeAny,
  property: 'body' | 'query' | 'params' = 'body'
) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate and parse the request data
      const validated = await schema.parseAsync(req[property]);
      
      // Replace the request data with validated & sanitized data
      (req as any)[property] = validated;
      
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Format Zod errors into a user-friendly format
        const errors = error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        }));

        logger.warn('Validation failed', { 
          errors,
          property,
          data: req[property] 
        });

        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.map(e => e.message),
          details: errors,
        });
        return;
      }

      // Handle unexpected errors
      logger.error('Unexpected validation error', { error });
      
      res.status(500).json({
        success: false,
        message: 'An unexpected error occurred during validation',
      });
    }
  };
};

/**
 * Middleware to validate multiple parts of the request
 * @param schemas - Object containing schemas for different request properties
 */
export const validateMultiple = (schemas: {
  body?: z.ZodTypeAny;
  query?: z.ZodTypeAny;
  params?: z.ZodTypeAny;
}) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const errors: { field: string; message: string }[] = [];

      // Validate body if schema provided
      if (schemas.body) {
        try {
          (req as any).body = await schemas.body.parseAsync(req.body);
        } catch (error) {
          if (error instanceof z.ZodError) {
            errors.push(
              ...error.issues.map((issue) => ({
                field: `body.${issue.path.join('.')}`,
                message: issue.message,
              }))
            );
          }
        }
      }

      // Validate query if schema provided
      if (schemas.query) {
        try {
          (req as any).query = await schemas.query.parseAsync(req.query);
        } catch (error) {
          if (error instanceof z.ZodError) {
            errors.push(
              ...error.issues.map((issue) => ({
                field: `query.${issue.path.join('.')}`,
                message: issue.message,
              }))
            );
          }
        }
      }

      // Validate params if schema provided
      if (schemas.params) {
        try {
          (req as any).params = await schemas.params.parseAsync(req.params);
        } catch (error) {
          if (error instanceof z.ZodError) {
            errors.push(
              ...error.issues.map((issue) => ({
                field: `params.${issue.path.join('.')}`,
                message: issue.message,
              }))
            );
          }
        }
      }

      // If any errors, return them
      if (errors.length > 0) {
        logger.warn('Multiple validation failed', { errors });

        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.map(e => e.message),
          details: errors,
        });
        return;
      }

      next();
    } catch (error) {
      logger.error('Unexpected validation error', { error });
      
      res.status(500).json({
        success: false,
        message: 'An unexpected error occurred during validation',
      });
    }
  };
};