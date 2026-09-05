export type Role = "ADMIN" | "STAFF";

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: Role;
  active?: boolean;
}

export interface Client {
  id: number;
  name: string;
  businessStructure: string | null;
  provisionalTaxpayer: boolean | null;
  firstName: string | null;
  lastName: string | null;
  companyNumber: string | null;
  cipcDate: string | null;
  taxNumber: string | null;
  email: string | null;
  phone: string | null;
  country: string | null;
  address: string | null;
  payrollClient: boolean | null;
  cashbook: boolean | null;
  vatSubmission: boolean | null;
  jobManager: string | null;
  clientType: string | null;
  isStub: boolean;
  createdAt: string;
  updatedAt: string;
  jobs?: Job[];
}

export interface Job {
  id: number;
  jobNo: string;
  clientId: number;
  name: string | null;
  startDate: string | null;
  budget: string | null;
  state: string;
  completedDate: string | null;
  actualTimeMinutes: number | null;
  isStub: boolean;
  createdAt: string;
  updatedAt: string;
  client?: { id: number; name: string; jobManager: string | null };
  costBreakdown?: JobCostBreakdown;
}

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

export interface StaffMember {
  id: number;
  name: string;
  hourlyRate: string | null;
  monthlyCtc: string | null;
  monthlyExpenses: string | null;
  linkedUserId: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface ImportSummaryItem {
  code: string;
  label: string;
  count: number;
}

export interface ImportWarning {
  row: number;
  code: string;
  message: string;
  context?: Record<string, unknown>;
}

export interface ImportResult {
  importBatchId: number;
  type: "CLIENT" | "JOB" | "TIME";
  filename: string;
  status: "SUCCESS" | "PARTIAL" | "FAILED";
  rowsTotal: number;
  rowsInserted: number;
  rowsUpdated: number;
  rowsSkipped: number;
  summary: ImportSummaryItem[];
  warnings: ImportWarning[];
}

export interface ImportBatchListItem {
  id: number;
  type: "CLIENT" | "JOB" | "TIME";
  filename: string;
  uploadedBy: string;
  rowsTotal: number;
  rowsInserted: number;
  rowsUpdated: number;
  rowsSkipped: number;
  status: "SUCCESS" | "PARTIAL" | "FAILED";
  summary: ImportSummaryItem[];
  createdAt: string;
}

export interface Paginated<T> {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface Timesheet {
  id: number;
  clientId: number;
  jobId: number;
  staffMemberId: number;
  entryDate: string;
  minutes: number;
  note: string | null;
  importBatchId: number;
  createdAt: string;
  client: { id: number; name: string };
  job: { id: number; jobNo: string; name: string | null };
  staffMember: { id: number; name: string; hourlyRate: string | null };
}

export interface TimesheetListResponse extends Paginated<Timesheet> {
  totalMinutes: number;
  totalFee: number;
  distinctStaffCount: number;
  distinctJobCount: number;
}

export interface TimeReportRow {
  key: number;
  label: string;
  minutes: number;
  hours: number;
}

export interface TimeReportResponse {
  groupBy: string;
  rows: TimeReportRow[];
  trend: { period: string; minutes: number }[];
  interval: string;
}

export interface AnalyticsResponse {
  jobsByState: { state: string; count: number }[];
  budgetByState: { state: string; totalBudget: number; count: number }[];
  topClientsByBudget: { clientId: number; name: string; totalBudget: number }[];
  topClientsByHours: { clientId: number; name: string; minutes: number; hours: number }[];
  avgTurnaroundDays: number | null;
  clientMix: {
    byBusinessStructure: { label: string; count: number }[];
    byClientType: { label: string; count: number }[];
  };
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

export interface JobsOverBudgetResponse {
  rows: OverBudgetJobRow[];
  /** Count of all over-budget jobs matching the filters, before the `limit` slicing applied to `rows`. */
  totalCount: number;
  /** Sum of variance across ALL over-budget jobs matching the filters, not just the returned `rows`. */
  totalOverage: number;
  /** Average variancePct across ALL over-budget jobs matching the filters. */
  avgVariancePct: number;
  ratesIncompleteCount: number;
}

export interface JobListResponse extends Paginated<Job> {
  /** Sum of budget across all jobs matching the current filters (not just the current page). */
  totalBudget: number;
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

export interface CtcVsTargetResponse {
  rows: CtcVsTargetRow[];
  totals: CtcVsTargetTotals;
  monthCount: number;
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

export interface CtcVsTargetBreakdownResponse {
  rows: CtcVsTargetBreakdownRow[];
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

export interface StaffVsClientResponse {
  rows: StaffVsClientRow[];
  totals: StaffVsClientTotals;
}
