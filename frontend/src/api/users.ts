import { api } from "./client";
import type { AuthUser } from "./types";

export interface UserListItem extends AuthUser {
  createdAt: string;
}

export async function listUsers(): Promise<UserListItem[]> {
  const { data } = await api.get("/users");
  return data;
}

export async function createUser(payload: { name: string; email: string; password: string; role: "ADMIN" | "STAFF" }): Promise<UserListItem> {
  const { data } = await api.post("/users", payload);
  return data;
}

export async function updateUser(id: number, payload: Partial<{ name: string; email: string; role: "ADMIN" | "STAFF"; active: boolean }>): Promise<UserListItem> {
  const { data } = await api.patch(`/users/${id}`, payload);
  return data;
}

export async function resetPassword(id: number, newPassword: string): Promise<void> {
  await api.post(`/users/${id}/reset-password`, { newPassword });
}
