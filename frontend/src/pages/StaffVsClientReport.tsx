import { useEffect, useState } from "react";
import { Box, Typography, Stack, Paper, Table, TableBody, TableCell, TableContainer, TableFooter, TableHead, TableRow, Tooltip, Alert } from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import dayjs from "dayjs";
import { ReportFilterBar, defaultFilterState, type ReportFilterState } from "../components/ReportFilterBar";
import { ExportButton } from "../components/ExportButton";
import { exportRowsAsCsv, type CsvColumn } from "../utils/csvExport";
import { getStaffVsClientReport } from "../api/reports";
import { formatMoney } from "../utils/money";
import type { StaffVsClientResponse, StaffVsClientRow } from "../api/types";

function money(n: number): string {
  return formatMoney(n);
}

function monthLabel(month: string): string {
  return dayjs(month).format("MMM-YY");
}

/** Column header with a hover tooltip explaining exactly how that figure is calculated —
 * these are derived profit/billing figures, not raw data, so the formula isn't self-evident from the label alone. */
function ColHeader({ label, tip }: { label: string; tip: string }) {
  return (
    <Stack direction="row" spacing={0.5} sx={{ alignItems: "center", justifyContent: "flex-end" }}>
      <span>{label}</span>
      <Tooltip title={tip} arrow placement="top">
        <InfoOutlinedIcon sx={{ fontSize: 15, color: "text.secondary", cursor: "help" }} />
      </Tooltip>
    </Stack>
  );
}

const CSV_COLUMNS: CsvColumn<StaffVsClientRow>[] = [
  { header: "Month", accessor: (r) => (r.month === "Total" ? r.month : monthLabel(r.month)) },
  { header: "Profit on Jobs Staff", accessor: (r) => r.profit },
  { header: "Client Jobs Complete", accessor: (r) => r.clientJobsComplete },
  { header: "Jobs not Billed", accessor: (r) => r.jobsNotBilled },
];

export function StaffVsClientReport() {
  const [filters, setFilters] = useState<ReportFilterState>(defaultFilterState());
  const [result, setResult] = useState<StaffVsClientResponse | null>(null);

  useEffect(() => {
    getStaffVsClientReport({
      from: filters.from?.format("YYYY-MM-DD"),
      to: filters.to?.format("YYYY-MM-DD"),
    }).then(setResult);
  }, [filters]);

  function handleExport() {
    if (!result) return;
    const totalRow: StaffVsClientRow = {
      month: "Total",
      profit: result.totals.profit,
      clientJobsComplete: result.totals.clientJobsComplete,
      jobsNotBilled: result.totals.jobsNotBilled,
    };
    exportRowsAsCsv(`finpro-staff-vs-client-${new Date().toISOString().slice(0, 10)}.csv`, [...result.rows, totalRow], CSV_COLUMNS);
  }

  return (
    <Box>
      <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 2 }}>
        <Typography variant="h5" gutterBottom>
          Staff vs Client
        </Typography>
        <ExportButton onExport={async () => handleExport()} />
      </Stack>
      <Alert severity="info" variant="outlined" sx={{ mb: 2 }}>
        A monthly summary of job profitability, grouped by each job's completion date. Profit nets the quoted budget
        against staff time cost; Client Jobs Complete and Jobs not Billed split that same budget by whether the job
        has been invoiced yet. Hover the info icon on a column header for its exact formula.
      </Alert>
      <ReportFilterBar value={filters} onChange={setFilters} />

      {result && (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>
                  <ColHeader label="Month" tip="Jobs are bucketed by their completion date, not when they started or were invoiced." />
                </TableCell>
                <TableCell align="right">
                  <ColHeader
                    label="Profit on Jobs Staff"
                    tip="Sum of (Job budget − staff cost) for every job completed in the month, regardless of billing status. Staff cost = hours logged × the staff member's hourly rate."
                  />
                </TableCell>
                <TableCell align="right">
                  <ColHeader
                    label="Client Jobs Complete"
                    tip="Sum of budget for jobs completed in the month whose state is 'Invoiced'."
                  />
                </TableCell>
                <TableCell align="right">
                  <ColHeader
                    label="Jobs not Billed"
                    tip="Sum of (Job budget − staff cost) for jobs completed in the month whose state is anything other than 'Invoiced'."
                  />
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {result.rows.map((row) => (
                <TableRow key={row.month} hover>
                  <TableCell>{monthLabel(row.month)}</TableCell>
                  <TableCell align="right">{money(row.profit)}</TableCell>
                  <TableCell align="right">{money(row.clientJobsComplete)}</TableCell>
                  <TableCell align="right">{money(row.jobsNotBilled)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Total</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>{money(result.totals.profit)}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>{money(result.totals.clientJobsComplete)}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>{money(result.totals.jobsNotBilled)}</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
