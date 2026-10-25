import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { closeDatabasePool, getDatabasePool } from '../config/database.js';

async function initializeDatabase(): Promise<void> {
  const schemaPath = resolve(process.cwd(), 'sql', 'init.sql');
  const schema = await readFile(schemaPath, 'utf8');

  await getDatabasePool().query(schema);
  console.log('Database schema initialized successfully.');
}

try {
  await initializeDatabase();
} catch (error) {
  console.error('Database initialization failed.', error);
  process.exitCode = 1;
} finally {
  await closeDatabasePool();
}
