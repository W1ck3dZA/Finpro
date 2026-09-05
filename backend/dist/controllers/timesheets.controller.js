"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listTimesheets = listTimesheets;
const prisma_1 = require("../config/prisma");
function buildTimesheetOrderBy(sortField, sortOrder) {
    switch (sortField) {
        case "minutes":
            return { minutes: sortOrder };
        case "staffName":
            return { staffMember: { name: sortOrder } };
        case "clientName":
            return { client: { name: sortOrder } };
        case "jobNo":
            return { job: { jobNo: sortOrder } };
        case "entryDate":
            return { entryDate: sortOrder };
        default:
            return { entryDate: "desc" };
    }
}
async function listTimesheets(req, res) {
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(200, Math.max(1, Number(req.query.pageSize) || 25));
    const where = {};
    if (req.query.staffMemberId)
        where.staffMemberId = Number(req.query.staffMemberId);
    if (req.query.clientId)
        where.clientId = Number(req.query.clientId);
    if (req.query.jobId)
        where.jobId = Number(req.query.jobId);
    if (req.query.client)
        where.client = { name: { contains: String(req.query.client) } };
    if (req.query.search) {
        const search = String(req.query.search);
        where.job = { OR: [{ jobNo: { contains: search } }, { name: { contains: search } }] };
    }
    if (req.query.from || req.query.to) {
        where.entryDate = {};
        if (req.query.from)
            where.entryDate.gte = new Date(String(req.query.from));
        if (req.query.to)
            where.entryDate.lte = new Date(String(req.query.to));
    }
    const sortOrder = req.query.sortOrder === "asc" ? "asc" : "desc";
    const orderBy = buildTimesheetOrderBy(req.query.sortField ? String(req.query.sortField) : undefined, sortOrder);
    const [rows, total, minutesAgg, distinctStaff, distinctJobs] = await Promise.all([
        prisma_1.prisma.timesheet.findMany({
            where,
            orderBy,
            skip: (page - 1) * pageSize,
            take: pageSize,
            include: {
                client: { select: { id: true, name: true } },
                job: { select: { id: true, jobNo: true, name: true } },
                staffMember: { select: { id: true, name: true } },
            },
        }),
        prisma_1.prisma.timesheet.count({ where }),
        prisma_1.prisma.timesheet.aggregate({ where, _sum: { minutes: true } }),
        prisma_1.prisma.timesheet.findMany({ where, distinct: ["staffMemberId"], select: { staffMemberId: true } }),
        prisma_1.prisma.timesheet.findMany({ where, distinct: ["jobId"], select: { jobId: true } }),
    ]);
    res.json({
        rows,
        total,
        page,
        pageSize,
        totalMinutes: minutesAgg._sum.minutes ?? 0,
        distinctStaffCount: distinctStaff.length,
        distinctJobCount: distinctJobs.length,
    });
}
//# sourceMappingURL=timesheets.controller.js.map