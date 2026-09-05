import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Stack,
  Chip,
  IconButton,
  Alert,
  Grid,
  Paper,
  Avatar,
  CircularProgress,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import LockResetIcon from "@mui/icons-material/LockReset";
import EditIcon from "@mui/icons-material/Edit";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { listUsers, createUser, updateUser, resetPassword, type UserListItem } from "../api/users";
import { KpiCard } from "../components/KpiCard";
import { useAuth } from "../auth/AuthContext";

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export function ManageUsers() {
  const { user: currentUser } = useAuth();
  const [rows, setRows] = useState<UserListItem[] | null>(null);
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<UserListItem | null>(null);
  const [editForm, setEditForm] = useState({ name: "", email: "", role: "STAFF" as "ADMIN" | "STAFF" });
  const [resetTarget, setResetTarget] = useState<UserListItem | null>(null);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "STAFF" as "ADMIN" | "STAFF" });
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  function refresh() {
    return listUsers().then(setRows);
  }

  useEffect(() => {
    refresh();
  }, []);

  const filtered = useMemo(() => {
    if (!rows) return [];
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter((u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
  }, [rows, search]);

  const adminCount = rows?.filter((u) => u.role === "ADMIN").length ?? 0;
  const activeCount = rows?.filter((u) => u.active).length ?? 0;
  const disabledCount = (rows?.length ?? 0) - activeCount;

  async function handleCreate() {
    setError(null);
    try {
      await createUser(form);
      setCreateOpen(false);
      setForm({ name: "", email: "", password: "", role: "STAFF" });
      refresh();
    } catch (err) {
      setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Failed to create user");
    }
  }

  async function toggleActive(user: UserListItem) {
    await updateUser(user.id, { active: !user.active });
    refresh();
  }

  function openEdit(user: UserListItem) {
    setEditTarget(user);
    setEditForm({ name: user.name, email: user.email, role: user.role });
    setError(null);
  }

  async function handleEditSave() {
    if (!editTarget) return;
    setError(null);
    try {
      await updateUser(editTarget.id, editForm);
      setEditTarget(null);
      refresh();
    } catch (err) {
      setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Failed to update user");
    }
  }

  async function handleResetPassword() {
    if (!resetTarget) return;
    await resetPassword(resetTarget.id, newPassword);
    setResetTarget(null);
    setNewPassword("");
  }

  const columns: GridColDef<UserListItem>[] = [
    {
      field: "name",
      headerName: "Name",
      flex: 1,
      renderCell: (params) => (
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", height: "100%" }}>
          <Avatar sx={{ width: 28, height: 28, fontSize: 13, bgcolor: params.row.role === "ADMIN" ? "secondary.main" : "primary.main" }}>
            {initials(params.row.name)}
          </Avatar>
          <Typography variant="body2">
            {params.row.name}
            {params.row.id === currentUser?.id && (
              <Typography component="span" variant="caption" color="text.secondary">
                {" "}(you)
              </Typography>
            )}
          </Typography>
        </Stack>
      ),
    },
    { field: "email", headerName: "Email", flex: 1 },
    {
      field: "role",
      headerName: "Role",
      width: 110,
      renderCell: (params) => (
        <Chip label={params.value === "ADMIN" ? "Admin" : "Staff"} size="small" color={params.value === "ADMIN" ? "secondary" : "default"} variant={params.value === "ADMIN" ? "filled" : "outlined"} />
      ),
    },
    {
      field: "active",
      headerName: "Status",
      width: 130,
      renderCell: (params) => (
        <Chip
          label={params.value ? "Active" : "Disabled"}
          size="small"
          color={params.value ? "success" : "default"}
          onClick={params.row.id === currentUser?.id ? undefined : () => toggleActive(params.row)}
          sx={{ cursor: params.row.id === currentUser?.id ? "default" : "pointer" }}
        />
      ),
    },
    {
      field: "actions",
      headerName: "Actions",
      width: 110,
      sortable: false,
      renderCell: (params) => (
        <Stack direction="row" spacing={0.5}>
          <IconButton size="small" onClick={() => openEdit(params.row)} title="Edit user">
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" onClick={() => setResetTarget(params.row)} title="Reset password">
            <LockResetIcon fontSize="small" />
          </IconButton>
        </Stack>
      ),
    },
  ];

  if (!rows) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Stack direction="row" sx={{ mb: 2, justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 2 }}>
        <Typography variant="h5">Manage Users</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
          New Staff Account
        </Button>
      </Stack>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid size={{ xs: 6, sm: 3 }}>
          <KpiCard label="Total Users" value={rows.length} />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <KpiCard label="Admins" value={adminCount} />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <KpiCard label="Active" value={activeCount} />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <KpiCard label="Disabled" value={disabledCount} color={disabledCount > 0 ? "warning" : "default"} />
        </Grid>
      </Grid>

      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <TextField size="small" label="Search by name or email" value={search} onChange={(e) => setSearch(e.target.value)} sx={{ width: 280 }} />
      </Paper>

      <Box sx={{ height: 600 }}>
        <DataGrid rows={filtered} columns={columns} density="comfortable" />
      </Box>

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>New Staff Account</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Name" fullWidth value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <TextField label="Email" type="email" fullWidth value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <TextField
              label="Temporary Password"
              type="password"
              fullWidth
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              helperText="Minimum 8 characters"
            />
            <TextField select label="Role" fullWidth value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as "ADMIN" | "STAFF" })}>
              <MenuItem value="STAFF">Staff (view-only)</MenuItem>
              <MenuItem value="ADMIN">Admin (full access)</MenuItem>
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreate}>Create</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(editTarget)} onClose={() => setEditTarget(null)} fullWidth maxWidth="xs">
        <DialogTitle>Edit {editTarget?.name}</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Name" fullWidth value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
            <TextField label="Email" type="email" fullWidth value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
            <TextField
              select
              label="Role"
              fullWidth
              value={editForm.role}
              onChange={(e) => setEditForm({ ...editForm, role: e.target.value as "ADMIN" | "STAFF" })}
              disabled={editTarget?.id === currentUser?.id}
              helperText={editTarget?.id === currentUser?.id ? "You can't change your own role" : undefined}
            >
              <MenuItem value="STAFF">Staff (view-only)</MenuItem>
              <MenuItem value="ADMIN">Admin (full access)</MenuItem>
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditTarget(null)}>Cancel</Button>
          <Button variant="contained" onClick={handleEditSave}>Save</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(resetTarget)} onClose={() => setResetTarget(null)} fullWidth maxWidth="xs">
        <DialogTitle>Reset Password for {resetTarget?.name}</DialogTitle>
        <DialogContent>
          <TextField
            label="New Password"
            type="password"
            fullWidth
            sx={{ mt: 1 }}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            helperText="Minimum 8 characters"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResetTarget(null)}>Cancel</Button>
          <Button variant="contained" onClick={handleResetPassword} disabled={newPassword.length < 8}>Reset</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
