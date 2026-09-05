import { useEffect, useState } from "react";
import { useParams, useNavigate, Link as RouterLink } from "react-router-dom";
import {
  Box,
  Typography,
  Paper,
  Grid,
  Chip,
  Stack,
  Button,
  CircularProgress,
  LinearProgress,
  Link,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import PersonIcon from "@mui/icons-material/Person";
import EventIcon from "@mui/icons-material/Event";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import BadgeIcon from "@mui/icons-material/Badge";
import { getJob } from "../api/jobs";
import { listTimesheets } from "../api/timesheets";
import { CostBreakdownTable } from "../components/CostBreakdownTable";
import { KpiCard } from "../components/KpiCard";
import { stateColor } from "../utils/stateColor";
import { formatMoney } from "../utils/money";
import { formatDate } from "../utils/date";
import type { Job, Timesheet } from "../api/types";

function money(n: number | string | null): string {
  if (n === null) return "—";
  const num = typeof n === "string" ? Number(n) : n;
  return formatMoney(num);
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

export function JobDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState<Job | null>(null);
  const [entries, setEntries] = useState<Timesheet[] | null>(null);

  useEffect(() => {
    setJob(null);
    getJob(Number(id)).then(setJob);
  }, [id]);

  useEffect(() => {
    setEntries(null);
    // export: true bypasses the normal page-size cap, so every entry logged against this one
    // job comes back regardless of count — a job's own timesheet history is always a bounded,
    // small set, unlike the site-wide Timesheets list this endpoint otherwise paginates.
    listTimesheets({ jobId: Number(id), sortField: "entryDate", sortOrder: "asc", export: true }).then((res) => setEntries(res.rows));
  }, [id]);

  if (!job) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  const breakdown = job.costBreakdown;
  const budget = breakdown?.budget ?? null;
  const totalCost = breakdown?.totalCost ?? null;
  const usagePct = budget && totalCost !== null ? Math.min(200, (totalCost / budget) * 100) : null;
  const progressColor = usagePct === null ? "info" : usagePct > 100 ? "error" : usagePct > 85 ? "warning" : "success";

  return (
    <Box sx={{ maxWidth: 1100, mx: "auto" }}>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate("/jobs")} sx={{ mb: 2 }}>
        Back to Jobs
      </Button>

      <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
        <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 2, mb: 2 }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 600 }}>
              {job.name || job.jobNo}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {job.jobNo}
              {job.client && (
                <>
                  {" · "}
                  <Link component={RouterLink} to={`/clients/${job.client.id}`}>
                    {job.client.name}
                  </Link>
                </>
              )}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
            <Chip label={job.state} color={stateColor(job.state)} />
            {job.isStub && <Chip label="Incomplete record" color="warning" variant="outlined" />}
            {breakdown?.overBudget && <Chip label="Over Budget" color="error" />}
          </Stack>
        </Stack>

        {budget !== null && totalCost !== null && (
          <Box sx={{ mb: 1 }}>
            <Stack direction="row" sx={{ justifyContent: "space-between", mb: 0.5 }}>
              <Typography variant="body2" color="text.secondary">
                Budget usage: {money(totalCost)} of {money(budget)}
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }} color={`${progressColor}.main`}>
                {usagePct !== null ? `${usagePct.toFixed(0)}%` : "—"}
              </Typography>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={usagePct !== null ? Math.min(100, usagePct) : 0}
              color={progressColor}
              sx={{ height: 8, borderRadius: 4 }}
            />
          </Box>
        )}
      </Paper>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 6, md: 3 }}>
          <KpiCard label="Total Hours" value={breakdown ? breakdown.totalHours.toFixed(2) : "0"} />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <KpiCard label="Budget" value={budget !== null ? money(budget) : "Not set"} />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <KpiCard label="Actual Cost" value={money(totalCost)} />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <KpiCard
            label="Variance"
            value={breakdown?.variance != null ? `${breakdown.variance >= 0 ? "+" : ""}${money(breakdown.variance)}` : "—"}
            color={breakdown?.overBudget ? "warning" : "default"}
            sublabel={breakdown?.variancePct != null ? `${breakdown.variancePct.toFixed(1)}%` : undefined}
          />
        </Grid>
      </Grid>

      <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <DetailRow icon={<BadgeIcon fontSize="small" />} label="Job Manager" value={job.client?.jobManager} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <DetailRow icon={<PersonIcon fontSize="small" />} label="Client" value={job.client?.name} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <DetailRow icon={<EventIcon fontSize="small" />} label="Start Date" value={job.startDate ? formatDate(job.startDate) : "—"} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <DetailRow
              icon={<EventAvailableIcon fontSize="small" />}
              label="Completed Date"
              value={job.completedDate ? formatDate(job.completedDate) : "—"}
            />
          </Grid>
        </Grid>
      </Paper>

      <Typography variant="h6" sx={{ mb: 1.5, fontWeight: 600 }}>
        Time & Cost Breakdown
      </Typography>
      {breakdown && breakdown.staff.length > 0 ? (
        <CostBreakdownTable breakdown={breakdown} />
      ) : (
        <Paper variant="outlined" sx={{ p: 4, textAlign: "center", mb: 3 }}>
          <Typography color="text.secondary">No time has been logged against this job yet.</Typography>
        </Paper>
      )}

      <Typography variant="h6" sx={{ mt: 3, mb: 1.5, fontWeight: 600 }}>
        Timesheet Entries
      </Typography>
      {entries === null ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
          <CircularProgress size={28} />
        </Box>
      ) : entries.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 4, textAlign: "center" }}>
          <Typography color="text.secondary">No time has been logged against this job yet.</Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Staff Member</TableCell>
                <TableCell align="right">Hours</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.id} hover>
                  <TableCell sx={{ whiteSpace: "nowrap", verticalAlign: "top" }}>{formatDate(entry.entryDate)}</TableCell>
                  <TableCell sx={{ verticalAlign: "top" }}>
                    {entry.staffMember.name}
                    {entry.note && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.25 }}>
                        {entry.note}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="right" sx={{ verticalAlign: "top" }}>{(entry.minutes / 60).toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
