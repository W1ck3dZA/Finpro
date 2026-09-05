import { Request, Response } from "express";
import { Prisma } from "../generated/prisma/client";
import { prisma } from "../config/prisma";
import { getJobCostBreakdown } from "../services/reports.service";

/** Maps a DataGrid column's `field` name to the corresponding Prisma orderBy shape, including
 * the relation traversal for columns sourced from the related Client (e.g. "clientName"). */
function buildJobOrderBy(sortField: string | undefined, sortOrder: "asc" | "desc"): Prisma.JobOrderByWithRelationInput {
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

// Export mode returns every row matching the current filters (not just one page) so a CSV
// export always reflects the full filtered result set, capped well above real data volumes
// as a safety net against a runaway query rather than a limit anyone should ever hit.
const EXPORT_ROW_CAP = 50_000;

export async function listJobs(req: Request, res: Response) {
  const isExport = req.query.export === "true";
  const page = isExport ? 1 : Math.max(1, Number(req.query.page) || 1);
  const pageSize = isExport ? EXPORT_ROW_CAP : Math.min(200, Math.max(1, Number(req.query.pageSize) || 25));

  const where: Prisma.JobWhereInput = {};
  // "Finance Tasks" = jobs ready to be quoted/invoiced but not yet budgeted: state is "Pls
  // Invoice", no budget has been set, and time has actually been logged against them (otherwise
  // there's nothing yet to base a quote on). Takes priority over a manually selected state.
  if (req.query.financeTasks === "true") {
    where.state = "Pls Invoice";
    where.budget = null;
    where.timesheets = { some: {} };
  } else if (req.query.state) {
    where.state = String(req.query.state);
  }
  // "Open" = not yet in a terminal state. Same definition the frontend already uses for its
  // "Active Jobs" dashboard KPI — kept here so the underlying job list can be queried the same way.
  else if (req.query.openOnly === "true") where.state = { notIn: ["Invoiced", "Cancelled"] };
  if (req.query.clientId) where.clientId = Number(req.query.clientId);
  if (req.query.search) {
    const search = String(req.query.search);
    where.OR = [{ jobNo: { contains: search } }, { name: { contains: search } }];
  }
  if (req.query.client || req.query.jobManager) {
    const clientFilter: Prisma.ClientWhereInput = {};
    if (req.query.client) clientFilter.name = { contains: String(req.query.client) };
    if (req.query.jobManager) clientFilter.jobManager = String(req.query.jobManager);
    where.client = clientFilter;
  }
  if (req.query.isStub !== undefined) where.isStub = req.query.isStub === "true";
  if (req.query.noHoursLogged === "true") where.timesheets = { none: {} };
  if (req.query.from || req.query.to) {
    where.startDate = {};
    if (req.query.from) where.startDate.gte = new Date(String(req.query.from));
    if (req.query.to) where.startDate.lte = new Date(String(req.query.to));
  }

  const sortOrder = req.query.sortOrder === "asc" ? "asc" : "desc";
  const orderBy = buildJobOrderBy(req.query.sortField ? String(req.query.sortField) : undefined, sortOrder);

  const [rows, total, budgetAgg] = await Promise.all([
    prisma.job.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { client: { select: { id: true, name: true, jobManager: true } } },
    }),
    prisma.job.count({ where }),
    prisma.job.aggregate({ where, _sum: { budget: true } }),
  ]);

  res.json({ rows, total, page, pageSize, totalBudget: budgetAgg._sum.budget ? Number(budgetAgg._sum.budget) : 0 });
}

export async function getJob(req: Request, res: Response) {
  const id = Number(req.params.id);
  const job = await prisma.job.findUnique({ where: { id }, include: { client: true } });
  if (!job) {
    res.status(404).json({ error: "Job not found" });
    return;
  }
  const costBreakdown = await getJobCostBreakdown(id);
  res.json({ ...job, costBreakdown });
}
