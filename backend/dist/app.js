"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const auth_routes_1 = require("./routes/auth.routes");
const users_routes_1 = require("./routes/users.routes");
const imports_routes_1 = require("./routes/imports.routes");
const clients_routes_1 = require("./routes/clients.routes");
const jobs_routes_1 = require("./routes/jobs.routes");
const timesheets_routes_1 = require("./routes/timesheets.routes");
const reports_routes_1 = require("./routes/reports.routes");
const staffMembers_routes_1 = require("./routes/staffMembers.routes");
const lookups_routes_1 = require("./routes/lookups.routes");
exports.app = (0, express_1.default)();
exports.app.use((0, cors_1.default)());
exports.app.use(express_1.default.json());
exports.app.get("/api/health", (_req, res) => res.json({ ok: true }));
exports.app.use("/api/auth", auth_routes_1.authRouter);
exports.app.use("/api/users", users_routes_1.usersRouter);
exports.app.use("/api/imports", imports_routes_1.importsRouter);
exports.app.use("/api/clients", clients_routes_1.clientsRouter);
exports.app.use("/api/jobs", jobs_routes_1.jobsRouter);
exports.app.use("/api/timesheets", timesheets_routes_1.timesheetsRouter);
exports.app.use("/api/reports", reports_routes_1.reportsRouter);
exports.app.use("/api/staff-members", staffMembers_routes_1.staffMembersRouter);
exports.app.use("/api", lookups_routes_1.lookupsRouter);
// eslint-disable-next-line @typescript-eslint/no-unused-vars
exports.app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ error: err.message || "Internal server error" });
});
//# sourceMappingURL=app.js.map