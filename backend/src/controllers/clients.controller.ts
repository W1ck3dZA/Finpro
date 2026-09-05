import { Request, Response } from "express";
import { Prisma } from "../generated/prisma/client";
import { prisma } from "../config/prisma";

function buildClientOrderBy(sortField: string | undefined, sortOrder: "asc" | "desc"): Prisma.ClientOrderByWithRelationInput {
  switch (sortField) {
    case "businessStructure":
      return { businessStructure: sortOrder };
    case "clientType":
      return { clientType: sortOrder };
    case "jobManager":
      return { jobManager: sortOrder };
    case "email":
      return { email: sortOrder };
    case "isStub":
      return { isStub: sortOrder };
    case "name":
      return { name: sortOrder };
    default:
      return { name: "asc" };
  }
}

// Export mode returns every row matching the current filters (not just one page) so a CSV
// export always reflects the full filtered result set, capped well above real data volumes
// as a safety net against a runaway query rather than a limit anyone should ever hit.
const EXPORT_ROW_CAP = 50_000;

export async function listClients(req: Request, res: Response) {
  const isExport = req.query.export === "true";
  const page = isExport ? 1 : Math.max(1, Number(req.query.page) || 1);
  const pageSize = isExport ? EXPORT_ROW_CAP : Math.min(200, Math.max(1, Number(req.query.pageSize) || 25));

  const where: Prisma.ClientWhereInput = {};
  if (req.query.search) where.name = { contains: String(req.query.search) };
  if (req.query.jobManager) where.jobManager = String(req.query.jobManager);
  if (req.query.businessStructure) where.businessStructure = String(req.query.businessStructure);
  if (req.query.clientType) where.clientType = String(req.query.clientType);
  if (req.query.isStub !== undefined) where.isStub = req.query.isStub === "true";

  const sortOrder = req.query.sortOrder === "desc" ? "desc" : "asc";
  const orderBy = buildClientOrderBy(req.query.sortField ? String(req.query.sortField) : undefined, sortOrder);

  const [rows, total] = await Promise.all([
    prisma.client.findMany({ where, orderBy, skip: (page - 1) * pageSize, take: pageSize }),
    prisma.client.count({ where }),
  ]);

  res.json({ rows, total, page, pageSize });
}

export async function getClient(req: Request, res: Response) {
  const id = Number(req.params.id);
  const client = await prisma.client.findUnique({
    where: { id },
    include: { jobs: { orderBy: { startDate: "desc" } } },
  });
  if (!client) {
    res.status(404).json({ error: "Client not found" });
    return;
  }
  res.json(client);
}
