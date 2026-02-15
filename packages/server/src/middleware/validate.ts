import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

/**
 * Returns Express middleware that validates req.body against a Zod schema.
 */
export function validateBody(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next({
          statusCode: 400,
          message: 'Validation error',
          code: 'VALIDATION_ERROR',
          details: error.issues,
        });
      } else {
        next(error);
      }
    }
  };
}

/**
 * Returns Express middleware that validates req.query against a Zod schema.
 */
export function validateQuery(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      req.query = schema.parse(req.query) as typeof req.query;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next({
          statusCode: 400,
          message: 'Validation error',
          code: 'VALIDATION_ERROR',
          details: error.issues,
        });
      } else {
        next(error);
      }
    }
  };
}
