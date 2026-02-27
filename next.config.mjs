import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      // Clearbit logo API (primary logo source)
      { protocol: 'https', hostname: 'logo.clearbit.com' },
      // Logo.dev API (secondary logo source)
      { protocol: 'https', hostname: 'img.logo.dev' },
      // Google high-res favicon service (fallback)
      { protocol: 'https', hostname: 't2.gstatic.com' },
      // DuckDuckGo icon service (fallback)
      { protocol: 'https', hostname: 'icons.duckduckgo.com' },
    ],
  },
};

export default withNextIntl(nextConfig);
