import type { CorsOptions } from 'cors';

export const corsOptions: CorsOptions = {
  origin: process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173',
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Authorization', 'Content-Type'],
  optionsSuccessStatus: 204,
};
