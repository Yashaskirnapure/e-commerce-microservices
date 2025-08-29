import * as express from 'express';
import { prismaClient } from '../db/prisma.client';
import { rabbitMQ } from '../rabbitmq/rabbitmq.helper';

import { CreateProductDTO, createProductSchema } from '../dto/create.product';
import { ProductResponseDTO, productResponseSchema } from '../dto/product.response';
import { UpdateProductDTO, updateProductSchema } from '../dto/update.product';

// create product controller
// /api/seller/create-product
export async function createProduct(req: express.Request, res: express.Response): Promise<void>{
    try{
        const product: CreateProductDTO = createProductSchema.parse(req.body);
        const role = req.role;

        if(!role || role !== 'SELLER'){
            res.status(403).json({ message: "Forbidden", description: "Not authorized to access this route." });
            return;
        }
        
        const quantity = req.body.quantity;
        if(!quantity || typeof quantity !== 'number' || quantity < 0){
            res.status(400).json({ message: "Invalid quantity" });
            return;
        }
        
        const upload = await prismaClient.$transaction(async (tx) => {
            const newUpload = await tx.product.create({
                data: { ...product, sellerId: req.userId! }
            });

            return newUpload;
        });

        try{
            await rabbitMQ.publishWithRetry('products_event', 'product.created', {
                productId: upload.id,
                quantity: quantity
            });

            console.log(`[createProduct] Published product.created event for productId: ${upload.id}`);
        }catch(pubError: any){
            console.error('[createProduct] Failed to publish product.created event', pubError);
            throw pubError;
        }

        const validated = productResponseSchema.parse({
            ...upload,
            createdAt: upload.createdAt.toISOString(),
            updatedAt: upload.updatedAt.toISOString(),
        });
        res.status(201).json(validated);
    }catch(err: any){
        console.error('CREATE_PRODUCT_ERROR', err);
        res.status(400).json({ error: err?.message || 'Failed to create product' });
    }
}

// update product controller
// /api/seller/update-product
export async function updateProduct(req: express.Request, res: express.Response): Promise<void> {
    try {
        const productId = parseInt(req.params.id);

        const role = req.role;
        if(!role || role !== 'SELLER'){
            res.status(403).json({ message: "Forbidden", description: "Not authorized to access this route." });
            return;
        }

        const sellerId = req.userId!;
        const data: UpdateProductDTO = updateProductSchema.parse(req.body);
    
        const existing = await prismaClient.product.findUnique({ where: { id: productId } });
        if (!existing || existing.sellerId !== sellerId) {
            res.status(403).json({ error: 'Not authorized to update this product' });
            return;
        }
    
        const updated = await prismaClient.product.update({
            where: { id: productId },
            data,
        });
    
        const validated = productResponseSchema.parse({
            ...updated,
            createdAt: updated.createdAt.toISOString(),
            updatedAt: updated.updatedAt.toISOString(),
        });
        res.status(200).json(validated);
    }catch(err: any) {
        console.error('UPDATE_PRODUCT_ERROR', err);
        res.status(400).json({ error: err?.message || 'Failed to update product' });
    }
}


// delete product controller
// /api/seller/delete
export async function deleteProduct(req: express.Request, res: express.Response): Promise<void> {
    try {
        const productId = parseInt(req.params.id);
        const role = req.role;
        if(!role || role !== 'SELLER'){
            res.status(403).json({ message: "Forbidden", description: "Not authorized to access this route." });
            return;
        }

        const sellerId = req.userId!;
        const result = await prismaClient.$transaction(async(tx) => {
            const rawResult = await tx.$queryRaw`
                SELECT * FROM "Product" WHERE id = ${productId} AND "sellerId" = ${sellerId} FOR UPDATE`;

            const products = rawResult as any[];
            if(!products || products.length === 0) throw new Error("Invalid productId")

            const product = await tx.product.update({
                where: { id: productId, sellerId: sellerId },
                data: { status: "OUT_OF_STOCK" }
            });

            return product;
        });
        
        try{
            await rabbitMQ.publishWithRetry('products_event', 'product.deleted', {
                productId: productId,
                sellerId: sellerId
            });

            console.log(`[createProduct] Published product.created event for productId: ${result.id}`);
        }catch(pubError: any){
            console.error('[createProduct] Failed to publish product.created event', pubError);
            throw pubError;
        }

        res.status(202).json({ message: `Deletion initiated for product id: ${result.id}`});
    }catch(err: any) {
        console.error('DELETE_PRODUCT_ERROR', err);
        res.status(400).json({ error: err?.message || 'Failed to delete product' });
    }
}


// get all products uploaded by seller
// /api/seller/products
export async function getSellerProducts(req: express.Request, res: express.Response): Promise<void> {
    try {
        const role = req.role;
        if(!role || role !== 'SELLER'){
            res.status(403).json({ message: "Forbidden", description: "Not authorized to access this route." });
            return;
        }

        const sellerId = req.userId!;
        const products = await prismaClient.product.findMany({
            where: { sellerId },
            orderBy: { createdAt: 'desc' },
        });

        const validated = products.map((p) => productResponseSchema.parse({
            ...p,
            createdAt: p.createdAt.toISOString(),
            updatedAt: p.updatedAt.toISOString(),
        }));
        res.status(200).json(validated);
    } catch (err: any) {
        console.error('GET_SELLER_PRODUCTS_ERROR', err);
        res.status(400).json({ error: err?.message || 'Failed to get seller products' });
    }
}

// get product details
export async function getProductInfo(req: express.Request, res: express.Response): Promise<void> {
    try{
        const productId = parseInt(req.params.id);
        const userId = req.userId;

        const item = await prismaClient.product.findUnique({
            where:{
                id: productId,
                sellerId: userId,
            }
        });

        const validated: ProductResponseDTO = productResponseSchema.parse(item);
        res.status(200).json(validated);
    }catch(err){
        console.error('GET_PRODUCT_INFO_ERROR', err);
        res.status(400).json({ message: 'Failed to get product information.' });
    }
}