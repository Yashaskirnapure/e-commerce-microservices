import express, { Express } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import morgan from 'morgan';

const app: Express = express();
dotenv.config();
const publicKey = fs.readFileSync(process.env.JWT_PUBLIC_KEY_PATH as string);

function authMiddleware(req: express.Request, res: express.Response, next: Function): void {
    const authHeader = req.headers['authorization'];
    if(!authHeader){
        res.status(401).json({ message: "Missing Token" });
        return;
    }

    const token = authHeader.split(" ")[1];
    try{
        const decoded: any = jwt.verify(token, publicKey, { algorithms: ['RS256'] });
        req.headers['x-user-id'] = decoded.userId.toString();
        req.headers['x-user-role'] = decoded.role;
        next();
    }catch(err){
        console.error("JWT verification failed:", err);
        res.status(401).json({ message: "Unauthorized", description: "Invalid or expired token" });
    }
}

app.use(morgan('combined'));

app.use('/catalog', authMiddleware,
    createProxyMiddleware({
        target: 'http://localhost:3001',
        changeOrigin: true,
        pathRewrite: { 
            '^/': '/api/'
        }
    })
);

app.use('/stock', authMiddleware,
    createProxyMiddleware({
        target: 'http://localhost:3002',
        changeOrigin: true,
        pathRewrite: {
            '^/': 'api/inventory/'
        }
    })
)

app.use('/auth',
    createProxyMiddleware({
        target: 'http://localhost:3000',
        changeOrigin: true,
        pathRewrite: { '^/': '/api/auth/' }
    })
);

app.use('/session',
    createProxyMiddleware({
        target: 'http://localhost:3000',
        changeOrigin: true,
        pathRewrite: { '^/': '/api/session/' }
    })
);

app.listen(8080, () => {console.log("API Gateway on port 8080")});