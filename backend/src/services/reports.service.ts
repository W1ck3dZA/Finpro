import { Prisma } from "../generated/prisma/client";
import { prisma } from "../config/prisma";

export interface TimeReportFilters {
  from?: Date;
  to?: Date;
  staffMemberId?: number;
  clientId?: number;
  jobManager?: string;
}

export interface TimeReportRow {
  key: number;
  label: string;
  minutes: number;
  hours: number;
}

function timesheetWhere(filters: TimeReportFilters): Prisma.TimesheetWhereInput {
  const where: Prisma.TimesheetWhereInput = {};
  if (filters.from || filters.to) {
    where.entryDate = {};
    if (filters.from) where.entryDate.gte = filters.from;
    if (filters.to) where.entryDate.lte = filters.to;
  }
  if (filters.staffMemberId) where.staffMemberId = filters.staffMemberId;
  if (filters.clientId) where.clientId = filters.clientId;
  if (filters.jobManager) where.client = { jobManager: filters.jobManager };
  return where;
}

export async function getTimeByStaff(filters: TimeReportFilters): Promise<TimeReportRow[]> {
  const grouped = await prisma.timesheet.groupBy({
    by: ["staffMemberId"],
    where: timesheetWhere(filters),
    _sum: { minutes: true },
    orderBy: { _sum: { minutes: "desc" } },
  });
  const staff = await prisma.staffMember.findMany({ where: { id: { in: grouped.map((g) => g.staffMemberId) } } });
  const map = new Map(staff.map((s) => [s.id, s.name]));
  return grouped.map((g) => {
    const minutes = g._sum.minutes ?? 0;
    return { key: g.staffMemberId, label: map.get(g.staffMemberId) ?? "Unknown", minutes, hours: minutes / 60 };
  });
}

export async function getTimeByClient(filters: TimeReportFilters): Promise<TimeReportRow[]> {
  const grouped = await prisma.timesheet.groupBy({
    by: ["clientId"],
    where: timesheetWhere(filters),
    _sum: { minutes: true },
    orderBy: { _sum: { minutes: "desc" } },
  });
  const clients = await prisma.client.findMany({ where: { id: { in: grouped.map((g) => g.clientId) } } });
  const map = new Map(clients.map((c) => [c.id, c.name]));
  return grouped.map((g) => {
    const minutes = g._sum.minutes ?? 0;
    return { key: g.clientId, label: map.get(g.clientId) ?? "Unknown", minutes, hours: minutes / 60 };
  });
}

export async function getTimeByJob(filters: TimeReportFilters): Promise<TimeReportRow[]> {
  const grouped = await prisma.timesheet.groupBy({
    by: ["jobId"],
    where: timesheetWhere(filters),
    _sum: { minutes: true },
    orderBy: { _sum: { minutes: "desc" } },
  });
  const jobs = await prisma.job.findMany({ where: { id: { in: grouped.map((g) => g.jobId) } } });
  const map = new Map(jobs.map((j) => [j.id, j.name ?? j.jobNo]));
  return grouped.map((g) => {
    const minutes = g._sum.minutes ?? 0;
    return { key: g.jobId, label: map.get(g.jobId) ?? "Unknown", minutes, hours: minutes / 60 };
  });
}

export type TrendInterval = "day" | "week" | "month";

export async function getTimeTrend(filters: TimeReportFilters, interval: TrendInterval): Promise<{ period: string; minutes: number }[]> {
  const conditions: Prisma.Sql[] = [Prisma.sql`1=1`];
  if (filters.from) conditions.push(Prisma.sql`t.entryDate >= ${filters.from}`);
  if (filters.to) conditions.push(Prisma.sql`t.entryDate <= ${filters.to}`);
  if (filters.staffMemberId) conditions.push(Prisma.sql`t.staffMemberId = ${filters.staffMemberId}`);
  if (filters.clientId) conditions.push(Prisma.sql`t.clientId = ${filters.clientId}`);
  if (filters.jobManager) conditions.push(Prisma.sql`c.jobManager = ${filters.jobManager}`);
  const whereClause = Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}`;

  const dateExpr =
    interval === "month"
      ? Prisma.sql`DATE_FORMAT(t.entryDate, '%Y-%m-01')`
      : interval === "week"
        ? Prisma.sql`DATE_FORMAT(DATE_SUB(t.entryDate, INTERVAL WEEKDAY(t.entryDate) DAY), '%Y-%m-%d')`
        : Prisma.sql`DATE_FORMAT(t.entryDate, '%Y-%m-%d')`;

  const rows = await prisma.$queryRaw<{ period: string; minutes: number | bigint }[]>`
    SELECT ${dateExpr} AS period, SUM(t.minutes) AS minutes
    FROM \`Timesheet\` t
    JOIN \`Client\` c ON c.id = t.clientId
    ${whereClause}
    GROUP BY period
    ORDER BY period
  `;
  return rows.map((r) => ({ period: r.period, minutes: Number(r.minutes) }));
}

// ---------------------------------------------------------------------------
// Business analytics
// ---------------------------------------------------------------------------
export interface AnalyticsFilters {
  from?: Date;
  to?: Date;
  clientId?: number;
  jobManager?: string;
  state?: string;
}

function jobWhere(filters: AnalyticsFilters): Prisma.JobWhereInput {
  const where: Prisma.JobWhereInput = {};
  if (filters.from || filters.to) {
    where.startDate = {};
    if (filters.from) where.startDate.gte = filters.from;
    if (filters.to) where.startDate.lte = filters.to;
  }
  if (filters.clientId) where.clientId = filters.clientId;
  if (filters.jobManager) where.client = { jobManager: filters.jobManager };
  if (filters.state) where.state = filters.state;
  return where;
}

export async function getJobsByState(filters: AnalyticsFilters) {
  const grouped = await prisma.job.groupBy({ by: ["state"], where: jobWhere(filters), _count: { _all: true } });
  return grouped.map((g) => ({ state: g.state, count: g._count._all })).sort((a, b) => b.count - a.count);
}

export async function getBudgetTotalsByState(filters: AnalyticsFilters) {
  const grouped = await prisma.job.groupBy({ by: ["state"], where: jobWhere(filters), _sum: { budget: true }, _count: { _all: true } });
  return grouped
    .map((g) => ({ state: g.state, totalBudget: g._sum.budget ? Number(g._sum.budget) : 0, count: g._count._all }))
    .sort((a, b) => b.totalBudget - a.totalBudget);
}

export async function getTopClientsByBudget(filters: AnalyticsFilters, limit = 10) {
  const grouped = await prisma.job.groupBy({
    by: ["clientId"],
    where: jobWhere(filters),
    _sum: { budget: true },
    orderBy: { _sum: { budget: "desc" } },
    take: limit,
  });
  const clients = await prisma.client.findMany({ where: { id: { in: grouped.map((g) => g.clientId) } } });
  const map = new Map(clients.map((c) => [c.id, c.name]));
  return grouped.map((g) => ({ clientId: g.clientId, name: map.get(g.clientId) ?? "Unknown", totalBudget: g._sum.budget ? Number(g._sum.budget) : 0 }));
}

export async function getTopClientsByHours(filters: TimeReportFilters, limit = 10) {
  const grouped = await prisma.timesheet.groupBy({
    by: ["clientId"],
    where: timesheetWhere(filters),
    _sum: { minutes: true },
    orderBy: { _sum: { minutes: "desc" } },
    take: limit,
  });
  const clients = await prisma.client.findMany({ where: { id: { in: grouped.map((g) => g.clientId) } } });
  const map = new Map(clients.map((c) => [c.id, c.name]));
  return grouped.map((g) => ({ clientId: g.clientId, name: map.get(g.clientId) ?? "Unknown", minutes: g._sum.minutes ?? 0, hours: (g._sum.minutes ?? 0) / 60 }));
}

export async function getAvgTurnaroundDays(filters: AnalyticsFilters): Promise<number | null> {
  const where: Prisma.JobWhereInput = { ...jobWhere(filters), startDate: { not: null }, completedDate: { not: null } };
  const jobs = await prisma.job.findMany({ where, select: { startDate: true, completedDate: true } });
  if (jobs.length === 0) return null;
  const totalDays = jobs.reduce((sum, j) => sum + (j.completedDate!.getTime() - j.startDate!.getTime()) / 86_400_000, 0);
  return totalDays / jobs.length;
}

export async function getClientMix() {
  const byStructure = await prisma.client.groupBy({ by: ["businessStructure"], _count: { _all: true } });
  const byType = await prisma.client.groupBy({ by: ["clientType"], _count: { _all: true } });
  return {
    byBusinessStructure: byStructure.map((g) => ({ label: g.businessStructure ?? "(unspecified)", count: g._count._all })),
    byClientType: byType.map((g) => ({ label: g.clientType || "(unspecified)", count: g._count._all })),
  };
}

// ---------------------------------------------------------------------------
// Job cost & budget analytics (computed on read — always consistent with the
// latest timesheet/rate data, no recompute step needed after editing a rate).
// ---------------------------------------------------------------------------
export interface StaffCostBreakdownRow {
  staffMemberId: number;
  staffName: string;
  minutes: number;
  hours: number;
  pctOfJob: number;
  hourlyRate: number | null;
  cost: number | null;
}

export interface JobCostBreakdown {
  jobId: number;
  totalMinutes: number;
  totalHours: number;
  totalCost: number | null;
  budget: number | null;
  variance: number | null;
  variancePct: number | null;
  overBudget: boolean;
  ratesIncomplete: boolean;
  staff: StaffCostBreakdownRow[];
}

export async function getJobCostBreakdown(jobId: number): Promise<JobCostBreakdown | null> {
  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) return null;

  const grouped = await prisma.timesheet.groupBy({ by: ["staffMemberId"], where: { jobId }, _sum: { minutes: true } });
  const staffMembers = await prisma.staffMember.findMany({ where: { id: { in: grouped.map((g) => g.staffMemberId) } } });
  const staffMap = new Map(staffMembers.map((s) => [s.id, s]));

  const totalMinutes = grouped.reduce((sum, g) => sum + (g._sum.minutes ?? 0), 0);
  let ratesIncomplete = false;

  const staff: StaffCostBreakdownRow[] = grouped.map((g) => {
    const member = staffMap.get(g.staffMemberId);
    const minutes = g._sum.minutes ?? 0;
    const hourlyRate = member?.hourlyRate != null ? Number(member.hourlyRate) : null;
    if (hourlyRate === null) ratesIncomplete = true;
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
  // variance = budget - actualCost: negative means the job cost more than budgeted (a loss),
  // positive means it came in under budget. This is the opposite sign of a plain "actual minus
  // budget" cost-accounting variance, chosen deliberately so the number reads the way a P&L would.
  const variance = totalCost != null && budget != null ? budget - totalCost : null;
  const variancePct = variance != null && budget ? (variance / budget) * 100 : null;
  // A "0.00" budget means no real budget was ever set — don't flag those as over budget.
  const overBudget = variance != null && variance < 0 && !!budget && budget > 0;

  return { jobId, totalMinutes, totalHours: totalMinutes / 60, totalCost, budget, variance, variancePct, overBudget, ratesIncomplete, staff };
}

export interface JobsOverBudgetFilters {
  clientId?: number;
  jobManager?: string;
  state?: string;
  from?: Date;
  to?: Date;
}

export interface OverBudgetJobRow {
  jobId: number;
  jobNo: string;
  name: string | null;
  clientId: number;
  clientName: string;
  jobManager: string | null;
  state: string;
  budget: number;
  totalCost: number;
  variance: number;
  variancePct: number;
}

export interface JobsOverBudgetResult {
  rows: OverBudgetJobRow[];
  /** Count of all over-budget jobs matching the filters, before `limit` slicing — use this for
   * summary KPIs instead of `rows.length`, which is capped. */
  totalCount: number;
  /** Sum of variance across ALL over-budget jobs matching the filters, not just the returned
   * (possibly limit-capped) `rows`. */
  totalOverage: number;
  /** Average variancePct across ALL over-budget jobs matching the filters. */
  avgVariancePct: number;
  ratesIncompleteCount: number;
}

/** Runs the cost-vs-budget calculation across all jobs in one query (not per-job N+1). */
export async function getJobsOverBudget(filters: JobsOverBudgetFilters, limit = 100): Promise<JobsOverBudgetResult> {
  // budget > 0 (not just NOT NULL) — a "0.00" budget in the source data means no real budget
  // was ever set for the job, not that the job has a zero-rand budget to compare cost against.
  const conditions: Prisma.Sql[] = [Prisma.sql`j.budget > 0`];
  if (filters.clientId) conditions.push(Prisma.sql`j.clientId = ${filters.clientId}`);
  if (filters.jobManager) conditions.push(Prisma.sql`c.jobManager = ${filters.jobManager}`);
  if (filters.state) conditions.push(Prisma.sql`j.state = ${filters.state}`);
  if (filters.from) conditions.push(Prisma.sql`j.startDate >= ${filters.from}`);
  if (filters.to) conditions.push(Prisma.sql`j.startDate <= ${filters.to}`);
  const whereClause = Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}`;

  const rows = await prisma.$queryRaw<
    {
      jobId: number;
      jobNo: string;
      name: string | null;
      clientId: number;
      clientName: string;
      jobManager: string | null;
      state: string;
      budget: number;
      totalCost: number;
      missingRateCount: number | bigint;
    }[]
  >`
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
  const overBudget: OverBudgetJobRow[] = [];

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

// ---------------------------------------------------------------------------
// CTC vs Target report — fee earned per staff member against their
// cost-to-company and a target derived from it. Fee is a share of each job's
// budget: for every job a staff member logged time on in the selected range,
// they're credited (their hours on that job ÷ all staff's combined hours on
// that job, within the range) × the job's budget — not a flat hourly rate.
// ---------------------------------------------------------------------------
export interface CtcVsTargetFilters {
  from?: Date;
  to?: Date;
}

export interface CtcVsTargetRow {
  staffMemberId: number;
  staffName: string;
  fee: number;
  expenses: number | null;
  netFee: number;
  average: number;
  c2cPm: number | null;
  target: number | null;
  /** Average minus Target, in the accounting sign convention: positive means the staff member is
   * exceeding target (profit), negative means they're falling short (loss). Null when no target is set. */
  variance: number | null;
}

export interface CtcVsTargetTotals {
  fee: number;
  expenses: number;
  netFee: number;
  average: number;
  c2cPm: number;
  target: number;
  variance: number;
}

export interface CtcVsTargetResult {
  rows: CtcVsTargetRow[];
  totals: CtcVsTargetTotals;
  monthCount: number;
}

function monthsBetweenInclusive(from?: Date, to?: Date): number {
  if (!from || !to) return 1;
  const months = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth()) + 1;
  return Math.max(1, months);
}

export async function getCtcVsTargetReport(filters: CtcVsTargetFilters): Promise<CtcVsTargetResult> {
  const monthCount = monthsBetweenInclusive(filters.from, filters.to);

  // Fee is a per-job budget allocation, not a rate calculation, so it can't be expressed as a
  // single groupBy — it needs each staff member's share of hours per job (perJobStaff) against
  // all staff's combined hours on that same job (jobTotals) to compute their slice of the budget.
  const dateConditions: Prisma.Sql[] = [];
  if (filters.from) dateConditions.push(Prisma.sql`entryDate >= ${filters.from}`);
  if (filters.to) dateConditions.push(Prisma.sql`entryDate <= ${filters.to}`);
  const dateWhere = dateConditions.length > 0 ? Prisma.sql`WHERE ${Prisma.join(dateConditions, " AND ")}` : Prisma.empty;

  const feeRows = await prisma.$queryRaw<{ staffMemberId: number; fee: number }[]>`
    SELECT perJobStaff.staffMemberId AS staffMemberId,
           SUM(perJobStaff.staffHours / jobTotals.totalHours * COALESCE(j.budget, 0)) AS fee
    FROM (
      SELECT jobId, staffMemberId, SUM(minutes) / 60 AS staffHours
      FROM \`Timesheet\`
      ${dateWhere}
      GROUP BY jobId, staffMemberId
    ) perJobStaff
    JOIN (
      SELECT jobId, SUM(minutes) / 60 AS totalHours
      FROM \`Timesheet\`
      ${dateWhere}
      GROUP BY jobId
    ) jobTotals ON jobTotals.jobId = perJobStaff.jobId
    JOIN \`Job\` j ON j.id = perJobStaff.jobId
    GROUP BY perJobStaff.staffMemberId
  `;

  const staffMembers = await prisma.staffMember.findMany({ where: { id: { in: feeRows.map((f) => f.staffMemberId) } } });
  const staffMap = new Map(staffMembers.map((s) => [s.id, s]));

  const rows: CtcVsTargetRow[] = feeRows.map((f) => {
    const member = staffMap.get(f.staffMemberId);
    const fee = Number(f.fee);
    const c2cPm = member?.monthlyCtc != null ? Number(member.monthlyCtc) : null;
    const target = c2cPm != null ? c2cPm * 3 : null;
    const expenses = member?.monthlyExpenses != null ? Number(member.monthlyExpenses) * monthCount : null;
    const average = fee / monthCount;
    return {
      staffMemberId: f.staffMemberId,
      staffName: member?.name ?? "Unknown",
      fee,
      expenses,
      netFee: fee - (expenses ?? 0),
      average,
      c2cPm,
      target,
      variance: target != null ? average - target : null,
    };
  });
  rows.sort((a, b) => b.fee - a.fee);

  const totals = rows.reduce<CtcVsTargetTotals>(
    (acc, r) => ({
      fee: acc.fee + r.fee,
      expenses: acc.expenses + (r.expenses ?? 0),
      netFee: acc.netFee + r.netFee,
      average: acc.average + r.average,
      c2cPm: acc.c2cPm + (r.c2cPm ?? 0),
      target: acc.target + (r.target ?? 0),
      variance: acc.variance + (r.variance ?? 0),
    }),
    { fee: 0, expenses: 0, netFee: 0, average: 0, c2cPm: 0, target: 0, variance: 0 },
  );

  return { rows, totals, monthCount };
}

export interface CtcVsTargetBreakdownRow {
  jobId: number;
  jobNo: string;
  jobName: string | null;
  clientName: string;
  staffHours: number;
  totalHours: number;
  sharePct: number;
  budget: number;
  fee: number;
}

/** Per-job detail behind one staff member's Fee figure in getCtcVsTargetReport — the same
 * per-job/per-staff share-of-hours × budget calculation, but returned one row per job instead
 * of summed into a single total, so the report's Fee number can be drilled into. */
export async function getCtcVsTargetBreakdown(staffMemberId: number, filters: CtcVsTargetFilters): Promise<CtcVsTargetBreakdownRow[]> {
  const dateConditions: Prisma.Sql[] = [];
  if (filters.from) dateConditions.push(Prisma.sql`entryDate >= ${filters.from}`);
  if (filters.to) dateConditions.push(Prisma.sql`entryDate <= ${filters.to}`);
  const dateWhere = dateConditions.length > 0 ? Prisma.sql`AND ${Prisma.join(dateConditions, " AND ")}` : Prisma.empty;

  const rows = await prisma.$queryRaw<
    { jobId: number; jobNo: string; jobName: string | null; clientName: string; staffHours: number; totalHours: number; budget: number }[]
  >`
    SELECT j.id AS jobId, j.jobNo AS jobNo, j.name AS jobName, c.name AS clientName,
           perJobStaff.staffHours AS staffHours, jobTotals.totalHours AS totalHours, COALESCE(j.budget, 0) AS budget
    FROM (
      SELECT jobId, SUM(minutes) / 60 AS staffHours
      FROM \`Timesheet\`
      WHERE staffMemberId = ${staffMemberId} ${dateWhere}
      GROUP BY jobId
    ) perJobStaff
    JOIN (
      SELECT jobId, SUM(minutes) / 60 AS totalHours
      FROM \`Timesheet\`
      WHERE 1 = 1 ${dateWhere}
      GROUP BY jobId
    ) jobTotals ON jobTotals.jobId = perJobStaff.jobId
    JOIN \`Job\` j ON j.id = perJobStaff.jobId
    JOIN \`Client\` c ON c.id = j.clientId
  `;

  return rows
    .map((r) => {
      const staffHours = Number(r.staffHours);
      const totalHours = Number(r.totalHours);
      const budget = Number(r.budget);
      const sharePct = totalHours > 0 ? (staffHours / totalHours) * 100 : 0;
      return {
        jobId: r.jobId,
        jobNo: r.jobNo,
        jobName: r.jobName,
        clientName: r.clientName,
        staffHours,
        totalHours,
        sharePct,
        budget,
        fee: (staffHours / totalHours) * budget,
      };
    })
    .sort((a, b) => b.fee - a.fee);
}

// ---------------------------------------------------------------------------
// Staff vs Client report — monthly profit on jobs (budget minus staff cost),
// value of invoiced jobs, and value of jobs not yet billed, bucketed by
// Job.completedDate.
// ---------------------------------------------------------------------------
export interface StaffVsClientFilters {
  from?: Date;
  to?: Date;
}

export interface StaffVsClientRow {
  month: string;
  profit: number;
  clientJobsComplete: number;
  jobsNotBilled: number;
}

export interface StaffVsClientTotals {
  profit: number;
  clientJobsComplete: number;
  jobsNotBilled: number;
}

export interface StaffVsClientResult {
  rows: StaffVsClientRow[];
  totals: StaffVsClientTotals;
}

export async function getStaffVsClientReport(filters: StaffVsClientFilters): Promise<StaffVsClientResult> {
  const conditions: Prisma.Sql[] = [Prisma.sql`j.completedDate IS NOT NULL`];
  if (filters.from) conditions.push(Prisma.sql`j.completedDate >= ${filters.from}`);
  if (filters.to) conditions.push(Prisma.sql`j.completedDate <= ${filters.to}`);
  const whereClause = Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}`;

  const rows = await prisma.$queryRaw<{ month: string; profit: number; clientJobsComplete: number; jobsNotBilled: number }[]>`
    SELECT
      DATE_FORMAT(j.completedDate, '%Y-%m-01') AS month,
      SUM(COALESCE(j.budget, 0) - COALESCE(jc.cost, 0)) AS profit,
      SUM(CASE WHEN j.state = 'Invoiced' THEN COALESCE(j.budget, 0) ELSE 0 END) AS clientJobsComplete,
      SUM(CASE WHEN j.state <> 'Invoiced' THEN COALESCE(j.budget, 0) - COALESCE(jc.cost, 0) ELSE 0 END) AS jobsNotBilled
    FROM \`Job\` j
    LEFT JOIN (
      SELECT ts.jobId, SUM(ts.minutes / 60 * COALESCE(sm.hourlyRate, 0)) AS cost
      FROM \`Timesheet\` ts
      JOIN \`StaffMember\` sm ON sm.id = ts.staffMemberId
      GROUP BY ts.jobId
    ) jc ON jc.jobId = j.id
    ${whereClause}
    GROUP BY month
    ORDER BY month
  `;

  const mapped = rows.map((r) => ({
    month: r.month,
    profit: Number(r.profit),
    clientJobsComplete: Number(r.clientJobsComplete),
    jobsNotBilled: Number(r.jobsNotBilled),
  }));

  const totals = mapped.reduce<StaffVsClientTotals>(
    (acc, r) => ({
      profit: acc.profit + r.profit,
      clientJobsComplete: acc.clientJobsComplete + r.clientJobsComplete,
      jobsNotBilled: acc.jobsNotBilled + r.jobsNotBilled,
    }),
    { profit: 0, clientJobsComplete: 0, jobsNotBilled: 0 },
  );

  return { rows: mapped, totals };
}
