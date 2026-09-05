"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.timesheetsRouter = void 0;
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const timesheets_controller_1 = require("../controllers/timesheets.controller");
exports.timesheetsRouter = (0, express_1.Router)();
exports.timesheetsRouter.use(auth_1.authenticate);
exports.timesheetsRouter.get("/", timesheets_controller_1.listTimesheets);
//# sourceMappingURL=timesheets.routes.js.map