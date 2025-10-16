import { computed, getCurrentInstance } from 'vue';
import { useI18n } from 'vue-i18n';
import { logger } from '@/utils/logger';

// Global flag to track i18n readiness
let i18nReady = false;

/**
 * Mark i18n as ready (called from main.ts after setup)
 */
export function markI18nReady() {
  i18nReady = true;
}

/**
 * Safely gets the current locale from i18n, falling back to 'en' if not in component context
 */
export function useSafeLocale() {
  const instance = getCurrentInstance();

  if (instance && i18nReady) {
    try {
      // Use useI18n with explicit global scope to avoid parent scope warnings
      const { locale } = useI18n({
        useScope: 'global',
        inheritLocale: true,
      });
      return computed(() => locale.value);
    } catch (error) {
      logger.warn('[useSafeLocale] Could not access i18n context:', error);
    }
  }

  // Fallback to browser language or English if not in component context or i18n not ready
  const browserLang = getBrowserLanguage();
  return computed(() => browserLang);
}

/**
 * Extracts language code from locale, falling back to 'en'
 */
export function extractLanguageCode(locale: string, availableLanguages: string[] = ['en']): string {
  const browserLocale = locale.split(/[-_]/)[0];
  return availableLanguages.includes(browserLocale) ? browserLocale : 'en';
}

/**
 * Gets the browser's language preference as a fallback
 */
export function getBrowserLanguage(): string {
  return navigator.language.split(/[-_]/)[0] || 'en';
}
