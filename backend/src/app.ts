import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import { authRouter } from "./routes/auth.routes";
import { usersRouter } from "./routes/users.routes";
import { importsRouter } from "./routes/imports.routes";
import { clientsRouter } from "./routes/clients.routes";
import { jobsRouter } from "./routes/jobs.routes";
import { timesheetsRouter } from "./routes/timesheets.routes";
import { reportsRouter } from "./routes/reports.routes";
import { staffMembersRouter } from "./routes/staffMembers.routes";
import { lookupsRouter } from "./routes/lookups.routes";

export const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);
app.use("/api/imports", importsRouter);
app.use("/api/clients", clientsRouter);
app.use("/api/jobs", jobsRouter);
app.use("/api/timesheets", timesheetsRouter);
app.use("/api/reports", reportsRouter);
app.use("/api/staff-members", staffMembersRouter);
app.use("/api", lookupsRouter);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: err.message || "Internal server error" });
});
