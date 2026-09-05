import { api } from "./client";
import type { TimesheetListResponse } from "./types";

export interface TimesheetFilters {
  search?: string;
  client?: string;
  clientId?: number;
  jobId?: number;
  staffMemberId?: number;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
  sortField?: string;
  sortOrder?: "asc" | "desc";
  /** Returns every matching row (ignoring pagination), for CSV export. */
  export?: boolean;
}

export async function listTimesheets(filters: TimesheetFilters = {}): Promise<TimesheetListResponse> {
  const { data } = await api.get("/timesheets", { params: filters });
  return data;
}
