import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import logger from '../service/logger';

interface ValidationSchemas {
  body?: z.ZodTypeAny;
  query?: z.ZodTypeAny;
  params?: z.ZodTypeAny;
}

export function validate(schemas: ValidationSchemas) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate body
      if (schemas.body) {
        req.body = await schemas.body.parseAsync(req.body);
      }
      
      // Validate query
      if (schemas.query) {
        req.query = await schemas.query.parseAsync(req.query);
      }
      
      // Validate params
      if (schemas.params) {
        req.params = await schemas.params.parseAsync(req.params);
      }
      
      // Validation passed, continue
      return next();
      
    } catch (error) {
      // Handle validation errors
      if (error instanceof z.ZodError) {
        logger.warn('Validation failed', { errors: error.errors });
        
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
        return;
      }
      
      // Pass other errors to error handler
      return next(error);
    }
  };
}