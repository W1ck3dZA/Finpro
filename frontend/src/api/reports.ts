import { api } from "./client";
import type { AnalyticsResponse, CtcVsTargetBreakdownResponse, CtcVsTargetResponse, JobsOverBudgetResponse, StaffVsClientResponse, TimeReportResponse } from "./types";

export interface ReportFilters {
  from?: string;
  to?: string;
  staffMemberId?: number;
  clientId?: number;
  jobManager?: string;
  state?: string;
}

export async function getTimeReport(groupBy: "staff" | "client" | "job", interval: "day" | "week" | "month", filters: ReportFilters = {}): Promise<TimeReportResponse> {
  const { data } = await api.get("/reports/time", { params: { groupBy, interval, ...filters } });
  return data;
}

export async function getAnalytics(filters: ReportFilters = {}): Promise<AnalyticsResponse> {
  const { data } = await api.get("/reports/analytics", { params: filters });
  return data;
}

export async function getJobsOverBudget(filters: ReportFilters = {}, limit = 100, exportAll = false): Promise<JobsOverBudgetResponse> {
  const { data } = await api.get("/reports/jobs-over-budget", { params: { ...filters, limit, export: exportAll || undefined } });
  return data;
}

export async function getCtcVsTargetReport(filters: ReportFilters = {}): Promise<CtcVsTargetResponse> {
  const { data } = await api.get("/reports/ctc-vs-target", { params: filters });
  return data;
}

export async function getCtcVsTargetBreakdown(staffMemberId: number, filters: ReportFilters = {}): Promise<CtcVsTargetBreakdownResponse> {
  const { data } = await api.get(`/reports/ctc-vs-target/${staffMemberId}/breakdown`, { params: filters });
  return data;
}

export async function getStaffVsClientReport(filters: ReportFilters = {}): Promise<StaffVsClientResponse> {
  const { data } = await api.get("/reports/staff-vs-client", { params: filters });
  return data;
}
