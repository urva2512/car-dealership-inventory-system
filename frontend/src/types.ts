export type UserRole = 'user' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
}

export interface Session {
  token: string;
  user: User;
}

export interface Vehicle {
  id: string;
  make: string;
  model: string;
  category: string;
  price: string;
  quantity: number;
  createdAt: string;
  updatedAt: string;
}

export interface VehicleFilters {
  make?: string;
  model?: string;
  category?: string;
  minPrice?: string;
  maxPrice?: string;
}

export interface VehicleInput {
  make: string;
  model: string;
  category: string;
  price: number;
  quantity: number;
}

export type VehicleUpdateInput = Omit<VehicleInput, 'quantity'>;

export type VehicleSort = 'newest' | 'price-asc' | 'price-desc' | 'name-asc' | 'name-desc' | 'stock-asc' | 'stock-desc';
