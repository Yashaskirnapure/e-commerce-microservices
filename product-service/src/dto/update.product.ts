import { z } from 'zod';

export const updateProductSchema = z.object({
    name: z.string().min(1, "Name is required"),
    description: z.string().min(1, "Description is required"),
    price: z.number().positive("Price must be positive"),
    images: z.array(z.string().url()).optional().default([]),
});

export type UpdateProductDTO = z.infer<typeof updateProductSchema>;