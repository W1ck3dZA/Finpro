import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Box, Typography, ToggleButtonGroup, ToggleButton, Paper, Stack } from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { BarChart } from "@mui/x-charts/BarChart";
import { LineChart } from "@mui/x-charts/LineChart";
import { ReportFilterBar, defaultFilterState, type ReportFilterState } from "../components/ReportFilterBar";
import { ExportButton } from "../components/ExportButton";
import { exportRowsAsCsv, type CsvColumn } from "../utils/csvExport";
import { getTimeReport } from "../api/reports";
import { listStaffMembers, listJobManagers } from "../api/staffMembers";
import type { StaffMember, TimeReportResponse, TimeReportRow } from "../api/types";

const columns: GridColDef[] = [
  { field: "label", headerName: "Name", flex: 1 },
  { field: "hours", headerName: "Hours", width: 120, type: "number", valueFormatter: (v: number) => v.toFixed(2) },
];

const CSV_COLUMNS: CsvColumn<TimeReportRow>[] = [
  { header: "Name", accessor: (r) => r.label },
  { header: "Hours", accessor: (r) => r.hours.toFixed(2) },
];

export function TimeReports() {
  const [searchParams] = useSearchParams();
  const deepLinkedStaffId = searchParams.get("staffMemberId");
  const [filters, setFilters] = useState<ReportFilterState>({
    ...defaultFilterState(),
    staffMemberId: deepLinkedStaffId ? Number(deepLinkedStaffId) : undefined,
  });
  const [groupBy, setGroupBy] = useState<"staff" | "client" | "job">("staff");
  const [interval, setInterval_] = useState<"day" | "week" | "month">("day");
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [jobManagers, setJobManagers] = useState<string[]>([]);
  const [report, setReport] = useState<TimeReportResponse | null>(null);

  useEffect(() => {
    listStaffMembers().then(setStaffMembers);
    listJobManagers().then(setJobManagers);
  }, []);

  useEffect(() => {
    getTimeReport(groupBy, interval, {
      from: filters.from?.format("YYYY-MM-DD"),
      to: filters.to?.format("YYYY-MM-DD"),
      staffMemberId: filters.staffMemberId,
      jobManager: filters.jobManager,
    }).then(setReport);
  }, [filters, groupBy, interval]);

  async function handleExport() {
    if (!report) return;
    exportRowsAsCsv(`finpro-time-report-${groupBy}-${new Date().toISOString().slice(0, 10)}.csv`, report.rows, CSV_COLUMNS);
  }

  return (
    <Box>
      <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 2 }}>
        <Typography variant="h5" gutterBottom>
          Time Reports
        </Typography>
        <ExportButton onExport={handleExport} />
      </Stack>

      <ReportFilterBar value={filters} onChange={setFilters} staffMembers={staffMembers} jobManagers={jobManagers} />

      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        <ToggleButtonGroup value={groupBy} exclusive size="small" onChange={(_, v) => v && setGroupBy(v)}>
          <ToggleButton value="staff">By Staff</ToggleButton>
          <ToggleButton value="client">By Client</ToggleButton>
          <ToggleButton value="job">By Job</ToggleButton>
        </ToggleButtonGroup>
        <ToggleButtonGroup value={interval} exclusive size="small" onChange={(_, v) => v && setInterval_(v)}>
          <ToggleButton value="day">Day</ToggleButton>
          <ToggleButton value="week">Week</ToggleButton>
          <ToggleButton value="month">Month</ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      {report && (
        <Stack spacing={3}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              Hours Trend
            </Typography>
            <LineChart
              xAxis={[{ scaleType: "point", data: report.trend.map((t) => t.period) }]}
              series={[{ data: report.trend.map((t) => Math.round((t.minutes / 60) * 10) / 10), label: "Hours" }]}
              height={280}
            />
          </Paper>

          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              Hours by {groupBy === "staff" ? "Staff" : groupBy === "client" ? "Client" : "Job"}
            </Typography>
            <BarChart
              xAxis={[{ scaleType: "band", data: report.rows.slice(0, 15).map((r) => r.label) }]}
              series={[{ data: report.rows.slice(0, 15).map((r) => Math.round(r.hours * 10) / 10), label: "Hours" }]}
              height={320}
            />
          </Paper>

          <Paper variant="outlined" sx={{ height: 500 }}>
            <DataGrid rows={report.rows} columns={columns} getRowId={(r) => r.key} density="compact" />
          </Paper>
        </Stack>
      )}
    </Box>
  );
}
