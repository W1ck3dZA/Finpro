"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listUsers = listUsers;
exports.createUser = createUser;
exports.updateUser = updateUser;
exports.resetPassword = resetPassword;
const zod_1 = require("zod");
const prisma_1 = require("../config/prisma");
const auth_service_1 = require("../services/auth.service");
function serialize(user) {
    return { id: user.id, name: user.name, email: user.email, role: user.role, active: user.active, createdAt: user.createdAt };
}
async function listUsers(_req, res) {
    const users = await prisma_1.prisma.user.findMany({ orderBy: { name: "asc" } });
    res.json(users.map(serialize));
}
const createUserSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(8),
    role: zod_1.z.enum(["ADMIN", "STAFF"]).default("STAFF"),
});
async function createUser(req, res) {
    const parsed = createUserSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: "Name, valid email, password (min 8 chars) and role are required" });
        return;
    }
    const existing = await prisma_1.prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (existing) {
        res.status(409).json({ error: "A user with that email already exists" });
        return;
    }
    const passwordHash = await (0, auth_service_1.hashPassword)(parsed.data.password);
    const user = await prisma_1.prisma.user.create({
        data: { name: parsed.data.name, email: parsed.data.email, passwordHash, role: parsed.data.role },
    });
    res.status(201).json(serialize(user));
}
const updateUserSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).optional(),
    email: zod_1.z.string().email().optional(),
    role: zod_1.z.enum(["ADMIN", "STAFF"]).optional(),
    active: zod_1.z.boolean().optional(),
});
async function updateUser(req, res) {
    const id = Number(req.params.id);
    const parsed = updateUserSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: "Invalid update payload" });
        return;
    }
    try {
        const user = await prisma_1.prisma.user.update({ where: { id }, data: parsed.data });
        res.json(serialize(user));
    }
    catch {
        res.status(404).json({ error: "User not found" });
    }
}
const resetPasswordSchema = zod_1.z.object({ newPassword: zod_1.z.string().min(8) });
async function resetPassword(req, res) {
    const id = Number(req.params.id);
    const parsed = resetPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: "newPassword (min 8 chars) is required" });
        return;
    }
    const passwordHash = await (0, auth_service_1.hashPassword)(parsed.data.newPassword);
    try {
        await prisma_1.prisma.user.update({ where: { id }, data: { passwordHash } });
        res.json({ ok: true });
    }
    catch {
        res.status(404).json({ error: "User not found" });
    }
}
//# sourceMappingURL=users.controller.js.map