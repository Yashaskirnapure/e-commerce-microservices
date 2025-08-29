import { Router } from 'express';
import { getStock, sellStock, reserveStock, replenishStock, releaseStock } from '../controllers/inventory.controllers';

const inventoryRouter = Router();
inventoryRouter.get('/get-stock/:productId', getStock);
inventoryRouter.patch('/reserve-stock/:productId', reserveStock);
inventoryRouter.patch('/sell-stock/:productId', sellStock);
inventoryRouter.patch('/replenish-stock/:productId', replenishStock);
inventoryRouter.patch('/release-stock/:productId', releaseStock);

export default inventoryRouter;