import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";

dayjs.extend(customParseFormat);

const SOURCE_DATE_FORMAT = "DD-MMM-YYYY";

/** Parses the "DD-MMM-YYYY" date strings used throughout the Xero exports (e.g. "22-Aug-2003"). */
export function parseSourceDate(raw: string | null | undefined): Date | null {
  const value = raw?.trim();
  if (!value) return null;
  const parsed = dayjs(value, SOURCE_DATE_FORMAT, true);
  return parsed.isValid() ? parsed.toDate() : null;
}
