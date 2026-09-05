import { useEffect, useRef, useState } from "react";
import {
  Box,
  Typography,
  Button,
  Paper,
  Alert,
  AlertTitle,
  List,
  ListItem,
  ListItemText,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  CircularProgress,
  Stack,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { uploadImport, listImports } from "../api/imports";
import { formatDateTime } from "../utils/date";
import type { ImportBatchListItem, ImportResult } from "../api/types";

const statusColor: Record<string, "success" | "warning" | "error"> = {
  SUCCESS: "success",
  PARTIAL: "warning",
  FAILED: "error",
};

export function Import() {
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<ImportBatchListItem[]>([]);

  function refreshHistory() {
    listImports().then((res) => setHistory(res.rows));
  }

  useEffect(() => {
    refreshHistory();
  }, []);

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    setResult(null);
    try {
      const res = await uploadImport(file);
      setResult(res);
      refreshHistory();
    } catch (err) {
      const message = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Upload failed";
      setError(message);
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  const historyColumns: GridColDef<ImportBatchListItem>[] = [
    { field: "createdAt", headerName: "Date", width: 170, valueFormatter: (v: string) => formatDateTime(v) },
    { field: "type", headerName: "Type", width: 90 },
    { field: "filename", headerName: "File", flex: 1 },
    { field: "uploadedBy", headerName: "Uploaded By", width: 150 },
    { field: "rowsTotal", headerName: "Rows", width: 90, type: "number" },
    {
      field: "status",
      headerName: "Status",
      width: 110,
      renderCell: (params) => <Chip label={params.value} size="small" color={statusColor[params.value as string]} />,
    },
  ];

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Import Data
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 2 }}>
        Upload a Client, Job Report, or Time export CSV from Xero Practice Manager. The file type is detected automatically.
      </Typography>

      <Paper variant="outlined" sx={{ p: 3, mb: 3, textAlign: "center" }}>
        <input ref={fileInput} type="file" accept=".csv" hidden onChange={handleFileSelected} />
        <Button
          variant="contained"
          startIcon={<UploadFileIcon />}
          onClick={() => fileInput.current?.click()}
          disabled={uploading}
        >
          {uploading ? "Uploading..." : "Upload CSV File"}
        </Button>
        {uploading && (
          <Box sx={{ mt: 2 }}>
            <CircularProgress size={24} />
          </Box>
        )}
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {result && (
        <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
          <Alert severity={statusColor[result.status] === "success" ? "success" : statusColor[result.status] === "warning" ? "warning" : "error"} sx={{ mb: 2 }}>
            <AlertTitle>
              {result.type} import {result.status === "SUCCESS" ? "completed successfully" : result.status === "PARTIAL" ? "completed with notes" : "failed"}
            </AlertTitle>
            {result.rowsTotal} rows processed — {result.rowsInserted} added, {result.rowsUpdated} updated, {result.rowsSkipped} skipped.
          </Alert>

          {result.summary.length > 0 && (
            <Stack spacing={1} sx={{ mb: 2 }}>
              {result.summary.map((s) => (
                <Alert key={s.code} severity="info" variant="outlined">
                  {s.label}
                </Alert>
              ))}
            </Stack>
          )}

          {result.warnings.length > 0 && (
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>Show details ({result.warnings.length})</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <List dense>
                  {result.warnings.map((w, i) => (
                    <ListItem key={i}>
                      <ListItemText primary={w.message} secondary={w.row > 0 ? `Row ${w.row}` : undefined} />
                    </ListItem>
                  ))}
                </List>
              </AccordionDetails>
            </Accordion>
          )}
        </Paper>
      )}

      <Typography variant="h6" gutterBottom>
        Upload History
      </Typography>
      <Box sx={{ height: 400 }}>
        <DataGrid rows={history} columns={historyColumns} density="compact" />
      </Box>
    </Box>
  );
}
