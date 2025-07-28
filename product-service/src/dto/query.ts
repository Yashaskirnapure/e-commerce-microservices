import { z } from 'zod';

export const querySchema = z.object({
    search: z.string().optional(),
    category: z.string().optional(),
    minPrice: z.coerce.number().min(0).optional(),
    maxPrice: z.coerce.number().min(0).optional(),
    sortBy: z.enum(['price', 'createdAt', 'name']).optional(),
    order: z.enum(['asc', 'desc']).optional()
});

export type ProductQueryDTO = z.infer<typeof querySchema>;