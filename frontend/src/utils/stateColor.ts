export type ChipColor = "success" | "warning" | "error" | "info" | "default";

/** Job/client states are a free-text picklist in the source system (new values can appear in
 * future exports), so this maps by keyword rather than an exhaustive switch. */
export function stateColor(state: string): ChipColor {
  const s = state.toLowerCase();
  if (s.includes("cancel")) return "default";
  if (s.includes("invoiced") || s.includes("completed")) return "success";
  if (s.includes("hold") || s.includes("awaiting") || s.includes("no client") || s.includes("documents requested") || s.includes("objection")) return "warning";
  return "info";
}
