"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.jobsRouter = void 0;
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const jobs_controller_1 = require("../controllers/jobs.controller");
exports.jobsRouter = (0, express_1.Router)();
exports.jobsRouter.use(auth_1.authenticate);
exports.jobsRouter.get("/", jobs_controller_1.listJobs);
exports.jobsRouter.get("/:id", jobs_controller_1.getJob);
//# sourceMappingURL=jobs.routes.js.map