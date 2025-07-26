import express, { Request, Response } from 'express';
import sellerRouter from './route/seller.route';
import morgan from 'morgan';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
app.use(morgan('combined'));
app.use(express.json());
app.use('/api/seller', sellerRouter);
app.use((err: any, req: Request, res: Response, next: Function) => {
    console.error(err.stack);
    res.status(500).json({ message: "Internal Server Error" });
});

app.listen(3001, () => { console.log("Server listening on 3001") })