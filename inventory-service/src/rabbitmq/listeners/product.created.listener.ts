import { ConsumeMessage } from "amqplib";
import { prismaClient } from "../../db/client";
import { rabbitMQ } from "../rabbitmq.helper";
import { inventoryItemSchema } from "../../dto/inventory.item";

export async function productCreationHandler(message: ConsumeMessage) {
    try {
        if (!message) return;

        const routingKey = message.fields.routingKey;
        if (routingKey !== "product.created") return;

        const data = JSON.parse(message.content.toString());

        const { productId, quantity } = data;
        const processedItem = await prismaClient.$transaction(async (tx) => {
            const item = await tx.inventory.upsert({
                where: { productId },
                update: {},
                create: { productId, quantity },
            });

            const validated = inventoryItemSchema.parse(item);
            return validated;
        });

        try {
            await rabbitMQ.publishWithRetry("inventory_event", "stock.created", {
                productId: processedItem.productId,
                quantity: processedItem.quantity
            });

            console.log(`[productCreationHandler] Stock item added for productId: ${processedItem.productId}`);
        } catch (pubError) {
            console.error("[productCreationHandler] Failed to publish stock.created event", pubError);
            throw pubError;
        }

        console.log(`[productCreationHandler] Inventory processing complete for productId: ${processedItem.productId}`);
    } catch (err: any) {
        console.error("[productCreationHandler] Error handling product.created event:", err);
    }
}