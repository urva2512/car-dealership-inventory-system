import { closeDatabasePool, getDatabasePool } from '../config/database.js';

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
}

function requestedName(): string {
  const argumentIndex = process.argv.indexOf('--name');
  const name = argumentIndex >= 0 ? process.argv[argumentIndex + 1]?.trim() : undefined;

  if (!name) {
    throw new Error('Usage: npm run user:promote-admin -- --name "Full Name"');
  }

  return name;
}

async function promoteAdmin(): Promise<void> {
  const name = requestedName();
  const pool = getDatabasePool();
  const matches = await pool.query<UserRow>(
    'SELECT id::text, name, email, role FROM users WHERE lower(name) = lower($1)',
    [name],
  );

  if (matches.rows.length !== 1) {
    throw new Error(`Expected exactly one user named "${name}", found ${matches.rows.length}. No role was changed.`);
  }

  const user = matches.rows[0];
  if (user.role === 'admin') {
    console.log(`${user.name} is already an admin.`);
    return;
  }

  const result = await pool.query<UserRow>(
    "UPDATE users SET role = 'admin' WHERE id = $1 AND role = 'user' RETURNING id::text, name, email, role",
    [user.id],
  );

  if (result.rowCount !== 1) {
    throw new Error('The user role could not be promoted. No role was changed.');
  }

  console.log(`Promoted ${result.rows[0].name} (${result.rows[0].email}) to admin.`);
}

try {
  await promoteAdmin();
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Admin promotion failed.');
  process.exitCode = 1;
} finally {
  await closeDatabasePool();
}
