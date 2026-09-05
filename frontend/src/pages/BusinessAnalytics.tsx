import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Typography, Paper, Grid, Stack, Chip } from "@mui/material";
import { PieChart } from "@mui/x-charts/PieChart";
import { BarChart } from "@mui/x-charts/BarChart";
import { ReportFilterBar, defaultFilterState, type ReportFilterState } from "../components/ReportFilterBar";
import { KpiCard } from "../components/KpiCard";
import { getAnalytics, getJobsOverBudget } from "../api/reports";
import { listJobManagers } from "../api/staffMembers";
import { formatMoney } from "../utils/money";
import type { AnalyticsResponse, JobsOverBudgetResponse } from "../api/types";

function money(n: number): string {
  return formatMoney(n, { decimals: 0 });
}

function truncateLabel(label: string, max = 18): string {
  return label.length > max ? `${label.slice(0, max - 1)}…` : label;
}

export function BusinessAnalytics() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<ReportFilterState>(defaultFilterState());
  const [jobManagers, setJobManagers] = useState<string[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [overBudget, setOverBudget] = useState<JobsOverBudgetResponse | null>(null);

  useEffect(() => {
    listJobManagers().then(setJobManagers);
  }, []);

  useEffect(() => {
    const params = {
      from: filters.from?.format("YYYY-MM-DD"),
      to: filters.to?.format("YYYY-MM-DD"),
      jobManager: filters.jobManager,
    };
    getAnalytics(params).then(setAnalytics);
    getJobsOverBudget(params, 8).then(setOverBudget);
  }, [filters]);

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Business Analytics
      </Typography>

      <ReportFilterBar value={filters} onChange={setFilters} jobManagers={jobManagers} />

      {analytics && (
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <KpiCard label="Avg. Job Turnaround" value={analytics.avgTurnaroundDays !== null ? `${analytics.avgTurnaroundDays.toFixed(1)} days` : "—"} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <KpiCard label="Total Budget (Invoiced)" value={money(analytics.budgetByState.find((b) => b.state === "Invoiced")?.totalBudget ?? 0)} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <KpiCard label="Total Jobs" value={analytics.jobsByState.reduce((s, j) => s + j.count, 0)} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <KpiCard
              label="Top Client (by hours spent)"
              value={analytics.topClientsByHours[0]?.name ?? "—"}
              sublabel={analytics.topClientsByHours[0] ? `${analytics.topClientsByHours[0].hours.toFixed(1)} hrs` : undefined}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle1" gutterBottom>Jobs by State</Typography>
              <PieChart series={[{ data: analytics.jobsByState.map((s) => ({ id: s.state, value: s.count, label: s.state })) }]} height={300} />
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle1" gutterBottom>Budget Total by State</Typography>
              <BarChart
                xAxis={[{ scaleType: "band", data: analytics.budgetByState.map((b) => b.state) }]}
                series={[{ data: analytics.budgetByState.map((b) => Math.round(b.totalBudget)), label: "Budget (R)" }]}
                height={300}
              />
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle1" gutterBottom>Top Clients by Budget</Typography>
              <BarChart
                xAxis={[{ scaleType: "band", data: analytics.topClientsByBudget.map((c) => c.name) }]}
                series={[{ data: analytics.topClientsByBudget.map((c) => Math.round(c.totalBudget)), label: "Budget (R)" }]}
                height={300}
              />
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper variant="outlined" sx={{ p: 2, height: "100%", cursor: "pointer" }} onClick={() => navigate("/reports/jobs-over-budget")}>
              <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 1, flexWrap: "wrap", gap: 1 }}>
                <Typography variant="subtitle1">Budget vs Over Budget</Typography>
                {overBudget && (
                  <Chip
                    label={overBudget.totalCount === 0 ? "None over budget" : `${overBudget.totalCount} job(s) over budget`}
                    color={overBudget.totalCount > 0 ? "warning" : "success"}
                    size="small"
                  />
                )}
              </Stack>
              {overBudget && overBudget.totalCount > 0 ? (
                <>
                  <Typography variant="caption" color="text.secondary">
                    Top {overBudget.rows.length} of {overBudget.totalCount} by overage amount
                  </Typography>
                  <BarChart
                    xAxis={[{ scaleType: "band", data: overBudget.rows.map((r) => truncateLabel(r.name || r.jobNo)), tickLabelStyle: { fontSize: 11 } }]}
                    series={[
                      { data: overBudget.rows.map((r) => Math.round(r.budget)), label: "Budget (R)" },
                      { data: overBudget.rows.map((r) => Math.round(r.totalCost)), label: "Actual Cost (R)" },
                    ]}
                    height={260}
                    margin={{ bottom: 30 }}
                  />
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Total overage (all {overBudget.totalCount}): <strong>{money(overBudget.totalOverage)}</strong>
                    {overBudget.ratesIncompleteCount > 0 && ` · ${overBudget.ratesIncompleteCount} job(s) excluded (missing staff rates)`}
                  </Typography>
                </>
              ) : (
                <Typography color="text.secondary" sx={{ py: 6, textAlign: "center" }}>
                  No jobs are currently over budget for this filter.
                </Typography>
              )}
            </Paper>
          </Grid>
        </Grid>
      )}
    </Box>
  );
}
