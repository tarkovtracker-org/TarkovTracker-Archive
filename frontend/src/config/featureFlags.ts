/**
 * Feature Flags System
 *
 * Use this to toggle incomplete or experimental features on/off per environment.
 * This allows you to:
 * - Merge code to staging before it's production-ready
 * - Test features in specific environments
 * - Gradually roll out features
 * - Quickly disable problematic features
 *
 * ## Usage
 *
 * 1. Add your feature flag below with a clear description
 * 2. Use it in your components:
 *    ```ts
 *    import { featureFlags } from '@/config/featureFlags';
 *
 *    if (featureFlags.myNewFeature) {
 *      // New code path
 *    } else {
 *      // Old/fallback code path
 *    }
 *    ```
 *
 * 3. Control via environment variables in .env files:
 *    - `.env.local` - Your local development (not committed)
 *    - `.env.staging` - Staging environment
 *    - `.env.production` - Production environment
 *
 * ## Lifecycle
 *
 * When a feature is stable in production:
 * 1. Remove the flag check from code
 * 2. Remove the old/fallback code path
 * 3. Remove the flag from this file
 * 4. Remove the env var from .env files
 *
 * Don't let feature flags accumulate! Clean them up regularly.
 */

/**
 * Parse environment variable as boolean
 * Accepts: 'true', '1', 'yes' (case-insensitive) as true
 * Everything else (including undefined) as false
 */
function envBool(value: string | undefined): boolean {
  if (!value) return false;
  return ['true', '1', 'yes'].includes(value.toLowerCase());
}

export const featureFlags = {
  /**
   * Example: New API Documentation System
   *
   * When true: Uses new Scalar UI embedded in app
   * When false: Uses legacy static docs
   *
   * Env var: VITE_FEATURE_NEW_API_DOCS
   * Status: ✅ Completed - Remove this flag after next release
   */
  newApiDocs: envBool(import.meta.env.VITE_FEATURE_NEW_API_DOCS),

  /**
   * Example: Experimental Map Renderer
   *
   * When true: Uses new WebGL-based map renderer
   * When false: Uses existing SVG renderer
   *
   * Env var: VITE_FEATURE_WEBGL_MAPS
   * Status: 🚧 In Development
   */
  webGLMaps: envBool(import.meta.env.VITE_FEATURE_WEBGL_MAPS),

  /**
   * Advanced Team Analytics
   *
   * When true: Shows detailed team performance metrics
   * When false: Shows basic team progress only
   *
   * Env var: VITE_FEATURE_TEAM_ANALYTICS
   * Status: 📋 Planned
   */
  teamAnalytics: envBool(import.meta.env.VITE_FEATURE_TEAM_ANALYTICS),
} as const;

/**
 * Type-safe feature flag names
 */
export type FeatureFlagName = keyof typeof featureFlags;

/**
 * Check if a feature is enabled (alias for better readability)
 */
export function isFeatureEnabled(flag: FeatureFlagName): boolean {
  return featureFlags[flag];
}

/**
 * Get all enabled features (useful for debugging/logging)
 */
export function getEnabledFeatures(): FeatureFlagName[] {
  return (Object.keys(featureFlags) as FeatureFlagName[]).filter((key) => featureFlags[key]);
}

// Log enabled features in development
if (import.meta.env.DEV) {
  const enabled = getEnabledFeatures();
  if (enabled.length > 0) {
    console.log('🎌 Feature Flags Enabled:', enabled.join(', '));
  } else {
    console.log('🎌 Feature Flags: None enabled');
  }
}
