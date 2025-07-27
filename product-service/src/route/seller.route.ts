import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { createProduct, deleteProduct, getSellerProducts, updateProduct } from "../controller/seller.controllers";

const sellerRouter = Router();
sellerRouter.get('/products', authenticate, getSellerProducts);
sellerRouter.post('/create-product', authenticate, createProduct);
sellerRouter.patch('/update-product/:id', authenticate, updateProduct);
sellerRouter.delete('/delete-product/:id', authenticate, deleteProduct);

export default sellerRouter;