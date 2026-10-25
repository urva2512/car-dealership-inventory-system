import { HttpError } from '../../middleware/httpError.js';
import { VehicleRepository, type VehicleRecord } from './vehicle.repository.js';
import type { RestockInput, VehicleInput, VehicleSearchInput, VehicleUpdateInput } from './vehicle.validation.js';

export class VehicleService {
  constructor(private readonly vehicleRepository = new VehicleRepository()) {}

  create(input: VehicleInput): Promise<VehicleRecord> {
    return this.vehicleRepository.create(input);
  }

  listAvailable(): Promise<VehicleRecord[]> {
    return this.vehicleRepository.findAvailable();
  }

  listAll(filters: VehicleSearchInput): Promise<VehicleRecord[]> {
    return this.vehicleRepository.findAll(filters);
  }

  search(filters: VehicleSearchInput): Promise<VehicleRecord[]> {
    return this.vehicleRepository.findAvailable(filters);
  }

  async update(id: number, input: VehicleUpdateInput): Promise<VehicleRecord> {
    const vehicle = await this.vehicleRepository.update(id, input);

    if (!vehicle) {
      throw new HttpError(404, 'VEHICLE_NOT_FOUND', 'Vehicle not found.');
    }

    return vehicle;
  }

  async delete(id: number): Promise<void> {
    const wasDeleted = await this.vehicleRepository.delete(id);

    if (!wasDeleted) {
      throw new HttpError(404, 'VEHICLE_NOT_FOUND', 'Vehicle not found.');
    }
  }

  async purchase(id: number): Promise<VehicleRecord> {
    const vehicle = await this.vehicleRepository.purchase(id);

    if (vehicle) {
      return vehicle;
    }

    const quantity = await this.vehicleRepository.findQuantity(id);

    if (quantity === null) {
      throw new HttpError(404, 'VEHICLE_NOT_FOUND', 'Vehicle not found.');
    }

    throw new HttpError(409, 'OUT_OF_STOCK', 'Vehicle is out of stock.');
  }

  async restock(id: number, input: RestockInput): Promise<VehicleRecord> {
    const vehicle = await this.vehicleRepository.restock(id, input.quantity);

    if (!vehicle) {
      throw new HttpError(404, 'VEHICLE_NOT_FOUND', 'Vehicle not found.');
    }

    return vehicle;
  }
}
