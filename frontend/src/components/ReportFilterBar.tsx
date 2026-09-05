import { Paper, Stack, TextField, MenuItem } from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs, { type Dayjs } from "dayjs";
import type { StaffMember } from "../api/types";

export interface ReportFilterState {
  from: Dayjs | null;
  to: Dayjs | null;
  staffMemberId?: number;
  clientId?: number;
  jobManager?: string;
  state?: string;
}

interface ReportFilterBarProps {
  value: ReportFilterState;
  onChange: (next: ReportFilterState) => void;
  staffMembers?: StaffMember[];
  jobManagers?: string[];
  states?: string[];
  showState?: boolean;
}

export function ReportFilterBar({ value, onChange, staffMembers, jobManagers, states, showState }: ReportFilterBarProps) {
  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
      <Stack direction="row" spacing={2} useFlexGap sx={{ flexWrap: "wrap", alignItems: "center" }}>
        <DatePicker
          label="From"
          value={value.from}
          onChange={(d) => onChange({ ...value, from: d })}
          slotProps={{ textField: { size: "small" } }}
        />
        <DatePicker
          label="To"
          value={value.to}
          onChange={(d) => onChange({ ...value, to: d })}
          slotProps={{ textField: { size: "small" } }}
        />
        {staffMembers && (
          <TextField
            select
            label="Staff Member"
            size="small"
            sx={{ minWidth: 180 }}
            value={value.staffMemberId ?? ""}
            onChange={(e) => onChange({ ...value, staffMemberId: e.target.value ? Number(e.target.value) : undefined })}
          >
            <MenuItem value="">All staff</MenuItem>
            {staffMembers.map((s) => (
              <MenuItem key={s.id} value={s.id}>
                {s.name}
              </MenuItem>
            ))}
          </TextField>
        )}
        {jobManagers && (
          <TextField
            select
            label="Job Manager"
            size="small"
            sx={{ minWidth: 180 }}
            value={value.jobManager ?? ""}
            onChange={(e) => onChange({ ...value, jobManager: e.target.value || undefined })}
          >
            <MenuItem value="">All managers</MenuItem>
            {jobManagers.map((m) => (
              <MenuItem key={m} value={m}>
                {m}
              </MenuItem>
            ))}
          </TextField>
        )}
        {showState && states && (
          <TextField
            select
            label="State"
            size="small"
            sx={{ minWidth: 180 }}
            value={value.state ?? ""}
            onChange={(e) => onChange({ ...value, state: e.target.value || undefined })}
          >
            <MenuItem value="">All states</MenuItem>
            {states.map((s) => (
              <MenuItem key={s} value={s}>
                {s}
              </MenuItem>
            ))}
          </TextField>
        )}
      </Stack>
    </Paper>
  );
}

export function defaultFilterState(): ReportFilterState {
  return { from: dayjs().subtract(3, "month"), to: dayjs() };
}
