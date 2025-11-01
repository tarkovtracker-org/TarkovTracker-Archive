/**
 * Shared dev auth configuration
 * Used across stores and composables to check if dev auth mode is enabled
 */
export const isDevAuthEnabled = import.meta.env.DEV && import.meta.env.VITE_DEV_AUTH === 'true';
