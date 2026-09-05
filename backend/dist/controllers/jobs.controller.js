"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listJobs = listJobs;
exports.getJob = getJob;
const prisma_1 = require("../config/prisma");
const reports_service_1 = require("../services/reports.service");
/** Maps a DataGrid column's `field` name to the corresponding Prisma orderBy shape, including
 * the relation traversal for columns sourced from the related Client (e.g. "clientName"). */
function buildJobOrderBy(sortField, sortOrder) {
    switch (sortField) {
        case "jobNo":
            return { jobNo: sortOrder };
        case "name":
            return { name: sortOrder };
        case "clientName":
            return { client: { name: sortOrder } };
        case "jobManagerCol":
            return { client: { jobManager: sortOrder } };
        case "state":
            return { state: sortOrder };
        case "budget":
            return { budget: sortOrder };
        case "completedDate":
            return { completedDate: sortOrder };
        case "isStub":
            return { isStub: sortOrder };
        case "startDate":
            return { startDate: sortOrder };
        default:
            return { startDate: "desc" };
    }
}
async function listJobs(req, res) {
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(200, Math.max(1, Number(req.query.pageSize) || 25));
    const where = {};
    if (req.query.state)
        where.state = String(req.query.state);
    // "Open" = not yet in a terminal state. Same definition the frontend already uses for its
    // "Active Jobs" dashboard KPI — kept here so the underlying job list can be queried the same way.
    else if (req.query.openOnly === "true")
        where.state = { notIn: ["Invoiced", "Cancelled"] };
    if (req.query.clientId)
        where.clientId = Number(req.query.clientId);
    if (req.query.search) {
        const search = String(req.query.search);
        where.OR = [{ jobNo: { contains: search } }, { name: { contains: search } }];
    }
    if (req.query.client || req.query.jobManager) {
        const clientFilter = {};
        if (req.query.client)
            clientFilter.name = { contains: String(req.query.client) };
        if (req.query.jobManager)
            clientFilter.jobManager = String(req.query.jobManager);
        where.client = clientFilter;
    }
    if (req.query.isStub !== undefined)
        where.isStub = req.query.isStub === "true";
    if (req.query.noHoursLogged === "true")
        where.timesheets = { none: {} };
    if (req.query.from || req.query.to) {
        where.startDate = {};
        if (req.query.from)
            where.startDate.gte = new Date(String(req.query.from));
        if (req.query.to)
            where.startDate.lte = new Date(String(req.query.to));
    }
    const sortOrder = req.query.sortOrder === "asc" ? "asc" : "desc";
    const orderBy = buildJobOrderBy(req.query.sortField ? String(req.query.sortField) : undefined, sortOrder);
    const [rows, total, budgetAgg] = await Promise.all([
        prisma_1.prisma.job.findMany({
            where,
            orderBy,
            skip: (page - 1) * pageSize,
            take: pageSize,
            include: { client: { select: { id: true, name: true, jobManager: true } } },
        }),
        prisma_1.prisma.job.count({ where }),
        prisma_1.prisma.job.aggregate({ where, _sum: { budget: true } }),
    ]);
    res.json({ rows, total, page, pageSize, totalBudget: budgetAgg._sum.budget ? Number(budgetAgg._sum.budget) : 0 });
}
async function getJob(req, res) {
    const id = Number(req.params.id);
    const job = await prisma_1.prisma.job.findUnique({ where: { id }, include: { client: true } });
    if (!job) {
        res.status(404).json({ error: "Job not found" });
        return;
    }
    const costBreakdown = await (0, reports_service_1.getJobCostBreakdown)(id);
    res.json({ ...job, costBreakdown });
}
//# sourceMappingURL=jobs.controller.js.map