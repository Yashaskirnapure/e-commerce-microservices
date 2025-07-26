import { z } from 'zod';

export const querySchema = z.object({
    search: z.string().optional(),
    category: z.string().optional(),
    minPrice: z.coerce.number().min(0).optional(),
    maxPrice: z.coerce.number().min(0).optional(),
    sortBy: z.enum(['price', 'createdAt', 'name']).optional(),
    order: z.enum(['asc', 'desc']).optional(),
    limit: z.coerce.number().min(1).max(100).default(10),
    offset: z.coerce.number().min(0).default(0),
});

export type ProductQueryDTO = z.infer<typeof querySchema>;