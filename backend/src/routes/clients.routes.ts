import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { listClients, getClient } from "../controllers/clients.controller";

export const clientsRouter = Router();

clientsRouter.use(authenticate);
clientsRouter.get("/", listClients);
clientsRouter.get("/:id", getClient);
