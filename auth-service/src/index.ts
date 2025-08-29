import express, { Request, Response } from 'express';
import authRouter from './route/auth-route';
import sessionRouter from './route/session-route';
import morgan from 'morgan';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(morgan('combined'));
app.use(express.json());
app.use('/api/auth', authRouter);
app.use('/api/session', sessionRouter);

app.use((err: any, req: Request, res: Response, next: Function) => {
    console.error(err.stack);
    res.status(500).json({ message: "Internal Server Error" });
});

app.get('/', (req: Request, res: Response): void => {
    res.send("Auth server is running");
});

app.listen(3000, () => { console.log("auth server listening on 3000"); });