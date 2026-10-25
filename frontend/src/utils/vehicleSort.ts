import type { Vehicle, VehicleSort } from '../types';

export function sortVehicles(vehicles: Vehicle[], sort: VehicleSort): Vehicle[] {
  return [...vehicles].sort((left, right) => {
    switch (sort) {
      case 'price-asc': return Number(left.price) - Number(right.price);
      case 'price-desc': return Number(right.price) - Number(left.price);
      case 'name-asc': return `${left.make} ${left.model}`.localeCompare(`${right.make} ${right.model}`);
      case 'name-desc': return `${right.make} ${right.model}`.localeCompare(`${left.make} ${left.model}`);
      case 'stock-asc': return left.quantity - right.quantity;
      case 'stock-desc': return right.quantity - left.quantity;
      case 'newest': return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
    }
  });
}
