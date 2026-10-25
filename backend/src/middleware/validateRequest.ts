import type { RequestHandler } from 'express';
import type { ZodTypeAny } from 'zod';
import { HttpError } from './httpError.js';

export function validateBody(schema: ZodTypeAny): RequestHandler {
  return (request, _response, next) => {
    const result = schema.safeParse(request.body);

    if (!result.success) {
      next(new HttpError(400, 'VALIDATION_ERROR', 'Invalid request body.', result.error.flatten()));
      return;
    }

    request.body = result.data;
    next();
  };
}

export function validateParams(schema: ZodTypeAny): RequestHandler {
  return (request, _response, next) => {
    const result = schema.safeParse(request.params);

    if (!result.success) {
      next(new HttpError(400, 'VALIDATION_ERROR', 'Invalid request parameters.', result.error.flatten()));
      return;
    }

    request.params = result.data as never;
    next();
  };
}

export function validateQuery(schema: ZodTypeAny): RequestHandler {
  return (request, _response, next) => {
    const result = schema.safeParse(request.query);

    if (!result.success) {
      next(new HttpError(400, 'VALIDATION_ERROR', 'Invalid query parameters.', result.error.flatten()));
      return;
    }

    request.query = result.data as never;
    next();
  };
}
