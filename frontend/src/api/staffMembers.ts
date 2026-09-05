import { api } from "./client";
import type { StaffMember } from "./types";

export async function listStaffMembers(): Promise<StaffMember[]> {
  const { data } = await api.get("/staff-members");
  return data;
}

export async function updateStaffMember(
  id: number,
  payload: Partial<{ hourlyRate: number | null; monthlyCtc: number | null; monthlyExpenses: number | null; linkedUserId: number | null }>,
): Promise<StaffMember> {
  const { data } = await api.patch(`/staff-members/${id}`, payload);
  return data;
}

export async function listJobManagers(): Promise<string[]> {
  const { data } = await api.get("/job-managers");
  return data;
}

export async function listStates(): Promise<string[]> {
  const { data } = await api.get("/states");
  return data;
}
