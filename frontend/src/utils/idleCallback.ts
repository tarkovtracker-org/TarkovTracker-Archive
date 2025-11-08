/**
 * Utility functions for idle callback feature detection and usage
 */

/**
 * Checks if the browser supports requestIdleCallback and cancelIdleCallback
 * @returns boolean indicating if idle callbacks are supported
 */
export function isIdleCallbackSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.requestIdleCallback === 'function' &&
    typeof window.cancelIdleCallback === 'function'
  );
}

/**
 * Safely requests an idle callback if supported
 * @param callback - The callback to run during idle time
 * @param options - Optional options for the idle callback
 * @returns handle if supported, null otherwise
 */
export function safeRequestIdleCallback(
  callback: IdleRequestCallback,
  options?: IdleRequestOptions
): number | null {
  if (isIdleCallbackSupported()) {
    return window.requestIdleCallback(callback, options);
  }
  return null;
}

/**
 * Safely cancels an idle callback if supported
 * @param handle - The handle returned by requestIdleCallback
 */
export function safeCancelIdleCallback(handle: number | null): void {
  if (handle !== null && isIdleCallbackSupported()) {
    window.cancelIdleCallback(handle);
  }
}