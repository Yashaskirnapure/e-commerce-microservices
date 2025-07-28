import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { getAllProducts } from "../controller/buyer.controllers";

const buyerRouter = Router();
buyerRouter.get('/products', authenticate, getAllProducts);

export default buyerRouter;