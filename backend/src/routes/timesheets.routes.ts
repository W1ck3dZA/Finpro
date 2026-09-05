import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { listTimesheets } from "../controllers/timesheets.controller";

export const timesheetsRouter = Router();

timesheetsRouter.use(authenticate);
timesheetsRouter.get("/", listTimesheets);
