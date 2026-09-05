import { parse } from "csv-parse/sync";
import { Prisma } from "../generated/prisma/client";
import { prisma } from "../config/prisma";
import { detectCsvType, CsvImportType } from "../utils/csvDetect";
import { parseSourceDate } from "../utils/dateParse";
import { parseBudget } from "../utils/money";
import { parseDurationMinutes } from "../utils/duration";

const MAX_WARNINGS = 500;
const CHUNK_SIZE = 500;

export class UnrecognizedCsvError extends Error {
  constructor(public headers: string[]) {
    super("Unrecognized CSV format — the header row didn't match a Client, Job, or Time export.");
  }
}

export class EmptyCsvError extends Error {
  constructor() {
    super("The uploaded file has no data rows.");
  }
}

export interface ImportWarning {
  row: number;
  code: string;
  message: string;
  context?: Record<string, unknown>;
}

export interface ImportSummaryItem {
  code: string;
  label: string;
  count: number;
}

export interface ImportResult {
  importBatchId: number;
  type: CsvImportType;
  filename: string;
  status: "SUCCESS" | "PARTIAL" | "FAILED";
  rowsTotal: number;
  rowsInserted: number;
  rowsUpdated: number;
  rowsSkipped: number;
  summary: ImportSummaryItem[];
  warnings: ImportWarning[];
}

interface TypeImportResult {
  inserted: number;
  updated: number;
  skipped: number;
  warnings: ImportWarning[];
  summary: ImportSummaryItem[];
}

function parseYesNo(raw: string | undefined): boolean | null {
  const v = raw?.trim().toLowerCase();
  if (v === "yes") return true;
  if (v === "no") return false;
  return null;
}

function readHeaders(buffer: Buffer): string[] {
  const firstLine = parse(buffer, { bom: true, to: 1 }) as string[][];
  return firstLine[0] ?? [];
}

function parseRecords(buffer: Buffer): Record<string, string>[] {
  return parse(buffer, {
    bom: true,
    columns: true,
    trim: true,
    skip_empty_lines: true,
  }) as Record<string, string>[];
}

function makeWarningSink(warnings: ImportWarning[]) {
  const truncated = { count: 0 };
  return {
    push(w: ImportWarning) {
      if (warnings.length < MAX_WARNINGS) warnings.push(w);
      else truncated.count++;
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
async function importClients(records: Record<string, string>[]): Promise<TypeImportResult> {
  const warnings: ImportWarning[] = [];
  const sink = makeWarningSink(warnings);
  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  await prisma.$transaction(
    async (tx) => {
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
          cipcDate: parseSourceDate(row["[Client] CIPCDate"]),
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

        if (result.createdAt.getTime() === result.updatedAt.getTime()) inserted++;
        else updated++;
      }
    },
    { timeout: 60_000, maxWait: 15_000 },
  );

  sink.finalize();
  const summary: ImportSummaryItem[] = [];
  if (skipped > 0) {
    summary.push({
      code: "ROWS_SKIPPED",
      label: `${skipped} row(s) were skipped due to a missing client name`,
      count: skipped,
    });
  }

  return { inserted, updated, skipped, warnings, summary };
}

// ---------------------------------------------------------------------------
// Job import: hot path (~20k rows). Bulk-stub missing clients, then chunked
// raw upsert (INSERT ... ON DUPLICATE KEY UPDATE) instead of per-row Prisma
// upserts, which would take minutes at this volume.
// ---------------------------------------------------------------------------
interface ParsedJobRow {
  jobNo: string;
  clientName: string;
  name: string | null;
  startDate: Date | null;
  budget: number | null;
  state: string;
  completedDate: Date | null;
  actualTimeMinutes: number | null;
}

async function importJobs(records: Record<string, string>[]): Promise<TypeImportResult> {
  const warnings: ImportWarning[] = [];
  const sink = makeWarningSink(warnings);
  let skipped = 0;

  const existingClients = await prisma.client.findMany({ select: { id: true, name: true } });
  const clientMap = new Map(existingClients.map((c) => [c.name, c.id]));
  const existingJobNos = new Set((await prisma.job.findMany({ select: { jobNo: true } })).map((j) => j.jobNo));

  const parsedRows: ParsedJobRow[] = [];
  const missingClientNames = new Set<string>();

  records.forEach((row, i) => {
    const rowNum = i + 1;
    const jobNo = row["[Job] Job No."]?.trim();
    const clientName = row["[Client] Client"]?.trim();
    if (!jobNo || !clientName) {
      skipped++;
      sink.push({ row: rowNum, code: "MISSING_REQUIRED_FIELD", message: "Row skipped: missing Job No. or Client." });
      return;
    }
    if (!clientMap.has(clientName)) missingClientNames.add(clientName);
    parsedRows.push({
      jobNo,
      clientName,
      name: row["[Job] Name"]?.trim() || null,
      startDate: parseSourceDate(row["[Job] Start Date"]),
      budget: parseBudget(row["[Job] Budget"]),
      state: row["[State] State"]?.trim() || "Unknown",
      completedDate: parseSourceDate(row["[Job] Completed Date"]),
      actualTimeMinutes: parseDurationMinutes(row["[Job] Actual Time"]),
    });
  });

  const summary: ImportSummaryItem[] = [];

  if (missingClientNames.size > 0) {
    await prisma.client.createMany({
      data: [...missingClientNames].map((name) => ({ name, isStub: true })),
      skipDuplicates: true,
    });
    const refreshed = await prisma.client.findMany({
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
    if (existingJobNos.has(r.jobNo)) updated++;
    else inserted++;
  }

  await prisma.$transaction(
    async (tx) => {
      for (let i = 0; i < parsedRows.length; i += CHUNK_SIZE) {
        const chunk = parsedRows.slice(i, i + CHUNK_SIZE);
        const values = Prisma.join(
          chunk.map(
            (r) =>
              Prisma.sql`(${r.jobNo}, ${clientMap.get(r.clientName)}, ${r.name}, ${r.startDate}, ${r.budget}, ${r.state}, ${r.completedDate}, ${r.actualTimeMinutes}, false, NOW(3), NOW(3))`,
          ),
        );
        await tx.$executeRaw`
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
    },
    { timeout: 120_000, maxWait: 15_000 },
  );

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

// ---------------------------------------------------------------------------
// Time import -> Timesheet: no reliable natural key in the source data, so
// each upload fully replaces the Timesheet table (it's a full authoritative
// dump each time). Client/Job/StaffMember references auto-vivify.
// ---------------------------------------------------------------------------
interface ParsedTimeRow {
  clientName: string;
  jobNo: string;
  staffName: string;
  entryDate: Date;
  minutes: number;
  note: string | null;
}

async function importTimesheets(records: Record<string, string>[], importBatchId: number): Promise<TypeImportResult> {
  const warnings: ImportWarning[] = [];
  const sink = makeWarningSink(warnings);
  let skipped = 0;

  const clientMap = new Map((await prisma.client.findMany({ select: { id: true, name: true } })).map((c) => [c.name, c.id]));
  const jobMap = new Map((await prisma.job.findMany({ select: { id: true, jobNo: true } })).map((j) => [j.jobNo, j.id]));
  const staffMap = new Map((await prisma.staffMember.findMany({ select: { id: true, name: true } })).map((s) => [s.name, s.id]));

  const parsedRows: ParsedTimeRow[] = [];
  const missingClientNames = new Set<string>();
  const missingJobNos = new Map<string, string>(); // jobNo -> a client name to stub it with
  const newStaffNames = new Set<string>();

  records.forEach((row, i) => {
    const rowNum = i + 1;
    const clientName = row["[Job] Client"]?.trim();
    const jobNo = row["[Job] Job No."]?.trim();
    const staffName = row["[Staff] Name"]?.trim();
    const entryDate = parseSourceDate(row["[Time] Date"]);
    const minutes = parseDurationMinutes(row["[Time] Time"]);
    // Optional — older TIME exports don't have this column at all, and even in newer exports
    // individual rows are often left blank, so an empty/missing value is normal, not an error.
    const note = row["[Time] Note"]?.trim() || null;

    if (!clientName || !jobNo || !staffName || !entryDate || minutes === null) {
      skipped++;
      sink.push({ row: rowNum, code: "MISSING_REQUIRED_FIELD", message: "Row skipped: missing or unparseable client, job no., staff name, date, or duration." });
      return;
    }

    if (!clientMap.has(clientName)) missingClientNames.add(clientName);
    if (!jobMap.has(jobNo) && !missingJobNos.has(jobNo)) missingJobNos.set(jobNo, clientName);
    if (!staffMap.has(staffName)) newStaffNames.add(staffName);

    parsedRows.push({ clientName, jobNo, staffName, entryDate, minutes, note });
  });

  const summary: ImportSummaryItem[] = [];

  if (missingClientNames.size > 0) {
    await prisma.client.createMany({
      data: [...missingClientNames].map((name) => ({ name, isStub: true })),
      skipDuplicates: true,
    });
    const refreshed = await prisma.client.findMany({
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
        clientId: clientMap.get(clientName)!,
        state: "Unknown",
        isStub: true,
      }));
    await prisma.job.createMany({ data: stubJobsData, skipDuplicates: true });
    const refreshed = await prisma.job.findMany({
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
    await prisma.staffMember.createMany({
      data: [...newStaffNames].map((name) => ({ name })),
      skipDuplicates: true,
    });
    const refreshed = await prisma.staffMember.findMany({
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

  await prisma.$transaction(
    async (tx) => {
      await tx.timesheet.deleteMany({});
      for (let i = 0; i < resolvedRows.length; i += CHUNK_SIZE) {
        const chunk = resolvedRows.slice(i, i + CHUNK_SIZE);
        await tx.timesheet.createMany({
          data: chunk.map((r) => ({
            clientId: clientMap.get(r.clientName)!,
            jobId: jobMap.get(r.jobNo)!,
            staffMemberId: staffMap.get(r.staffName)!,
            entryDate: r.entryDate,
            minutes: r.minutes,
            note: r.note,
            importBatchId,
          })),
        });
      }
    },
    { timeout: 60_000, maxWait: 15_000 },
  );

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
export async function runImport(fileBuffer: Buffer, filename: string, uploadedById: number): Promise<ImportResult> {
  const headers = readHeaders(fileBuffer);
  const type = detectCsvType(headers);
  if (!type) throw new UnrecognizedCsvError(headers);

  const records = parseRecords(fileBuffer);
  if (records.length === 0) throw new EmptyCsvError();

  // Recorded up front (own insert, outside the type-specific transaction) so a failed import
  // still shows up in upload history rather than vanishing silently.
  const batch = await prisma.importBatch.create({
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
    let result: TypeImportResult;
    if (type === "CLIENT") result = await importClients(records);
    else if (type === "JOB") result = await importJobs(records);
    else result = await importTimesheets(records, batch.id);

    const status: ImportResult["status"] = result.warnings.length > 0 || result.skipped > 0 ? "PARTIAL" : "SUCCESS";

    await prisma.importBatch.update({
      where: { id: batch.id },
      data: {
        rowsInserted: result.inserted,
        rowsUpdated: result.updated,
        rowsSkipped: result.skipped,
        status,
        summary: result.summary as unknown as Prisma.InputJsonValue,
        warnings: result.warnings as unknown as Prisma.InputJsonValue,
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
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    await prisma.importBatch.update({
      where: { id: batch.id },
      data: {
        status: "FAILED",
        summary: [] as unknown as Prisma.InputJsonValue,
        warnings: [{ row: 0, code: "IMPORT_FAILED", message }] as unknown as Prisma.InputJsonValue,
      },
    });
    throw err;
  }
}
