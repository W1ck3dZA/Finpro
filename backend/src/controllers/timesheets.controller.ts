import { Request, Response } from "express";
import { Prisma } from "../generated/prisma/client";
import { prisma } from "../config/prisma";

function buildTimesheetOrderBy(sortField: string | undefined, sortOrder: "asc" | "desc"): Prisma.TimesheetOrderByWithRelationInput {
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

// Export mode returns every row matching the current filters (not just one page) so a CSV
// export always reflects the full filtered result set, capped well above real data volumes
// as a safety net against a runaway query rather than a limit anyone should ever hit.
const EXPORT_ROW_CAP = 50_000;

export async function listTimesheets(req: Request, res: Response) {
  const isExport = req.query.export === "true";
  const page = isExport ? 1 : Math.max(1, Number(req.query.page) || 1);
  const pageSize = isExport ? EXPORT_ROW_CAP : Math.min(200, Math.max(1, Number(req.query.pageSize) || 25));

  const where: Prisma.TimesheetWhereInput = {};
  if (req.query.staffMemberId) where.staffMemberId = Number(req.query.staffMemberId);
  if (req.query.clientId) where.clientId = Number(req.query.clientId);
  if (req.query.jobId) where.jobId = Number(req.query.jobId);
  if (req.query.client) where.client = { name: { contains: String(req.query.client) } };
  if (req.query.search) {
    const search = String(req.query.search);
    where.job = { OR: [{ jobNo: { contains: search } }, { name: { contains: search } }] };
  }
  if (req.query.from || req.query.to) {
    where.entryDate = {};
    if (req.query.from) where.entryDate.gte = new Date(String(req.query.from));
    if (req.query.to) where.entryDate.lte = new Date(String(req.query.to));
  }

  const sortOrder = req.query.sortOrder === "asc" ? "asc" : "desc";
  const orderBy = buildTimesheetOrderBy(req.query.sortField ? String(req.query.sortField) : undefined, sortOrder);

  const [rows, total, minutesAgg, staffMinutes, distinctJobs] = await Promise.all([
    prisma.timesheet.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        client: { select: { id: true, name: true } },
        job: { select: { id: true, jobNo: true, name: true } },
        staffMember: { select: { id: true, name: true, hourlyRate: true } },
      },
    }),
    prisma.timesheet.count({ where }),
    prisma.timesheet.aggregate({ where, _sum: { minutes: true } }),
    // Grouped (not a plain distinct findMany) so the same query also yields each staff
    // member's minutes, needed to compute total fee across the full filtered set below.
    prisma.timesheet.groupBy({ by: ["staffMemberId"], where, _sum: { minutes: true } }),
    prisma.timesheet.findMany({ where, distinct: ["jobId"], select: { jobId: true } }),
  ]);

  const staffMembers = await prisma.staffMember.findMany({
    where: { id: { in: staffMinutes.map((s) => s.staffMemberId) } },
    select: { id: true, hourlyRate: true },
  });
  const rateById = new Map(staffMembers.map((s) => [s.id, s.hourlyRate != null ? Number(s.hourlyRate) : 0]));
  const totalFee = staffMinutes.reduce((sum, s) => sum + ((s._sum.minutes ?? 0) / 60) * (rateById.get(s.staffMemberId) ?? 0), 0);

  res.json({
    rows,
    total,
    page,
    pageSize,
    totalMinutes: minutesAgg._sum.minutes ?? 0,
    totalFee,
    distinctStaffCount: staffMinutes.length,
    distinctJobCount: distinctJobs.length,
  });
}
