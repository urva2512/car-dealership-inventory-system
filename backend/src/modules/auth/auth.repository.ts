import { getDatabasePool } from '../../config/database.js';

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: 'user' | 'admin';
  createdAt: Date;
}

export class AuthRepository {
  async findByEmail(email: string): Promise<UserRecord | null> {
    const result = await getDatabasePool().query<UserRecord>(
      `SELECT id::text, name, email, password_hash AS "passwordHash", role, created_at AS "createdAt"
       FROM users
       WHERE email = $1`,
      [email],
    );

    return result.rows[0] ?? null;
  }

  async create(input: Pick<UserRecord, 'name' | 'email' | 'passwordHash' | 'role'>): Promise<UserRecord> {
    const result = await getDatabasePool().query<UserRecord>(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id::text, name, email, password_hash AS "passwordHash", role, created_at AS "createdAt"`,
      [input.name, input.email, input.passwordHash, input.role],
    );

    return result.rows[0];
  }
}
