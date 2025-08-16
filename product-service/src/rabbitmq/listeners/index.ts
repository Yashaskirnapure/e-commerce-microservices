import { rabbitMQ } from "../rabbitmq.helper";
import { stockCreationHandler } from "./stock.created.listener";

export async function startListeners() {
    await rabbitMQ.assertExchange("inventory_event", "topic");
    await rabbitMQ.assertQueue("product_service_q");

    await rabbitMQ.bindQueue("product_service_q", "inventory_event", "stock.created");
    await rabbitMQ.consume('product_service_q', stockCreationHandler);
}