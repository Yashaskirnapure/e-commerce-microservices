import { Router } from 'express';
import { getStock, sellStock, reserveStock, replenishStock, createStockEntry } from '../controllers/inventory.controllers';

const inventoryRouter = Router();
inventoryRouter.get('/get-stock/:productId', getStock);
inventoryRouter.patch('/reserve-stock/:productId', reserveStock);
inventoryRouter.patch('/sell-stock/:productId', sellStock);
inventoryRouter.patch('/replenish-stock/:productId', replenishStock);
inventoryRouter.post('/create-stock-entry', createStockEntry);

export default inventoryRouter;