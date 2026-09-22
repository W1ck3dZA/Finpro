import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Typography, TextField, MenuItem, Stack, Chip, Paper, Grid, FormControlLabel, Checkbox, Tooltip } from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { DataGrid, type GridColDef, type GridSortModel } from "@mui/x-data-grid";
import type { Dayjs } from "dayjs";
import { listJobs } from "../api/jobs";
import { listStates, listJobManagers } from "../api/staffMembers";
import { KpiCard } from "../components/KpiCard";
import { ExportButton } from "../components/ExportButton";
import { exportRowsAsCsv, type CsvColumn } from "../utils/csvExport";
import { formatMoney } from "../utils/money";
import { formatDate } from "../utils/date";
import type { Job } from "../api/types";

function money(n: number): string {
  return formatMoney(n, { decimals: 0 });
}

const CSV_COLUMNS: CsvColumn<Job>[] = [
  { header: "Job No.", accessor: (j) => j.jobNo },
  { header: "Job Name", accessor: (j) => j.name },
  { header: "Client", accessor: (j) => j.client?.name },
  { header: "Job Manager", accessor: (j) => j.client?.jobManager },
  { header: "State", accessor: (j) => j.state },
  { header: "Budget", accessor: (j) => j.budget },
  { header: "Start Date", accessor: (j) => (j.startDate ? formatDate(j.startDate) : "") },
  { header: "Completed Date", accessor: (j) => (j.completedDate ? formatDate(j.completedDate) : "") },
  { header: "Import Status", accessor: (j) => (j.isStub ? "Incomplete" : "Complete") },
];

export function Jobs() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [client, setClient] = useState("");
  const [jobManager, setJobManager] = useState("");
  const [state, setState] = useState("");
  const [status, setStatus] = useState("");
  const [financeTasks, setFinanceTasks] = useState(false);
  const [from, setFrom] = useState<Dayjs | null>(null);
  const [to, setTo] = useState<Dayjs | null>(null);
  const [states, setStates] = useState<string[]>([]);
  const [jobManagers, setJobManagers] = useState<string[]>([]);
  const [rows, setRows] = useState<Job[]>([]);
  const [total, setTotal] = useState(0);
  const [totalBudget, setTotalBudget] = useState(0);
  const [completeCount, setCompleteCount] = useState<number | null>(null);
  const [incompleteCount, setIncompleteCount] = useState<number | null>(null);
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 25 });
  const [sortModel, setSortModel] = useState<GridSortModel>([]);

  useEffect(() => {
    listStates().then(setStates);
    listJobManagers().then(setJobManagers);
  }, []);

  const baseFilters = {
    search: search || undefined,
    client: client || undefined,
    jobManager: jobManager || undefined,
    state: state || undefined,
    financeTasks: financeTasks || undefined,
    from: from?.format("YYYY-MM-DD"),
    to: to?.format("YYYY-MM-DD"),
  };

  // Complete/incomplete counts ignore the Status filter itself (so they always show the full
  // breakdown for the rest of the current filter scope, regardless of which status is selected).
  useEffect(() => {
    const handle = setTimeout(() => {
      Promise.all([
        listJobs({ ...baseFilters, isStub: false, pageSize: 1 }),
        listJobs({ ...baseFilters, isStub: true, pageSize: 1 }),
      ]).then(([complete, incomplete]) => {
        setCompleteCount(complete.total);
        setIncompleteCount(incomplete.total);
      });
    }, 300);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, client, jobManager, state, financeTasks, from, to]);

  useEffect(() => {
    const handle = setTimeout(() => {
      listJobs({
        ...baseFilters,
        isStub: status === "" ? undefined : status === "incomplete",
        page: paginationModel.page + 1,
        pageSize: paginationModel.pageSize,
        sortField: sortModel[0]?.field,
        sortOrder: sortModel[0]?.sort ?? undefined,
      }).then((res) => {
        setRows(res.rows);
        setTotal(res.total);
        setTotalBudget(res.totalBudget);
      });
    }, 300);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, client, jobManager, state, status, financeTasks, from, to, paginationModel, sortModel]);

  async function handleExport() {
    const res = await listJobs({
      ...baseFilters,
      isStub: status === "" ? undefined : status === "incomplete",
      sortField: sortModel[0]?.field,
      sortOrder: sortModel[0]?.sort ?? undefined,
      export: true,
    });
    exportRowsAsCsv(`finpro-jobs-${new Date().toISOString().slice(0, 10)}.csv`, res.rows, CSV_COLUMNS);
  }

  const columns: GridColDef<Job>[] = [
    { field: "jobNo", headerName: "Job No.", width: 110 },
    { field: "name", headerName: "Job Name", flex: 1 },
    { field: "clientName", headerName: "Client", flex: 1, valueGetter: (_v, row) => row.client?.name ?? "" },
    { field: "jobManagerCol", headerName: "Job Manager", width: 160, valueGetter: (_v, row) => row.client?.jobManager ?? "" },
    { field: "state", headerName: "State", width: 160 },
    { field: "budget", headerName: "Budget", width: 110 },
    {
      field: "isStub",
      headerName: "Import Status",
      width: 140,
      renderCell: (params) =>
        params.value ? (
          <Chip label="Incomplete" size="small" color="warning" />
        ) : (
          <Chip label="Complete" size="small" color="success" variant="outlined" />
        ),
    },
  ];

  return (
    <Box>
      <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 2 }}>
        <Typography variant="h5" gutterBottom>Jobs</Typography>
        <ExportButton onExport={handleExport} />
      </Stack>
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Stack direction="row" spacing={2} useFlexGap sx={{ flexWrap: "wrap", alignItems: "center" }}>
          <TextField size="small" label="Search by Job No. / Name" value={search} onChange={(e) => setSearch(e.target.value)} sx={{ width: 220 }} />
          <TextField size="small" label="Client" value={client} onChange={(e) => setClient(e.target.value)} sx={{ width: 200 }} />
          <TextField select size="small" label="Job Manager" value={jobManager} onChange={(e) => setJobManager(e.target.value)} sx={{ width: 190 }}>
            <MenuItem value="">All managers</MenuItem>
            {jobManagers.map((m) => (
              <MenuItem key={m} value={m}>{m}</MenuItem>
            ))}
          </TextField>
          <TextField select size="small" label="State" value={state} onChange={(e) => setState(e.target.value)} sx={{ width: 190 }}>
            <MenuItem value="">All states</MenuItem>
            {states.map((s) => (
              <MenuItem key={s} value={s}>{s}</MenuItem>
            ))}
          </TextField>
          <TextField select size="small" label="Import Status" value={status} onChange={(e) => setStatus(e.target.value)} sx={{ width: 150 }}>
            <MenuItem value="">All</MenuItem>
            <MenuItem value="complete">Complete</MenuItem>
            <MenuItem value="incomplete">Incomplete</MenuItem>
          </TextField>
          <DatePicker label="Start From" value={from} onChange={setFrom} slotProps={{ textField: { size: "small" } }} sx={{ width: 170 }} />
          <DatePicker label="Start To" value={to} onChange={setTo} slotProps={{ textField: { size: "small" } }} sx={{ width: 170 }} />
          <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
            <FormControlLabel
              control={<Checkbox checked={financeTasks} onChange={(e) => setFinanceTasks(e.target.checked)} />}
              label="Finance Tasks"
            />
            <Tooltip
              title='Jobs ready to be quoted or invoiced: state is "Pls Invoice", no budget has been set yet, and time has already been logged against them.'
              arrow
              placement="top"
            >
              <InfoOutlinedIcon sx={{ fontSize: 16, color: "text.secondary", cursor: "help" }} />
            </Tooltip>
          </Stack>
        </Stack>
      </Paper>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid size={{ xs: 6, sm: 3 }}>
          <KpiCard label="Total Jobs" value={total} />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <KpiCard label="Complete Records" value={completeCount ?? "—"} />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <KpiCard label="Incomplete Records" value={incompleteCount ?? "—"} color={incompleteCount ? "warning" : "default"} />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <KpiCard label="Total Budget" value={money(totalBudget)} />
        </Grid>
      </Grid>

      <Box sx={{ height: 650 }}>
        <DataGrid
          rows={rows}
          columns={columns}
          rowCount={total}
          paginationMode="server"
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          pageSizeOptions={[25, 50, 100]}
          sortingMode="server"
          sortModel={sortModel}
          onSortModelChange={setSortModel}
          onRowClick={(params) => navigate(`/jobs/${params.id}`)}
          sx={{ cursor: "pointer" }}
        />
      </Box>
    </Box>
  );
}
