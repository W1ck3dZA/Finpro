"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectCsvType = detectCsvType;
/**
 * Classifies an uploaded export by its header row, never by filename (uploaded files are
 * timestamp-prefixed, e.g. "20260821075611-Client - EXPORT.csv"). Checked in this order because
 * all three files share a "[Client]"/"[Job] Client" style column, so the check must key off the
 * columns that are unique to each file.
 */
function detectCsvType(headers) {
    const set = new Set(headers.map((h) => h.trim()));
    if (set.has("[State] State") && set.has("[Job] Budget"))
        return "JOB";
    if (set.has("[Time] Time") && set.has("[Staff] Name"))
        return "TIME";
    if (set.has("[Client] Business Structure"))
        return "CLIENT";
    return null;
}
//# sourceMappingURL=csvDetect.js.map