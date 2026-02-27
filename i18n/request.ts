import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';

// Maps market codes to language files
const localeToLang: Record<string, string> = {
  us: 'en', uk: 'en', au: 'en', ca: 'en', nl: 'en', se: 'en', dk: 'en', fi: 'en', no: 'en',
  de: 'de', at: 'de', ch: 'de',
  fr: 'fr', be: 'fr',
  es: 'es', mx: 'es',
  it: 'it',
  br: 'pt',
};

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  // Fall back to default if locale is invalid
  if (!locale || !routing.locales.includes(locale as (typeof routing.locales)[number])) {
    locale = routing.defaultLocale;
  }

  const lang = localeToLang[locale] || 'en';

  return {
    locale,
    messages: (await import(`../locales/${lang}.json`)).default,
  };
});
