import { z } from 'zod';

export const inventoryItemSchema = z.object({
    productId: z.number().int().nonnegative(),
    quantity: z.number().int().nonnegative(),
    reserved: z.number().int().nonnegative(),
    restockAt: z.coerce.date().nullable().optional().transform((date) => date?.toISOString() ?? null),
    createdAt: z.coerce.date().transform((date) => date.toISOString()),
    updatedAt: z.coerce.date().transform((date) => date.toISOString()),
});
  
  export type InventoryItemDTO = z.infer<typeof inventoryItemSchema>;
  