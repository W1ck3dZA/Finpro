"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reportsRouter = void 0;
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const reports_controller_1 = require("../controllers/reports.controller");
exports.reportsRouter = (0, express_1.Router)();
exports.reportsRouter.use(auth_1.authenticate);
exports.reportsRouter.get("/time", reports_controller_1.getTimeReport);
exports.reportsRouter.get("/analytics", reports_controller_1.getAnalyticsReport);
exports.reportsRouter.get("/jobs-over-budget", reports_controller_1.getJobsOverBudgetReport);
//# sourceMappingURL=reports.routes.js.map