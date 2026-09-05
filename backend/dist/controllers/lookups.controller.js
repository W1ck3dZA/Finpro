"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getJobManagers = getJobManagers;
exports.getStates = getStates;
const lookups_service_1 = require("../services/lookups.service");
async function getJobManagers(_req, res) {
    res.json(await (0, lookups_service_1.listJobManagers)());
}
async function getStates(_req, res) {
    res.json(await (0, lookups_service_1.listStates)());
}
//# sourceMappingURL=lookups.controller.js.map