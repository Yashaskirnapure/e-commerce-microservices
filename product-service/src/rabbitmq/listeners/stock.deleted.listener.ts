import { ConsumeMessage } from "amqplib";
import { prismaClient } from "../../db/prisma.client";

export async function stockDeletionHandler(message: ConsumeMessage){
    try{
        if(!message) return;

        const routingKey = message.fields.routingKey;
        if(routingKey !== 'stock.deleted') return;

        const data = JSON.parse(message.content.toString());
        const { productId, sellerId } = data;
        const product = await prismaClient.product.delete({
            where: { id: productId, sellerId: sellerId }
        });

        console.log(`[stockDeletionHandler] Inventory processing complete for productId: ${product.id}`);
        console.log(`Product deleted with product ID: ${productId}`);
    }catch(err){
        console.error("[stockDeletionHandler] Error handling stock.deleted event:", err);
    }
}