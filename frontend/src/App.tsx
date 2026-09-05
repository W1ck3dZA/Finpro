import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider, CssBaseline } from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
// Registers the "en-gb" locale data with dayjs so AdapterDayjs's default DatePicker format
// resolves to day/month/year (DD/MM/YYYY) instead of dayjs's "en" default of month/day/year.
import "dayjs/locale/en-gb";
import { theme } from "./theme";
import { AuthProvider } from "./auth/AuthContext";
import { ProtectedRoute, RequireAdmin } from "./auth/ProtectedRoute";
import { Layout } from "./components/Layout";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { TimeReports } from "./pages/TimeReports";
import { BusinessAnalytics } from "./pages/BusinessAnalytics";
import { JobsOverBudget } from "./pages/JobsOverBudget";
import { CtcVsTargetReport } from "./pages/CtcVsTargetReport";
import { StaffVsClientReport } from "./pages/StaffVsClientReport";
import { Clients } from "./pages/Clients";
import { ClientDetail } from "./pages/ClientDetail";
import { Jobs } from "./pages/Jobs";
import { JobDetail } from "./pages/JobDetail";
import { Timesheets } from "./pages/Timesheets";
import { Import } from "./pages/Import";
import { ManageUsers } from "./pages/ManageUsers";
import { StaffRates } from "./pages/StaffRates";
import { Profile } from "./pages/Profile";

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="en-gb">
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route element={<ProtectedRoute />}>
                <Route element={<Layout />}>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/reports/time" element={<TimeReports />} />
                  <Route path="/reports/analytics" element={<BusinessAnalytics />} />
                  <Route path="/reports/jobs-over-budget" element={<JobsOverBudget />} />
                  <Route path="/reports/ctc-vs-target" element={<CtcVsTargetReport />} />
                  <Route path="/reports/staff-vs-client" element={<StaffVsClientReport />} />
                  <Route path="/clients" element={<Clients />} />
                  <Route path="/clients/:id" element={<ClientDetail />} />
                  <Route path="/jobs" element={<Jobs />} />
                  <Route path="/jobs/:id" element={<JobDetail />} />
                  <Route path="/timesheets" element={<Timesheets />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route element={<RequireAdmin />}>
                    <Route path="/import" element={<Import />} />
                    <Route path="/staff-rates" element={<StaffRates />} />
                    <Route path="/manage-users" element={<ManageUsers />} />
                  </Route>
                </Route>
              </Route>
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </LocalizationProvider>
    </ThemeProvider>
  );
}
