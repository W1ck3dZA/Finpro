import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Typography, Alert, Grid, Stack } from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { ReportFilterBar, defaultFilterState, type ReportFilterState } from "../components/ReportFilterBar";
import { KpiCard } from "../components/KpiCard";
import { ExportButton } from "../components/ExportButton";
import { exportRowsAsCsv, type CsvColumn } from "../utils/csvExport";
import { getJobsOverBudget } from "../api/reports";
import { listJobManagers, listStates } from "../api/staffMembers";
import { formatMoney } from "../utils/money";
import type { JobsOverBudgetResponse, OverBudgetJobRow } from "../api/types";

function money(n: number): string {
  return formatMoney(n);
}

const CSV_COLUMNS: CsvColumn<OverBudgetJobRow>[] = [
  { header: "Job No.", accessor: (r) => r.jobNo },
  { header: "Job Name", accessor: (r) => r.name },
  { header: "Client", accessor: (r) => r.clientName },
  { header: "Job Manager", accessor: (r) => r.jobManager },
  { header: "State", accessor: (r) => r.state },
  { header: "Budget", accessor: (r) => r.budget },
  { header: "Actual Cost", accessor: (r) => r.totalCost },
  { header: "Over By", accessor: (r) => r.variance },
  { header: "Over %", accessor: (r) => r.variancePct.toFixed(1) },
];

export function JobsOverBudget() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<ReportFilterState>(defaultFilterState());
  const [jobManagers, setJobManagers] = useState<string[]>([]);
  const [states, setStates] = useState<string[]>([]);
  const [result, setResult] = useState<JobsOverBudgetResponse | null>(null);

  useEffect(() => {
    listJobManagers().then(setJobManagers);
    listStates().then(setStates);
  }, []);

  useEffect(() => {
    getJobsOverBudget({
      from: filters.from?.format("YYYY-MM-DD"),
      to: filters.to?.format("YYYY-MM-DD"),
      jobManager: filters.jobManager,
      state: filters.state,
    }).then(setResult);
  }, [filters]);

  async function handleExport() {
    const res = await getJobsOverBudget(
      {
        from: filters.from?.format("YYYY-MM-DD"),
        to: filters.to?.format("YYYY-MM-DD"),
        jobManager: filters.jobManager,
        state: filters.state,
      },
      100,
      true,
    );
    exportRowsAsCsv(`finpro-jobs-over-budget-${new Date().toISOString().slice(0, 10)}.csv`, res.rows, CSV_COLUMNS);
  }

  const columns: GridColDef[] = [
    { field: "jobNo", headerName: "Job No.", width: 110 },
    { field: "name", headerName: "Job Name", flex: 1 },
    { field: "clientName", headerName: "Client", flex: 1 },
    { field: "jobManager", headerName: "Job Manager", width: 160 },
    { field: "state", headerName: "State", width: 140 },
    { field: "budget", headerName: "Budget", width: 120, type: "number", valueFormatter: (v: number) => money(v) },
    { field: "totalCost", headerName: "Actual Cost", width: 130, type: "number", valueFormatter: (v: number) => money(v) },
    { field: "variance", headerName: "Over By", width: 130, type: "number", valueFormatter: (v: number) => money(v) },
    { field: "variancePct", headerName: "Over %", width: 100, type: "number", valueFormatter: (v: number) => `${v.toFixed(0)}%` },
  ];

  return (
    <Box>
      <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 2 }}>
        <Typography variant="h5" gutterBottom>
          Jobs Over Budget
        </Typography>
        <ExportButton onExport={handleExport} />
      </Stack>
      <ReportFilterBar value={filters} onChange={setFilters} jobManagers={jobManagers} states={states} showState />

      {result && (
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid size={{ xs: 6, sm: 3 }}>
            <KpiCard label="Jobs Over Budget" value={result.totalCount} color={result.totalCount > 0 ? "warning" : "default"} />
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <KpiCard label="Total Overage" value={money(result.totalOverage)} />
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <KpiCard label="Avg. Overage %" value={result.totalCount > 0 ? `${result.avgVariancePct.toFixed(0)}%` : "—"} />
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <KpiCard label="Excluded (No Rate)" value={result.ratesIncompleteCount} color={result.ratesIncompleteCount > 0 ? "warning" : "default"} />
          </Grid>
        </Grid>
      )}

      {result && result.ratesIncompleteCount > 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {result.ratesIncompleteCount} job(s) were excluded from this list because one or more contributing staff members don't
          have an hourly rate set yet — set rates on the Staff Rates page to include them.
        </Alert>
      )}

      {result && (
        <Box sx={{ height: 600 }}>
          <DataGrid
            rows={result.rows}
            columns={columns}
            getRowId={(r) => r.jobId}
            density="compact"
            onRowClick={(params) => navigate(`/jobs/${params.id}`)}
            sx={{ cursor: "pointer" }}
          />
        </Box>
      )}
    </Box>
  );
}
