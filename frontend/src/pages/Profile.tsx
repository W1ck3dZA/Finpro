import { useState } from "react";
import { Box, Typography, Paper, TextField, Button, Alert, Stack } from "@mui/material";
import { useAuth } from "../auth/AuthContext";
import { changePassword } from "../api/auth";

export function Profile() {
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    try {
      await changePassword(currentPassword, newPassword);
      setMessage({ type: "success", text: "Password updated successfully" });
      setCurrentPassword("");
      setNewPassword("");
    } catch {
      setMessage({ type: "error", text: "Current password is incorrect" });
    }
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom>Profile</Typography>
      <Paper variant="outlined" sx={{ p: 3, maxWidth: 400 }}>
        <Typography variant="subtitle1">{user?.name}</Typography>
        <Typography color="text.secondary" gutterBottom>{user?.email} · {user?.role}</Typography>

        <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>Change Password</Typography>
        <form onSubmit={handleSubmit}>
          <Stack spacing={2}>
            <TextField label="Current Password" type="password" required value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
            <TextField label="New Password" type="password" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} helperText="Minimum 8 characters" />
            {message && <Alert severity={message.type}>{message.text}</Alert>}
            <Button type="submit" variant="contained">Update Password</Button>
          </Stack>
        </form>
      </Paper>
    </Box>
  );
}
