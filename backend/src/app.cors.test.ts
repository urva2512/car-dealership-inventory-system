import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app } from './app.js';

const frontendOrigin = 'http://localhost:5173';

describe('CORS configuration', () => {
  it('allows API requests from the Vite frontend origin', async () => {
    const response = await request(app)
      .get('/api/vehicles')
      .set('Origin', frontendOrigin);

    expect(response.status).toBe(200);
    expect(response.headers['access-control-allow-origin']).toBe(frontendOrigin);
  });

  it('handles frontend preflight requests', async () => {
    const response = await request(app)
      .options('/api/vehicles')
      .set('Origin', frontendOrigin)
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'authorization,content-type');

    expect(response.status).toBe(204);
    expect(response.headers['access-control-allow-origin']).toBe(frontendOrigin);
    expect(response.headers['access-control-allow-methods']).toContain('POST');
    expect(response.headers['access-control-allow-headers']).toContain('Authorization');
  });
});
