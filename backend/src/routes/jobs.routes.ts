import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { listJobs, getJob } from "../controllers/jobs.controller";

export const jobsRouter = Router();

jobsRouter.use(authenticate);
jobsRouter.get("/", listJobs);
jobsRouter.get("/:id", getJob);
