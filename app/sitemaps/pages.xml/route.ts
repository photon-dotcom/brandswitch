/**
 * /sitemaps/pages.xml — All static pages: homepages, categories, top-brands, best-of
 */
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import {
  getCategories,
  getCuratedCategorySlugs,
  BEST_OF_MAP,
  MARKETS,
} from '@/lib/brands';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 86400;

const BASE = 'https://brandswitch.com';

const LANG_TAGS: Record<string, string> = {
  us: 'en-US', uk: 'en-GB', au: 'en-AU', ca: 'en-CA', nl: 'nl-NL', se: 'sv-SE',
  dk: 'da-DK', fi: 'fi-FI', no: 'nb-NO', de: 'de-DE', at: 'de-AT', ch: 'de-CH',
  fr: 'fr-FR', be: 'fr-BE', es: 'es-ES', mx: 'es-MX', it: 'it-IT', br: 'pt-BR',
};

function getLastMod(): string {
  try {
    const raw = fs.readFileSync(path.join(process.cwd(), 'data', 'sync-summary.json'), 'utf-8');
    return JSON.parse(raw).syncedAt?.split('T')[0] ?? new Date().toISOString().split('T')[0];
  } catch {
    return new Date().toISOString().split('T')[0];
  }
}

function urlEntry(
  loc: string,
  lastmod: string,
  priority: number,
  changefreq: string,
  alternates?: Record<string, string>
): string {
  const altLinks = alternates
    ? Object.entries(alternates)
        .map(([lang, href]) => `    <xhtml:link rel="alternate" hreflang="${lang}" href="${href}"/>`)
        .join('\n')
    : '';
  return `  <url>
    <loc>${loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
${altLinks}  </url>`;
}

export function GET() {
  const lastmod = getLastMod();
  const catSlugs = getCuratedCategorySlugs();
  const bestSlugs = Object.keys(BEST_OF_MAP);
  const entries: string[] = [];

  for (const locale of MARKETS) {
    // Homepages
    const homeAlts = Object.fromEntries(MARKETS.map(m => [LANG_TAGS[m], `${BASE}/${m}`]));
    homeAlts['x-default'] = `${BASE}/us`;
    entries.push(urlEntry(`${BASE}/${locale}`, lastmod, 1.0, 'daily', homeAlts));

    // Category index
    entries.push(urlEntry(`${BASE}/${locale}/category`, lastmod, 0.8, 'weekly'));

    // Per-category pages
    const cats = getCategories(locale);
    for (const cat of cats) {
      const catAlts = Object.fromEntries(MARKETS.map(m => [LANG_TAGS[m], `${BASE}/${m}/category/${cat.slug}`]));
      entries.push(urlEntry(`${BASE}/${locale}/category/${cat.slug}`, lastmod, 0.7, 'weekly', catAlts));
    }

    // Top brands index
    const tbAlts = Object.fromEntries(MARKETS.map(m => [LANG_TAGS[m], `${BASE}/${m}/top-brands`]));
    entries.push(urlEntry(`${BASE}/${locale}/top-brands`, lastmod, 0.8, 'weekly', tbAlts));

    // Top brands per category
    for (const slug of catSlugs) {
      const tbCatAlts = Object.fromEntries(MARKETS.map(m => [LANG_TAGS[m], `${BASE}/${m}/top-brands/${slug}`]));
      entries.push(urlEntry(`${BASE}/${locale}/top-brands/${slug}`, lastmod, 0.7, 'weekly', tbCatAlts));
    }

    // Best-of pages
    for (const slug of bestSlugs) {
      entries.push(urlEntry(`${BASE}/${locale}/best/${slug}`, lastmod, 0.6, 'weekly'));
    }

    // Static pages
    for (const page of ['about', 'privacy', 'terms']) {
      entries.push(urlEntry(`${BASE}/${locale}/${page}`, lastmod, 0.3, 'monthly'));
    }
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entries.join('\n')}
</urlset>`;

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate',
    },
  });
}
