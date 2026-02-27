import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      // CompanyEnrich logo API (primary logo source used by sync)
      { protocol: 'https', hostname: 'api.companyenrich.com' },
      // Debounce logo API (secondary logo source used by sync)
      { protocol: 'https', hostname: 'logo.debounce.com' },
      // Clearbit logo API
      { protocol: 'https', hostname: 'logo.clearbit.com' },
      // Logo.dev API
      { protocol: 'https', hostname: 'img.logo.dev' },
      // Google high-res favicon service (fallback)
      { protocol: 'https', hostname: 't2.gstatic.com' },
      // DuckDuckGo icon service (fallback)
      { protocol: 'https', hostname: 'icons.duckduckgo.com' },
      // Shoptastic logo CDN
      { protocol: 'https', hostname: 'gstatic.shoptastic.io' },
    ],
  },
};

export default withNextIntl(nextConfig);
