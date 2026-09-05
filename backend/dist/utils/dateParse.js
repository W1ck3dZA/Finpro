"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseSourceDate = parseSourceDate;
const dayjs_1 = __importDefault(require("dayjs"));
const customParseFormat_1 = __importDefault(require("dayjs/plugin/customParseFormat"));
dayjs_1.default.extend(customParseFormat_1.default);
const SOURCE_DATE_FORMAT = "DD-MMM-YYYY";
/** Parses the "DD-MMM-YYYY" date strings used throughout the Xero exports (e.g. "22-Aug-2003"). */
function parseSourceDate(raw) {
    const value = raw?.trim();
    if (!value)
        return null;
    const parsed = (0, dayjs_1.default)(value, SOURCE_DATE_FORMAT, true);
    return parsed.isValid() ? parsed.toDate() : null;
}
//# sourceMappingURL=dateParse.js.map