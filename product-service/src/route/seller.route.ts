import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { createProduct, updateProduct } from "../controller/seller.controllers";

const sellerRouter = Router();
sellerRouter.post('/create-product', authenticate, createProduct);
sellerRouter.patch('/update-product/:id', authenticate, updateProduct);

export default sellerRouter;