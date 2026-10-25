import type { RequestHandler } from 'express';
import { VehicleService } from './vehicle.service.js';
import type { RestockInput, VehicleId, VehicleInput, VehicleSearchInput, VehicleUpdateInput } from './vehicle.validation.js';

const vehicleService = new VehicleService();

export const createVehicle: RequestHandler = async (request, response, next) => {
  try {
    const vehicle = await vehicleService.create(request.body as VehicleInput);
    response.status(201).json(vehicle);
  } catch (error) {
    next(error);
  }
};

export const listVehicles: RequestHandler = async (_request, response, next) => {
  try {
    response.status(200).json(await vehicleService.listAvailable());
  } catch (error) {
    next(error);
  }
};

export const listAllVehicles: RequestHandler = async (request, response, next) => {
  try {
    response.status(200).json(await vehicleService.listAll(request.query as unknown as VehicleSearchInput));
  } catch (error) {
    next(error);
  }
};

export const searchVehicles: RequestHandler = async (request, response, next) => {
  try {
    response.status(200).json(await vehicleService.search(request.query as unknown as VehicleSearchInput));
  } catch (error) {
    next(error);
  }
};

export const updateVehicle: RequestHandler = async (request, response, next) => {
  try {
    const { id } = request.params as unknown as VehicleId;
    response.status(200).json(await vehicleService.update(id, request.body as VehicleUpdateInput));
  } catch (error) {
    next(error);
  }
};

export const deleteVehicle: RequestHandler = async (request, response, next) => {
  try {
    const { id } = request.params as unknown as VehicleId;
    await vehicleService.delete(id);
    response.sendStatus(204);
  } catch (error) {
    next(error);
  }
};

export const purchaseVehicle: RequestHandler = async (request, response, next) => {
  try {
    const { id } = request.params as unknown as VehicleId;
    response.status(200).json(await vehicleService.purchase(id));
  } catch (error) {
    next(error);
  }
};

export const restockVehicle: RequestHandler = async (request, response, next) => {
  try {
    const { id } = request.params as unknown as VehicleId;
    response.status(200).json(await vehicleService.restock(id, request.body as RestockInput));
  } catch (error) {
    next(error);
  }
};
