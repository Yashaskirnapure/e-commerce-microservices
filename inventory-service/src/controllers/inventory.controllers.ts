import { Request, Response } from 'express';
import { Prisma, PrismaClient } from '@prisma/client';
import { InventoryItemDTO, inventoryItemSchema } from '../dto/inventory.item';
import { prismaClient } from '../db/client';
import { rabbitMQ } from '../rabbitmq/rabbitmq.helper';

export async function getStock(req: Request, res: Response): Promise<void> {
    try {
        const productId = parseInt(req.params.productId);
        const secret = req.body.secret;

        if (!secret || secret !== process.env.CATALOG_SECRET) throw { status: 403, message: "Unauthorized request" };
        if (isNaN(productId)) throw { status: 400,  message: "Invalid productId or quantity" };

        const rawInventory = await prismaClient.inventory.findUnique({ where: { productId } });
        if (!rawInventory) throw { status: 404, message: "Inventory not found" };

        const inventory: InventoryItemDTO = inventoryItemSchema.parse(rawInventory);
        res.status(200).json({ stock: inventory.quantity });
    } catch (err: any) {
        const status = err?.status || 500;
        const message = err?.message || "Internal server error";

        console.error("Error in reserveStock:", err);
        res.status(status).json({ error: message });
    }
}

export async function reserveStock(req: Request, res: Response): Promise<void> {
    try {
        const productId = parseInt(req.params.productId);
        const { quantity } = req.body;

        if (!productId || typeof quantity !== "number" || quantity <= 0) throw { status: 400,  message: "Invalid productId or quantity" };

        const result = await prismaClient.$transaction(async(tx: Prisma.TransactionClient) => {
            const rawResult = await tx.$queryRaw`SELECT * FROM "Inventory" WHERE "productId" = ${productId} FOR UPDATE`;

            const inventory = rawResult as any[];
            if (!inventory || inventory.length === 0) throw { status: 404, message: "Inventory not found" };

            const inv = inventory[0];
            const available = inv.quantity - inv.reserved;

            if (available < quantity) throw { status: 409, message: "Insufficient stock" };

            const updatedItem = await tx.inventory.update({
                where: { productId },
                data: {
                    reserved: {
                        increment: quantity,
                    },
                },
            });

            return updatedItem;
        });

        if(result.quantity-result.reserved === 0){
            try{
                await rabbitMQ.publishWithRetry('inventory_event', 'stock.out_of_stock', {
                    productId: result.productId
                });
                console.log(`[reserveStock] Stock empty for productId: ${result.productId}, published event`);
            } catch (pubError) {
                console.error("[replenishStock] Failed to publish stock.out_of_stock event", pubError);
                throw pubError;
            }
        }

        res.status(200).json(result);
    } catch (err: any) {
        const status = err?.status || 500;
        const message = err?.message || "Internal server error";

        console.error("Error in reserveStock:", err);
        res.status(status).json({ error: message });
    }
}

export async function sellStock(req: Request, res: Response): Promise<void> {
    try {
        const productId = parseInt(req.params.productId);
        const { quantity, secret } = req.body;

        if (!productId || typeof quantity !== "number" || quantity <= 0) throw { status: 400,  message: "Invalid productId or quantity" };

        const result = await prismaClient.$transaction(async(tx: Prisma.TransactionClient) => {
            const rawResult = await tx.$queryRaw`SELECT * FROM "Inventory" WHERE "productId" = ${productId} FOR UPDATE`;

            const inventory = rawResult as any[];
            if (!inventory || inventory.length === 0) throw { status: 404, message: "Inventory not found" };

            const item: InventoryItemDTO = inventoryItemSchema.parse(inventory[0]);
            if(item.reserved < quantity) throw { status: 409, message: "Not enough reserved stock" };

            const updatedItem = await tx.inventory.update({
                where: { productId },
                data: {
                    reserved: {
                        decrement: quantity,
                    },
                },
            });

            return updatedItem;
        });

        res.status(200).json({ message: result });
    } catch (err: any) {
        const status = err?.status || 500;
        const message = err?.message || "Internal server error";

        console.error("Error in reserveStock:", err);
        res.status(status).json({ error: message });
    }
}

export async function replenishStock(req: Request, res: Response): Promise<void> {
    try {
        const productId = parseInt(req.params.productId);
        const { quantity } = req.body;

        if (!productId || typeof quantity !== "number" || quantity <= 0) throw { status: 400,  message: "Invalid productId or quantity" };

        let productEvent = false;
        const result = await prismaClient.$transaction(async(tx: Prisma.TransactionClient) => {
            const rawResult = await tx.$queryRaw`SELECT * FROM "Inventory" WHERE "productId" = ${productId} FOR UPDATE`;

            const inventory = rawResult as any[];
            if (!inventory || inventory.length === 0) throw { status: 404, message: "Inventory not found" };
            
            const initialQuantity = inventory[0].quantity-inventory[0].reserved;
            if(initialQuantity === 0) productEvent = true;

            const updatedItem = await tx.inventory.update({
                where: { productId },
                data: {
                    quantity: {
                        increment: quantity,
                    },
                },
            });

            return updatedItem;
        });

        if(productEvent){
            try {
                await rabbitMQ.publishWithRetry("inventory_event", "stock.replenish", {
                    productId: result.productId
                });

                console.log(`[replenishStock] Stock updated for productId: ${result.productId}, published event`);
            } catch (pubError) {
                console.error("[replenishStock] Failed to publish stock.replenish event", pubError);
                throw pubError;
            }
        }

        res.status(200).json(result);

    } catch (err: any) {
        const status = err?.status || 500;
        const message = err?.message || "Internal server error";

        console.error("Error in reserveStock:", err);
        res.status(status).json({ error: message });
    }
}

export async function releaseStock(req: Request, res: Response): Promise<void>{
    try{
        const productId = parseInt(req.params.id);
        const { quantity } = req.body;

        let event: boolean = false;
        const result = await prismaClient.$transaction(async(tx: Prisma.TransactionClient) => {
            const item = await prismaClient.$queryRaw`SELECT * FROM "Inventory" WHERE "productId" = ${productId} FOR UPDATE`;

            const inventory = item as any[];
            if(!inventory || inventory.length === 0) throw { status: 400,  message: "Invalid productId or quantity" };

            if(inventory[0].quantity == inventory[0].reserved) event = true;
            const updatedItem = await prismaClient.inventory.update({
                where: { productId: productId },
                data: { 
                    reserved: { decrement: quantity }
                }
            });

            return updatedItem;
        });

        try {
            await rabbitMQ.publishWithRetry("inventory_event", "stock.replenish", {
                productId: result.productId
            });

            console.log(`[replenishStock] Stock updated for productId: ${result.productId}, published event`);
        } catch (pubError) {
            console.error("[replenishStock] Failed to publish stock.replenish event", pubError);
            throw pubError;
        }

        res.status(201).json(result);
    }catch(err: any){
        const status = err?.status || 500;
        const message = err?.message || "Internal server error";

        console.error("Error in reserveStock:", err);
        res.status(status).json({ error: message });
    }
}