import dayjs from "dayjs";

/** Formats a date as "DD/MM/YYYY" — the app's day/month/year display convention, rather than the
 * browser's locale default (`toLocaleDateString()` renders month/day/year first under en-US,
 * which is ambiguous/wrong for this app's users). Assumes a valid, non-null date; callers that
 * may have a null date handle that themselves, same convention as `formatMoney`. */
export function formatDate(value: string | Date): string {
  return dayjs(value).format("DD/MM/YYYY");
}

/** Formats a date and time as "DD/MM/YYYY HH:mm". */
export function formatDateTime(value: string | Date): string {
  return dayjs(value).format("DD/MM/YYYY HH:mm");
}
