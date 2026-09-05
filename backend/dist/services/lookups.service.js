"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listStaffMembers = listStaffMembers;
exports.listJobManagers = listJobManagers;
exports.listStates = listStates;
const prisma_1 = require("../config/prisma");
/** Distinct filter-dropdown values are always read live from imported data, never hard-coded,
 * since these are free-text picklists in the source system that can gain new values over time. */
async function listStaffMembers() {
    return prisma_1.prisma.staffMember.findMany({ orderBy: { name: "asc" } });
}
async function listJobManagers() {
    const rows = await prisma_1.prisma.client.findMany({
        where: { jobManager: { not: null } },
        select: { jobManager: true },
        distinct: ["jobManager"],
    });
    return rows.map((r) => r.jobManager).filter(Boolean).sort();
}
async function listStates() {
    const rows = await prisma_1.prisma.job.findMany({ select: { state: true }, distinct: ["state"] });
    return rows.map((r) => r.state).sort();
}
//# sourceMappingURL=lookups.service.js.map