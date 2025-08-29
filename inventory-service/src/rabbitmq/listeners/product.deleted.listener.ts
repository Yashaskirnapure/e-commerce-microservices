import { ConsumeMessage } from "amqplib";
import { prismaClient } from "../../db/client";
import { rabbitMQ } from "../rabbitmq.helper";
import { inventoryItemSchema } from "../../dto/inventory.item";

export async function productDeletionHandler(message: ConsumeMessage) {
    try {
        if (!message) return;

        const routingKey = message.fields.routingKey;
        if (routingKey !== "product.deleted") return;

        const data = JSON.parse(message.content.toString());
        const { productId, sellerId } = data;
        const item = await prismaClient.inventory.delete({ where: { productId } });
        const validated = inventoryItemSchema.parse(item);

        try {
            await rabbitMQ.publishWithRetry("inventory_event", "stock.deleted", {
                productId: validated.productId,
                quantity: validated.quantity
            });

            console.log(`[productDeletionHandler] Stock item deleted for productId: ${validated.productId}`);
        } catch (pubError) {
            console.error("[productDeletionHandler] Failed to publish stock.deleted event", pubError);
            throw pubError;
        }

        console.log(`[productDeletionHandler] Inventory processing complete for productId: ${validated.productId}`);
    } catch (err: any) {
        console.error("[productDeletionHandler] Error handling product.deletion event:", err);
    }
}