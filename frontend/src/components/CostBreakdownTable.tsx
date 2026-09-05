import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  Box,
  Typography,
  Chip,
  LinearProgress,
  Avatar,
  Stack,
} from "@mui/material";
import { BarChart } from "@mui/x-charts/BarChart";
import { formatMoney } from "../utils/money";
import type { JobCostBreakdown } from "../api/types";

function money(n: number | null): string {
  if (n === null) return "—";
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

const STAFF_COLORS = ["#1E9E93", "#F59E0B", "#3B82F6", "#EF4444", "#8B5CF6", "#EC4899", "#10B981", "#6366F1"];

export function CostBreakdownTable({ breakdown }: { breakdown: JobCostBreakdown }) {
  return (
    <Box>
      {breakdown.ratesIncomplete && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          One or more staff members on this job don't have an hourly rate set yet, so total cost can't be calculated accurately.
          Set their rate on the Staff Rates page.
        </Alert>
      )}

      {breakdown.staff.length > 1 && (
        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
            Hours by Staff Member
          </Typography>
          <BarChart
            layout="horizontal"
            yAxis={[{ scaleType: "band", data: breakdown.staff.map((s) => s.staffName), tickLabelStyle: { fontSize: 12 } }]}
            series={[{ data: breakdown.staff.map((s) => Math.round(s.hours * 10) / 10), label: "Hours" }]}
            height={Math.max(120, breakdown.staff.length * 40)}
            margin={{ left: 130, right: 20, top: 10, bottom: 30 }}
          />
        </Paper>
      )}

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Staff Member</TableCell>
              <TableCell align="right">Hours</TableCell>
              <TableCell sx={{ width: 180 }}>% of Job</TableCell>
              <TableCell align="right">Rate / hr</TableCell>
              <TableCell align="right">Cost</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {breakdown.staff.map((row, i) => (
              <TableRow key={row.staffMemberId} hover>
                <TableCell>
                  <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                    <Avatar sx={{ width: 28, height: 28, fontSize: 13, bgcolor: STAFF_COLORS[i % STAFF_COLORS.length] }}>
                      {initials(row.staffName)}
                    </Avatar>
                    <Typography variant="body2">{row.staffName}</Typography>
                  </Stack>
                </TableCell>
                <TableCell align="right">{row.hours.toFixed(2)}</TableCell>
                <TableCell>
                  <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                    <LinearProgress
                      variant="determinate"
                      value={row.pctOfJob}
                      sx={{ flex: 1, height: 6, borderRadius: 3 }}
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ minWidth: 36, textAlign: "right" }}>
                      {row.pctOfJob.toFixed(0)}%
                    </Typography>
                  </Stack>
                </TableCell>
                <TableCell align="right">{row.hourlyRate !== null ? money(row.hourlyRate) : <Chip label="not set" size="small" color="warning" />}</TableCell>
                <TableCell align="right">{money(row.cost)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
