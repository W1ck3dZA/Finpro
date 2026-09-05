import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Paper,
  Grid,
  Chip,
  Stack,
  Button,
  CircularProgress,
  MenuItem,
  TextField,
  Link,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import EmailIcon from "@mui/icons-material/Email";
import PhoneIcon from "@mui/icons-material/Phone";
import BadgeIcon from "@mui/icons-material/Badge";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import EventIcon from "@mui/icons-material/Event";
import PublicIcon from "@mui/icons-material/Public";
import HomeIcon from "@mui/icons-material/Home";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { getClient } from "../api/clients";
import { getTimeReport, getJobsOverBudget } from "../api/reports";
import { KpiCard } from "../components/KpiCard";
import { stateColor } from "../utils/stateColor";
import { formatMoney } from "../utils/money";
import { formatDate } from "../utils/date";
import type { Client, Job } from "../api/types";

function money(n: number): string {
  return formatMoney(n, { decimals: 0 });
}

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <Stack direction="row" spacing={1.5} sx={{ alignItems: "flex-start" }}>
      <Box sx={{ color: "text.secondary", mt: 0.25 }}>{icon}</Box>
      <Box>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
          {label}
        </Typography>
        <Typography variant="body1">{value ?? "—"}</Typography>
      </Box>
    </Stack>
  );
}

function ServiceChip({ label, active }: { label: string; active: boolean | null }) {
  if (active === null) return null;
  return <Chip label={label} size="small" color={active ? "success" : "default"} variant={active ? "filled" : "outlined"} />;
}

export function ClientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState<Client | null>(null);
  const [totalHours, setTotalHours] = useState<number | null>(null);
  const [overBudgetCount, setOverBudgetCount] = useState<number | null>(null);
  const [jobStateFilter, setJobStateFilter] = useState("");

  useEffect(() => {
    const clientId = Number(id);
    setClient(null);
    setTotalHours(null);
    setOverBudgetCount(null);
    setJobStateFilter("");
    getClient(clientId).then(setClient);
    getTimeReport("staff", "day", { clientId }).then((res) => setTotalHours(res.rows.reduce((sum, r) => sum + r.hours, 0)));
    getJobsOverBudget({ clientId }, 500).then((res) => setOverBudgetCount(res.rows.length));
  }, [id]);

  const jobStates = useMemo(() => Array.from(new Set((client?.jobs ?? []).map((j) => j.state))).sort(), [client]);
  const filteredJobs = useMemo(
    () => (jobStateFilter ? (client?.jobs ?? []).filter((j) => j.state === jobStateFilter) : client?.jobs ?? []),
    [client, jobStateFilter],
  );
  const totalBudget = useMemo(
    () => (client?.jobs ?? []).reduce((sum, j) => sum + (j.budget !== null ? Number(j.budget) : 0), 0),
    [client],
  );

  if (!client) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  const columns: GridColDef<Job>[] = [
    { field: "jobNo", headerName: "Job No.", width: 110 },
    { field: "name", headerName: "Job Name", flex: 1 },
    {
      field: "state",
      headerName: "State",
      width: 170,
      renderCell: (params) => <Chip label={params.value} size="small" color={stateColor(params.value)} />,
    },
    { field: "budget", headerName: "Budget", width: 110, valueFormatter: (v: string | null) => (v !== null ? money(Number(v)) : "—") },
    { field: "startDate", headerName: "Start Date", width: 130, valueFormatter: (v: string | null) => (v ? formatDate(v) : "—") },
    {
      field: "isStub",
      headerName: "Status",
      width: 120,
      renderCell: (params) =>
        params.value ? <Chip label="Incomplete" size="small" color="warning" /> : <Chip label="Complete" size="small" color="success" variant="outlined" />,
    },
  ];

  return (
    <Box sx={{ maxWidth: 1100, mx: "auto" }}>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate("/clients")} sx={{ mb: 2 }}>
        Back to Clients
      </Button>

      <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
        <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 2, mb: 2 }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 600 }}>
              {client.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {client.businessStructure ?? "Business structure not set"}
              {client.clientType && ` · ${client.clientType}`}
            </Typography>
          </Box>
          {client.isStub && <Chip label="Incomplete record (auto-created)" color="warning" />}
        </Stack>

        <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
          <ServiceChip label="Payroll Client" active={client.payrollClient} />
          <ServiceChip label="Cashbook" active={client.cashbook} />
          <ServiceChip label="VAT Submission" active={client.vatSubmission} />
          <ServiceChip label="Provisional Taxpayer" active={client.provisionalTaxpayer} />
        </Stack>
      </Paper>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 6, md: 3 }}>
          <KpiCard label="Total Jobs" value={client.jobs?.length ?? 0} />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <KpiCard label="Total Budget" value={money(totalBudget)} />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <KpiCard label="Hours Logged" value={totalHours !== null ? totalHours.toFixed(1) : "—"} />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <KpiCard label="Jobs Over Budget" value={overBudgetCount ?? "—"} color={overBudgetCount ? "warning" : "default"} />
        </Grid>
      </Grid>

      <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <DetailRow icon={<BadgeIcon fontSize="small" />} label="Job Manager" value={client.jobManager} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <DetailRow icon={<EmailIcon fontSize="small" />} label="Email" value={client.email ? <Link href={`mailto:${client.email}`}>{client.email}</Link> : null} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <DetailRow icon={<PhoneIcon fontSize="small" />} label="Phone" value={client.phone ? <Link href={`tel:${client.phone}`}>{client.phone}</Link> : null} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <DetailRow icon={<ReceiptLongIcon fontSize="small" />} label="Tax Number" value={client.taxNumber} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <DetailRow icon={<BadgeIcon fontSize="small" />} label="Company Number" value={client.companyNumber} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <DetailRow icon={<EventIcon fontSize="small" />} label="CIPC Date" value={client.cipcDate ? formatDate(client.cipcDate) : null} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <DetailRow icon={<PublicIcon fontSize="small" />} label="Country" value={client.country} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <DetailRow icon={<HomeIcon fontSize="small" />} label="Address" value={client.address} />
          </Grid>
        </Grid>
      </Paper>

      <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 1.5, flexWrap: "wrap", gap: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Jobs ({filteredJobs.length}{jobStateFilter ? ` of ${client.jobs?.length ?? 0}` : ""})
        </Typography>
        <TextField select size="small" label="State" value={jobStateFilter} onChange={(e) => setJobStateFilter(e.target.value)} sx={{ width: 200 }}>
          <MenuItem value="">All states</MenuItem>
          {jobStates.map((s) => (
            <MenuItem key={s} value={s}>{s}</MenuItem>
          ))}
        </TextField>
      </Stack>
      <Box sx={{ height: 500 }}>
        <DataGrid
          rows={filteredJobs}
          columns={columns}
          density="compact"
          onRowClick={(params) => navigate(`/jobs/${params.id}`)}
          sx={{ cursor: "pointer" }}
        />
      </Box>
    </Box>
  );
}
