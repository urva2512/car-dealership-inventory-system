import { apiRequest } from './client';
import type { Vehicle, VehicleFilters, VehicleInput, VehicleUpdateInput } from '../types';

function searchString(filters: VehicleFilters): string {
  const parameters = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value?.trim()) {
      parameters.set(key, value.trim());
    }
  });

  const query = parameters.toString();
  return query ? `?${query}` : '';
}

export function listVehicles(filters: VehicleFilters = {}): Promise<Vehicle[]> {
  const hasFilters = Object.values(filters).some((value) => value?.trim());
  const path = hasFilters ? `/vehicles/search${searchString(filters)}` : '/vehicles';
  return apiRequest<Vehicle[]>(path);
}

export function listAdminVehicles(filters: VehicleFilters, token: string): Promise<Vehicle[]> {
  return apiRequest<Vehicle[]>(`/vehicles/admin${searchString(filters)}`, { token });
}

export function createVehicle(input: VehicleInput, token: string): Promise<Vehicle> {
  return apiRequest<Vehicle>('/vehicles', { method: 'POST', body: input, token });
}

export function updateVehicle(id: string, input: VehicleUpdateInput, token: string): Promise<Vehicle> {
  return apiRequest<Vehicle>(`/vehicles/${id}`, { method: 'PUT', body: input, token });
}

export function deleteVehicle(id: string, token: string): Promise<void> {
  return apiRequest<void>(`/vehicles/${id}`, { method: 'DELETE', token });
}

export function purchaseVehicle(id: string, token: string): Promise<Vehicle> {
  return apiRequest<Vehicle>(`/vehicles/${id}/purchase`, { method: 'POST', token });
}

export function restockVehicle(id: string, quantity: number, token: string): Promise<Vehicle> {
  return apiRequest<Vehicle>(`/vehicles/${id}/restock`, { method: 'POST', token, body: { quantity } });
}
