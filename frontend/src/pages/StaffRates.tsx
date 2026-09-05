import { useEffect, useMemo, useState } from "react";
import { Box, Typography, Alert, Grid, Paper, TextField, Stack, Avatar, Chip } from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { KpiCard } from "../components/KpiCard";
import { listStaffMembers, updateStaffMember } from "../api/staffMembers";
import { formatMoney } from "../utils/money";
import type { StaffMember } from "../api/types";

function money(n: number): string {
  return formatMoney(n);
}

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export function StaffRates() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [search, setSearch] = useState("");
  const [feedback, setFeedback] = useState<{ severity: "success" | "error"; message: string } | null>(null);

  function refresh() {
    return listStaffMembers().then(setStaff);
  }

  useEffect(() => {
    refresh();
  }, []);

  const filtered = useMemo(
    () => (search ? staff.filter((s) => s.name.toLowerCase().includes(search.toLowerCase())) : staff),
    [staff, search],
  );

  const ratesSet = staff.filter((s) => s.hourlyRate !== null).length;
  const ratesMissing = staff.length - ratesSet;
  const avgRate = ratesSet > 0 ? staff.reduce((sum, s) => sum + (s.hourlyRate !== null ? Number(s.hourlyRate) : 0), 0) / ratesSet : null;

  const columns: GridColDef<StaffMember>[] = [
    {
      field: "name",
      headerName: "Staff Member",
      flex: 1,
      renderCell: (params) => (
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", height: "100%" }}>
          <Avatar sx={{ width: 28, height: 28, fontSize: 13, bgcolor: "primary.main" }}>{initials(params.row.name)}</Avatar>
          <Typography variant="body2">{params.row.name}</Typography>
        </Stack>
      ),
    },
    {
      field: "hourlyRate",
      headerName: "Hourly Rate (R)",
      width: 200,
      editable: true,
      type: "number",
      valueGetter: (v: string | null) => (v !== null ? Number(v) : null),
      valueFormatter: (v: number | null) => (v !== null && v !== undefined ? money(v) : "—"),
    },
    {
      field: "monthlyCtc",
      headerName: "Monthly CTC (R)",
      width: 200,
      editable: true,
      type: "number",
      valueGetter: (v: string | null) => (v !== null ? Number(v) : null),
      valueFormatter: (v: number | null) => (v !== null && v !== undefined ? money(v) : "—"),
    },
    {
      field: "monthlyExpenses",
      headerName: "Monthly Expenses (R)",
      width: 200,
      editable: true,
      type: "number",
      valueGetter: (v: string | null) => (v !== null ? Number(v) : null),
      valueFormatter: (v: number | null) => (v !== null && v !== undefined ? money(v) : "—"),
    },
    {
      field: "status",
      headerName: "Status",
      width: 130,
      sortable: false,
      valueGetter: (_v, row) => row.hourlyRate !== null,
      renderCell: (params) =>
        params.value ? <Chip label="Rate Set" size="small" color="success" variant="outlined" /> : <Chip label="Not Set" size="small" color="warning" />,
    },
  ];

  function toNullableNumber(v: string | number | null | undefined): number | null {
    return v === null || v === undefined || (v as unknown) === "" ? null : Number(v);
  }

  async function processRowUpdate(newRow: StaffMember, oldRow: StaffMember) {
    const payload = {
      hourlyRate: toNullableNumber(newRow.hourlyRate),
      monthlyCtc: toNullableNumber(newRow.monthlyCtc),
      monthlyExpenses: toNullableNumber(newRow.monthlyExpenses),
    };
    try {
      const updated = await updateStaffMember(newRow.id, payload);
      setFeedback({ severity: "success", message: `Updated rate for ${updated.name}` });
      setStaff((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      return updated;
    } catch {
      setFeedback({ severity: "error", message: "Failed to update rate" });
      return oldRow;
    }
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Staff Rates
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 2 }}>
        Set each staff member's hourly rate so job cost breakdowns and the Jobs Over Budget report can calculate accurately.
        Double-click a rate to edit it.
      </Typography>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid size={{ xs: 6, sm: 3 }}>
          <KpiCard label="Total Staff" value={staff.length} />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <KpiCard label="Rates Set" value={ratesSet} />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <KpiCard label="Rates Missing" value={ratesMissing} color={ratesMissing > 0 ? "warning" : "default"} />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <KpiCard label="Average Rate" value={avgRate !== null ? money(avgRate) : "—"} />
        </Grid>
      </Grid>

      {feedback && (
        <Alert severity={feedback.severity} sx={{ mb: 2 }} onClose={() => setFeedback(null)}>
          {feedback.message}
        </Alert>
      )}

      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <TextField size="small" label="Search staff" value={search} onChange={(e) => setSearch(e.target.value)} sx={{ width: 260 }} />
      </Paper>

      <Box sx={{ height: 600 }}>
        <DataGrid rows={filtered} columns={columns} processRowUpdate={processRowUpdate} density="comfortable" />
      </Box>
    </Box>
  );
}
