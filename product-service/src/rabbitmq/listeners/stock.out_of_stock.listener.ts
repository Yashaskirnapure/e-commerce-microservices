import { ConsumeMessage } from "amqplib";
import { prismaClient } from "../../db/prisma.client";

export async function outOfStockHandler(message: ConsumeMessage){
    try{
        if(!message) return;

        const routingKey = message.fields.routingKey;
        if(routingKey !== 'stock.out_of_stock') return;

        const data = JSON.parse(message.content.toString());
        const { productId } = data;
        const product = await prismaClient.product.update({
            where: { id: productId },
            data: { status: "OUT_OF_STOCK" }
        });

        console.log(`[outOfStockHandler] Inventory processing complete for productId: ${product.id}`);
    }catch(err){
        console.error("[outOfStockHandler] Error handling stock.out_of_stock event:", err);
    }
}