import { Card, CardContent, Typography, Box, Stack } from "@mui/material";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import RemoveIcon from "@mui/icons-material/Remove";
import type { ReactNode } from "react";

export interface Trend {
  /** Percent change vs the previous equivalent period, e.g. 12.4 for +12.4%. Null when the
   * previous period was zero (percent change is undefined) — shown as a flat "new" indicator. */
  pct: number | null;
  /** Short description of what's being compared against, e.g. "vs last week". */
  comparisonLabel: string;
}

interface KpiCardProps {
  label: string;
  value: ReactNode;
  sublabel?: string;
  color?: "default" | "warning" | "success";
  trend?: Trend;
  onClick?: () => void;
}

const colorMap = {
  default: "text.primary",
  warning: "warning.main",
  success: "success.main",
} as const;

function TrendIndicator({ trend }: { trend: Trend }) {
  if (trend.pct === null) {
    return (
      <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
        <Typography variant="caption" color="text.secondary">
          {trend.comparisonLabel}: n/a
        </Typography>
      </Stack>
    );
  }

  const rounded = Math.round(trend.pct * 10) / 10;
  const isFlat = Math.abs(rounded) < 0.1;
  const isUp = rounded > 0;
  const trendColor = isFlat ? "text.secondary" : isUp ? "success.main" : "error.main";
  const Icon = isFlat ? RemoveIcon : isUp ? ArrowUpwardIcon : ArrowDownwardIcon;

  return (
    <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
      <Icon sx={{ fontSize: 14, color: trendColor }} />
      <Typography variant="caption" sx={{ color: trendColor, fontWeight: 600 }}>
        {isFlat ? "0%" : `${isUp ? "+" : ""}${rounded}%`}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {trend.comparisonLabel}
      </Typography>
    </Stack>
  );
}

export function KpiCard({ label, value, sublabel, color = "default", trend, onClick }: KpiCardProps) {
  return (
    <Card
      variant="outlined"
      onClick={onClick}
      sx={{
        height: "100%",
        ...(onClick && { cursor: "pointer", transition: "box-shadow 0.15s", "&:hover": { boxShadow: 2 } }),
      }}
    >
      <CardContent>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          {label}
        </Typography>
        <Typography variant="h4" sx={{ color: colorMap[color], fontWeight: 600 }}>
          {value}
        </Typography>
        {sublabel && (
          <Box sx={{ mt: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              {sublabel}
            </Typography>
          </Box>
        )}
        {trend && (
          <Box sx={{ mt: 0.5 }}>
            <TrendIndicator trend={trend} />
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
