import bcrypt from 'bcrypt';
import { HttpError } from '../../middleware/httpError.js';
import { createAccessToken } from './auth.token.js';
import { AuthRepository, type UserRecord } from './auth.repository.js';
import type { LoginInput, RegisterInput } from './auth.validation.js';

const PASSWORD_SALT_ROUNDS = 12;

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  createdAt: Date;
}

export interface AuthResult {
  token: string;
  user: PublicUser;
}

function toPublicUser(user: UserRecord): PublicUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
  };
}

function isUniqueConstraintError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === '23505';
}

export class AuthService {
  constructor(private readonly authRepository = new AuthRepository()) {}

  private async createUser(input: RegisterInput, role: UserRecord['role']): Promise<UserRecord> {
    const existingUser = await this.authRepository.findByEmail(input.email);

    if (existingUser) {
      throw new HttpError(409, 'EMAIL_ALREADY_EXISTS', 'An account with this email already exists.');
    }

    const passwordHash = await bcrypt.hash(input.password, PASSWORD_SALT_ROUNDS);
    let user: UserRecord;

    try {
      user = await this.authRepository.create({
        name: input.name,
        email: input.email,
        passwordHash,
        role,
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new HttpError(409, 'EMAIL_ALREADY_EXISTS', 'An account with this email already exists.');
      }

      throw error;
    }

    return user;
  }

  async register(input: RegisterInput): Promise<AuthResult> {
    const user = await this.createUser(input, 'user');
    return { token: createAccessToken(user), user: toPublicUser(user) };
  }

  async createAdmin(input: RegisterInput): Promise<PublicUser> {
    return toPublicUser(await this.createUser(input, 'admin'));
  }

  async login(input: LoginInput): Promise<AuthResult> {
    const user = await this.authRepository.findByEmail(input.email);
    const isPasswordValid = user ? await bcrypt.compare(input.password, user.passwordHash) : false;

    if (!user || !isPasswordValid) {
      throw new HttpError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.');
    }

    return { token: createAccessToken(user), user: toPublicUser(user) };
  }
}
