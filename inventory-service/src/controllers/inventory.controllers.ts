import { Request, Response } from 'express';
import { Prisma, PrismaClient } from '@prisma/client';
import { InventoryItemDTO, inventoryItemSchema } from '../dto/inventory.item';
import { prismaClient } from '../db/client';

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
        const { quantity, secret } = req.body;

        if (!productId || typeof quantity !== "number" || quantity <= 0) throw { status: 400,  message: "Invalid productId or quantity" };
        if (!secret || secret !== process.env.CATALOG_SECRET) throw { status: 403, message: "Unauthorized request" };

        const result = await prismaClient.$transaction(async(tx: Prisma.TransactionClient) => {
            const rawResult = await tx.$queryRaw`SELECT * FROM Inventory WHERE productId = ${productId} FOR UPDATE`;

            const inventory = rawResult as any[];
            if (!inventory || inventory.length === 0) throw { status: 404, message: "Inventory not found" };

            const inv = inventory[0];
            const available = inv.quantity - inv.reserved;

            if (available < quantity) throw { status: 409, message: "Insufficient stock" };

            await tx.inventory.update({
                where: { productId },
                data: {
                    reserved: {
                        increment: quantity,
                    },
                },
            });

            return "Stock reserved successfully";
        })
        res.status(200).json({ message: result });
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
        if (!secret || secret !== process.env.CATALOG_SECRET) throw { status: 403, message: "Unauthorized request" };

        const result = await prismaClient.$transaction(async(tx: Prisma.TransactionClient) => {
            const rawResult = await tx.$queryRaw`SELECT * FROM Inventory WHERE productId = ${productId} FOR UPDATE`;

            const inventory = rawResult as any[];
            if (!inventory || inventory.length === 0) throw { status: 404, message: "Inventory not found" };

            const item: InventoryItemDTO = inventoryItemSchema.parse(inventory[0]);
            if(item.reserved < quantity) throw { status: 409, message: "Not enough reserved stock" };

            await tx.inventory.update({
                where: { productId },
                data: {
                    reserved: {
                        decrement: quantity,
                    },
                },
            });

            return "Stock updated successfully";
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
        const { secret, quantity } = req.body;

        if (!productId || typeof quantity !== "number" || quantity <= 0) throw { status: 400,  message: "Invalid productId or quantity" };
        if (!secret || secret !== process.env.CATALOG_SECRET) throw { status: 403, message: "Unauthorized request" };

        const result = await prismaClient.$transaction(async(tx: Prisma.TransactionClient) => {
            const rawResult = await tx.$queryRaw`SELECT * FROM Inventory WHERE productId = ${productId} FOR UPDATE`;

            const inventory = rawResult as any[];
            if (!inventory || inventory.length === 0) throw { status: 404, message: "Inventory not found" };

            await tx.inventory.update({
                where: { productId },
                data: {
                    quantity: {
                        increment: quantity,
                    },
                },
            });
        });

        res.status(200).json({ message: result });

    } catch (err: any) {
        const status = err?.status || 500;
        const message = err?.message || "Internal server error";

        console.error("Error in reserveStock:", err);
        res.status(status).json({ error: message });
    }
}

export async function createStockEntry(req: Request, res: Response): Promise<void> {
    try{
        const { productId, quantity, secret } = req.body;
        if (!productId || typeof quantity !== "number" || quantity <= 0) throw { status: 400,  message: "Invalid productId or quantity" };
        if (!secret || secret !== process.env.CATALOG_SECRET) throw { status: 403, message: "Unauthorized request" };
        
        const upload = await prismaClient.inventory.create({
            data: { productId: productId, quantity: quantity }
        });

        const validated = inventoryItemSchema.parse(upload);
        res.status(201).json(validated);
    }catch(err: any){
        const status = err?.status || 500;
        const message = err?.message || "Internal server error";

        console.error("Error in reserveStock:", err);
        res.status(status).json({ error: message });
    }
}