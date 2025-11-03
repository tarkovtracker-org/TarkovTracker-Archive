/**
 * Returns true when Vite dev auth flag is enabled.
 * Accepts boolean true or strings: '1', 'true', 'yes', 'on' (case-insensitive).
 */
export function isDevAuthEnabled(): boolean {
  const raw = import.meta.env.VITE_DEV_AUTH as unknown;
  if (typeof raw === 'boolean') return raw;
  if (typeof raw === 'string') {
    const v = raw.trim().toLowerCase();
    return v === '1' || v === 'true' || v === 'yes' || v === 'on';
  }
  return false;
}
