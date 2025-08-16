import express, { Request, Response } from 'express';
import inventoryRouter from './routers/inventory.router';
import dotenv from 'dotenv';
import morgan from 'morgan';
import { rabbitMQ } from './rabbitmq/rabbitmq.helper';
import { startListeners } from './rabbitmq/listeners';
dotenv.config();

const app = express();

app.use(morgan('combined'));
app.use(express.json());
app.use('/api/inventory', inventoryRouter);
app.use((err: any, req: Request, res: Response, next: Function) => {
    console.error(err.stack);
    res.status(500).json({ message: "Internal Server Error" });
});

async function startServer(){
    try{
        await rabbitMQ.connect();
        console.log("RabbitMQ connected");
        
        await startListeners();
        console.log("Inventory service RabbitMQ listeners started.");
        
        await app.listen(3002, () => { console.log("Inventory service running on port 3002."); })
    }catch(err: any){
        console.error("Failed to connect RabbitMQ", err);
        process.exit(1);
    }
}

startServer();