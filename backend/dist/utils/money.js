"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseBudget = parseBudget;
/**
 * Parses budget/money strings from the Job Report export. ~22% of real budget values contain
 * thousands-separator commas (e.g. "1,400.00") — Number("1,400.00") silently truncates to 1,
 * so commas must be stripped before numeric parsing.
 */
function parseBudget(raw) {
    const value = raw?.trim();
    if (!value)
        return null;
    const cleaned = value.replace(/,/g, "");
    const num = Number(cleaned);
    return Number.isFinite(num) ? num : null;
}
//# sourceMappingURL=money.js.map