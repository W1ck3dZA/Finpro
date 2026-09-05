/** Formats an amount as "R 1,234.00". Deliberately not `Intl.NumberFormat`'s `currency` style —
 * that renders as "ZAR 1,234.00" under most locales (only en-ZA shows the "R" symbol), so the
 * "R" prefix is applied manually here to guarantee it regardless of the browser's locale. */
export function formatMoney(n: number, opts?: { decimals?: number }): string {
  const decimals = opts?.decimals ?? 2;
  const formatted = n.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return `R ${formatted}`;
}
