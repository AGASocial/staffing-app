/**
 * Shift option values stored in DB. Labels come from i18n: shiftOptions.<key>
 */
export const SHIFT_OPTION_KEYS = [
  "1st_shift",
  "2nd_shift",
  "3rd_shift",
  "weekend_shift",
  "split_shift",
  "on_call",
  "rotating_shift",
  "flexible_shift",
] as const;

export type ShiftOptionKey = (typeof SHIFT_OPTION_KEYS)[number];

export function isShiftOptionKey(value: string | null | undefined): value is ShiftOptionKey {
  return value != null && (SHIFT_OPTION_KEYS as readonly string[]).includes(value);
}
