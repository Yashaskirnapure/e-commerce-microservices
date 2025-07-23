import express, { Request, Response } from 'express';
import morgan from 'morgan';

const app = express();
app.use(morgan('combined'));
app.use(express.json());
app.use((err: any, req: Request, res: Response, next: Function) => {
    console.error(err.stack);
    res.status(500).json({ message: "Internal Server Error" });
});

app.listen(3001, () => { console.log("Server listening on 3001") })