import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/authenticate.js';
import { validateBody, validateParams, validateQuery } from '../../middleware/validateRequest.js';
import { createVehicle, deleteVehicle, listAllVehicles, listVehicles, purchaseVehicle, restockVehicle, searchVehicles, updateVehicle } from './vehicle.controller.js';
import { restockSchema, vehicleIdSchema, vehicleSchema, vehicleSearchSchema, vehicleUpdateSchema } from './vehicle.validation.js';

export const vehicleRouter = Router();

vehicleRouter.get('/', listVehicles);
vehicleRouter.get('/search', validateQuery(vehicleSearchSchema), searchVehicles);
vehicleRouter.get('/admin', authenticate, requireRole('admin'), validateQuery(vehicleSearchSchema), listAllVehicles);
vehicleRouter.post('/', authenticate, requireRole('admin'), validateBody(vehicleSchema), createVehicle);
vehicleRouter.put('/:id', authenticate, requireRole('admin'), validateParams(vehicleIdSchema), validateBody(vehicleUpdateSchema), updateVehicle);
vehicleRouter.delete('/:id', authenticate, requireRole('admin'), validateParams(vehicleIdSchema), deleteVehicle);
vehicleRouter.post('/:id/purchase', authenticate, validateParams(vehicleIdSchema), purchaseVehicle);
vehicleRouter.post('/:id/restock', authenticate, requireRole('admin'), validateParams(vehicleIdSchema), validateBody(restockSchema), restockVehicle);
