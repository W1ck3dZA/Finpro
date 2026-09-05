"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listClients = listClients;
exports.getClient = getClient;
const prisma_1 = require("../config/prisma");
function buildClientOrderBy(sortField, sortOrder) {
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
async function listClients(req, res) {
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(200, Math.max(1, Number(req.query.pageSize) || 25));
    const where = {};
    if (req.query.search)
        where.name = { contains: String(req.query.search) };
    if (req.query.jobManager)
        where.jobManager = String(req.query.jobManager);
    if (req.query.businessStructure)
        where.businessStructure = String(req.query.businessStructure);
    if (req.query.clientType)
        where.clientType = String(req.query.clientType);
    if (req.query.isStub !== undefined)
        where.isStub = req.query.isStub === "true";
    const sortOrder = req.query.sortOrder === "desc" ? "desc" : "asc";
    const orderBy = buildClientOrderBy(req.query.sortField ? String(req.query.sortField) : undefined, sortOrder);
    const [rows, total] = await Promise.all([
        prisma_1.prisma.client.findMany({ where, orderBy, skip: (page - 1) * pageSize, take: pageSize }),
        prisma_1.prisma.client.count({ where }),
    ]);
    res.json({ rows, total, page, pageSize });
}
async function getClient(req, res) {
    const id = Number(req.params.id);
    const client = await prisma_1.prisma.client.findUnique({
        where: { id },
        include: { jobs: { orderBy: { startDate: "desc" } } },
    });
    if (!client) {
        res.status(404).json({ error: "Client not found" });
        return;
    }
    res.json(client);
}
//# sourceMappingURL=clients.controller.js.map