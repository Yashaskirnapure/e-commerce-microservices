import express, { Request, Response } from 'express';
import sellerRouter from './route/seller.route';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { rabbitMQ } from './rabbitmq/rabbitmq.helper';
import { startListeners } from './rabbitmq/listeners';
import buyerRouter from './route/buyer.route';
dotenv.config();

const app = express();
function extractUserInfo(req: Request, res: Response, next: Function) {
    req.userId = parseInt(req.headers['x-user-id'] as string);
    req.role = req.headers['x-user-role'] as string;
    next();
}

app.use(morgan('combined'));
app.use(express.json());
app.use('/api/seller', extractUserInfo, sellerRouter);
app.use('/api/buyer', extractUserInfo, buyerRouter);

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