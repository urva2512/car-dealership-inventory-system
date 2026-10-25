import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { afterAll, afterEach, describe, expect, it } from 'vitest';
import { app } from '../../app.js';
import { closeDatabasePool, getDatabasePool } from '../../config/database.js';

const createdEmails: string[] = [];

function uniqueEmail(): string {
  return `auth-test-${randomUUID()}@example.com`;
}

async function createAdminToken(): Promise<string> {
  const email = uniqueEmail();
  const password = 'secure-password-123';
  createdEmails.push(email);

  await request(app).post('/api/auth/register').send({
    name: 'Existing Admin',
    email,
    password,
  }).expect(201);
  await getDatabasePool().query("UPDATE users SET role = 'admin' WHERE email = $1", [email]);

  return (await request(app).post('/api/auth/login').send({ email, password }).expect(200)).body.token;
}

afterEach(async () => {
  if (createdEmails.length > 0) {
    await getDatabasePool().query('DELETE FROM users WHERE email = ANY($1::text[])', [createdEmails]);
    createdEmails.length = 0;
  }
});

afterAll(async () => {
  await closeDatabasePool();
});

describe('authentication endpoints', () => {
  it('registers a user, returns a session, and never permits a public admin role', async () => {
    const email = uniqueEmail();
    createdEmails.push(email);

    const response = await request(app).post('/api/auth/register').send({
      name: 'Ada Lovelace',
      email,
      password: 'secure-password-123',
      role: 'admin',
    });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      token: expect.any(String),
      user: {
        id: expect.any(String),
        name: 'Ada Lovelace',
        email,
        role: 'user',
      },
    });
    expect(response.body.user.password_hash).toBeUndefined();
  });

  it('rejects duplicate email registration', async () => {
    const email = uniqueEmail();
    createdEmails.push(email);
    const user = { name: 'Grace Hopper', email, password: 'secure-password-123' };

    await request(app).post('/api/auth/register').send(user).expect(201);
    const response = await request(app).post('/api/auth/register').send(user);

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject({ code: 'EMAIL_ALREADY_EXISTS' });
  });

  it('rejects invalid registration input', async () => {
    const response = await request(app).post('/api/auth/register').send({
      name: '',
      email: 'not-an-email',
      password: 'short',
    });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ code: 'VALIDATION_ERROR' });
  });

  it('logs in with valid credentials', async () => {
    const email = uniqueEmail();
    createdEmails.push(email);
    const password = 'secure-password-123';

    await request(app).post('/api/auth/register').send({
      name: 'Katherine Johnson',
      email,
      password,
    }).expect(201);

    const response = await request(app).post('/api/auth/login').send({ email, password });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      token: expect.any(String),
      user: { email, name: 'Katherine Johnson', role: 'user' },
    });
    expect(response.body.user.password_hash).toBeUndefined();
  });

  it('rejects an incorrect password without revealing which credential failed', async () => {
    const email = uniqueEmail();
    createdEmails.push(email);

    await request(app).post('/api/auth/register').send({
      name: 'Dorothy Vaughan',
      email,
      password: 'secure-password-123',
    }).expect(201);

    const response = await request(app).post('/api/auth/login').send({
      email,
      password: 'incorrect-password',
    });

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({ code: 'INVALID_CREDENTIALS' });
  });

  it('rejects missing login credentials', async () => {
    const response = await request(app).post('/api/auth/login').send({ email: uniqueEmail() });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ code: 'VALIDATION_ERROR' });
  });

  it('allows an authenticated admin to create another admin without returning a token', async () => {
    const adminToken = await createAdminToken();
    const email = uniqueEmail();
    createdEmails.push(email);

    const response = await request(app)
      .post('/api/auth/admin')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'New Administrator', email, password: 'secure-password-123' });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      id: expect.any(String),
      name: 'New Administrator',
      email,
      role: 'admin',
    });
    expect(response.body.token).toBeUndefined();
    expect(response.body.password_hash).toBeUndefined();
  });

  it('rejects admin account creation by unauthenticated and non-admin users', async () => {
    const email = uniqueEmail();
    const password = 'secure-password-123';
    createdEmails.push(email);
    const body = { name: 'Attempted Admin', email: uniqueEmail(), password };
    createdEmails.push(body.email);

    const unauthenticated = await request(app).post('/api/auth/admin').send(body);
    expect(unauthenticated.status).toBe(401);
    expect(unauthenticated.body).toMatchObject({ code: 'UNAUTHENTICATED' });

    const registration = await request(app).post('/api/auth/register').send({ name: 'Standard User', email, password }).expect(201);
    const nonAdmin = await request(app)
      .post('/api/auth/admin')
      .set('Authorization', `Bearer ${registration.body.token}`)
      .send(body);
    expect(nonAdmin.status).toBe(403);
    expect(nonAdmin.body).toMatchObject({ code: 'FORBIDDEN' });
  });
});
