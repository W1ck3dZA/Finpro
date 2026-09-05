"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.lookupsRouter = void 0;
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const lookups_controller_1 = require("../controllers/lookups.controller");
exports.lookupsRouter = (0, express_1.Router)();
exports.lookupsRouter.use(auth_1.authenticate);
exports.lookupsRouter.get("/job-managers", lookups_controller_1.getJobManagers);
exports.lookupsRouter.get("/states", lookups_controller_1.getStates);
//# sourceMappingURL=lookups.routes.js.map