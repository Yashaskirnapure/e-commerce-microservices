import { Router } from 'express';
import { getStock } from '../controllers/inventory.controllers';

const inventoryRouter = Router();
inventoryRouter.get('/get-stock/:productId/:state', getStock);

export default inventoryRouter;