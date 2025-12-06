// i18n.ts
import { createI18n, type I18n, type LocaleMessages } from 'vue-i18n';
import {
  cs as vuetifyCs,
  en as vuetifyEn,
  de as vuetifyDe,
  fr as vuetifyFr,
  es as vuetifyEs,
  hu as vuetifyHu,
  it as vuetifyIt,
  pt as vuetifyPt,
  pl as vuetifyPl,
  ru as vuetifyRu,
  tr as vuetifyTr,
  uk as vuetifyUk,
  ja as vuetifyJa,
  ko as vuetifyKo,
  zhHans as vuetifyZh,
  zhHant as vuetifyZhTw,
} from 'vuetify/locale';

import messages from '@intlify/unplugin-vue-i18n/messages';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type VuetifyLocaleMessages = { $vuetify: any };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AppMessages = LocaleMessages<any> & {
  [key: string]: VuetifyLocaleMessages;
};

const languageCode = navigator.language.split(/[-_]/)[0];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const vuetifyLocales: Record<string, any> = {
  cs: vuetifyCs,
  en: vuetifyEn,
  de: vuetifyDe,
  fr: vuetifyFr,
  es: vuetifyEs,
  hu: vuetifyHu,
  it: vuetifyIt,
  pt: vuetifyPt,
  pl: vuetifyPl,
  ru: vuetifyRu,
  tr: vuetifyTr,
  uk: vuetifyUk,
  ja: vuetifyJa,
  ko: vuetifyKo,
  zh: vuetifyZh,
  'zh-TW': vuetifyZhTw,
};

const typedMessages = messages as AppMessages;

if (!typedMessages.pt && typedMessages['pt-BR']) {
  typedMessages.pt = typedMessages['pt-BR'];
}

for (const [locale, vuetifyLocale] of Object.entries(vuetifyLocales)) {
  if (typedMessages[locale]) {
    typedMessages[locale].$vuetify = vuetifyLocale;
  } else {
    typedMessages[locale] = { $vuetify: vuetifyLocale };
  }
}

const i18n: I18n<
  AppMessages,
  Record<string, never>,
  Record<string, never>,
  string,
  false
> = createI18n({
  legacy: false,
  globalInjection: true,
  locale: languageCode,
  fallbackLocale: 'en',
  warnHtmlInMessage: 'error',
  escapeParameterHtml: true,
  messages: typedMessages,
  silentTranslationWarn: true,
  silentFallbackWarn: true,
  missingWarn: false,
  fallbackWarn: false,
});

export default i18n;
