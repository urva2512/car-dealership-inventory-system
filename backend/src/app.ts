import cors from 'cors';
import express from 'express';
import { corsOptions } from './config/cors.js';
import { errorHandler } from './middleware/errorHandler.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { vehicleRouter } from './modules/vehicles/vehicle.routes.js';

export const app = express();

app.use(cors(corsOptions));
app.use(express.json());
app.use('/api/auth', authRouter);
app.use('/api/vehicles', vehicleRouter);
app.use(errorHandler);
