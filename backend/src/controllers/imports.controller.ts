import { Request, Response } from "express";
import { prisma } from "../config/prisma";
import { runImport, UnrecognizedCsvError, EmptyCsvError } from "../services/csvImport.service";

export async function uploadImport(req: Request, res: Response) {
  const file = req.file;
  if (!file) {
    res.status(400).json({ error: "No file uploaded (expected multipart field 'file')" });
    return;
  }

  try {
    const result = await runImport(file.buffer, file.originalname, req.user!.id);
    res.status(result.status === "FAILED" ? 422 : 200).json(result);
  } catch (err) {
    if (err instanceof UnrecognizedCsvError) {
      res.status(400).json({ error: err.message, detectedHeaders: err.headers });
      return;
    }
    if (err instanceof EmptyCsvError) {
      res.status(400).json({ error: err.message });
      return;
    }
    console.error("Import failed:", err);
    res.status(500).json({ error: "Import failed due to an unexpected error" });
  }
}

export async function listImports(req: Request, res: Response) {
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 20));

  const [rows, total] = await Promise.all([
    prisma.importBatch.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { uploadedBy: { select: { name: true } } },
    }),
    prisma.importBatch.count(),
  ]);

  res.json({
    rows: rows.map((r) => ({
      id: r.id,
      type: r.type,
      filename: r.filename,
      uploadedBy: r.uploadedBy.name,
      rowsTotal: r.rowsTotal,
      rowsInserted: r.rowsInserted,
      rowsUpdated: r.rowsUpdated,
      rowsSkipped: r.rowsSkipped,
      status: r.status,
      summary: r.summary,
      createdAt: r.createdAt,
    })),
    total,
    page,
    pageSize,
  });
}

export async function getImport(req: Request, res: Response) {
  const id = Number(req.params.id);
  const batch = await prisma.importBatch.findUnique({ where: { id }, include: { uploadedBy: { select: { name: true } } } });
  if (!batch) {
    res.status(404).json({ error: "Import batch not found" });
    return;
  }
  res.json({
    id: batch.id,
    type: batch.type,
    filename: batch.filename,
    uploadedBy: batch.uploadedBy.name,
    rowsTotal: batch.rowsTotal,
    rowsInserted: batch.rowsInserted,
    rowsUpdated: batch.rowsUpdated,
    rowsSkipped: batch.rowsSkipped,
    status: batch.status,
    summary: batch.summary,
    warnings: batch.warnings,
    createdAt: batch.createdAt,
  });
}
