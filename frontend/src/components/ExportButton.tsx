import { useState } from "react";
import { Button, CircularProgress } from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";

interface ExportButtonProps {
  onExport: () => Promise<void>;
  label?: string;
}

/** Fetches + downloads on click; shows a spinner while the (potentially large, unpaginated)
 * export request is in flight rather than leaving the button looking unresponsive. */
export function ExportButton({ onExport, label = "Export CSV" }: ExportButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      await onExport();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant="outlined"
      size="small"
      startIcon={loading ? <CircularProgress size={16} /> : <DownloadIcon />}
      onClick={handleClick}
      disabled={loading}
    >
      {label}
    </Button>
  );
}
