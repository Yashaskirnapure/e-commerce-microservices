import { Router } from "express";
import { createProduct, deleteProduct, getSellerProducts, updateProduct, getProductInfo } from "../controller/seller.controllers";

const sellerRouter = Router();
sellerRouter.get('/products', getSellerProducts);
sellerRouter.get('/products/:id', getProductInfo)
sellerRouter.post('/create-product', createProduct);
sellerRouter.patch('/update-product/:id', updateProduct);
sellerRouter.delete('/delete-product/:id', deleteProduct);

export default sellerRouter;