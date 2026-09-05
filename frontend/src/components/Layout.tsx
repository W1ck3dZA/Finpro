import { useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import {
  AppBar,
  Toolbar,
  Typography,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Box,
  IconButton,
  Menu,
  MenuItem,
  Avatar,
  Divider,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import DashboardIcon from "@mui/icons-material/Dashboard";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import InsightsIcon from "@mui/icons-material/Insights";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import CompareArrowsIcon from "@mui/icons-material/CompareArrows";
import PeopleIcon from "@mui/icons-material/People";
import WorkIcon from "@mui/icons-material/Work";
import EventNoteIcon from "@mui/icons-material/EventNote";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import ManageAccountsIcon from "@mui/icons-material/ManageAccounts";
import PaidIcon from "@mui/icons-material/Paid";
import { useAuth } from "../auth/AuthContext";
import logo from "../assets/logo.png";

const DRAWER_WIDTH = 240;

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
  adminOnly: boolean;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    label: "Overview",
    items: [{ to: "/", label: "Dashboard", icon: <DashboardIcon />, adminOnly: false }],
  },
  {
    label: "Reports",
    items: [
      { to: "/reports/time", label: "Time Reports", icon: <AccessTimeIcon />, adminOnly: false },
      { to: "/reports/analytics", label: "Business Analytics", icon: <InsightsIcon />, adminOnly: false },
      { to: "/reports/jobs-over-budget", label: "Jobs Over Budget", icon: <WarningAmberIcon />, adminOnly: false },
      { to: "/reports/ctc-vs-target", label: "CTC vs Target", icon: <TrendingUpIcon />, adminOnly: false },
      { to: "/reports/staff-vs-client", label: "Staff vs Client", icon: <CompareArrowsIcon />, adminOnly: false },
    ],
  },
  {
    label: "Data",
    items: [
      { to: "/clients", label: "Clients", icon: <PeopleIcon />, adminOnly: false },
      { to: "/jobs", label: "Jobs", icon: <WorkIcon />, adminOnly: false },
      { to: "/timesheets", label: "Timesheets", icon: <EventNoteIcon />, adminOnly: false },
    ],
  },
  {
    label: "Administration",
    items: [
      { to: "/import", label: "Import Data", icon: <UploadFileIcon />, adminOnly: true },
      { to: "/staff-rates", label: "Staff Rates", icon: <PaidIcon />, adminOnly: true },
      { to: "/manage-users", label: "Manage Users", icon: <ManageAccountsIcon />, adminOnly: true },
    ],
  },
];

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  function handleLogout() {
    setAnchorEl(null);
    logout();
    navigate("/login");
  }

  const drawerContent = (
    <>
      <Toolbar />
      {navSections.map((section, sectionIndex) => {
        const items = section.items.filter((item) => !item.adminOnly || user?.role === "ADMIN");
        if (items.length === 0) return null;
        return (
          <Box key={section.label}>
            {sectionIndex > 0 && <Divider sx={{ my: 0.5 }} />}
            <Typography
              variant="overline"
              color="text.secondary"
              sx={{ display: "block", px: 2, pt: 1.5, pb: 0.5, fontSize: 11, fontWeight: 600, letterSpacing: 0.6 }}
            >
              {section.label}
            </Typography>
            <List dense sx={{ py: 0 }}>
              {items.map((item) => (
                <ListItemButton
                  key={item.to}
                  component={NavLink}
                  to={item.to}
                  end={item.to === "/"}
                  onClick={() => setMobileOpen(false)}
                  sx={{ "&.active": { bgcolor: "action.selected", borderRight: 3, borderColor: "primary.main" } }}
                >
                  <ListItemIcon>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.label} />
                </ListItemButton>
              ))}
            </List>
          </Box>
        );
      })}
    </>
  );

  return (
    <Box sx={{ display: "flex" }}>
      <AppBar position="fixed" sx={{ zIndex: (t) => t.zIndex.drawer + 1 }}>
        <Toolbar sx={{ display: "flex", justifyContent: "space-between" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <IconButton
              color="inherit"
              edge="start"
              onClick={() => setMobileOpen(true)}
              sx={{ display: { md: "none" } }}
            >
              <MenuIcon />
            </IconButton>
            <Box component="img" src={logo} alt="Finpro Accountants" sx={{ height: 32, borderRadius: 1, bgcolor: "white", px: 0.5 }} />
          </Box>
          <IconButton onClick={(e) => setAnchorEl(e.currentTarget)} size="small">
            <Avatar sx={{ width: 32, height: 32, bgcolor: "primary.main" }}>{user?.name?.[0]?.toUpperCase() ?? "?"}</Avatar>
          </IconButton>
          <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
            <MenuItem disabled>{user?.name} ({user?.role})</MenuItem>
            <Divider />
            <MenuItem onClick={() => { setAnchorEl(null); navigate("/profile"); }}>Profile</MenuItem>
            <MenuItem onClick={handleLogout}>Logout</MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      {/* Mobile: overlay drawer that opens on demand and closes on nav/backdrop click */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: "block", md: "none" },
          [`& .MuiDrawer-paper`]: { width: DRAWER_WIDTH, boxSizing: "border-box" },
        }}
      >
        {drawerContent}
      </Drawer>

      {/* Desktop: always-visible drawer */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: "none", md: "block" },
          width: DRAWER_WIDTH,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: { width: DRAWER_WIDTH, boxSizing: "border-box" },
        }}
      >
        {drawerContent}
      </Drawer>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, sm: 3 },
          bgcolor: "background.default",
          minHeight: "100vh",
          width: { xs: "100%", md: `calc(100% - ${DRAWER_WIDTH}px)` },
        }}
      >
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
}
