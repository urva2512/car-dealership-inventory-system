import { getDatabasePool } from '../../config/database.js';
import type { VehicleInput, VehicleSearchInput, VehicleUpdateInput } from './vehicle.validation.js';

export interface VehicleRecord extends Omit<VehicleInput, 'price'> {
  id: string;
  price: string;
  createdAt: Date;
  updatedAt: Date;
}

const vehicleColumns = `id::text, make, model, category, price, quantity,
  created_at AS "createdAt", updated_at AS "updatedAt"`;

export class VehicleRepository {
  async create(input: VehicleInput): Promise<VehicleRecord> {
    const result = await getDatabasePool().query<VehicleRecord>(
      `INSERT INTO vehicles (make, model, category, price, quantity)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING ${vehicleColumns}`,
      [input.make, input.model, input.category, input.price, input.quantity],
    );

    return result.rows[0];
  }

  private async find(filters: VehicleSearchInput, availableOnly: boolean): Promise<VehicleRecord[]> {
    const conditions = availableOnly ? ['quantity > 0'] : [];
    const values: unknown[] = [];

    const addTextFilter = (column: 'make' | 'model' | 'category', value: string | undefined) => {
      if (value !== undefined) {
        values.push(`%${value}%`);
        conditions.push(`${column} ILIKE $${values.length}`);
      }
    };

    addTextFilter('make', filters.make);
    addTextFilter('model', filters.model);
    addTextFilter('category', filters.category);

    if (filters.minPrice !== undefined) {
      values.push(filters.minPrice);
      conditions.push(`price >= $${values.length}`);
    }

    if (filters.maxPrice !== undefined) {
      values.push(filters.maxPrice);
      conditions.push(`price <= $${values.length}`);
    }

    const result = await getDatabasePool().query<VehicleRecord>(
      `SELECT ${vehicleColumns}
       FROM vehicles
       ${conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''}
       ORDER BY created_at DESC`,
      values,
    );

    return result.rows;
  }

  findAvailable(filters: VehicleSearchInput = {}): Promise<VehicleRecord[]> {
    return this.find(filters, true);
  }

  findAll(filters: VehicleSearchInput = {}): Promise<VehicleRecord[]> {
    return this.find(filters, false);
  }

  async update(id: number, input: VehicleUpdateInput): Promise<VehicleRecord | null> {
    const result = await getDatabasePool().query<VehicleRecord>(
      `UPDATE vehicles
       SET make = $1, model = $2, category = $3, price = $4, updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING ${vehicleColumns}`,
      [input.make, input.model, input.category, input.price, id],
    );

    return result.rows[0] ?? null;
  }

  async purchase(id: number): Promise<VehicleRecord | null> {
    const result = await getDatabasePool().query<VehicleRecord>(
      `UPDATE vehicles
       SET quantity = quantity - 1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND quantity > 0
       RETURNING ${vehicleColumns}`,
      [id],
    );

    return result.rows[0] ?? null;
  }

  async findQuantity(id: number): Promise<number | null> {
    const result = await getDatabasePool().query<{ quantity: number }>(
      'SELECT quantity FROM vehicles WHERE id = $1',
      [id],
    );

    return result.rows[0]?.quantity ?? null;
  }

  async restock(id: number, quantity: number): Promise<VehicleRecord | null> {
    const result = await getDatabasePool().query<VehicleRecord>(
      `UPDATE vehicles
       SET quantity = quantity + $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING ${vehicleColumns}`,
      [id, quantity],
    );

    return result.rows[0] ?? null;
  }

  async delete(id: number): Promise<boolean> {
    const result = await getDatabasePool().query('DELETE FROM vehicles WHERE id = $1', [id]);
    return result.rowCount === 1;
  }
}
