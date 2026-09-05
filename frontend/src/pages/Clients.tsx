import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Typography, TextField, Chip, Stack, Grid } from "@mui/material";
import { DataGrid, type GridColDef, type GridSortModel } from "@mui/x-data-grid";
import { listClients } from "../api/clients";
import { KpiCard } from "../components/KpiCard";
import { ExportButton } from "../components/ExportButton";
import { exportRowsAsCsv, type CsvColumn } from "../utils/csvExport";
import type { Client } from "../api/types";

const CSV_COLUMNS: CsvColumn<Client>[] = [
  { header: "Client Name", accessor: (c) => c.name },
  { header: "Business Structure", accessor: (c) => c.businessStructure },
  { header: "Client Type", accessor: (c) => c.clientType },
  { header: "Job Manager", accessor: (c) => c.jobManager },
  { header: "Email", accessor: (c) => c.email },
  { header: "Phone", accessor: (c) => c.phone },
  { header: "Tax Number", accessor: (c) => c.taxNumber },
  { header: "Company Number", accessor: (c) => c.companyNumber },
  { header: "Country", accessor: (c) => c.country },
  { header: "Status", accessor: (c) => (c.isStub ? "Incomplete" : "Complete") },
];

export function Clients() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<Client[]>([]);
  const [total, setTotal] = useState(0);
  const [completeCount, setCompleteCount] = useState<number | null>(null);
  const [incompleteCount, setIncompleteCount] = useState<number | null>(null);
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 25 });
  const [sortModel, setSortModel] = useState<GridSortModel>([]);

  // Stats reflect the current search scope but not the status filter (there isn't one on this
  // page), so they always show the full complete/incomplete breakdown for what's searched.
  useEffect(() => {
    const handle = setTimeout(() => {
      const searchFilter = search || undefined;
      Promise.all([
        listClients({ search: searchFilter, isStub: false, pageSize: 1 }),
        listClients({ search: searchFilter, isStub: true, pageSize: 1 }),
      ]).then(([complete, incomplete]) => {
        setCompleteCount(complete.total);
        setIncompleteCount(incomplete.total);
      });
    }, 300);
    return () => clearTimeout(handle);
  }, [search]);

  useEffect(() => {
    const handle = setTimeout(() => {
      listClients({
        search: search || undefined,
        page: paginationModel.page + 1,
        pageSize: paginationModel.pageSize,
        sortField: sortModel[0]?.field,
        sortOrder: sortModel[0]?.sort ?? undefined,
      }).then((res) => {
        setRows(res.rows);
        setTotal(res.total);
      });
    }, 300);
    return () => clearTimeout(handle);
  }, [search, paginationModel, sortModel]);

  async function handleExport() {
    const res = await listClients({
      search: search || undefined,
      sortField: sortModel[0]?.field,
      sortOrder: sortModel[0]?.sort ?? undefined,
      export: true,
    });
    exportRowsAsCsv(`finpro-clients-${new Date().toISOString().slice(0, 10)}.csv`, res.rows, CSV_COLUMNS);
  }

  const columns: GridColDef<Client>[] = [
    { field: "name", headerName: "Client Name", flex: 1.5 },
    { field: "businessStructure", headerName: "Structure", width: 150 },
    { field: "clientType", headerName: "Type", width: 100 },
    { field: "jobManager", headerName: "Job Manager", width: 160 },
    { field: "email", headerName: "Email", flex: 1 },
    {
      field: "isStub",
      headerName: "Status",
      width: 120,
      renderCell: (params) => (params.value ? <Chip label="Incomplete" size="small" color="warning" /> : <Chip label="Complete" size="small" color="success" variant="outlined" />),
    },
  ];

  return (
    <Box>
      <Stack direction="row" sx={{ mb: 2, justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 2 }}>
        <Typography variant="h5">Clients</Typography>
        <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
          <TextField size="small" label="Search by name" value={search} onChange={(e) => setSearch(e.target.value)} sx={{ width: 300 }} />
          <ExportButton onExport={handleExport} />
        </Stack>
      </Stack>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid size={{ xs: 6, sm: 4 }}>
          <KpiCard label="Total Clients" value={total} />
        </Grid>
        <Grid size={{ xs: 6, sm: 4 }}>
          <KpiCard label="Complete Records" value={completeCount ?? "—"} />
        </Grid>
        <Grid size={{ xs: 6, sm: 4 }}>
          <KpiCard label="Incomplete Records" value={incompleteCount ?? "—"} color={incompleteCount ? "warning" : "default"} />
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
          onRowClick={(params) => navigate(`/clients/${params.id}`)}
          sx={{ cursor: "pointer" }}
        />
      </Box>
    </Box>
  );
}
