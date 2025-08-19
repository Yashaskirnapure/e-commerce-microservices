import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import { prismaClient } from '../db/prisma.client';

dotenv.config();

export async function register(req: Request, res: Response): Promise<void> {
    try{
        const { name, email, password, role } = req.body;
        if(!name || !password || !email || !role){
            res.status(400).json({ message: "Bad Request", description: "Please provide all fields." });
            return;
        }

        const exisitingUser = await prismaClient.user.findUnique({ where: { email }});
        if(exisitingUser){
            res.status(409).json({ message: "Bad Request", description: "Email already registered." });
            return;
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = {
            name: name,
            email: email,
            password: hashedPassword,
            role: role
        };

        const registeredUser = await prismaClient.user.create({ data: newUser });
        res.status(201).json({ message: "User registered successfully"});
    }catch(err){
        console.error("Registration error:", err);
        res.status(500).json({ message: "Internal Server Error", description: err });
    }
}

export async function login(req: Request, res: Response): Promise<void> {
    try{
        const { email, password } = req.body;
        if(!email || !password){
            res.status(401).json({ message: "Bad Request", description: "Provide all fields." });
            return;
        }

        const existingUser = await prismaClient.user.findUnique({ where: { email }});
        if(!existingUser){
            res.status(401).json({ message: "Unauthorized", description: "Email not registered." });
            return;
        }

        const isValid = await bcrypt.compare(password, existingUser.password);
        if (!isValid) {
            res.status(401).json({ message: "Unauthorized", description: "Invalid credentials." });
            return;
        }

        const existingSessions = await prismaClient.session.findMany({
            where: {
                userId: existingUser.id,
                expiresAt: { gt: new Date() }
            }
        });

        if (existingSessions.length >= 3) {
            res.status(403).json({
                message: "Forbidden", 
                description: "Session limit reached. Please logout from another device to continue."
            });
            return;
        }

        const accessToken = jwt.sign(
            {
                userId: existingUser.id,
                role: existingUser.role,
            },
            process.env.JWT_SECRET! as string,
            { expiresIn: '1h' }
        );
        const refreshToken = uuidv4();
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); 

        const savedSession = await prismaClient.session.create({
            data:{
                userId: existingUser.id,
                refreshToken: refreshToken,
                userAgent: req.headers['user-agent'] || 'Unknown',
                ipAddress: req.ip || 'Unknown',
                expiresAt: expiresAt
            }
        });

        res.status(200).json({
            message: "Login Successful",
            accessToken: accessToken,
            refreshToken: refreshToken,
            expiresIn: '1h'
        });

    }catch(err){
        console.error("Login error:", err);
        res.status(500).json({ message: "Internal Server Error", description: err });
    }
}

export async function logout(req: Request, res: Response): Promise<void> {
    try {
        const refreshToken = req.body.refreshToken as string;
        if (!refreshToken) {
            res.status(400).json({ message: "Missing refresh token" });
            return;
        }

        const session = await prismaClient.session.findFirst({
            where: { refreshToken }
        });

        if (!session) {
            res.status(404).json({ message: "Session not found" });
            return;
        }

        await prismaClient.session.delete({
            where: { id: session.id }
        });

        res.status(200).json({ message: "Logged out successfully" });
    } catch (err: any) {
        console.error("Logout error:", err);
        res.status(500).json({ message: "Internal Server Error", description: err.message });
    }
}

export async function logoutAll(req: Request, res: Response): Promise<void> {
    try {
        const userId = req.body.userId as number;

        if (!userId) {
            res.status(400).json({ message: "Missing userId" });
            return;
        }

        await prismaClient.session.deleteMany({
            where: { userId }
        });

        res.status(200).json({ message: "Logged out from all devices" });
    } catch (err: any) {
        console.error("Logout-all error:", err);
        res.status(500).json({ message: "Internal Server Error", description: err.message });
    }
}