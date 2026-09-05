import { Request, Response } from "express";
import * as reports from "../services/reports.service";

function parseDateParam(v: unknown): Date | undefined {
  if (typeof v !== "string" || !v) return undefined;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function parseTimeFilters(req: Request): reports.TimeReportFilters {
  return {
    from: parseDateParam(req.query.from),
    to: parseDateParam(req.query.to),
    staffMemberId: req.query.staffMemberId ? Number(req.query.staffMemberId) : undefined,
    clientId: req.query.clientId ? Number(req.query.clientId) : undefined,
    jobManager: req.query.jobManager ? String(req.query.jobManager) : undefined,
  };
}

export async function getTimeReport(req: Request, res: Response) {
  const filters = parseTimeFilters(req);
  const groupBy = String(req.query.groupBy ?? "staff");

  let rows: reports.TimeReportRow[];
  if (groupBy === "client") rows = await reports.getTimeByClient(filters);
  else if (groupBy === "job") rows = await reports.getTimeByJob(filters);
  else rows = await reports.getTimeByStaff(filters);

  const interval = (["day", "week", "month"].includes(String(req.query.interval)) ? req.query.interval : "day") as reports.TrendInterval;
  const trend = await reports.getTimeTrend(filters, interval);

  res.json({ groupBy, rows, trend, interval });
}

export async function getAnalyticsReport(req: Request, res: Response) {
  const filters: reports.AnalyticsFilters = {
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

export async function getCtcVsTargetReport(req: Request, res: Response) {
  const filters: reports.CtcVsTargetFilters = {
    from: parseDateParam(req.query.from),
    to: parseDateParam(req.query.to),
  };
  const result = await reports.getCtcVsTargetReport(filters);
  res.json(result);
}

export async function getCtcVsTargetBreakdown(req: Request, res: Response) {
  const staffMemberId = Number(req.params.staffMemberId);
  const filters: reports.CtcVsTargetFilters = {
    from: parseDateParam(req.query.from),
    to: parseDateParam(req.query.to),
  };
  const rows = await reports.getCtcVsTargetBreakdown(staffMemberId, filters);
  res.json({ rows });
}

export async function getStaffVsClientReport(req: Request, res: Response) {
  const filters: reports.StaffVsClientFilters = {
    from: parseDateParam(req.query.from),
    to: parseDateParam(req.query.to),
  };
  const result = await reports.getStaffVsClientReport(filters);
  res.json(result);
}

export async function getJobsOverBudgetReport(req: Request, res: Response) {
  const filters: reports.JobsOverBudgetFilters = {
    clientId: req.query.clientId ? Number(req.query.clientId) : undefined,
    jobManager: req.query.jobManager ? String(req.query.jobManager) : undefined,
    state: req.query.state ? String(req.query.state) : undefined,
    from: parseDateParam(req.query.from),
    to: parseDateParam(req.query.to),
  };
  // Export mode returns every over-budget job matching the filters, not just the capped
  // top-N normally shown on screen, so a CSV export reflects the full result set.
  const isExport = req.query.export === "true";
  const limit = isExport ? 50_000 : Math.min(500, Math.max(1, Number(req.query.limit) || 100));
  const result = await reports.getJobsOverBudget(filters, limit);
  res.json(result);
}
