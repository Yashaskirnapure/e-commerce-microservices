import { z } from 'zod';

export const stockEntryRequestSchema = z.object({
    productId: z.number().int().nonnegative({ message: "Invalid product ID format" }),
    quantity: z.number().int().nonnegative({ message: "Quantity must be a positive integer" }),
});

export type StockEntryRequestDTO = z.infer<typeof stockEntryRequestSchema>;