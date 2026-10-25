import type { RequestHandler } from 'express';
import type { AuthenticatedUser } from '../modules/auth/auth.token.js';
import { verifyAccessToken } from '../modules/auth/auth.token.js';
import { HttpError } from './httpError.js';

declare global {
  namespace Express {
    interface Request {
      authUser?: AuthenticatedUser;
    }
  }
}

export const authenticate: RequestHandler = (request, _response, next) => {
  const authorization = request.header('Authorization');
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];

  if (!token) {
    next(new HttpError(401, 'UNAUTHENTICATED', 'A bearer token is required.'));
    return;
  }

  try {
    request.authUser = verifyAccessToken(token);
    next();
  } catch (error) {
    next(error);
  }
};

export function requireRole(...allowedRoles: AuthenticatedUser['role'][]): RequestHandler {
  return (request, _response, next) => {
    if (!request.authUser || !allowedRoles.includes(request.authUser.role)) {
      next(new HttpError(403, 'FORBIDDEN', 'You do not have permission to perform this action.'));
      return;
    }

    next();
  };
}
