import { rabbitMQ } from "../rabbitmq.helper";
import { stockCreationHandler } from "./stock.created.listener";
import { stockDeletionHandler } from "./stock.deleted.listener";
import { outOfStockHandler } from "./stock.out_of_stock.listener";
import { stockReplenishHandler } from "./stock.replenish.listener";

export async function startListeners() {
    await rabbitMQ.assertExchange("inventory_event", "topic");

    await rabbitMQ.assertQueue("stock_created_q");
    await rabbitMQ.bindQueue("stock_created_q", "inventory_event", "stock.created");
    await rabbitMQ.consume('stock_created_q', stockCreationHandler);

    await rabbitMQ.assertQueue("stock_deleted_q");
    await rabbitMQ.bindQueue("stock_deleted_q", "inventory_event", "stock.deleted");
    await rabbitMQ.consume("stock_deleted_q", stockDeletionHandler)

    await rabbitMQ.assertQueue("out_of_stock_q");
    await rabbitMQ.bindQueue("out_of_stock_q", "inventory_event", "stock.out_of_stock");
    await rabbitMQ.consume("out_of_stock_q", outOfStockHandler);

    await rabbitMQ.assertQueue("stock_replenish_q");
    await rabbitMQ.bindQueue("stock_replenish_q", "inventory_event", "stock.replenish");
    await rabbitMQ.consume("stock_replenish_q", stockReplenishHandler);
}