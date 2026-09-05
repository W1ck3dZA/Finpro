import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { getJobManagers, getStates } from "../controllers/lookups.controller";

export const lookupsRouter = Router();

lookupsRouter.use(authenticate);
lookupsRouter.get("/job-managers", getJobManagers);
lookupsRouter.get("/states", getStates);
