import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { createProduct } from "../controller/seller.controllers";

const sellerRouter = Router();
sellerRouter.post('/create-product', authenticate, createProduct);

export default sellerRouter;