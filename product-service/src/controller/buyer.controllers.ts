import * as express from 'express';
import { PrismaClient } from '@prisma/client';
import { querySchema, ProductQueryDTO } from '../dto/query';
import { productResponseSchema, ProductResponseDTO } from '../dto/product.response';

const prismaClient = new PrismaClient();

export async function getAllProducts(req: express.Request, res: express.Response): Promise<void> {
	try {
		const role = req.role;
        if(!role || role !== 'BUYER'){
            res.status(403).json({ message: "Forbidden", description: "Not authorized to access this route." });
            return;
        }

		const query = querySchema.parse(req.query);
		const {
			search,
			category,
			minPrice,
			maxPrice,
			sortBy = 'createdAt',
			order = 'desc'
		} = query;

		const where: any = {
			...(search && {
			OR: [
				{ name: { contains: search, mode: 'insensitive' } },
				{ description: { contains: search, mode: 'insensitive' } },
			],
			}),
			...(category && { category }),
			...(minPrice !== undefined && { price: { gte: minPrice } }),
			...(maxPrice !== undefined && { price: { ...(minPrice !== undefined ? { gte: minPrice } : {}), lte: maxPrice } }),
		};

		const products = await prismaClient.product.findMany({
			where,
			orderBy: { [sortBy]: order },
		});

		const validated = products.map((p) => productResponseSchema.parse({
            ...p,
            createdAt: p.createdAt.toISOString(),
            updatedAt: p.updatedAt.toISOString(),
        }));
		res.status(200).json({ data: validated, count: validated.length });
	} catch (err: any) {
		console.error('GET_ALL_PRODUCTS_ERROR', err);
		res.status(400).json({ error: err?.message || 'Failed to fetch products' });
	}
}