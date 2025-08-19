import { ConsumeMessage } from "amqplib";
import { prismaClient } from "../../db/prisma.client";

export async function stockReplenishHandler(message: ConsumeMessage){
    try{
        if(!message) return;

        const routingKey = message.fields.routingKey;
        if(routingKey !== 'stock.replenish') return;

        const data = JSON.parse(message.content.toString());
        const { productId } = data;
        const product = await prismaClient.product.update({
            where: { id: productId },
            data: { status: "AVAILABLE" }
        });

        console.log(`[stockReplenishHandler] Inventory processing complete for productId: ${product.id}`);
    }catch(err){
        console.error("[stockReplenishHandler] Error handling stock.replenish event:", err);
    }
}