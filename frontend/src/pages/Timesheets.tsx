import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Typography, TextField, MenuItem, Stack, Paper, Grid, Tooltip } from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { DataGrid, type GridColDef, type GridSortModel } from "@mui/x-data-grid";
import type { Dayjs } from "dayjs";
import { listTimesheets } from "../api/timesheets";
import { listStaffMembers } from "../api/staffMembers";
import { KpiCard } from "../components/KpiCard";
import { ExportButton } from "../components/ExportButton";
import { exportRowsAsCsv, type CsvColumn } from "../utils/csvExport";
import { formatMoney } from "../utils/money";
import { formatDate } from "../utils/date";
import type { StaffMember, Timesheet } from "../api/types";

function timesheetFee(t: Timesheet): number {
  const hourlyRate = t.staffMember.hourlyRate != null ? Number(t.staffMember.hourlyRate) : 0;
  return (t.minutes / 60) * hourlyRate;
}

const CSV_COLUMNS: CsvColumn<Timesheet>[] = [
  { header: "Date", accessor: (t) => formatDate(t.entryDate) },
  { header: "Staff Member", accessor: (t) => t.staffMember.name },
  { header: "Client", accessor: (t) => t.client.name },
  { header: "Job No.", accessor: (t) => t.job.jobNo },
  { header: "Job Name", accessor: (t) => t.job.name },
  { header: "Hours", accessor: (t) => (t.minutes / 60).toFixed(2) },
  { header: "Fee", accessor: (t) => timesheetFee(t).toFixed(2) },
  { header: "Note", accessor: (t) => t.note },
];

export function Timesheets() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [client, setClient] = useState("");
  const [staffMemberId, setStaffMemberId] = useState("");
  const [from, setFrom] = useState<Dayjs | null>(null);
  const [to, setTo] = useState<Dayjs | null>(null);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [rows, setRows] = useState<Timesheet[]>([]);
  const [total, setTotal] = useState(0);
  const [totalMinutes, setTotalMinutes] = useState(0);
  const [totalFee, setTotalFee] = useState(0);
  const [distinctJobCount, setDistinctJobCount] = useState(0);
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 25 });
  const [sortModel, setSortModel] = useState<GridSortModel>([]);

  useEffect(() => {
    listStaffMembers().then(setStaffMembers);
  }, []);

  useEffect(() => {
    const handle = setTimeout(() => {
      listTimesheets({
        search: search || undefined,
        client: client || undefined,
        staffMemberId: staffMemberId ? Number(staffMemberId) : undefined,
        from: from?.format("YYYY-MM-DD"),
        to: to?.format("YYYY-MM-DD"),
        page: paginationModel.page + 1,
        pageSize: paginationModel.pageSize,
        sortField: sortModel[0]?.field,
        sortOrder: sortModel[0]?.sort ?? undefined,
      }).then((res) => {
        setRows(res.rows);
        setTotal(res.total);
        setTotalMinutes(res.totalMinutes);
        setTotalFee(res.totalFee);
        setDistinctJobCount(res.distinctJobCount);
      });
    }, 300);
    return () => clearTimeout(handle);
  }, [search, client, staffMemberId, from, to, paginationModel, sortModel]);

  async function handleExport() {
    const res = await listTimesheets({
      search: search || undefined,
      client: client || undefined,
      staffMemberId: staffMemberId ? Number(staffMemberId) : undefined,
      from: from?.format("YYYY-MM-DD"),
      to: to?.format("YYYY-MM-DD"),
      sortField: sortModel[0]?.field,
      sortOrder: sortModel[0]?.sort ?? undefined,
      export: true,
    });
    exportRowsAsCsv(`finpro-timesheets-${new Date().toISOString().slice(0, 10)}.csv`, res.rows, CSV_COLUMNS);
  }

  const columns: GridColDef<Timesheet>[] = [
    { field: "entryDate", headerName: "Date", width: 120, valueFormatter: (v: string) => formatDate(v) },
    { field: "staffName", headerName: "Staff Member", flex: 1, valueGetter: (_v, row) => row.staffMember.name },
    { field: "clientName", headerName: "Client", flex: 1, valueGetter: (_v, row) => row.client.name },
    { field: "jobNo", headerName: "Job No.", width: 110, valueGetter: (_v, row) => row.job.jobNo },
    { field: "jobName", headerName: "Job Name", flex: 1, valueGetter: (_v, row) => row.job.name ?? "" },
    {
      field: "minutes",
      headerName: "Hours",
      width: 100,
      type: "number",
      valueGetter: (_v, row) => row.minutes / 60,
      valueFormatter: (v: number) => v.toFixed(2),
    },
    {
      field: "fee",
      headerName: "Fee",
      width: 120,
      type: "number",
      valueGetter: (_v, row) => timesheetFee(row),
      valueFormatter: (v: number) => formatMoney(v),
    },
    {
      field: "note",
      headerName: "Note",
      flex: 1.5,
      sortable: false,
      renderCell: (params) =>
        params.value ? (
          <Tooltip title={params.value} arrow placement="top">
            <Box component="span" sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>
              {params.value}
            </Box>
          </Tooltip>
        ) : (
          <Box component="span" sx={{ color: "text.disabled" }}>—</Box>
        ),
    },
  ];

  return (
    <Box>
      <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 2 }}>
        <Typography variant="h5" gutterBottom>Timesheets</Typography>
        <ExportButton onExport={handleExport} />
      </Stack>
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Stack direction="row" spacing={2} useFlexGap sx={{ flexWrap: "wrap", alignItems: "center" }}>
          <TextField size="small" label="Search by Job No. / Name" value={search} onChange={(e) => setSearch(e.target.value)} sx={{ width: 220 }} />
          <TextField size="small" label="Client" value={client} onChange={(e) => setClient(e.target.value)} sx={{ width: 200 }} />
          <TextField select size="small" label="Staff Member" value={staffMemberId} onChange={(e) => setStaffMemberId(e.target.value)} sx={{ width: 190 }}>
            <MenuItem value="">All staff</MenuItem>
            {staffMembers.map((s) => (
              <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
            ))}
          </TextField>
          <DatePicker label="From" value={from} onChange={setFrom} slotProps={{ textField: { size: "small" } }} sx={{ width: 170 }} />
          <DatePicker label="To" value={to} onChange={setTo} slotProps={{ textField: { size: "small" } }} sx={{ width: 170 }} />
        </Stack>
      </Paper>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid size={{ xs: 6, sm: 3 }}>
          <KpiCard label="Total Entries" value={total} />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <KpiCard label="Total Hours" value={(totalMinutes / 60).toFixed(1)} />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <KpiCard label="Total Fee" value={formatMoney(totalFee)} />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <KpiCard label="Jobs" value={distinctJobCount} />
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
          onRowClick={(params) => navigate(`/jobs/${params.row.jobId}`)}
          sx={{ cursor: "pointer" }}
        />
      </Box>
    </Box>
  );
}
