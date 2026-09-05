import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { requireAdmin } from "../middleware/requireAdmin";
import { listUsers, createUser, updateUser, resetPassword } from "../controllers/users.controller";

export const usersRouter = Router();

usersRouter.use(authenticate, requireAdmin);
usersRouter.get("/", listUsers);
usersRouter.post("/", createUser);
usersRouter.patch("/:id", updateUser);
usersRouter.post("/:id/reset-password", resetPassword);
