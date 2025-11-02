import { createI18n } from 'vue-i18n';

export const testI18n = createI18n({
  legacy: false,
  locale: 'en',
  fallbackLocale: 'en',
  warnHtmlInMessage: 'error',
  escapeParameterHtml: true,
  messages: {
    en: {
      test: 'Test message',
    },
  },
});
