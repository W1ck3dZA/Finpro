import { api } from "./client";
import type { AuthUser } from "./types";

export async function login(email: string, password: string): Promise<{ token: string; user: AuthUser }> {
  const { data } = await api.post("/auth/login", { email, password });
  return data;
}

export async function fetchMe(): Promise<AuthUser> {
  const { data } = await api.get("/auth/me");
  return data;
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  await api.post("/auth/change-password", { currentPassword, newPassword });
}
