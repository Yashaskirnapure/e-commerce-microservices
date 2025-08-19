import express, { Request, Response } from 'express';
import sellerRouter from './route/seller.route';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { rabbitMQ } from './rabbitmq/rabbitmq.helper';
import { startListeners } from './rabbitmq/listeners';
dotenv.config();

const app = express();

app.use(morgan('combined'));
app.use(express.json());
app.use('/api/seller', sellerRouter);

app.use((err: any, req: Request, res: Response, next: Function) => {
    console.error(err.stack);
    res.status(500).json({ message: "Internal Server Error" });
});

async function startServer(){
    try{
        await rabbitMQ.connect();
        await startListeners();

        app.listen(3001, () => { console.log("Product service listening on port 3001") })
    }catch(err: any){
        console.error("Failed to connect RabbitMQ", err);
        process.exit(1);
    }
}

startServer();