import { Router } from "express";
import { authenticate } from "../middleware/auth";
import {
  getTimeReport,
  getAnalyticsReport,
  getJobsOverBudgetReport,
  getCtcVsTargetReport,
  getCtcVsTargetBreakdown,
  getStaffVsClientReport,
} from "../controllers/reports.controller";

export const reportsRouter = Router();

reportsRouter.use(authenticate);
reportsRouter.get("/time", getTimeReport);
reportsRouter.get("/analytics", getAnalyticsReport);
reportsRouter.get("/jobs-over-budget", getJobsOverBudgetReport);
reportsRouter.get("/ctc-vs-target", getCtcVsTargetReport);
reportsRouter.get("/ctc-vs-target/:staffMemberId/breakdown", getCtcVsTargetBreakdown);
reportsRouter.get("/staff-vs-client", getStaffVsClientReport);
