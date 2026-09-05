"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseDurationMinutes = parseDurationMinutes;
const DURATION_PATTERN = /^(\d+):(\d{2})$/;
/** Parses "H:MM" duration strings (e.g. "0:15", "120:30") into total minutes. */
function parseDurationMinutes(raw) {
    const value = raw?.trim();
    if (!value)
        return null;
    const match = DURATION_PATTERN.exec(value);
    if (!match)
        return null;
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    return hours * 60 + minutes;
}
//# sourceMappingURL=duration.js.map