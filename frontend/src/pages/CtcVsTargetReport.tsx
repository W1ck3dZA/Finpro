import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Typography,
  Stack,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableFooter,
  TableHead,
  TableRow,
  TableSortLabel,
  Tooltip,
  Alert,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  CircularProgress,
  Avatar,
  Grid,
  LinearProgress,
  TextField,
  MenuItem,
} from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import CloseIcon from "@mui/icons-material/Close";
import dayjs from "dayjs";
import { ReportFilterBar, type ReportFilterState } from "../components/ReportFilterBar";
import { ExportButton } from "../components/ExportButton";
import { KpiCard } from "../components/KpiCard";
import { exportRowsAsCsv, type CsvColumn } from "../utils/csvExport";
import { getCtcVsTargetReport, getCtcVsTargetBreakdown } from "../api/reports";
import { formatMoney } from "../utils/money";
import type { CtcVsTargetBreakdownRow, CtcVsTargetResponse, CtcVsTargetRow } from "../api/types";

function money(n: number | null): string {
  return n !== null ? formatMoney(n) : "—";
}

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

type SortField = "staffName" | "fee" | "expenses" | "netFee" | "average" | "c2cPm" | "target" | "variance" | "rateCost" | "profit";
type BreakdownSortField = "job" | "staffHours" | "totalHours" | "sharePct" | "budget" | "fee" | "actualCost" | "profit";

/** Sortable column header, optionally with a hover tooltip explaining exactly how that figure is
 * calculated. The sort arrow and the info icon (when present) are independently
 * clickable/hoverable, side by side. Generic over the field union so both the main report table
 * and the drilldown dialog's breakdown table can share one implementation. */
function SortableHeader<F extends string>({
  label,
  tip,
  field,
  align = "right",
  orderBy,
  order,
  onSort,
  cellSx,
}: {
  label: string;
  tip?: string;
  field: F;
  align?: "left" | "right";
  orderBy: F;
  order: "asc" | "desc";
  onSort: (field: F) => void;
  cellSx?: object;
}) {
  return (
    <TableCell align={align} sx={cellSx}>
      <Stack direction="row" spacing={0.5} sx={{ alignItems: "center", justifyContent: align === "right" ? "flex-end" : "flex-start" }}>
        <TableSortLabel active={orderBy === field} direction={orderBy === field ? order : "asc"} onClick={() => onSort(field)}>
          {label}
        </TableSortLabel>
        {tip && (
          <Tooltip title={tip} arrow placement="top">
            <InfoOutlinedIcon sx={{ fontSize: 15, color: "text.secondary", cursor: "help" }} />
          </Tooltip>
        )}
      </Stack>
    </TableCell>
  );
}

/** A signed money figure flagged green when non-negative, red when negative, shown as both the
 * amount and a labelled chip so it reads clearly at a glance, not just from color (which alone
 * wouldn't be accessible to colorblind users). Shared by Variance (Average − Target) and Profit
 * (Fee − Rate Cost), which follow the same "positive is good, negative is a loss" convention. */
function SignedMoneyCell({
  value,
  bold,
  positiveLabel,
  negativeLabel,
}: {
  value: number | null;
  bold?: boolean;
  positiveLabel: string;
  negativeLabel: string;
}) {
  if (value === null) {
    return <TableCell align="right">—</TableCell>;
  }
  const positive = value >= 0;
  return (
    <TableCell align="right">
      <Stack direction="row" spacing={1} sx={{ justifyContent: "flex-end", alignItems: "center" }}>
        <Typography
          variant="body2"
          component="span"
          sx={{ color: positive ? "success.main" : "error.main", fontWeight: bold ? 700 : 600 }}
        >
          {money(value)}
        </Typography>
        <Chip size="small" variant="outlined" color={positive ? "success" : "error"} label={positive ? positiveLabel : negativeLabel} />
      </Stack>
    </TableCell>
  );
}

/** Job-level breakdown behind one staff member's Fee figure — fetched on open rather than
 * up front, since it's only needed when a user drills into a specific row. */
function FeeBreakdownDialog({
  staff,
  filters,
  onClose,
}: {
  staff: CtcVsTargetRow;
  filters: { from?: string; to?: string };
  onClose: () => void;
}) {
  const [rows, setRows] = useState<CtcVsTargetBreakdownRow[] | null>(null);
  const [search, setSearch] = useState("");
  const [orderBy, setOrderBy] = useState<BreakdownSortField>("fee");
  const [order, setOrder] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    setRows(null);
    getCtcVsTargetBreakdown(staff.staffMemberId, filters).then((res) => setRows(res.rows));
  }, [staff.staffMemberId, filters]);

  function handleSort(field: BreakdownSortField) {
    if (orderBy === field) {
      setOrder(order === "asc" ? "desc" : "asc");
    } else {
      setOrderBy(field);
      setOrder(field === "job" ? "asc" : "desc");
    }
  }

  const displayedRows = useMemo(() => {
    const all = rows ?? [];
    const q = search.toLowerCase();
    const filtered = q
      ? all.filter((r) => (r.jobName ?? "").toLowerCase().includes(q) || r.jobNo.toLowerCase().includes(q) || r.clientName.toLowerCase().includes(q))
      : all;
    const dir = order === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      if (orderBy === "job") return (a.jobName ?? a.jobNo).localeCompare(b.jobName ?? b.jobNo) * dir;
      const av = a[orderBy] ?? -Infinity;
      const bv = b[orderBy] ?? -Infinity;
      return (av - bv) * dir;
    });
  }, [rows, search, orderBy, order]);

  const totalFee = displayedRows.reduce((sum, r) => sum + r.fee, 0);
  const totalActualCost = displayedRows.reduce((sum, r) => sum + (r.actualCost ?? 0), 0);
  const totalProfit = displayedRows.reduce((sum, r) => sum + (r.profit ?? 0), 0);
  const dateRangeLabel =
    filters.from && filters.to ? `${dayjs(filters.from).format("D MMM YYYY")} – ${dayjs(filters.to).format("D MMM YYYY")}` : "selected range";

  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 2 }}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
          <Avatar sx={{ bgcolor: "primary.main" }}>{initials(staff.staffName)}</Avatar>
          <Box>
            <Typography variant="h6" component="div" sx={{ lineHeight: 1.3 }}>
              {staff.staffName}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Fee breakdown for {dateRangeLabel}
            </Typography>
          </Box>
        </Stack>
        <IconButton onClick={onClose} size="small" sx={{ mt: 0.5 }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {rows === null ? (
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1.5, py: 5 }}>
            <CircularProgress size={28} />
            <Typography variant="body2" color="text.secondary">Loading breakdown…</Typography>
          </Box>
        ) : rows.length === 0 ? (
          <Typography color="text.secondary" sx={{ py: 2 }}>
            No jobs with logged time in this date range.
          </Typography>
        ) : (
          <>
            <Grid container spacing={2} sx={{ mb: 2.5 }}>
              <Grid size={{ xs: 6, sm: 4 }}>
                <KpiCard label="Total Fee" value={money(totalFee)} />
              </Grid>
              <Grid size={{ xs: 6, sm: 4 }}>
                <KpiCard label="Jobs Worked" value={displayedRows.length} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <KpiCard
                  label="Top Job"
                  value={displayedRows.length > 0 ? money(displayedRows[0].fee) : "—"}
                  sublabel={displayedRows.length > 0 ? (displayedRows[0].jobName ?? displayedRows[0].jobNo) : undefined}
                />
              </Grid>
            </Grid>

            <TextField
              size="small"
              label="Search job / client"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{ width: 260, mb: 2 }}
            />

            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <SortableHeader label="Job" field="job" align="left" orderBy={orderBy} order={order} onSort={handleSort} />
                    <SortableHeader label="Your Hours" field="staffHours" orderBy={orderBy} order={order} onSort={handleSort} />
                    <SortableHeader
                      label="Your Share"
                      field="sharePct"
                      align="left"
                      orderBy={orderBy}
                      order={order}
                      onSort={handleSort}
                      cellSx={{ width: 160 }}
                    />
                    <SortableHeader label="Budget" field="budget" orderBy={orderBy} order={order} onSort={handleSort} />
                    <SortableHeader label="Allocated Fee" field="fee" orderBy={orderBy} order={order} onSort={handleSort} />
                    <SortableHeader
                      label="Actual Cost"
                      tip="This job's hours you logged × your Hourly Rate — what it cost regardless of the job's budget."
                      field="actualCost"
                      orderBy={orderBy}
                      order={order}
                      onSort={handleSort}
                    />
                    <SortableHeader
                      label="Profit"
                      tip="Allocated Fee minus Actual Cost for this job. Negative when the job had no (or too small a) budget to cover the time logged — the client wasn't billed for it."
                      field="profit"
                      orderBy={orderBy}
                      order={order}
                      onSort={handleSort}
                    />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {displayedRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7}>
                        <Typography color="text.secondary" sx={{ py: 2, textAlign: "center" }}>
                          No jobs match "{search}".
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    displayedRows.map((r) => (
                      <TableRow key={r.jobId} hover>
                        <TableCell>
                          <Typography variant="body2">{r.jobName ?? r.jobNo}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {r.jobNo} · {r.clientName}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          {r.staffHours.toFixed(2)}
                          <Typography component="span" variant="caption" color="text.secondary">
                            {" "}/ {r.totalHours.toFixed(2)}h
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                            <LinearProgress
                              variant="determinate"
                              value={Math.min(100, r.sharePct)}
                              sx={{ flex: 1, height: 6, borderRadius: 3 }}
                            />
                            <Typography variant="caption" color="text.secondary" sx={{ minWidth: 38, textAlign: "right" }}>
                              {r.sharePct.toFixed(0)}%
                            </Typography>
                          </Stack>
                        </TableCell>
                        <TableCell align="right">{money(r.budget)}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600, color: "primary.main" }}>
                          {money(r.fee)}
                        </TableCell>
                        <TableCell align="right">{money(r.actualCost)}</TableCell>
                        <SignedMoneyCell value={r.profit} positiveLabel="Profit" negativeLabel="Loss" />
                      </TableRow>
                    ))
                  )}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={4} sx={{ fontWeight: 600 }}>Total Fee</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>{money(totalFee)}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>{money(totalActualCost)}</TableCell>
                    <SignedMoneyCell value={totalProfit} bold positiveLabel="Profit" negativeLabel="Loss" />
                  </TableRow>
                </TableFooter>
              </Table>
            </TableContainer>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function defaultCtcFilterState(): ReportFilterState {
  return { from: dayjs().subtract(5, "month").startOf("month"), to: dayjs() };
}

/** Sums a set of rows into the same shape as the backend's `totals` — used to keep the footer
 * row and CSV export in sync with whatever the search/target-status filters currently show,
 * rather than always reflecting the full unfiltered result set. */
function computeTotals(rows: CtcVsTargetRow[]) {
  return rows.reduce(
    (acc, r) => ({
      fee: acc.fee + r.fee,
      expenses: acc.expenses + (r.expenses ?? 0),
      netFee: acc.netFee + r.netFee,
      average: acc.average + r.average,
      c2cPm: acc.c2cPm + (r.c2cPm ?? 0),
      target: acc.target + (r.target ?? 0),
      variance: acc.variance + (r.variance ?? 0),
      hours: acc.hours + r.hours,
      rateCost: acc.rateCost + (r.rateCost ?? 0),
      profit: acc.profit + (r.profit ?? 0),
    }),
    { fee: 0, expenses: 0, netFee: 0, average: 0, c2cPm: 0, target: 0, variance: 0, hours: 0, rateCost: 0, profit: 0 },
  );
}

function csvColumns(monthCount: number): CsvColumn<CtcVsTargetRow>[] {
  return [
    { header: "Staff Member", accessor: (r) => r.staffName },
    { header: `${monthCount} Months Fee`, accessor: (r) => r.fee },
    { header: "Expenses", accessor: (r) => r.expenses },
    { header: "Net Fee", accessor: (r) => r.netFee },
    { header: "Average", accessor: (r) => r.average },
    { header: "C2C pm", accessor: (r) => r.c2cPm },
    { header: "Target (x3)", accessor: (r) => r.target },
    { header: "Average - Target", accessor: (r) => r.variance },
    { header: "Hours", accessor: (r) => r.hours },
    { header: "Rate Cost (Rate x Hours)", accessor: (r) => r.rateCost },
    { header: "Profit (Fee - Rate Cost)", accessor: (r) => r.profit },
  ];
}

export function CtcVsTargetReport() {
  const [filters, setFilters] = useState<ReportFilterState>(defaultCtcFilterState());
  const [result, setResult] = useState<CtcVsTargetResponse | null>(null);
  const [drilldownStaff, setDrilldownStaff] = useState<CtcVsTargetRow | null>(null);
  const [search, setSearch] = useState("");
  const [targetStatus, setTargetStatus] = useState<"all" | "making" | "below">("all");
  const [orderBy, setOrderBy] = useState<SortField>("fee");
  const [order, setOrder] = useState<"asc" | "desc">("desc");

  const dateFilters = {
    from: filters.from?.format("YYYY-MM-DD"),
    to: filters.to?.format("YYYY-MM-DD"),
  };

  useEffect(() => {
    getCtcVsTargetReport({
      from: filters.from?.format("YYYY-MM-DD"),
      to: filters.to?.format("YYYY-MM-DD"),
    }).then(setResult);
  }, [filters]);

  function handleSort(field: SortField) {
    if (orderBy === field) {
      setOrder(order === "asc" ? "desc" : "asc");
    } else {
      setOrderBy(field);
      setOrder(field === "staffName" ? "asc" : "desc");
    }
  }

  const displayedRows = useMemo(() => {
    const rows = result?.rows ?? [];
    const filtered = rows.filter((r) => {
      if (search && !r.staffName.toLowerCase().includes(search.toLowerCase())) return false;
      if (targetStatus === "making" && !(r.variance !== null && r.variance >= 0)) return false;
      if (targetStatus === "below" && !(r.variance !== null && r.variance < 0)) return false;
      return true;
    });
    const dir = order === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      if (orderBy === "staffName") return a.staffName.localeCompare(b.staffName) * dir;
      const av = a[orderBy] ?? -Infinity;
      const bv = b[orderBy] ?? -Infinity;
      return (av - bv) * dir;
    });
  }, [result, search, targetStatus, orderBy, order]);

  function handleExport() {
    if (!result) return;
    const totals = computeTotals(displayedRows);
    const totalRow: CtcVsTargetRow = { staffMemberId: -1, staffName: "Total", ...totals };
    exportRowsAsCsv(
      `finpro-ctc-vs-target-${new Date().toISOString().slice(0, 10)}.csv`,
      [...displayedRows, totalRow],
      csvColumns(result.monthCount),
    );
  }

  const footerTotals = computeTotals(displayedRows);

  return (
    <Box>
      <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 2 }}>
        <Typography variant="h5" gutterBottom>
          CTC vs Target
        </Typography>
        <ExportButton onExport={async () => handleExport()} />
      </Stack>
      <Alert severity="info" variant="outlined" sx={{ mb: 2 }}>
        Compares what each staff member has earned against their cost to company (CTC) for the selected date range.
        Fee is a share of each job's budget: for every job worked in the range, a staff member is credited their
        share of the logged hours × that job's budget — not a flat hourly rate. Profit is Fee minus Rate Cost
        (Hourly Rate × hours worked): on jobs with no budget set, the client was never billed for that time, so
        it shows as a loss instead of being ignored. Hover the info icon on a column header for its exact formula,
        or click a row to see the job-by-job breakdown behind its Fee and Profit. Set Hourly Rate, monthly CTC and
        monthly expenses per staff member on the Staff Rates page.
      </Alert>
      <ReportFilterBar value={filters} onChange={setFilters} />

      {result && (
        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Stack direction="row" spacing={2} useFlexGap sx={{ flexWrap: "wrap", alignItems: "center" }}>
            <TextField
              size="small"
              label="Search staff member"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{ width: 240 }}
            />
            <TextField
              select
              size="small"
              label="Target Status"
              value={targetStatus}
              onChange={(e) => setTargetStatus(e.target.value as "all" | "making" | "below")}
              sx={{ width: 190 }}
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="making">Making Target</MenuItem>
              <MenuItem value="below">Below Target</MenuItem>
            </TextField>
            <Typography variant="body2" color="text.secondary">
              {displayedRows.length} of {result.rows.length} staff member{result.rows.length === 1 ? "" : "s"}
            </Typography>
          </Stack>
        </Paper>
      )}

      {result && (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <SortableHeader
                  label="Staff Member"
                  tip="Only staff members with logged time in the selected date range appear here."
                  field="staffName"
                  align="left"
                  orderBy={orderBy}
                  order={order}
                  onSort={handleSort}
                />
                <SortableHeader
                  label={`${result.monthCount} Months Fee`}
                  tip="For each job worked in the selected range: your hours on that job ÷ total hours all staff logged on it, × that job's budget — summed across every job you touched in the range."
                  field="fee"
                  orderBy={orderBy}
                  order={order}
                  onSort={handleSort}
                />
                <SortableHeader
                  label="Expenses"
                  tip={`Monthly Expenses (set on Staff Rates) × ${result.monthCount} month(s) in the selected range.`}
                  field="expenses"
                  orderBy={orderBy}
                  order={order}
                  onSort={handleSort}
                />
                <SortableHeader label="Net Fee" tip="Fee minus Expenses." field="netFee" orderBy={orderBy} order={order} onSort={handleSort} />
                <SortableHeader
                  label="Average"
                  tip={`Fee ÷ ${result.monthCount} — the average monthly fee over the selected range.`}
                  field="average"
                  orderBy={orderBy}
                  order={order}
                  onSort={handleSort}
                />
                <SortableHeader
                  label="C2C pm"
                  tip="The staff member's Monthly CTC (cost to company), set on the Staff Rates page."
                  field="c2cPm"
                  orderBy={orderBy}
                  order={order}
                  onSort={handleSort}
                />
                <SortableHeader
                  label="Target (x3)"
                  tip="C2C pm × 3 — the fee a staff member is expected to bill relative to their monthly cost to company, regardless of the selected date range's length."
                  field="target"
                  orderBy={orderBy}
                  order={order}
                  onSort={handleSort}
                />
                <SortableHeader
                  label="Average - Target"
                  tip="Average minus Target. A positive amount (green) means the staff member is exceeding target — profit; a negative amount (red) means they're falling short — a loss."
                  field="variance"
                  orderBy={orderBy}
                  order={order}
                  onSort={handleSort}
                />
                <SortableHeader
                  label="Rate Cost"
                  tip="Hourly Rate (set on Staff Rates) × total hours logged in the selected range — a flat-rate cost figure, unlike Fee which is a share of each job's budget."
                  field="rateCost"
                  orderBy={orderBy}
                  order={order}
                  onSort={handleSort}
                />
                <SortableHeader
                  label="Profit"
                  tip="Fee minus Rate Cost. On jobs with no budget set, Fee credits nothing for the time logged, so the staff cost comes straight off here as a loss — this is what it actually cost to have unbilled time worked."
                  field="profit"
                  orderBy={orderBy}
                  order={order}
                  onSort={handleSort}
                />
              </TableRow>
            </TableHead>
            <TableBody>
              {displayedRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10}>
                    <Typography color="text.secondary" sx={{ py: 2, textAlign: "center" }}>
                      No staff members match the current filters.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                displayedRows.map((row) => (
                  <TableRow
                    key={row.staffMemberId}
                    hover
                    onClick={() => setDrilldownStaff(row)}
                    sx={{ cursor: "pointer" }}
                  >
                    <TableCell>{row.staffName}</TableCell>
                    <TableCell align="right">{money(row.fee)}</TableCell>
                    <TableCell align="right">{money(row.expenses)}</TableCell>
                    <TableCell align="right">{money(row.netFee)}</TableCell>
                    <TableCell align="right">{money(row.average)}</TableCell>
                    <TableCell align="right">{money(row.c2cPm)}</TableCell>
                    <TableCell align="right">{money(row.target)}</TableCell>
                    <SignedMoneyCell value={row.variance} positiveLabel="Making Target" negativeLabel="Below Target" />
                    <TableCell align="right">{money(row.rateCost)}</TableCell>
                    <SignedMoneyCell value={row.profit} positiveLabel="Profit" negativeLabel="Loss" />
                  </TableRow>
                ))
              )}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Total</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>{money(footerTotals.fee)}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>{money(footerTotals.expenses)}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>{money(footerTotals.netFee)}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>{money(footerTotals.average)}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>{money(footerTotals.c2cPm)}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>{money(footerTotals.target)}</TableCell>
                <SignedMoneyCell value={footerTotals.variance} bold positiveLabel="Making Target" negativeLabel="Below Target" />
                <TableCell align="right" sx={{ fontWeight: 600 }}>{money(footerTotals.rateCost)}</TableCell>
                <SignedMoneyCell value={footerTotals.profit} bold positiveLabel="Profit" negativeLabel="Loss" />
              </TableRow>
            </TableFooter>
          </Table>
        </TableContainer>
      )}

      {drilldownStaff && (
        <FeeBreakdownDialog staff={drilldownStaff} filters={dateFilters} onClose={() => setDrilldownStaff(null)} />
      )}
    </Box>
  );
}
