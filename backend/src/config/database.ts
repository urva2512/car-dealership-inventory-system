import 'dotenv/config';
import { Pool, type PoolConfig } from 'pg';

let pool: Pool | undefined;

function requiredEnvironmentVariable(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required database environment variable: ${name}`);
  }

  return value;
}

function databaseConfig(): PoolConfig {
  const port = Number(requiredEnvironmentVariable('DB_PORT'));

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('DB_PORT must be an integer between 1 and 65535.');
  }

  return {
    host: requiredEnvironmentVariable('DB_HOST'),
    port,
    database: requiredEnvironmentVariable('DB_NAME'),
    user: requiredEnvironmentVariable('DB_USER'),
    password: requiredEnvironmentVariable('DB_PASSWORD'),
  };
}

export function getDatabasePool(): Pool {
  pool ??= new Pool(databaseConfig());
  return pool;
}

export async function closeDatabasePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = undefined;
  }
}
