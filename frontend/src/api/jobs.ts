import { api } from "./client";
import type { Job, JobListResponse } from "./types";

export interface JobFilters {
  search?: string;
  state?: string;
  clientId?: number;
  client?: string;
  jobManager?: string;
  isStub?: boolean;
  /** Jobs not yet in a terminal state (Invoiced/Cancelled). Ignored if `state` or `financeTasks` is also set. */
  openOnly?: boolean;
  /** Jobs with zero Timesheet entries logged against them. */
  noHoursLogged?: boolean;
  /** Jobs ready to be quoted/invoiced: state = "Pls Invoice", no budget set, and time has been
   * logged against them. Takes priority over `state`/`openOnly` when set. */
  financeTasks?: boolean;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
  sortField?: string;
  sortOrder?: "asc" | "desc";
  /** Returns every matching row (ignoring pagination), for CSV export. */
  export?: boolean;
}

export async function listJobs(filters: JobFilters = {}): Promise<JobListResponse> {
  const { data } = await api.get("/jobs", { params: filters });
  return data;
}

export async function getJob(id: number): Promise<Job> {
  const { data } = await api.get(`/jobs/${id}`);
  return data;
}
