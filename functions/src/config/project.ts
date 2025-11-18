/**
 * Centralised resolver for the Firebase project ID so we avoid scattering
 * hard-coded values throughout the codebase. Consumers can override the
 * project via FIREBASE_PROJECT_ID (preferred) or fall back to the typical
 * Firebase/Google environment variables.
 */
export const getFirebaseProjectId = (): string => {
  return (
    process.env.FIREBASE_PROJECT_ID ??
    process.env.GCLOUD_PROJECT ??
    process.env.VITE_FIREBASE_PROJECT_ID ??
    'tarkovtracker-org'
  );
};
