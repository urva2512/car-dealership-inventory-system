import jwt, { type SignOptions } from 'jsonwebtoken';
import { HttpError } from '../../middleware/httpError.js';
import type { UserRecord } from './auth.repository.js';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: 'user' | 'admin';
}

function jwtSecret(): string {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error('Missing required environment variable: JWT_SECRET');
  }

  return secret;
}

export function createAccessToken(user: UserRecord): string {
  const expiresIn = (process.env.JWT_EXPIRES_IN ?? '1h') as SignOptions['expiresIn'];

  return jwt.sign(
    { email: user.email, role: user.role },
    jwtSecret(),
    { subject: user.id, expiresIn },
  );
}

export function verifyAccessToken(token: string): AuthenticatedUser {
  const secret = jwtSecret();

  try {
    const payload = jwt.verify(token, secret);

    if (
      typeof payload === 'string'
      || typeof payload.sub !== 'string'
      || typeof payload.email !== 'string'
      || (payload.role !== 'user' && payload.role !== 'admin')
    ) {
      throw new HttpError(401, 'UNAUTHENTICATED', 'Invalid access token.');
    }

    return { id: payload.sub, email: payload.email, role: payload.role };
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }

    throw new HttpError(401, 'UNAUTHENTICATED', 'Invalid or expired access token.');
  }
}
