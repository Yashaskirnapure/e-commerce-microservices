import { Router } from "express";
import { register, login, logout, logoutAll } from "../controller/auth-controllers";

const authRouter = Router();
authRouter.post('/register', register);
authRouter.post('/login', login);
authRouter.post('/logout', logout);
authRouter.post('/logout-all', logoutAll);

export default authRouter;