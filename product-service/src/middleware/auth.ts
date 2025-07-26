import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export function authenticate(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Missing or invalid authorization header' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: number; role: string };

        req.userId = decoded.userId;
        req.role = decoded.role;

        next();
    } catch (err) {
        console.log(err);
        return res.status(401).json({ message: 'Invalid or expired token' });
    }
}