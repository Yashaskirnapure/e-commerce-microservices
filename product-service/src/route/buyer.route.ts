import { Router } from "express";
import { getProductInfo, getProducts } from "../controller/buyer.controllers";

const buyerRouter = Router();
buyerRouter.get('/products', getProducts);
buyerRouter.get('/products/:id', getProductInfo);

export default buyerRouter;