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
            let item = await tx.inventory.findFirst({ where: { productId } });

            let isNew = false;
            if (!item) {
                item = await tx.inventory.create({ data: { productId, quantity } });
                isNew = true;
            }

            const validated = inventoryItemSchema.parse(item);

            try {
                await rabbitMQ.publish("inventory_event", "stock.created", {
                    productId: validated.productId,
                    quantity: validated.quantity
                });

                if (isNew) {
                    console.log(`[productCreationHandler] Stock item added for productId: ${validated.productId}`);
                } else {
                    console.log(`[productCreationHandler] Stock already exists for productId: ${validated.productId}, published event`);
                }
            } catch (pubError) {
                console.error("[productCreationHandler] Failed to publish stock.created event", pubError);
                throw pubError;
            }

            return validated;
        });

        console.log(`[productCreationHandler] Inventory processing complete for productId: ${processedItem.productId}`);
    } catch (err: any) {
        console.error("[productCreationHandler] Error handling product.created event:", err);
    }
}