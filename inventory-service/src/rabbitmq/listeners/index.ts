import { rabbitMQ } from "../rabbitmq.helper";
import { productCreationHandler } from "./product.created.listener";
import { productDeletionHandler } from "./product.deleted.listener";

export async function startListeners() {
    await rabbitMQ.assertExchange("products_event", "topic");

    await rabbitMQ.assertQueue("product_created_q");
    await rabbitMQ.bindQueue("product_created_q", "products_event", "product.created");
    await rabbitMQ.consume("product_created_q", productCreationHandler);

    await rabbitMQ.assertQueue("product_deleted_q");
    await rabbitMQ.bindQueue("product_deleted_q", "products_event", "product.deleted");
    await rabbitMQ.consume("product_deleted_q", productDeletionHandler);
}
