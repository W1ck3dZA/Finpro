"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadImport = uploadImport;
exports.listImports = listImports;
exports.getImport = getImport;
const prisma_1 = require("../config/prisma");
const csvImport_service_1 = require("../services/csvImport.service");
async function uploadImport(req, res) {
    const file = req.file;
    if (!file) {
        res.status(400).json({ error: "No file uploaded (expected multipart field 'file')" });
        return;
    }
    try {
        const result = await (0, csvImport_service_1.runImport)(file.buffer, file.originalname, req.user.id);
        res.status(result.status === "FAILED" ? 422 : 200).json(result);
    }
    catch (err) {
        if (err instanceof csvImport_service_1.UnrecognizedCsvError) {
            res.status(400).json({ error: err.message, detectedHeaders: err.headers });
            return;
        }
        if (err instanceof csvImport_service_1.EmptyCsvError) {
            res.status(400).json({ error: err.message });
            return;
        }
        console.error("Import failed:", err);
        res.status(500).json({ error: "Import failed due to an unexpected error" });
    }
}
async function listImports(req, res) {
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 20));
    const [rows, total] = await Promise.all([
        prisma_1.prisma.importBatch.findMany({
            orderBy: { createdAt: "desc" },
            skip: (page - 1) * pageSize,
            take: pageSize,
            include: { uploadedBy: { select: { name: true } } },
        }),
        prisma_1.prisma.importBatch.count(),
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
async function getImport(req, res) {
    const id = Number(req.params.id);
    const batch = await prisma_1.prisma.importBatch.findUnique({ where: { id }, include: { uploadedBy: { select: { name: true } } } });
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
//# sourceMappingURL=imports.controller.js.map