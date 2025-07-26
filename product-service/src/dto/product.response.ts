import { z } from 'zod';

export const productResponseSchema = z.object({
	id: z.number(),
	name: z.string(),
	description: z.string(),
	price: z.number(),
	images: z.array(z.string()).optional(),
	createdAt: z.string(),
	updatedAt: z.string(),
});

export type ProductResponseDTO = z.infer<typeof productResponseSchema>;