import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { prismaClient } from '../db/prisma.client';

const privateKey = fs.readFileSync(process.env.JWT_PRIVATE_KEY_PATH as string);

export async function refreshToken(req: Request, res: Response): Promise<void> {
    try {
        const incomingToken = req.body.refreshToken as string;
        if (!incomingToken) {
            res.status(400).json({ message: "Missing refresh token" });
            return;
        }

        const existingSession = await prismaClient.session.findFirst({
            where: {
                refreshToken: incomingToken,
                expiresAt: { gt: new Date() }
            },
            include: { user: true }
        });

        if (!existingSession) {
            res.status(401).json({ message: "Invalid or expired refresh token" });
            return;
        }

        await prismaClient.session.delete({ where: { id: existingSession.id } });
        const activeSessions = await prismaClient.session.findMany({
            where: {
                userId: existingSession.userId,
                expiresAt: { gt: new Date() }
            },
            orderBy: { createdAt: 'asc' }
        });

        if (activeSessions.length >= 3) {
            const oldest = activeSessions[0];
            await prismaClient.session.delete({ where: { id: oldest.id } });
        }

        const newRefreshToken = uuidv4();
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        const newSession = await prismaClient.session.create({
            data: {
                userId: existingSession.userId,
                refreshToken: newRefreshToken,
                userAgent: req.headers['user-agent'] || 'Unknown',
                ipAddress: req.ip || 'Unknown',
                expiresAt
            }
        });

        const accessToken = jwt.sign(
            {
                userId: existingSession.userId,
                role: existingSession.user.role
            },
            privateKey,
            { expiresIn: '1h', algorithm: 'RS256' }
        );

        res.status(200).json({
            message: "Token refreshed successfully",
            accessToken,
            refreshToken: newRefreshToken,
            expiresIn: '1h'
        });
    } catch (err: any) {
        console.error("Refresh token error", err);
        res.status(500).json({ message: "Internal Server Error", description: err.message || err });
    }
}