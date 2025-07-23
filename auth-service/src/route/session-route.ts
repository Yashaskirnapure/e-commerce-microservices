import { Router } from "express";
import { refreshToken } from "../controller/session-controllers";

const sessionRouter = Router();
sessionRouter.post('/refresh', refreshToken);

export default sessionRouter;