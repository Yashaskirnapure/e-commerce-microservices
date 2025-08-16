import amqp, { Channel, Connection } from 'amqplib';

export class RabbitMQHelper{
    private connection: Connection | null = null;
    private channel: Channel | null = null;
    private uri: string | null  = null;

    constructor(uri: string){
        this.uri = uri;
    }

    public async connect(): Promise<void> {
        if(this.connection && this.channel) return;
        this.connection = await amqp.connect(this.uri as string);
        this.channel = await this.connection.createChannel();
        console.log('[RabbitMQHelper] connected to RabbitMQ');
    }

    private ensureChannel(): Channel {
        if (!this.channel) throw new Error('Channel not initialized. Call connect() first.');
        return this.channel;
    }

    public async assertExchange(exchange: string, type: string = 'topic'): Promise<void> {
        const channel = this.ensureChannel();
        await channel.assertExchange(exchange, type, { durable: true });
    }

    public async assertQueue(queue: string): Promise<void>{
        const channel = this.ensureChannel();
        await channel.assertQueue(queue, { durable: true });
    }

    public async bindQueue(queue: string, exchange: string, routingKey: string): Promise<void> {
        const channel = this.ensureChannel();
        await channel.bindQueue(queue, exchange, routingKey);
    }

    public async publish(exchange: string, routingKey: string, message: any): Promise<void> {
        const channel = this.ensureChannel();
        await channel.assertExchange(exchange, 'topic', { durable: true });
        channel.publish(exchange, routingKey, Buffer.from(JSON.stringify(message)));
        console.log(`[RabbitMQHelper] Published to exchange "${exchange}" with routing key "${routingKey}"`);
    }
    
    public async consume(queue: string, handler: (msg: any) => Promise<void>): Promise<void> {
        const channel = this.ensureChannel();
        await channel.consume(queue, async (msg) => {
            if (msg) {
                try {
                    await handler(msg);
                    channel.ack(msg);
                } catch (error) {
                    console.error('[RabbitMQHelper] Consume handler error:', error);
                    channel.nack(msg, false, true);
                }
            }
        }, { noAck: false });
    }

    public async close(): Promise<void> {
        if (this.channel) {
            await this.channel.close();
            this.channel = null;
        }

        if (this.connection) {
            await this.connection.close();
            this.connection = null;
        }

        console.log('[RabbitMQHelper] Connection closed');
    }
}