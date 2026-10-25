import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { afterAll, afterEach, describe, expect, it } from 'vitest';
import { app } from '../../app.js';
import { closeDatabasePool, getDatabasePool } from '../../config/database.js';

const createdEmails: string[] = [];
const createdVehicleIds: string[] = [];

function uniqueEmail(): string {
  return `vehicle-test-${randomUUID()}@example.com`;
}

async function registerUser(role: 'user' | 'admin' = 'user'): Promise<string> {
  const email = uniqueEmail();
  createdEmails.push(email);
  const password = 'secure-password-123';

  const registration = await request(app).post('/api/auth/register').send({
    name: role === 'admin' ? 'Vehicle Admin' : 'Vehicle User',
    email,
    password,
  }).expect(201);

  if (role === 'admin') {
    await getDatabasePool().query("UPDATE users SET role = 'admin' WHERE email = $1", [email]);
    return (await request(app).post('/api/auth/login').send({ email, password }).expect(200)).body.token;
  }

  return registration.body.token;
}

async function createVehicle(token: string, overrides: Record<string, unknown> = {}) {
  const response = await request(app)
    .post('/api/vehicles')
    .set('Authorization', `Bearer ${token}`)
    .send({
      make: 'Toyota',
      model: 'Camry',
      category: 'Sedan',
      price: 25000.5,
      quantity: 3,
      ...overrides,
    })
    .expect(201);

  createdVehicleIds.push(response.body.id);
  return response.body;
}

afterEach(async () => {
  if (createdVehicleIds.length > 0) {
    await getDatabasePool().query('DELETE FROM vehicles WHERE id = ANY($1::bigint[])', [createdVehicleIds]);
    createdVehicleIds.length = 0;
  }

  if (createdEmails.length > 0) {
    await getDatabasePool().query('DELETE FROM users WHERE email = ANY($1::text[])', [createdEmails]);
    createdEmails.length = 0;
  }
});

afterAll(async () => {
  await closeDatabasePool();
});

describe('vehicle inventory endpoints', () => {
  it('allows only administrators to create vehicles', async () => {
    const userToken = await registerUser();
    const adminToken = await registerUser('admin');

    const forbidden = await request(app)
      .post('/api/vehicles')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ make: 'Toyota', model: 'Camry', category: 'Sedan', price: 25000.5, quantity: 3 });
    expect(forbidden.status).toBe(403);

    const vehicle = await createVehicle(adminToken);

    expect(vehicle).toMatchObject({
      id: expect.any(String),
      make: 'Toyota',
      model: 'Camry',
      category: 'Sedan',
      price: '25000.50',
      quantity: 3,
    });
  });

  it('rejects vehicle creation without a valid access token', async () => {
    const response = await request(app).post('/api/vehicles').send({
      make: 'Toyota', model: 'Camry', category: 'Sedan', price: 25000, quantity: 1,
    });

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({ code: 'UNAUTHENTICATED' });
  });

  it('rejects invalid vehicle input', async () => {
    const token = await registerUser('admin');
    const response = await request(app)
      .post('/api/vehicles')
      .set('Authorization', `Bearer ${token}`)
      .send({ make: '', model: 'Camry', category: 'Sedan', price: -1, quantity: -1 });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ code: 'VALIDATION_ERROR' });
  });

  it('lists only vehicles that are in stock', async () => {
    const token = await registerUser('admin');
    const inStock = await createVehicle(token, { model: 'In Stock', quantity: 1 });
    const outOfStock = await createVehicle(token, { model: 'Out of Stock', quantity: 0 });

    const response = await request(app).get('/api/vehicles');

    expect(response.status).toBe(200);
    expect(response.body.some((vehicle: { id: string }) => vehicle.id === inStock.id)).toBe(true);
    expect(response.body.some((vehicle: { id: string }) => vehicle.id === outOfStock.id)).toBe(false);
  });

  it('allows administrators to list all vehicles, including out-of-stock vehicles', async () => {
    const adminToken = await registerUser('admin');
    const outOfStock = await createVehicle(adminToken, { model: 'Admin Visible', quantity: 0 });

    const response = await request(app)
      .get('/api/vehicles/admin')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.some((vehicle: { id: string }) => vehicle.id === outOfStock.id)).toBe(true);
  });

  it('searches in-stock vehicles using make, category, and price filters', async () => {
    const token = await registerUser('admin');
    const matching = await createVehicle(token, {
      make: 'Honda', model: 'CR-V', category: 'SUV', price: 32000, quantity: 2,
    });
    await createVehicle(token, { make: 'Honda', model: 'Civic', category: 'Sedan', price: 22000, quantity: 2 });

    const response = await request(app)
      .get('/api/vehicles/search')
      .query({ make: 'honda', category: 'suv', minPrice: 30000, maxPrice: 35000 });

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0]).toMatchObject({ id: matching.id, model: 'CR-V' });
  });

  it('rejects invalid search filters', async () => {
    const response = await request(app).get('/api/vehicles/search').query({ minPrice: -10 });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ code: 'VALIDATION_ERROR' });
  });

  it('allows only administrators to update vehicle details without changing stock', async () => {
    const token = await registerUser('admin');
    const userToken = await registerUser();
    const vehicle = await createVehicle(token);

    const forbidden = await request(app)
      .put(`/api/vehicles/${vehicle.id}`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ make: 'Toyota', model: 'Camry Hybrid', category: 'Sedan', price: 30000 });
    expect(forbidden.status).toBe(403);

    const response = await request(app)
      .put(`/api/vehicles/${vehicle.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ make: 'Toyota', model: 'Camry Hybrid', category: 'Sedan', price: 30000 });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ id: vehicle.id, model: 'Camry Hybrid', price: '30000.00', quantity: 3 });

    const stockOverwrite = await request(app)
      .put(`/api/vehicles/${vehicle.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ make: 'Toyota', model: 'Camry Hybrid', category: 'Sedan', price: 30000, quantity: 99 });

    expect(stockOverwrite.status).toBe(400);
    expect(stockOverwrite.body).toMatchObject({ code: 'VALIDATION_ERROR' });
  });

  it('returns 404 when updating a nonexistent vehicle', async () => {
    const token = await registerUser('admin');
    const response = await request(app)
      .put('/api/vehicles/999999999')
      .set('Authorization', `Bearer ${token}`)
      .send({ make: 'Toyota', model: 'Camry', category: 'Sedan', price: 25000 });

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({ code: 'VEHICLE_NOT_FOUND' });
  });

  it('allows only administrators to delete a vehicle', async () => {
    const userToken = await registerUser();
    const adminToken = await registerUser('admin');
    const vehicle = await createVehicle(adminToken);

    const forbidden = await request(app)
      .delete(`/api/vehicles/${vehicle.id}`)
      .set('Authorization', `Bearer ${userToken}`);
    expect(forbidden.status).toBe(403);
    expect(forbidden.body).toMatchObject({ code: 'FORBIDDEN' });

    const deleted = await request(app)
      .delete(`/api/vehicles/${vehicle.id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(deleted.status).toBe(204);
    createdVehicleIds.splice(createdVehicleIds.indexOf(vehicle.id), 1);
  });

  it('returns 404 when an administrator deletes a nonexistent vehicle', async () => {
    const adminToken = await registerUser('admin');
    const response = await request(app)
      .delete('/api/vehicles/999999999')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({ code: 'VEHICLE_NOT_FOUND' });
  });

  it('purchases one in-stock vehicle for an authenticated user', async () => {
    const token = await registerUser();
    const adminToken = await registerUser('admin');
    const vehicle = await createVehicle(adminToken, { quantity: 2 });

    const response = await request(app)
      .post(`/api/vehicles/${vehicle.id}/purchase`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ id: vehicle.id, quantity: 1 });
  });

  it('rejects purchases when the vehicle is out of stock', async () => {
    const token = await registerUser();
    const adminToken = await registerUser('admin');
    const vehicle = await createVehicle(adminToken, { quantity: 0 });

    const response = await request(app)
      .post(`/api/vehicles/${vehicle.id}/purchase`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject({ code: 'OUT_OF_STOCK' });
  });

  it('returns 404 when purchasing a nonexistent vehicle', async () => {
    const token = await registerUser();
    const response = await request(app)
      .post('/api/vehicles/999999999/purchase')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({ code: 'VEHICLE_NOT_FOUND' });
  });

  it('rejects unauthenticated purchase attempts', async () => {
    const response = await request(app).post('/api/vehicles/1/purchase');

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({ code: 'UNAUTHENTICATED' });
  });

  it('allows an administrator to restock a vehicle', async () => {
    const userToken = await registerUser();
    const adminToken = await registerUser('admin');
    const vehicle = await createVehicle(adminToken, { quantity: 2 });

    const response = await request(app)
      .post(`/api/vehicles/${vehicle.id}/restock`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ quantity: 5 });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ id: vehicle.id, quantity: 7 });
  });

  it('rejects restocking by a non-admin user', async () => {
    const token = await registerUser();
    const adminToken = await registerUser('admin');
    const vehicle = await createVehicle(adminToken);

    const response = await request(app)
      .post(`/api/vehicles/${vehicle.id}/restock`)
      .set('Authorization', `Bearer ${token}`)
      .send({ quantity: 1 });

    expect(response.status).toBe(403);
    expect(response.body).toMatchObject({ code: 'FORBIDDEN' });
  });

  it('rejects invalid restock quantities', async () => {
    const adminToken = await registerUser('admin');
    const vehicle = await createVehicle(adminToken);

    const response = await request(app)
      .post(`/api/vehicles/${vehicle.id}/restock`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ quantity: 0 });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ code: 'VALIDATION_ERROR' });
  });

  it('returns 404 when an administrator restocks a nonexistent vehicle', async () => {
    const adminToken = await registerUser('admin');
    const response = await request(app)
      .post('/api/vehicles/999999999/restock')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ quantity: 1 });

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({ code: 'VEHICLE_NOT_FOUND' });
  });

  it('handles concurrent purchases without allowing stock to become negative', async () => {
    const token = await registerUser();
    const adminToken = await registerUser('admin');
    const vehicle = await createVehicle(adminToken, { quantity: 1 });

    const responses = await Promise.all([
      request(app).post(`/api/vehicles/${vehicle.id}/purchase`).set('Authorization', `Bearer ${token}`),
      request(app).post(`/api/vehicles/${vehicle.id}/purchase`).set('Authorization', `Bearer ${token}`),
    ]);

    const statuses = responses.map((response) => response.status).sort();
    const successfulPurchase = responses.find((response) => response.status === 200);

    expect(statuses).toEqual([200, 409]);
    expect(successfulPurchase?.body).toMatchObject({ id: vehicle.id, quantity: 0 });
  });
});
