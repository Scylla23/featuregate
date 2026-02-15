import { Request, Response, NextFunction } from 'express';
import { AppError, ValidationError } from '../utils/errors.js';
import mongoose from 'mongoose';

export function globalErrorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // Validation middleware error objects (from validate.ts)
  if (
    err &&
    typeof err === 'object' &&
    'statusCode' in err &&
    'code' in err &&
    (err as Record<string, unknown>).code === 'VALIDATION_ERROR'
  ) {
    const e = err as Record<string, unknown>;
    res.status(e.statusCode as number).json({
      error: e.message,
      details: e.details,
    });
    return;
  }

  // Custom AppError subclasses
  if (err instanceof AppError) {
    const response: Record<string, unknown> = { error: err.message };
    if (err instanceof ValidationError && err.details) {
      response.details = err.details;
    }
    res.status(err.statusCode).json(response);
    return;
  }

  if (err instanceof Error) {
    // Mongoose validation error
    if (err instanceof mongoose.Error.ValidationError) {
      res.status(400).json({
        error: 'Database validation failed',
        details: Object.values(err.errors).map((e) => ({
          field: e.path,
          message: e.message,
        })),
      });
      return;
    }

    // MongoDB duplicate key error (code 11000)
    if (err.name === 'MongoServerError' && (err as { code?: number }).code === 11000) {
      const keyPattern = (err as { keyPattern?: Record<string, number> }).keyPattern || {};
      const field = Object.keys(keyPattern)[0] || 'unknown';
      res.status(409).json({
        error: `A resource with this ${field} already exists`,
      });
      return;
    }
  }

  // Unhandled errors
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
  });
}
