"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = login;
exports.me = me;
exports.changePassword = changePassword;
const zod_1 = require("zod");
const prisma_1 = require("../config/prisma");
const auth_service_1 = require("../services/auth.service");
const loginSchema = zod_1.z.object({ email: zod_1.z.string().email(), password: zod_1.z.string().min(1) });
async function login(req, res) {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: "Email and password are required" });
        return;
    }
    const user = await (0, auth_service_1.verifyLogin)(parsed.data.email, parsed.data.password);
    if (!user) {
        res.status(401).json({ error: "Invalid email or password" });
        return;
    }
    const token = (0, auth_service_1.issueToken)(user);
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
}
async function me(req, res) {
    const user = await prisma_1.prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
    }
    res.json({ id: user.id, name: user.name, email: user.email, role: user.role, active: user.active });
}
const changePasswordSchema = zod_1.z.object({
    currentPassword: zod_1.z.string().min(1),
    newPassword: zod_1.z.string().min(8),
});
async function changePassword(req, res) {
    const parsed = changePasswordSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: "A current password and a new password (min 8 chars) are required" });
        return;
    }
    const user = await prisma_1.prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
    }
    const valid = await (0, auth_service_1.verifyPassword)(parsed.data.currentPassword, user.passwordHash);
    if (!valid) {
        res.status(401).json({ error: "Current password is incorrect" });
        return;
    }
    await (0, auth_service_1.updatePassword)(user.id, parsed.data.newPassword);
    res.json({ ok: true });
}
//# sourceMappingURL=auth.controller.js.map