import amqp, { Channel, Connection, ConsumeMessage } from 'amqplib';
import chalk from 'chalk';

export class RabbitMQHelper {
    private connection: Connection | null = null;
    private channel: Channel | null = null;
    private uri: string | null = null;

    constructor(uri: string) {
        this.uri = uri;
    }

    private logInfo(message: string) {
        console.log(chalk.cyan(`[RabbitMQ] ${message}`));
    }

    private logWarn(message: string) {
        console.warn(chalk.yellow(`[RabbitMQ] ${message}`));
    }

    private logError(message: string, err?: any) {
        console.error(chalk.red(`[RabbitMQ] ${message}`), err ?? '');
    }

    public async connect(): Promise<void> {
        if (this.connection && this.channel) {
            this.logInfo('Already connected, skipping connect.');
            return;
        }

        this.logInfo(`Connecting to RabbitMQ at ${this.uri}...`);
        this.connection = await amqp.connect(this.uri as string);
        this.channel = await this.connection.createChannel();
        this.logInfo('Connected to RabbitMQ and channel created');
    }

    private ensureChannel(): Channel {
        if (!this.channel) {
            throw new Error('[RabbitMQ] Channel not initialized. Call connect() first.');
        }
        return this.channel;
    }

    public async assertExchange(exchange: string, type: string = 'topic'): Promise<void> {
        const channel = this.ensureChannel();
        await channel.assertExchange(exchange, type, { durable: true });
        this.logInfo(`Exchange asserted: "${exchange}" (type: ${type})`);
    }

    public async assertQueue(queue: string): Promise<void> {
        const channel = this.ensureChannel();
        await channel.assertQueue(queue, { durable: true });
        this.logInfo(`Queue asserted: "${queue}"`);
    }

    public async bindQueue(queue: string, exchange: string, routingKey: string): Promise<void> {
        const channel = this.ensureChannel();
        await channel.bindQueue(queue, exchange, routingKey);
        this.logInfo(`Bound queue "${queue}" -> exchange "${exchange}" [routingKey="${routingKey}"]`);
    }

    public async publish(exchange: string, routingKey: string, message: any): Promise<void> {
        const channel = this.ensureChannel();
        await channel.assertExchange(exchange, 'topic', { durable: true });
        const payload = JSON.stringify(message);

        channel.publish(exchange, routingKey, Buffer.from(payload));
        this.logInfo(`Published to "${exchange}" [routingKey="${routingKey}"] | Payload: ${payload}`);
    }

    public async consume(queue: string, handler: (msg: ConsumeMessage) => Promise<void>): Promise<void> {
        const channel = this.ensureChannel();
        this.logInfo(`Starting consumer on queue "${queue}"...`);

        await channel.consume(
            queue,
            async (msg) => {
                if (msg) {
                    try {
                        this.logInfo(`Message received on "${queue}" [routingKey=${msg.fields.routingKey}]`);
                        await handler(msg);
                        channel.ack(msg);
                        this.logInfo(`Message ACKed from "${queue}"`);
                    } catch (error) {
                        this.logError(`Handler error for queue "${queue}"`, error);
                        channel.nack(msg, false, true);
                        this.logWarn(`Message NACKed and requeued on "${queue}"`);
                    }
                }
            },
            { noAck: false }
        );
    }

    public async close(): Promise<void> {
        if (this.channel) {
            await this.channel.close();
            this.logInfo('Channel closed');
            this.channel = null;
        }
        if (this.connection) {
            await this.connection.close();
            this.logInfo('Connection closed');
            this.connection = null;
        }
    }

    public async publishWithRetry(
        exchange: string,
        routingKey: string,
        message: any,
        retries: number = 5,
        delayMs: number = 1000
    ): Promise<void> {
        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                this.logInfo(`Publish attempt ${attempt} for routingKey "${routingKey}"`);
                await this.publish(exchange, routingKey, message);
                this.logInfo(`Successfully published on attempt ${attempt}`);
                return;
            } catch (err) {
                this.logError(`Publish attempt ${attempt} failed`, err);
                if (attempt === retries) {
                    this.logError('Max retries reached, giving up.');
                    throw err;
                }
                this.logWarn(`Retrying in ${delayMs}ms...`);
                await new Promise((res) => setTimeout(res, delayMs));
            }
        }
    }
}