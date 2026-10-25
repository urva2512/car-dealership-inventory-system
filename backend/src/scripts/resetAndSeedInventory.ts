import { closeDatabasePool, getDatabasePool } from '../config/database.js';

type SampleVehicle = {
  make: string;
  model: string;
  category: string;
  price: number;
  quantity: number;
};

// Prices are current-style Indian-market demo prices in INR. The current
// vehicles table intentionally has no year, variant, or image-url columns.
const sampleInventory: readonly SampleVehicle[] = [
  { make: 'Maruti Suzuki', model: 'Swift', category: 'Hatchback', price: 649000, quantity: 8 },
  { make: 'Maruti Suzuki', model: 'Baleno', category: 'Hatchback', price: 799000, quantity: 6 },
  { make: 'Maruti Suzuki', model: 'Dzire', category: 'Sedan', price: 849000, quantity: 5 },
  { make: 'Hyundai', model: 'i20', category: 'Hatchback', price: 825000, quantity: 4 },
  { make: 'Hyundai', model: 'Verna', category: 'Sedan', price: 1199000, quantity: 3 },
  { make: 'Hyundai', model: 'Creta', category: 'SUV', price: 1649000, quantity: 7 },
  { make: 'Tata', model: 'Tiago', category: 'Hatchback', price: 599000, quantity: 9 },
  { make: 'Tata', model: 'Nexon', category: 'Compact SUV', price: 1199000, quantity: 6 },
  { make: 'Tata', model: 'Harrier', category: 'SUV', price: 1999000, quantity: 3 },
  { make: 'Mahindra', model: 'XUV 3XO', category: 'Compact SUV', price: 1149000, quantity: 5 },
  { make: 'Mahindra', model: 'Scorpio-N', category: 'SUV', price: 1899000, quantity: 4 },
  { make: 'Mahindra', model: 'XUV700', category: 'SUV', price: 2299000, quantity: 3 },
  { make: 'Honda', model: 'Amaze', category: 'Sedan', price: 899000, quantity: 4 },
  { make: 'Honda', model: 'Elevate', category: 'SUV', price: 1399000, quantity: 5 },
  { make: 'Toyota', model: 'Glanza', category: 'Hatchback', price: 789000, quantity: 4 },
  { make: 'Toyota', model: 'Hyryder', category: 'SUV', price: 1699000, quantity: 3 },
  { make: 'Toyota', model: 'Innova Crysta', category: 'MPV', price: 2399000, quantity: 2 },
  { make: 'Kia', model: 'Sonet', category: 'Compact SUV', price: 1099000, quantity: 6 },
  { make: 'Kia', model: 'Seltos', category: 'SUV', price: 1599000, quantity: 5 },
  { make: 'Volkswagen', model: 'Virtus', category: 'Sedan', price: 1499000, quantity: 3 },
  { make: 'Volkswagen', model: 'Taigun', category: 'SUV', price: 1599000, quantity: 3 },
  { make: 'Skoda', model: 'Slavia', category: 'Sedan', price: 1549000, quantity: 2 },
  { make: 'Skoda', model: 'Kushaq', category: 'SUV', price: 1699000, quantity: 3 },
  { make: 'BMW', model: 'X1', category: 'Luxury SUV', price: 5490000, quantity: 1 },
  { make: 'Mercedes-Benz', model: 'C-Class', category: 'Luxury Sedan', price: 6190000, quantity: 1 },
  { make: 'Audi', model: 'Q3', category: 'Luxury SUV', price: 4690000, quantity: 2 },
];

async function resetAndSeedInventory(): Promise<void> {
  const client = await getDatabasePool().connect();

  try {
    await client.query('BEGIN');
    // The schema has no foreign keys to vehicles. This delete affects only
    // inventory records; users and every other table remain untouched.
    const removed = await client.query('DELETE FROM vehicles');

    for (const vehicle of sampleInventory) {
      await client.query(
        `INSERT INTO vehicles (make, model, category, price, quantity)
         VALUES ($1, $2, $3, $4, $5)`,
        [vehicle.make, vehicle.model, vehicle.category, vehicle.price, vehicle.quantity],
      );
    }

    await client.query('COMMIT');
    console.log(`Replaced ${removed.rowCount ?? 0} vehicle record(s) with ${sampleInventory.length} sample vehicles.`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

try {
  await resetAndSeedInventory();
} catch (error) {
  console.error('Inventory reset and seed failed. No changes were committed.', error);
  process.exitCode = 1;
} finally {
  await closeDatabasePool();
}
