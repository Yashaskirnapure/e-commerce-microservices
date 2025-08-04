import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { privateDecrypt } from 'crypto';

const prismaClient = new PrismaClient();

export async function getStock(req: Request, res: Response): Promise<void> {
    try {
        const productId = parseInt(req.params.productId);
        const secret = req.body.secret;

        if (secret !== process.env.CATALOG_SECRET) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        if (isNaN(productId)) {
            res.status(400).json({ error: 'Invalid productId' });
            return;
        }

        const inventory = await prismaClient.inventory.findUnique({
            where: { productId },
        });

        if (!inventory) {
            res.status(404).json({ error: 'Inventory not found' });
            return;
        }

        res.status(200).json({ stock: inventory.stock });
    } catch (err: any) {
        console.error('Error getting stock:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
}

export async function reserveStock(req: Request, res: Response): Promise<void> {
    try {
        const { productId, quantity, secret } = req.body;

        if (!productId || typeof quantity !== "number" || quantity <= 0) {
            res.status(400).json({ error: "Invalid productId or quantity" });
            return;
        }

        if (!secret || secret !== process.env.CATALOG_SECRET) {
            res.status(403).json({ error: "Unauthorized request" });
            return;
        }

        const inventory = await prismaClient.inventory.findUnique({ where: { productId: productId } });
        if (!inventory) {
            res.status(404).json({ error: 'Inventory not found' });
            return;
        }

        const available = inventory.quantity - inventory.reserved;
        if (available < quantity) {
            res.status(409).json({ error: "Insufficient stock" });
            return;
        }

        const result = await prismaClient.inventory.updateMany({
            where: {
                productId: productId,
                reserved: { lte: inventory.reserved },
                quantity: { gte: inventory.reserved + quantity }
            },
            data: {
                reserved: { increment: quantity },
            },
        });

        if (result.count === 0) {
            res.status(409).json({ error: "Failed to reserve stock due to concurrent update. Please retry." });
            return;
        }

        res.status(200).json({ message: "Stock reserved successfully" });
    } catch (err: any) {
        console.error("Error in reserveStock:", err);
        res.status(500).json({ error: "Internal server error" });
    }
}

export async function releaseStock(req: Request, res: Response): Promise<void> {
    try {
        const { productId, quantity, secret } = req.body;

        if (!productId || typeof quantity !== "number" || quantity <= 0) {
            res.status(400).json({ error: "Invalid productId or quantity" });
            return;
        }

        if (!secret || secret !== process.env.CATALOG_SECRET) {
            res.status(403).json({ error: "Unauthorized request" });
            return;
        }

        const inventory = await prismaClient.inventory.findUnique({ where: { productId } });
        if (!inventory) {
            res.status(404).json({ error: 'Inventory not found' });
            return;
        }

        if (inventory.reserved < quantity) {
            res.status(409).json({ error: "Cannot release more than reserved stock" });
            return;
        }

        const result = await prismaClient.inventory.updateMany({
            where: {
                productId,
                reserved: { gte: quantity }
            },
            data: {
                reserved: { decrement: quantity }
            }
        });

        if (result.count === 0) {
            res.status(409).json({ error: "Failed to release stock due to concurrent update. Please retry." });
            return;
        }

        res.status(200).json({ message: "Stock released successfully" });
    } catch (err: any) {
        console.error("Error in releaseStock:", err);
        res.status(500).json({ error: "Internal server error" });
    }
}

export async function replenishStock(req: Request, res: Response): Promise<void> {
    try {
        const { secret, productId, quantity } = req.body;

        if (!productId || typeof quantity !== "number" || quantity <= 0) {
            res.status(400).json({ error: "Invalid productId or quantity" });
            return;
        }

        if (!secret || secret !== process.env.CATALOG_SECRET) {
            res.status(403).json({ error: "Unauthorized request" });
            return;
        }

        const inventory = await prismaClient.inventory.findUnique({
            where: { productId }
        });

        if (!inventory) {
            res.status(404).json({ error: "Inventory not found" });
            return;
        }

        const result = await prismaClient.inventory.updateMany({
            where: {
                productId: productId,
                quantity: inventory.quantity
            },
            data: {
                quantity: { increment: quantity }
            }
        });

        if (result.count === 0) {
            res.status(409).json({ error: "Conflict detected, please retry" });
            return;
        }

        res.status(200).json({ message: "Stock replenished successfully" });

    } catch (err: any) {
        console.error("Error in replenishStock:", err);
        res.status(500).json({ error: "Internal server error" });
    }
}
