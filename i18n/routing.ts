import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  // 18 markets — see lib/brands.ts MARKETS for full list
  locales: ['us', 'uk', 'de', 'fr', 'nl', 'es', 'it', 'se', 'ch', 'at', 'au', 'dk', 'ca', 'fi', 'mx', 'br', 'be', 'no'],
  defaultLocale: 'us',
});
