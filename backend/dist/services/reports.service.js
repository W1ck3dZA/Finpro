"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTimeByStaff = getTimeByStaff;
exports.getTimeByClient = getTimeByClient;
exports.getTimeByJob = getTimeByJob;
exports.getTimeTrend = getTimeTrend;
exports.getJobsByState = getJobsByState;
exports.getBudgetTotalsByState = getBudgetTotalsByState;
exports.getTopClientsByBudget = getTopClientsByBudget;
exports.getTopClientsByHours = getTopClientsByHours;
exports.getAvgTurnaroundDays = getAvgTurnaroundDays;
exports.getClientMix = getClientMix;
exports.getJobCostBreakdown = getJobCostBreakdown;
exports.getJobsOverBudget = getJobsOverBudget;
const client_1 = require("../generated/prisma/client");
const prisma_1 = require("../config/prisma");
function timesheetWhere(filters) {
    const where = {};
    if (filters.from || filters.to) {
        where.entryDate = {};
        if (filters.from)
            where.entryDate.gte = filters.from;
        if (filters.to)
            where.entryDate.lte = filters.to;
    }
    if (filters.staffMemberId)
        where.staffMemberId = filters.staffMemberId;
    if (filters.clientId)
        where.clientId = filters.clientId;
    if (filters.jobManager)
        where.client = { jobManager: filters.jobManager };
    return where;
}
async function getTimeByStaff(filters) {
    const grouped = await prisma_1.prisma.timesheet.groupBy({
        by: ["staffMemberId"],
        where: timesheetWhere(filters),
        _sum: { minutes: true },
        orderBy: { _sum: { minutes: "desc" } },
    });
    const staff = await prisma_1.prisma.staffMember.findMany({ where: { id: { in: grouped.map((g) => g.staffMemberId) } } });
    const map = new Map(staff.map((s) => [s.id, s.name]));
    return grouped.map((g) => {
        const minutes = g._sum.minutes ?? 0;
        return { key: g.staffMemberId, label: map.get(g.staffMemberId) ?? "Unknown", minutes, hours: minutes / 60 };
    });
}
async function getTimeByClient(filters) {
    const grouped = await prisma_1.prisma.timesheet.groupBy({
        by: ["clientId"],
        where: timesheetWhere(filters),
        _sum: { minutes: true },
        orderBy: { _sum: { minutes: "desc" } },
    });
    const clients = await prisma_1.prisma.client.findMany({ where: { id: { in: grouped.map((g) => g.clientId) } } });
    const map = new Map(clients.map((c) => [c.id, c.name]));
    return grouped.map((g) => {
        const minutes = g._sum.minutes ?? 0;
        return { key: g.clientId, label: map.get(g.clientId) ?? "Unknown", minutes, hours: minutes / 60 };
    });
}
async function getTimeByJob(filters) {
    const grouped = await prisma_1.prisma.timesheet.groupBy({
        by: ["jobId"],
        where: timesheetWhere(filters),
        _sum: { minutes: true },
        orderBy: { _sum: { minutes: "desc" } },
    });
    const jobs = await prisma_1.prisma.job.findMany({ where: { id: { in: grouped.map((g) => g.jobId) } } });
    const map = new Map(jobs.map((j) => [j.id, j.name ?? j.jobNo]));
    return grouped.map((g) => {
        const minutes = g._sum.minutes ?? 0;
        return { key: g.jobId, label: map.get(g.jobId) ?? "Unknown", minutes, hours: minutes / 60 };
    });
}
async function getTimeTrend(filters, interval) {
    const conditions = [client_1.Prisma.sql `1=1`];
    if (filters.from)
        conditions.push(client_1.Prisma.sql `t.entryDate >= ${filters.from}`);
    if (filters.to)
        conditions.push(client_1.Prisma.sql `t.entryDate <= ${filters.to}`);
    if (filters.staffMemberId)
        conditions.push(client_1.Prisma.sql `t.staffMemberId = ${filters.staffMemberId}`);
    if (filters.clientId)
        conditions.push(client_1.Prisma.sql `t.clientId = ${filters.clientId}`);
    if (filters.jobManager)
        conditions.push(client_1.Prisma.sql `c.jobManager = ${filters.jobManager}`);
    const whereClause = client_1.Prisma.sql `WHERE ${client_1.Prisma.join(conditions, " AND ")}`;
    const dateExpr = interval === "month"
        ? client_1.Prisma.sql `DATE_FORMAT(t.entryDate, '%Y-%m-01')`
        : interval === "week"
            ? client_1.Prisma.sql `DATE_FORMAT(DATE_SUB(t.entryDate, INTERVAL WEEKDAY(t.entryDate) DAY), '%Y-%m-%d')`
            : client_1.Prisma.sql `DATE_FORMAT(t.entryDate, '%Y-%m-%d')`;
    const rows = await prisma_1.prisma.$queryRaw `
    SELECT ${dateExpr} AS period, SUM(t.minutes) AS minutes
    FROM \`Timesheet\` t
    JOIN \`Client\` c ON c.id = t.clientId
    ${whereClause}
    GROUP BY period
    ORDER BY period
  `;
    return rows.map((r) => ({ period: r.period, minutes: Number(r.minutes) }));
}
function jobWhere(filters) {
    const where = {};
    if (filters.from || filters.to) {
        where.startDate = {};
        if (filters.from)
            where.startDate.gte = filters.from;
        if (filters.to)
            where.startDate.lte = filters.to;
    }
    if (filters.clientId)
        where.clientId = filters.clientId;
    if (filters.jobManager)
        where.client = { jobManager: filters.jobManager };
    if (filters.state)
        where.state = filters.state;
    return where;
}
async function getJobsByState(filters) {
    const grouped = await prisma_1.prisma.job.groupBy({ by: ["state"], where: jobWhere(filters), _count: { _all: true } });
    return grouped.map((g) => ({ state: g.state, count: g._count._all })).sort((a, b) => b.count - a.count);
}
async function getBudgetTotalsByState(filters) {
    const grouped = await prisma_1.prisma.job.groupBy({ by: ["state"], where: jobWhere(filters), _sum: { budget: true }, _count: { _all: true } });
    return grouped
        .map((g) => ({ state: g.state, totalBudget: g._sum.budget ? Number(g._sum.budget) : 0, count: g._count._all }))
        .sort((a, b) => b.totalBudget - a.totalBudget);
}
async function getTopClientsByBudget(filters, limit = 10) {
    const grouped = await prisma_1.prisma.job.groupBy({
        by: ["clientId"],
        where: jobWhere(filters),
        _sum: { budget: true },
        orderBy: { _sum: { budget: "desc" } },
        take: limit,
    });
    const clients = await prisma_1.prisma.client.findMany({ where: { id: { in: grouped.map((g) => g.clientId) } } });
    const map = new Map(clients.map((c) => [c.id, c.name]));
    return grouped.map((g) => ({ clientId: g.clientId, name: map.get(g.clientId) ?? "Unknown", totalBudget: g._sum.budget ? Number(g._sum.budget) : 0 }));
}
async function getTopClientsByHours(filters, limit = 10) {
    const grouped = await prisma_1.prisma.timesheet.groupBy({
        by: ["clientId"],
        where: timesheetWhere(filters),
        _sum: { minutes: true },
        orderBy: { _sum: { minutes: "desc" } },
        take: limit,
    });
    const clients = await prisma_1.prisma.client.findMany({ where: { id: { in: grouped.map((g) => g.clientId) } } });
    const map = new Map(clients.map((c) => [c.id, c.name]));
    return grouped.map((g) => ({ clientId: g.clientId, name: map.get(g.clientId) ?? "Unknown", minutes: g._sum.minutes ?? 0, hours: (g._sum.minutes ?? 0) / 60 }));
}
async function getAvgTurnaroundDays(filters) {
    const where = { ...jobWhere(filters), startDate: { not: null }, completedDate: { not: null } };
    const jobs = await prisma_1.prisma.job.findMany({ where, select: { startDate: true, completedDate: true } });
    if (jobs.length === 0)
        return null;
    const totalDays = jobs.reduce((sum, j) => sum + (j.completedDate.getTime() - j.startDate.getTime()) / 86_400_000, 0);
    return totalDays / jobs.length;
}
async function getClientMix() {
    const byStructure = await prisma_1.prisma.client.groupBy({ by: ["businessStructure"], _count: { _all: true } });
    const byType = await prisma_1.prisma.client.groupBy({ by: ["clientType"], _count: { _all: true } });
    return {
        byBusinessStructure: byStructure.map((g) => ({ label: g.businessStructure ?? "(unspecified)", count: g._count._all })),
        byClientType: byType.map((g) => ({ label: g.clientType || "(unspecified)", count: g._count._all })),
    };
}
async function getJobCostBreakdown(jobId) {
    const job = await prisma_1.prisma.job.findUnique({ where: { id: jobId } });
    if (!job)
        return null;
    const grouped = await prisma_1.prisma.timesheet.groupBy({ by: ["staffMemberId"], where: { jobId }, _sum: { minutes: true } });
    const staffMembers = await prisma_1.prisma.staffMember.findMany({ where: { id: { in: grouped.map((g) => g.staffMemberId) } } });
    const staffMap = new Map(staffMembers.map((s) => [s.id, s]));
    const totalMinutes = grouped.reduce((sum, g) => sum + (g._sum.minutes ?? 0), 0);
    let ratesIncomplete = false;
    const staff = grouped.map((g) => {
        const member = staffMap.get(g.staffMemberId);
        const minutes = g._sum.minutes ?? 0;
        const hourlyRate = member?.hourlyRate != null ? Number(member.hourlyRate) : null;
        if (hourlyRate === null)
            ratesIncomplete = true;
        const cost = hourlyRate !== null ? (minutes / 60) * hourlyRate : null;
        return {
            staffMemberId: g.staffMemberId,
            staffName: member?.name ?? "Unknown",
            minutes,
            hours: minutes / 60,
            pctOfJob: totalMinutes > 0 ? (minutes / totalMinutes) * 100 : 0,
            hourlyRate,
            cost,
        };
    });
    staff.sort((a, b) => b.minutes - a.minutes);
    const budget = job.budget != null ? Number(job.budget) : null;
    const totalCost = ratesIncomplete ? null : staff.reduce((sum, r) => sum + (r.cost ?? 0), 0);
    const variance = totalCost != null && budget != null ? totalCost - budget : null;
    const variancePct = variance != null && budget ? (variance / budget) * 100 : null;
    // A "0.00" budget means no real budget was ever set — don't flag those as over budget.
    const overBudget = variance != null && variance > 0 && !!budget && budget > 0;
    return { jobId, totalMinutes, totalHours: totalMinutes / 60, totalCost, budget, variance, variancePct, overBudget, ratesIncomplete, staff };
}
/** Runs the cost-vs-budget calculation across all jobs in one query (not per-job N+1). */
async function getJobsOverBudget(filters, limit = 100) {
    // budget > 0 (not just NOT NULL) — a "0.00" budget in the source data means no real budget
    // was ever set for the job, not that the job has a zero-rand budget to compare cost against.
    const conditions = [client_1.Prisma.sql `j.budget > 0`];
    if (filters.clientId)
        conditions.push(client_1.Prisma.sql `j.clientId = ${filters.clientId}`);
    if (filters.jobManager)
        conditions.push(client_1.Prisma.sql `c.jobManager = ${filters.jobManager}`);
    if (filters.state)
        conditions.push(client_1.Prisma.sql `j.state = ${filters.state}`);
    if (filters.from)
        conditions.push(client_1.Prisma.sql `j.startDate >= ${filters.from}`);
    if (filters.to)
        conditions.push(client_1.Prisma.sql `j.startDate <= ${filters.to}`);
    const whereClause = client_1.Prisma.sql `WHERE ${client_1.Prisma.join(conditions, " AND ")}`;
    const rows = await prisma_1.prisma.$queryRaw `
    SELECT
      j.id AS jobId, j.jobNo AS jobNo, j.name AS name, j.clientId AS clientId, c.name AS clientName,
      c.jobManager AS jobManager, j.state AS state, j.budget AS budget,
      SUM(ts.minutes / 60 * COALESCE(sm.hourlyRate, 0)) AS totalCost,
      SUM(CASE WHEN sm.hourlyRate IS NULL THEN 1 ELSE 0 END) AS missingRateCount
    FROM \`Job\` j
    JOIN \`Client\` c ON c.id = j.clientId
    JOIN \`Timesheet\` ts ON ts.jobId = j.id
    JOIN \`StaffMember\` sm ON sm.id = ts.staffMemberId
    ${whereClause}
    GROUP BY j.id, j.jobNo, j.name, j.clientId, c.name, c.jobManager, j.state, j.budget
  `;
    let ratesIncompleteCount = 0;
    const overBudget = [];
    for (const r of rows) {
        if (Number(r.missingRateCount) > 0) {
            ratesIncompleteCount++;
            continue;
        }
        const budget = Number(r.budget);
        const totalCost = Number(r.totalCost);
        if (totalCost > budget) {
            const variance = totalCost - budget;
            overBudget.push({
                jobId: r.jobId,
                jobNo: r.jobNo,
                name: r.name,
                clientId: r.clientId,
                clientName: r.clientName,
                jobManager: r.jobManager,
                state: r.state,
                budget,
                totalCost,
                variance,
                variancePct: budget !== 0 ? (variance / budget) * 100 : 0,
            });
        }
    }
    overBudget.sort((a, b) => b.variance - a.variance);
    const totalCount = overBudget.length;
    const totalOverage = overBudget.reduce((sum, r) => sum + r.variance, 0);
    const avgVariancePct = totalCount > 0 ? overBudget.reduce((sum, r) => sum + r.variancePct, 0) / totalCount : 0;
    return { rows: overBudget.slice(0, limit), totalCount, totalOverage, avgVariancePct, ratesIncompleteCount };
}
//# sourceMappingURL=reports.service.js.map