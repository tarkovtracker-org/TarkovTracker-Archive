/**
 * Returns true when Vite dev auth flag is enabled.
 * Explicit parsing rules for test stability and predictable behavior.
 *
 * Disabled when raw is: undefined, null, false, empty string, "false", "0", "off", "no", "nil", "null"
 * Enabled for: "true", "1", "on", "yes"
 * Non-primitive types (object, array, function) → disabled
 */
export function isDevAuthEnabled(raw: unknown = undefined): boolean {
  // Always read from environment to avoid caching issues in tests
  if (raw === undefined) {
    raw = (import.meta as any)?.env?.VITE_DEV_AUTH;
  }

  // Handle null/undefined explicitly
  if (raw === undefined || raw === null) {
    return false;
  }

  // Handle boolean values directly
  if (typeof raw === 'boolean') {
    return raw;
  }

  // Handle string values with explicit parsing
  if (typeof raw === 'string') {
    const trimmed = raw.trim().toLowerCase();

    // Explicit false values
    if (
      trimmed === '' ||
      trimmed === 'false' ||
      trimmed === '0' ||
      trimmed === 'off' ||
      trimmed === 'no' ||
      trimmed === 'nil' ||
      trimmed === 'null'
    ) {
      return false;
    }

    // Explicit true values
    if (trimmed === 'true' || trimmed === '1' || trimmed === 'on' || trimmed === 'yes') {
      return true;
    }

    // All other string values default to false
    return false;
  }

  // Non-primitive types (object, array, function, etc.) → disabled
  return false;
}
