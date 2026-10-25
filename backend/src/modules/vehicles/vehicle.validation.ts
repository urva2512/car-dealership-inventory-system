import { z } from 'zod';

const vehicleText = z.string().trim().min(1).max(100);
const price = z.coerce.number().finite().nonnegative().max(99_999_999.99);
const quantity = z.coerce.number().int().min(0).max(2_147_483_647);

export const vehicleSchema = z.object({
  make: vehicleText,
  model: vehicleText,
  category: vehicleText,
  price,
  quantity,
});

// Stock is deliberately absent here. Quantity changes only through the
// atomic purchase and restock operations, never through a details edit.
export const vehicleUpdateSchema = z.object({
  make: vehicleText,
  model: vehicleText,
  category: vehicleText,
  price,
}).strict();

export const vehicleIdSchema = z.object({
  id: z.coerce.number().int().positive().max(Number.MAX_SAFE_INTEGER),
});

export const restockSchema = z.object({
  quantity: z.coerce.number().int().positive().max(2_147_483_647),
});

export const vehicleSearchSchema = z.object({
  make: vehicleText.optional(),
  model: vehicleText.optional(),
  category: vehicleText.optional(),
  minPrice: price.optional(),
  maxPrice: price.optional(),
}).superRefine((value, context) => {
  if (value.minPrice !== undefined && value.maxPrice !== undefined && value.minPrice > value.maxPrice) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'minPrice cannot exceed maxPrice.',
      path: ['minPrice'],
    });
  }
});

export type VehicleInput = z.infer<typeof vehicleSchema>;
export type VehicleUpdateInput = z.infer<typeof vehicleUpdateSchema>;
export type VehicleId = z.infer<typeof vehicleIdSchema>;
export type RestockInput = z.infer<typeof restockSchema>;
export type VehicleSearchInput = z.infer<typeof vehicleSearchSchema>;
