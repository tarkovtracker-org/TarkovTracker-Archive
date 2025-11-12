// Shared utilities for layout components
export interface ImageSources {
  fallback: string;
  webp?: string | null;
  avif?: string | null;
}
/**
 * Generates responsive image sources with fallback support
 */
export function createImageSources(sources: ImageSources) {
  const result: Record<string, string> = {
    src: sources.fallback,
  };
  if (sources.webp) {
    result.srcset = sources.webp;
  }
  if (sources.avif) {
    result['srcset-avif'] = sources.avif;
  }
  return result;
}
/**
 * Gets the appropriate image source based on format support
 */
export function getImageSource(
  sources: ImageSources,
  format: 'fallback' | 'webp' | 'avif' = 'fallback'
): string {
  if (format === 'webp' && sources.webp) {
    return sources.webp;
  }
  if (format === 'avif' && sources.avif) {
    return sources.avif;
  }
  return sources.fallback;
}
