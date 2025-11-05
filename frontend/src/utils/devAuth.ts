/**
 * Returns true when Vite dev auth flag is enabled.
 * Accepts boolean true or strings: '1', 'true', 'yes', 'on' (case-insensitive).
 */
export function isDevAuthEnabled(): boolean {
  const raw = import.meta.env.VITE_DEV_AUTH as string | boolean | undefined;
  const normalized = typeof raw === 'string' ? raw.trim().toLowerCase() : (raw ?? false);
  if (typeof normalized === 'boolean') return normalized;
  if (typeof normalized === 'string') {
    const v = normalized;
    return v === '1' || v === 'true' || v === 'yes' || v === 'on';
  }
  return false;
}
