import { rabbitMQ } from "../rabbitmq.helper";
import { productCreationHandler } from "./product.created.listener";

export async function startListeners() {
    await rabbitMQ.assertExchange("products_event", "topic");
    await rabbitMQ.assertQueue("inventory_service_q");

    await rabbitMQ.bindQueue("inventory_service_q", "products_event", "product.created");
    await rabbitMQ.consume("inventory_service_q", productCreationHandler);
    console.log("[InventoryService] Listening for product.created events...");
}
