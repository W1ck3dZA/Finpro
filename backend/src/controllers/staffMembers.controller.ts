import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { listStaffMembers } from "../services/lookups.service";

export async function getStaffMembers(_req: Request, res: Response) {
  const members = await listStaffMembers();
  res.json(members);
}

const updateSchema = z.object({
  hourlyRate: z.number().nonnegative().nullable().optional(),
  monthlyCtc: z.number().nonnegative().nullable().optional(),
  monthlyExpenses: z.number().nonnegative().nullable().optional(),
  linkedUserId: z.number().int().nullable().optional(),
});

export async function updateStaffMember(req: Request, res: Response) {
  const id = Number(req.params.id);
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid update payload" });
    return;
  }
  try {
    const member = await prisma.staffMember.update({ where: { id }, data: parsed.data });
    res.json(member);
  } catch {
    res.status(404).json({ error: "Staff member not found" });
  }
}
