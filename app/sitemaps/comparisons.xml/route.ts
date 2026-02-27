import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getComparisonPairs, MARKETS } from '@/lib/brands';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 86400;

const BASE = 'https://brandswitch.com';

function getLastMod(): string {
  try {
    const raw = fs.readFileSync(path.join(process.cwd(), 'data', 'sync-summary.json'), 'utf-8');
    return JSON.parse(raw).syncedAt?.split('T')[0] ?? new Date().toISOString().split('T')[0];
  } catch {
    return new Date().toISOString().split('T')[0];
  }
}

export function GET() {
  const lastmod = getLastMod();
  const seen = new Set<string>();
  const entries: string[] = [];

  for (const locale of MARKETS) {
    for (const { slug1, slug2 } of getComparisonPairs(locale, 200)) {
      const url = `${BASE}/${locale}/compare/${slug1}-vs-${slug2}`;
      if (seen.has(url)) continue;
      seen.add(url);
      entries.push(`  <url>
    <loc>${url}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.5</priority>
  </url>`);
    }
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join('\n')}
</urlset>`;

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate',
    },
  });
}
