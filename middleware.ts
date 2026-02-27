import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { NextRequest, NextResponse } from 'next/server';

// ISO country code → Brandswitch locale
const GEO_MAP: Record<string, string> = {
  US: 'us', GB: 'uk', DE: 'de', FR: 'fr', NL: 'nl', ES: 'es', IT: 'it',
  SE: 'se', CH: 'ch', AT: 'at', AU: 'au', DK: 'dk', CA: 'ca', FI: 'fi',
  MX: 'mx', BR: 'br', BE: 'be', NO: 'no',
};

const VALID_LOCALES = new Set(routing.locales as unknown as string[]);

const intlMiddleware = createMiddleware(routing);

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only intercept the root path for geo/cookie redirect
  if (pathname === '/') {
    // 1. Check bs-locale cookie
    const cookieLocale = request.cookies.get('bs-locale')?.value;
    if (cookieLocale && VALID_LOCALES.has(cookieLocale)) {
      return NextResponse.redirect(new URL(`/${cookieLocale}`, request.url), 302);
    }

    // 2. Check Vercel geo header
    const country = request.headers.get('x-vercel-ip-country');
    if (country) {
      const geoLocale = GEO_MAP[country.toUpperCase()];
      if (geoLocale) {
        return NextResponse.redirect(new URL(`/${geoLocale}`, request.url), 302);
      }
    }

    // 3. Default to /us
    return NextResponse.redirect(new URL('/us', request.url), 302);
  }

  // All other routes — delegate to next-intl middleware
  return intlMiddleware(request);
}

export const config = {
  // Match all paths EXCEPT Next.js internals, static files, and /admin routes
  matcher: ['/((?!api|_next|_vercel|admin|.*\\..*).*)'],
};
