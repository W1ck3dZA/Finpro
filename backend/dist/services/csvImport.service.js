"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmptyCsvError = exports.UnrecognizedCsvError = void 0;
exports.runImport = runImport;
const sync_1 = require("csv-parse/sync");
const client_1 = require("../generated/prisma/client");
const prisma_1 = require("../config/prisma");
const csvDetect_1 = require("../utils/csvDetect");
const dateParse_1 = require("../utils/dateParse");
const money_1 = require("../utils/money");
const duration_1 = require("../utils/duration");
const MAX_WARNINGS = 500;
const CHUNK_SIZE = 500;
class UnrecognizedCsvError extends Error {
    headers;
    constructor(headers) {
        super("Unrecognized CSV format — the header row didn't match a Client, Job, or Time export.");
        this.headers = headers;
    }
}
exports.UnrecognizedCsvError = UnrecognizedCsvError;
class EmptyCsvError extends Error {
    constructor() {
        super("The uploaded file has no data rows.");
    }
}
exports.EmptyCsvError = EmptyCsvError;
function parseYesNo(raw) {
    const v = raw?.trim().toLowerCase();
    if (v === "yes")
        return true;
    if (v === "no")
        return false;
    return null;
}
function readHeaders(buffer) {
    const firstLine = (0, sync_1.parse)(buffer, { bom: true, to: 1 });
    return firstLine[0] ?? [];
}
function parseRecords(buffer) {
    return (0, sync_1.parse)(buffer, {
        bom: true,
        columns: true,
        trim: true,
        skip_empty_lines: true,
    });
}
function makeWarningSink(warnings) {
    const truncated = { count: 0 };
    return {
        push(w) {
            if (warnings.length < MAX_WARNINGS)
                warnings.push(w);
            else
                truncated.count++;
        },
        finalize() {
            if (truncated.count > 0) {
                warnings.push({
                    row: 0,
                    code: "WARNINGS_TRUNCATED",
                    message: `${truncated.count} additional warning(s) were generated but not shown.`,
                });
            }
        },
    };
}
// ---------------------------------------------------------------------------
// Client import: small volume, natural-key upsert by name.
// ---------------------------------------------------------------------------
async function importClients(records) {
    const warnings = [];
    const sink = makeWarningSink(warnings);
    let inserted = 0;
    let updated = 0;
    let skipped = 0;
    await prisma_1.prisma.$transaction(async (tx) => {
        for (let i = 0; i < records.length; i++) {
            const row = records[i];
            const rowNum = i + 1;
            const name = row["[Client] Client"]?.trim();
            if (!name) {
                skipped++;
                sink.push({ row: rowNum, code: "MISSING_REQUIRED_FIELD", message: "Row skipped: missing client name." });
                continue;
            }
            const data = {
                businessStructure: row["[Client] Business Structure"]?.trim() || null,
                provisionalTaxpayer: parseYesNo(row["[Client] ProvisionalTaxpayer"]),
                firstName: row["[Client] First Name"]?.trim() || null,
                lastName: row["[Client] Last Name"]?.trim() || null,
                companyNumber: row["[Client] Company Number"]?.trim() || null,
                cipcDate: (0, dateParse_1.parseSourceDate)(row["[Client] CIPCDate"]),
                taxNumber: row["[Client] Tax Number"]?.trim() || null,
                email: row["[Client] Email"]?.trim() || null,
                phone: row["[Client] Phone"]?.trim() || null,
                country: row["[Client] Country"]?.trim() || null,
                address: row["[Client] Address"]?.trim() || null,
                payrollClient: parseYesNo(row["[Client] Payroll Client"]),
                cashbook: parseYesNo(row["[Client] Cashbook"]),
                vatSubmission: parseYesNo(row["[Client] VAT Submission"]),
                jobManager: row["[Client] Job Manager"]?.trim() || null,
                clientType: row["[Client] Type"]?.trim() || null,
                isStub: false,
            };
            const result = await tx.client.upsert({
                where: { name },
                create: { name, ...data },
                update: data,
            });
            if (result.createdAt.getTime() === result.updatedAt.getTime())
                inserted++;
            else
                updated++;
        }
    }, { timeout: 60_000, maxWait: 15_000 });
    sink.finalize();
    const summary = [];
    if (skipped > 0) {
        summary.push({
            code: "ROWS_SKIPPED",
            label: `${skipped} row(s) were skipped due to a missing client name`,
            count: skipped,
        });
    }
    return { inserted, updated, skipped, warnings, summary };
}
async function importJobs(records) {
    const warnings = [];
    const sink = makeWarningSink(warnings);
    let skipped = 0;
    const existingClients = await prisma_1.prisma.client.findMany({ select: { id: true, name: true } });
    const clientMap = new Map(existingClients.map((c) => [c.name, c.id]));
    const existingJobNos = new Set((await prisma_1.prisma.job.findMany({ select: { jobNo: true } })).map((j) => j.jobNo));
    const parsedRows = [];
    const missingClientNames = new Set();
    records.forEach((row, i) => {
        const rowNum = i + 1;
        const jobNo = row["[Job] Job No."]?.trim();
        const clientName = row["[Client] Client"]?.trim();
        if (!jobNo || !clientName) {
            skipped++;
            sink.push({ row: rowNum, code: "MISSING_REQUIRED_FIELD", message: "Row skipped: missing Job No. or Client." });
            return;
        }
        if (!clientMap.has(clientName))
            missingClientNames.add(clientName);
        parsedRows.push({
            jobNo,
            clientName,
            name: row["[Job] Name"]?.trim() || null,
            startDate: (0, dateParse_1.parseSourceDate)(row["[Job] Start Date"]),
            budget: (0, money_1.parseBudget)(row["[Job] Budget"]),
            state: row["[State] State"]?.trim() || "Unknown",
            completedDate: (0, dateParse_1.parseSourceDate)(row["[Job] Completed Date"]),
            actualTimeMinutes: (0, duration_1.parseDurationMinutes)(row["[Job] Actual Time"]),
        });
    });
    const summary = [];
    if (missingClientNames.size > 0) {
        await prisma_1.prisma.client.createMany({
            data: [...missingClientNames].map((name) => ({ name, isStub: true })),
            skipDuplicates: true,
        });
        const refreshed = await prisma_1.prisma.client.findMany({
            where: { name: { in: [...missingClientNames] } },
            select: { id: true, name: true },
        });
        refreshed.forEach((c) => clientMap.set(c.name, c.id));
        summary.push({
            code: "CLIENTS_STUBBED",
            label: `${missingClientNames.size} client(s) referenced in this file didn't exist yet — placeholder client records were created. Review them on the Clients page.`,
            count: missingClientNames.size,
        });
        sink.push({
            row: 0,
            code: "CLIENTS_STUBBED",
            message: `Placeholder clients created: ${[...missingClientNames].slice(0, 20).join(", ")}${missingClientNames.size > 20 ? ", ..." : ""}`,
        });
    }
    let inserted = 0;
    let updated = 0;
    for (const r of parsedRows) {
        if (existingJobNos.has(r.jobNo))
            updated++;
        else
            inserted++;
    }
    await prisma_1.prisma.$transaction(async (tx) => {
        for (let i = 0; i < parsedRows.length; i += CHUNK_SIZE) {
            const chunk = parsedRows.slice(i, i + CHUNK_SIZE);
            const values = client_1.Prisma.join(chunk.map((r) => client_1.Prisma.sql `(${r.jobNo}, ${clientMap.get(r.clientName)}, ${r.name}, ${r.startDate}, ${r.budget}, ${r.state}, ${r.completedDate}, ${r.actualTimeMinutes}, false, NOW(3), NOW(3))`));
            await tx.$executeRaw `
          INSERT INTO \`Job\` (\`jobNo\`, \`clientId\`, \`name\`, \`startDate\`, \`budget\`, \`state\`, \`completedDate\`, \`actualTimeMinutes\`, \`isStub\`, \`createdAt\`, \`updatedAt\`)
          VALUES ${values}
          ON DUPLICATE KEY UPDATE
            \`clientId\` = VALUES(\`clientId\`),
            \`name\` = VALUES(\`name\`),
            \`startDate\` = VALUES(\`startDate\`),
            \`budget\` = VALUES(\`budget\`),
            \`state\` = VALUES(\`state\`),
            \`completedDate\` = VALUES(\`completedDate\`),
            \`actualTimeMinutes\` = VALUES(\`actualTimeMinutes\`),
            \`isStub\` = false,
            \`updatedAt\` = VALUES(\`updatedAt\`)
        `;
        }
    }, { timeout: 120_000, maxWait: 15_000 });
    sink.finalize();
    if (skipped > 0) {
        summary.push({
            code: "ROWS_SKIPPED",
            label: `${skipped} row(s) were skipped due to a missing Job No. or Client`,
            count: skipped,
        });
    }
    return { inserted, updated, skipped, warnings, summary };
}
async function importTimesheets(records, importBatchId) {
    const warnings = [];
    const sink = makeWarningSink(warnings);
    let skipped = 0;
    const clientMap = new Map((await prisma_1.prisma.client.findMany({ select: { id: true, name: true } })).map((c) => [c.name, c.id]));
    const jobMap = new Map((await prisma_1.prisma.job.findMany({ select: { id: true, jobNo: true } })).map((j) => [j.jobNo, j.id]));
    const staffMap = new Map((await prisma_1.prisma.staffMember.findMany({ select: { id: true, name: true } })).map((s) => [s.name, s.id]));
    const parsedRows = [];
    const missingClientNames = new Set();
    const missingJobNos = new Map(); // jobNo -> a client name to stub it with
    const newStaffNames = new Set();
    records.forEach((row, i) => {
        const rowNum = i + 1;
        const clientName = row["[Job] Client"]?.trim();
        const jobNo = row["[Job] Job No."]?.trim();
        const staffName = row["[Staff] Name"]?.trim();
        const entryDate = (0, dateParse_1.parseSourceDate)(row["[Time] Date"]);
        const minutes = (0, duration_1.parseDurationMinutes)(row["[Time] Time"]);
        if (!clientName || !jobNo || !staffName || !entryDate || minutes === null) {
            skipped++;
            sink.push({ row: rowNum, code: "MISSING_REQUIRED_FIELD", message: "Row skipped: missing or unparseable client, job no., staff name, date, or duration." });
            return;
        }
        if (!clientMap.has(clientName))
            missingClientNames.add(clientName);
        if (!jobMap.has(jobNo) && !missingJobNos.has(jobNo))
            missingJobNos.set(jobNo, clientName);
        if (!staffMap.has(staffName))
            newStaffNames.add(staffName);
        parsedRows.push({ clientName, jobNo, staffName, entryDate, minutes });
    });
    const summary = [];
    if (missingClientNames.size > 0) {
        await prisma_1.prisma.client.createMany({
            data: [...missingClientNames].map((name) => ({ name, isStub: true })),
            skipDuplicates: true,
        });
        const refreshed = await prisma_1.prisma.client.findMany({
            where: { name: { in: [...missingClientNames] } },
            select: { id: true, name: true },
        });
        refreshed.forEach((c) => clientMap.set(c.name, c.id));
        summary.push({
            code: "CLIENTS_STUBBED",
            label: `${missingClientNames.size} client(s) referenced in this file didn't exist yet — placeholder client records were created.`,
            count: missingClientNames.size,
        });
    }
    if (missingJobNos.size > 0) {
        const stubJobsData = [...missingJobNos.entries()]
            .filter(([, clientName]) => clientMap.has(clientName))
            .map(([jobNo, clientName]) => ({
            jobNo,
            clientId: clientMap.get(clientName),
            state: "Unknown",
            isStub: true,
        }));
        await prisma_1.prisma.job.createMany({ data: stubJobsData, skipDuplicates: true });
        const refreshed = await prisma_1.prisma.job.findMany({
            where: { jobNo: { in: [...missingJobNos.keys()] } },
            select: { id: true, jobNo: true },
        });
        refreshed.forEach((j) => jobMap.set(j.jobNo, j.id));
        summary.push({
            code: "JOBS_STUBBED",
            label: `${missingJobNos.size} timesheet entries referenced a Job No. that doesn't exist yet — placeholder job records were created. Review them on the Jobs page.`,
            count: missingJobNos.size,
        });
    }
    if (newStaffNames.size > 0) {
        await prisma_1.prisma.staffMember.createMany({
            data: [...newStaffNames].map((name) => ({ name })),
            skipDuplicates: true,
        });
        const refreshed = await prisma_1.prisma.staffMember.findMany({
            where: { name: { in: [...newStaffNames] } },
            select: { id: true, name: true },
        });
        refreshed.forEach((s) => staffMap.set(s.name, s.id));
        const names = [...newStaffNames].slice(0, 10).join(", ") + (newStaffNames.size > 10 ? ", ..." : "");
        summary.push({
            code: "STAFF_CREATED",
            label: `${newStaffNames.size} new staff member(s) were added from this file (${names}). Set their hourly rate on the Staff Rates page so cost reports are accurate.`,
            count: newStaffNames.size,
        });
    }
    // Rows whose job/client reference still couldn't be resolved (e.g. a stub job's client was
    // itself unresolvable) are skipped rather than inserted with a broken FK.
    const resolvedRows = parsedRows.filter((r) => clientMap.has(r.clientName) && jobMap.has(r.jobNo) && staffMap.has(r.staffName));
    const unresolved = parsedRows.length - resolvedRows.length;
    if (unresolved > 0) {
        skipped += unresolved;
        sink.push({ row: 0, code: "UNRESOLVED_REFERENCE", message: `${unresolved} row(s) could not be linked to a client/job/staff member and were skipped.` });
    }
    await prisma_1.prisma.$transaction(async (tx) => {
        await tx.timesheet.deleteMany({});
        for (let i = 0; i < resolvedRows.length; i += CHUNK_SIZE) {
            const chunk = resolvedRows.slice(i, i + CHUNK_SIZE);
            await tx.timesheet.createMany({
                data: chunk.map((r) => ({
                    clientId: clientMap.get(r.clientName),
                    jobId: jobMap.get(r.jobNo),
                    staffMemberId: staffMap.get(r.staffName),
                    entryDate: r.entryDate,
                    minutes: r.minutes,
                    importBatchId,
                })),
            });
        }
    }, { timeout: 60_000, maxWait: 15_000 });
    sink.finalize();
    if (skipped > 0) {
        summary.push({
            code: "ROWS_SKIPPED",
            label: `${skipped} row(s) were skipped due to missing/unparseable data`,
            count: skipped,
        });
    }
    return { inserted: resolvedRows.length, updated: 0, skipped, warnings, summary };
}
// ---------------------------------------------------------------------------
// Orchestration
// ---------------------------------------------------------------------------
async function runImport(fileBuffer, filename, uploadedById) {
    const headers = readHeaders(fileBuffer);
    const type = (0, csvDetect_1.detectCsvType)(headers);
    if (!type)
        throw new UnrecognizedCsvError(headers);
    const records = parseRecords(fileBuffer);
    if (records.length === 0)
        throw new EmptyCsvError();
    // Recorded up front (own insert, outside the type-specific transaction) so a failed import
    // still shows up in upload history rather than vanishing silently.
    const batch = await prisma_1.prisma.importBatch.create({
        data: {
            type,
            filename,
            uploadedById,
            rowsTotal: records.length,
            rowsInserted: 0,
            rowsUpdated: 0,
            rowsSkipped: 0,
            status: "PARTIAL",
            summary: [],
            warnings: [],
        },
    });
    try {
        let result;
        if (type === "CLIENT")
            result = await importClients(records);
        else if (type === "JOB")
            result = await importJobs(records);
        else
            result = await importTimesheets(records, batch.id);
        const status = result.warnings.length > 0 || result.skipped > 0 ? "PARTIAL" : "SUCCESS";
        await prisma_1.prisma.importBatch.update({
            where: { id: batch.id },
            data: {
                rowsInserted: result.inserted,
                rowsUpdated: result.updated,
                rowsSkipped: result.skipped,
                status,
                summary: result.summary,
                warnings: result.warnings,
            },
        });
        return {
            importBatchId: batch.id,
            type,
            filename,
            status,
            rowsTotal: records.length,
            rowsInserted: result.inserted,
            rowsUpdated: result.updated,
            rowsSkipped: result.skipped,
            summary: result.summary,
            warnings: result.warnings,
        };
    }
    catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        await prisma_1.prisma.importBatch.update({
            where: { id: batch.id },
            data: {
                status: "FAILED",
                summary: [],
                warnings: [{ row: 0, code: "IMPORT_FAILED", message }],
            },
        });
        throw err;
    }
}
//# sourceMappingURL=csvImport.service.js.map