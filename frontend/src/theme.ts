import { createTheme } from "@mui/material/styles";

export const theme = createTheme({
  palette: {
    primary: { main: "#1E9E93", dark: "#157B72", light: "#4FBBB0" },
    secondary: { main: "#0E2A33" },
    background: { default: "#F4F7F7" },
  },
  shape: { borderRadius: 8 },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
  },
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: { backgroundColor: "#0E2A33" },
      },
    },
  },
});
