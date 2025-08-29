import { prismaClient } from "../db/prisma.client";
import { Request, Response } from "express";

export async function getProducts(req: Request, res: Response): Promise<void> {
    try{
        const items = await prismaClient.product.findMany({ where: { status: "AVAILABLE" } });
        res.status(200).json(items);
    }catch(err){
        console.log("[getProducts] could not get products:", err);
        res.status(500).json(err);
    }
}

export async function getProductInfo(req: Request, res: Response): Promise<void> {
    try{
        const productId = parseInt(req.params.id);
        if(!productId) throw new Error("Invalid productId");

        const item = await prismaClient.product.findUnique({ where: { id: productId } });
        if(!item) throw new Error("Item not found");
        const response = await fetch(`${process.env.INVENTORY_URL}/get-product/:productId`,
            { method: "GET" }
        );
        if(!response.ok) throw new Error("Inventory service error.");
        const inventory = await response.json();

        const result = {
            name: item.name,
            description: item.description,
            price: item.price,
            quantity: inventory.stock,
            category: item.category,
        };

        res.status(200).json(result);
    }catch(err){
        console.log("[getProductInfo] could not get product info:", err);
        res.status(500).json(err);
    }
}