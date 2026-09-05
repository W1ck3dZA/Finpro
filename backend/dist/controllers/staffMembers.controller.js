"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStaffMembers = getStaffMembers;
exports.updateStaffMember = updateStaffMember;
const zod_1 = require("zod");
const prisma_1 = require("../config/prisma");
const lookups_service_1 = require("../services/lookups.service");
async function getStaffMembers(_req, res) {
    const members = await (0, lookups_service_1.listStaffMembers)();
    res.json(members);
}
const updateSchema = zod_1.z.object({
    hourlyRate: zod_1.z.number().nonnegative().nullable().optional(),
    linkedUserId: zod_1.z.number().int().nullable().optional(),
});
async function updateStaffMember(req, res) {
    const id = Number(req.params.id);
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: "Invalid update payload" });
        return;
    }
    try {
        const member = await prisma_1.prisma.staffMember.update({ where: { id }, data: parsed.data });
        res.json(member);
    }
    catch {
        res.status(404).json({ error: "Staff member not found" });
    }
}
//# sourceMappingURL=staffMembers.controller.js.map