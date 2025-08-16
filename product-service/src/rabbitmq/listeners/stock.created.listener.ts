import { ConsumeMessage } from "amqplib";
import { prismaClient } from "../../db/prisma.client";

export async function stockCreationHandler(message: ConsumeMessage){
    try{
        if(!message) return;

        const routingKey = message.fields.routingKey;
        if(routingKey !== 'stock.created') return;

        const data = JSON.parse(message.content.toString());
        const { productId, quantity } = data;
        const product = await prismaClient.product.update({
            where: { id: productId },
            data: { status: "AVAILABLE" }
        });

        console.log(`[stockCreationHandler] Inventory processing complete for productId: ${product.id}`);
    }catch(err){
        console.error("[stockCreationHandler] Error handling stock.created event:", err);
    }
}