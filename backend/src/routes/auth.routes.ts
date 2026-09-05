import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { login, me, changePassword } from "../controllers/auth.controller";

export const authRouter = Router();

authRouter.post("/login", login);
authRouter.get("/me", authenticate, me);
authRouter.post("/change-password", authenticate, changePassword);
