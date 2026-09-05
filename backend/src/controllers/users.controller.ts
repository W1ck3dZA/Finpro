import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { hashPassword } from "../services/auth.service";

function serialize(user: { id: number; name: string; email: string; role: string; active: boolean; createdAt: Date }) {
  return { id: user.id, name: user.name, email: user.email, role: user.role, active: user.active, createdAt: user.createdAt };
}

export async function listUsers(_req: Request, res: Response) {
  const users = await prisma.user.findMany({ orderBy: { name: "asc" } });
  res.json(users.map(serialize));
}

const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["ADMIN", "STAFF"]).default("STAFF"),
});

export async function createUser(req: Request, res: Response) {
  const parsed = createUserSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Name, valid email, password (min 8 chars) and role are required" });
    return;
  }
  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) {
    res.status(409).json({ error: "A user with that email already exists" });
    return;
  }
  const passwordHash = await hashPassword(parsed.data.password);
  const user = await prisma.user.create({
    data: { name: parsed.data.name, email: parsed.data.email, passwordHash, role: parsed.data.role },
  });
  res.status(201).json(serialize(user));
}

const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  role: z.enum(["ADMIN", "STAFF"]).optional(),
  active: z.boolean().optional(),
});

export async function updateUser(req: Request, res: Response) {
  const id = Number(req.params.id);
  const parsed = updateUserSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid update payload" });
    return;
  }
  try {
    const user = await prisma.user.update({ where: { id }, data: parsed.data });
    res.json(serialize(user));
  } catch {
    res.status(404).json({ error: "User not found" });
  }
}

const resetPasswordSchema = z.object({ newPassword: z.string().min(8) });

export async function resetPassword(req: Request, res: Response) {
  const id = Number(req.params.id);
  const parsed = resetPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "newPassword (min 8 chars) is required" });
    return;
  }
  const passwordHash = await hashPassword(parsed.data.newPassword);
  try {
    await prisma.user.update({ where: { id }, data: { passwordHash } });
    res.json({ ok: true });
  } catch {
    res.status(404).json({ error: "User not found" });
  }
}
