import { prisma } from "../config/prisma";

/** Distinct filter-dropdown values are always read live from imported data, never hard-coded,
 * since these are free-text picklists in the source system that can gain new values over time. */

export async function listStaffMembers() {
  return prisma.staffMember.findMany({ orderBy: { name: "asc" } });
}

export async function listJobManagers(): Promise<string[]> {
  const rows = await prisma.client.findMany({
    where: { jobManager: { not: null } },
    select: { jobManager: true },
    distinct: ["jobManager"],
  });
  return rows.map((r) => r.jobManager!).filter(Boolean).sort();
}

export async function listStates(): Promise<string[]> {
  const rows = await prisma.job.findMany({ select: { state: true }, distinct: ["state"] });
  return rows.map((r) => r.state).sort();
}
