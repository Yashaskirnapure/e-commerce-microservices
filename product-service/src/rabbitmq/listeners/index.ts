import { rabbitMQ } from "../rabbitmq.helper";
import { stockCreationHandler } from "./stock.created.listener";
import { outOfStockHandler } from "./stock.out_of_stock.listener";
import { stockReplenishHandler } from "./stock.replenish.listener";

export async function startListeners() {
    await rabbitMQ.assertExchange("inventory_event", "topic");

    await rabbitMQ.assertQueue("stock_created_queue");
    await rabbitMQ.bindQueue("stock_created_queue", "inventory_event", "stock.created");
    await rabbitMQ.consume('stock_created_queue', stockCreationHandler);

    await rabbitMQ.assertQueue("out_of_stock_q");
    await rabbitMQ.bindQueue("out_of_stock_q", "inventory_event", "stock.out_of_stock");
    await rabbitMQ.consume("out_of_stock_q", outOfStockHandler);

    await rabbitMQ.assertQueue("stock_replenish_queue");
    await rabbitMQ.bindQueue("stock_replenish_queue", "inventory_event", "stock.replenish");
    await rabbitMQ.consume("stock_replenish_queue", stockReplenishHandler);
}