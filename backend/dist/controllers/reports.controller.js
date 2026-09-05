"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTimeReport = getTimeReport;
exports.getAnalyticsReport = getAnalyticsReport;
exports.getJobsOverBudgetReport = getJobsOverBudgetReport;
const reports = __importStar(require("../services/reports.service"));
function parseDateParam(v) {
    if (typeof v !== "string" || !v)
        return undefined;
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? undefined : d;
}
function parseTimeFilters(req) {
    return {
        from: parseDateParam(req.query.from),
        to: parseDateParam(req.query.to),
        staffMemberId: req.query.staffMemberId ? Number(req.query.staffMemberId) : undefined,
        clientId: req.query.clientId ? Number(req.query.clientId) : undefined,
        jobManager: req.query.jobManager ? String(req.query.jobManager) : undefined,
    };
}
async function getTimeReport(req, res) {
    const filters = parseTimeFilters(req);
    const groupBy = String(req.query.groupBy ?? "staff");
    let rows;
    if (groupBy === "client")
        rows = await reports.getTimeByClient(filters);
    else if (groupBy === "job")
        rows = await reports.getTimeByJob(filters);
    else
        rows = await reports.getTimeByStaff(filters);
    const interval = (["day", "week", "month"].includes(String(req.query.interval)) ? req.query.interval : "day");
    const trend = await reports.getTimeTrend(filters, interval);
    res.json({ groupBy, rows, trend, interval });
}
async function getAnalyticsReport(req, res) {
    const filters = {
        from: parseDateParam(req.query.from),
        to: parseDateParam(req.query.to),
        clientId: req.query.clientId ? Number(req.query.clientId) : undefined,
        jobManager: req.query.jobManager ? String(req.query.jobManager) : undefined,
        state: req.query.state ? String(req.query.state) : undefined,
    };
    const [jobsByState, budgetByState, topClientsByBudget, topClientsByHours, avgTurnaroundDays, clientMix] = await Promise.all([
        reports.getJobsByState(filters),
        reports.getBudgetTotalsByState(filters),
        reports.getTopClientsByBudget(filters, 10),
        reports.getTopClientsByHours(filters, 10),
        reports.getAvgTurnaroundDays(filters),
        reports.getClientMix(),
    ]);
    res.json({ jobsByState, budgetByState, topClientsByBudget, topClientsByHours, avgTurnaroundDays, clientMix });
}
async function getJobsOverBudgetReport(req, res) {
    const filters = {
        clientId: req.query.clientId ? Number(req.query.clientId) : undefined,
        jobManager: req.query.jobManager ? String(req.query.jobManager) : undefined,
        state: req.query.state ? String(req.query.state) : undefined,
        from: parseDateParam(req.query.from),
        to: parseDateParam(req.query.to),
    };
    const limit = Math.min(500, Math.max(1, Number(req.query.limit) || 100));
    const result = await reports.getJobsOverBudget(filters, limit);
    res.json(result);
}
//# sourceMappingURL=reports.controller.js.map