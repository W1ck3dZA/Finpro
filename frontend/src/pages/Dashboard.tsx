import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Grid, Typography, Paper, Box, CircularProgress, Stack, Chip, ToggleButtonGroup, ToggleButton } from "@mui/material";
import { LineChart } from "@mui/x-charts/LineChart";
import { BarChart } from "@mui/x-charts/BarChart";
import { ChartsReferenceLine } from "@mui/x-charts/ChartsReferenceLine";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import dayjs from "dayjs";
import { KpiCard, type Trend } from "../components/KpiCard";
import { listClients } from "../api/clients";
import { listJobs } from "../api/jobs";
import { getAnalytics, getJobsOverBudget, getTimeReport } from "../api/reports";
import { formatMoney } from "../utils/money";
import type { AnalyticsResponse, Job, JobsOverBudgetResponse, TimeReportResponse } from "../api/types";

type TrendInterval = "day" | "week" | "month";

function money(n: number): string {
  return formatMoney(n, { decimals: 0 });
}

function truncateLabel(label: string, max = 16): string {
  return label.length > max ? `${label.slice(0, max - 1)}…` : label;
}

function formatPeriodLabel(period: string, interval: TrendInterval): string {
  return dayjs(period).format(interval === "month" ? "MMM 'YY" : "D MMM");
}

/** Keeps the x-axis readable by only labelling every Nth point, however many there are. */
function thinnedTickInterval(pointCount: number, maxLabels = 8) {
  const step = Math.max(1, Math.ceil(pointCount / maxLabels));
  return (_value: unknown, index: number) => index % step === 0;
}

/** Percent change vs previous; null (n/a) when there's nothing to compare against — going from
 * zero to any positive amount isn't a meaningful percentage. */
function trendPct(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / previous) * 100;
}

/** Standard working hours over a period: an 8-hour day for every Monday–Friday in the range
 * (inclusive), no public holiday adjustment. Used as the "expected hours" reference line on the
 * Hours Logged by Staff chart. */
function standardWorkingHours(from: dayjs.Dayjs, to: dayjs.Dayjs): number {
  let weekdays = 0;
  const dayCount = to.startOf("day").diff(from.startOf("day"), "day") + 1;
  for (let i = 0; i < dayCount; i++) {
    const dow = from.add(i, "day").day();
    if (dow !== 0 && dow !== 6) weekdays++;
  }
  return weekdays * 8;
}

type Range = "lastMonth" | "last3Months" | "last6Months" | "year";

// Data only gets imported up to the end of the previous month, so every range is a trailing
// window of whole months ending at the end of last month — never "so far this month", which
// would always show as empty or misleadingly low. The trend chart buckets at a finer granularity
// than the window itself so a single-month selection still produces a meaningful line rather than
// one lone point.
const RANGE_CONFIG: Record<Range, { label: string; compareLabel: string; monthsBack: number; interval: TrendInterval }> = {
  lastMonth: { label: "Last Month", compareLabel: "vs previous month", monthsBack: 1, interval: "day" },
  last3Months: { label: "Last 3 Months", compareLabel: "vs previous 3 months", monthsBack: 3, interval: "week" },
  last6Months: { label: "Last 6 Months", compareLabel: "vs previous 6 months", monthsBack: 6, interval: "week" },
  year: { label: "Last 12 Months", compareLabel: "vs previous 12 months", monthsBack: 12, interval: "month" },
};

interface PeriodTotals {
  activeJobs: number;
  invoicedValue: number;
  periodHours: number;
}

function extractTotals(analyticsRes: AnalyticsResponse, staffHoursRes: TimeReportResponse): PeriodTotals {
  return {
    activeJobs: analyticsRes.jobsByState.filter((j) => j.state !== "Invoiced" && j.state !== "Cancelled").reduce((sum, j) => sum + j.count, 0),
    invoicedValue: analyticsRes.budgetByState.find((b) => b.state === "Invoiced")?.totalBudget ?? 0,
    periodHours: staffHoursRes.rows.reduce((sum, r) => sum + r.hours, 0),
  };
}

export function Dashboard() {
  const navigate = useNavigate();
  const [range, setRange] = useState<Range>("lastMonth");
  const [loading, setLoading] = useState(true);
  const [totalClients, setTotalClients] = useState(0);
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [overBudget, setOverBudget] = useState<JobsOverBudgetResponse | null>(null);
  const [staffHours, setStaffHours] = useState<TimeReportResponse | null>(null);
  const [previousTotals, setPreviousTotals] = useState<PeriodTotals | null>(null);
  const [oldestOpenJobs, setOldestOpenJobs] = useState<Job[] | null>(null);
  const [openJobsNoHours, setOpenJobsNoHours] = useState<Job[] | null>(null);
  const [expectedHours, setExpectedHours] = useState(0);

  // Both snapshots are deliberately independent of the Day/Week/Month/Year range toggle — "which
  // open jobs are stalling" isn't a period-scoped question. Both exclude stub (isStub) jobs:
  // those are auto-created placeholders that would otherwise surface as false positives (no
  // startDate, and often no hours logged yet either) instead of genuinely stale real jobs.
  useEffect(() => {
    listJobs({ openOnly: true, isStub: false, sortField: "startDate", sortOrder: "asc", pageSize: 8 }).then((res) => setOldestOpenJobs(res.rows));
    listJobs({ openOnly: true, isStub: false, noHoursLogged: true, sortField: "startDate", sortOrder: "asc", pageSize: 8 }).then((res) =>
      setOpenJobsNoHours(res.rows),
    );
  }, []);

  useEffect(() => {
    const config = RANGE_CONFIG[range];
    // Window is monthsBack whole calendar months ending at the end of last month.
    const end = dayjs().subtract(1, "month").endOf("month");
    const start = dayjs().subtract(config.monthsBack, "month").startOf("month");
    const from = start.format("YYYY-MM-DD");
    const to = end.format("YYYY-MM-DD");

    // Compare against the same number of whole months immediately preceding this window.
    const prevEnd = start.subtract(1, "day");
    const prevStart = start.subtract(config.monthsBack, "month");
    const prevFrom = prevStart.format("YYYY-MM-DD");
    const prevTo = prevEnd.format("YYYY-MM-DD");

    setExpectedHours(standardWorkingHours(start, end));

    setLoading(true);
    Promise.all([
      listClients({ pageSize: 1 }),
      getAnalytics({ from, to }),
      getJobsOverBudget({}, 500),
      getTimeReport("staff", config.interval, { from, to }),
      getAnalytics({ from: prevFrom, to: prevTo }),
      getTimeReport("staff", config.interval, { from: prevFrom, to: prevTo }),
    ]).then(([clients, analyticsRes, overBudgetRes, staffHoursRes, prevAnalyticsRes, prevStaffHoursRes]) => {
      setTotalClients(clients.total);
      setAnalytics(analyticsRes);
      setOverBudget(overBudgetRes);
      setStaffHours(staffHoursRes);
      setPreviousTotals(extractTotals(prevAnalyticsRes, prevStaffHoursRes));
      setLoading(false);
    });
  }, [range]);

  const rangeLabel = RANGE_CONFIG[range].label;

  return (
    <Box sx={{ maxWidth: 1400, mx: "auto" }}>
      <Stack direction="row" sx={{ mb: 3, justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          Dashboard
        </Typography>
        <ToggleButtonGroup
          value={range}
          exclusive
          size="small"
          onChange={(_, v: Range | null) => v && setRange(v)}
        >
          <ToggleButton value="lastMonth">Last Month</ToggleButton>
          <ToggleButton value="last3Months">Last 3 Months</ToggleButton>
          <ToggleButton value="last6Months">Last 6 Months</ToggleButton>
          <ToggleButton value="year">Year</ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      {loading || !analytics || !overBudget || !staffHours || !previousTotals ? (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <DashboardContent
          rangeLabel={rangeLabel}
          compareLabel={RANGE_CONFIG[range].compareLabel}
          interval={RANGE_CONFIG[range].interval}
          analytics={analytics}
          overBudget={overBudget}
          staffHours={staffHours}
          previousTotals={previousTotals}
          totalClients={totalClients}
          oldestOpenJobs={oldestOpenJobs}
          openJobsNoHours={openJobsNoHours}
          expectedHours={expectedHours}
          navigate={navigate}
        />
      )}
    </Box>
  );
}

interface DashboardContentProps {
  rangeLabel: string;
  compareLabel: string;
  interval: TrendInterval;
  analytics: AnalyticsResponse;
  overBudget: JobsOverBudgetResponse;
  staffHours: TimeReportResponse;
  previousTotals: PeriodTotals;
  totalClients: number;
  oldestOpenJobs: Job[] | null;
  openJobsNoHours: Job[] | null;
  expectedHours: number;
  navigate: (path: string) => void;
}

function DashboardContent({
  rangeLabel,
  compareLabel,
  interval,
  analytics,
  overBudget,
  staffHours,
  previousTotals,
  totalClients,
  oldestOpenJobs,
  openJobsNoHours,
  expectedHours,
  navigate,
}: DashboardContentProps) {
  const { activeJobs, invoicedValue, periodHours } = extractTotals(analytics, staffHours);
  const totalOverage = overBudget.totalOverage;

  const activeJobsTrend: Trend = { pct: trendPct(activeJobs, previousTotals.activeJobs), comparisonLabel: compareLabel };
  const hoursTrend: Trend = { pct: trendPct(periodHours, previousTotals.periodHours), comparisonLabel: compareLabel };
  const invoicedTrend: Trend = { pct: trendPct(invoicedValue, previousTotals.invoicedValue), comparisonLabel: compareLabel };
  const topStaff = [...staffHours.rows].sort((a, b) => b.hours - a.hours).slice(0, 8);
  const trendLabels = staffHours.trend.map((t) => formatPeriodLabel(t.period, interval));

  const jobsTableColumns: GridColDef<Job>[] = [
    { field: "jobNo", headerName: "Job No.", width: 100 },
    { field: "name", headerName: "Job Name", flex: 1 },
    { field: "clientName", headerName: "Client", flex: 1, valueGetter: (_v, row) => row.client?.name ?? "" },
    { field: "state", headerName: "State", width: 130 },
    {
      field: "daysOpen",
      headerName: "Days Open",
      width: 100,
      type: "number",
      valueGetter: (_v, row) => (row.startDate ? dayjs().diff(dayjs(row.startDate), "day") : null),
    },
  ];

  return (
    <>
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard label="Total Clients" value={totalClients} onClick={() => navigate("/clients")} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard label="Active Jobs" value={activeJobs} sublabel={rangeLabel} trend={activeJobsTrend} onClick={() => navigate("/jobs")} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard label="Hours Logged" value={periodHours.toFixed(1)} sublabel={rangeLabel} trend={hoursTrend} onClick={() => navigate("/reports/time")} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard
            label="Total Invoiced"
            value={money(invoicedValue)}
            sublabel={rangeLabel}
            trend={invoicedTrend}
            onClick={() => navigate("/reports/analytics")}
          />
        </Grid>
      </Grid>

      <Paper
        variant="outlined"
        onClick={() => navigate("/reports/jobs-over-budget")}
        sx={{
          p: 2.5,
          mb: 3,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 2,
          cursor: "pointer",
          borderColor: overBudget.totalCount > 0 ? "warning.main" : "divider",
          borderWidth: overBudget.totalCount > 0 ? 2 : 1,
          "&:hover": { boxShadow: 1 },
        }}
      >
        <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            Jobs Over Budget
          </Typography>
          <Chip
            label={overBudget.totalCount === 0 ? "None" : `${overBudget.totalCount} job(s)`}
            color={overBudget.totalCount > 0 ? "warning" : "success"}
            size="small"
          />
        </Stack>
        <Stack direction="row" spacing={3} sx={{ alignItems: "center" }}>
          {overBudget.totalCount > 0 && (
            <Typography variant="body2" color="text.secondary">
              Total overage: <strong>{money(totalOverage)}</strong>
            </Typography>
          )}
          {overBudget.ratesIncompleteCount > 0 && (
            <Typography variant="caption" color="text.secondary">
              {overBudget.ratesIncompleteCount} job(s) excluded (missing staff rates)
            </Typography>
          )}
        </Stack>
      </Paper>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper variant="outlined" sx={{ p: 2.5, height: "100%" }}>
            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>
              Hours Logged by Staff · {rangeLabel}
            </Typography>
            <BarChart
              layout="horizontal"
              yAxis={[{ scaleType: "band", data: topStaff.map((s) => truncateLabel(s.label)), tickLabelStyle: { fontSize: 11 } }]}
              xAxis={[{ min: 0 }]}
              series={[{ data: topStaff.map((s) => Math.round(s.hours * 10) / 10), label: "Hours" }]}
              height={300}
              margin={{ left: 110, right: 20, top: 20, bottom: 30 }}
              onItemClick={(_e, item) => navigate(`/reports/time?staffMemberId=${topStaff[item.dataIndex]?.key}`)}
            >
              <ChartsReferenceLine
                x={expectedHours}
                label={`Standard Hours (${Math.round(expectedHours)})`}
                labelAlign="end"
                lineStyle={{ stroke: "var(--mui-palette-error-main, #d32f2f)", strokeDasharray: "6 4" }}
              />
            </BarChart>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper variant="outlined" sx={{ p: 2.5, height: "100%" }}>
            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>
              Hours Trend · {rangeLabel}
            </Typography>
            <LineChart
              xAxis={[
                {
                  scaleType: "point",
                  data: trendLabels,
                  tickLabelStyle: { angle: -35, textAnchor: "end", fontSize: 11 },
                  tickLabelInterval: thinnedTickInterval(trendLabels.length),
                },
              ]}
              series={[{ data: staffHours.trend.map((t) => Math.round((t.minutes / 60) * 10) / 10), label: "Hours", showMark: false }]}
              height={300}
              margin={{ left: 40, right: 20, top: 20, bottom: 50 }}
            />
          </Paper>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <JobsPanel
            title="Oldest Open Jobs"
            jobs={oldestOpenJobs}
            emptyMessage="No open jobs — everything is Invoiced or Cancelled."
            viewAllHref="/jobs"
            columns={jobsTableColumns}
            navigate={navigate}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <JobsPanel
            title="Open Jobs With No Hours Logged"
            jobs={openJobsNoHours}
            emptyMessage="Every open job has at least some time logged against it."
            viewAllHref="/jobs"
            columns={jobsTableColumns}
            navigate={navigate}
          />
        </Grid>
      </Grid>
    </>
  );
}

interface JobsPanelProps {
  title: string;
  jobs: Job[] | null;
  emptyMessage: string;
  viewAllHref: string;
  columns: GridColDef<Job>[];
  navigate: (path: string) => void;
}

function JobsPanel({ title, jobs, emptyMessage, viewAllHref, columns, navigate }: JobsPanelProps) {
  return (
    <Paper variant="outlined" sx={{ p: 2.5, height: "100%" }}>
      <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 1.5, flexWrap: "wrap", gap: 1 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          {title}
        </Typography>
        <Typography variant="body2" color="primary" sx={{ cursor: "pointer", fontWeight: 600 }} onClick={() => navigate(viewAllHref)}>
          View all →
        </Typography>
      </Stack>
      {jobs === null ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
          <CircularProgress size={24} />
        </Box>
      ) : jobs.length === 0 ? (
        <Typography color="text.secondary" sx={{ py: 3, textAlign: "center" }}>
          {emptyMessage}
        </Typography>
      ) : (
        <Box sx={{ height: 340 }}>
          <DataGrid
            rows={jobs}
            columns={columns}
            density="compact"
            hideFooter
            onRowClick={(params) => navigate(`/jobs/${params.id}`)}
            sx={{ cursor: "pointer" }}
          />
        </Box>
      )}
    </Paper>
  );
}
