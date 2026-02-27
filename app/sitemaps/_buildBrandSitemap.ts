import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getBrands } from '@/lib/brands';

const BASE = 'https://brandswitch.com';

function getLastMod(): string {
  try {
    const raw = fs.readFileSync(path.join(process.cwd(), 'data', 'sync-summary.json'), 'utf-8');
    return JSON.parse(raw).syncedAt?.split('T')[0] ?? new Date().toISOString().split('T')[0];
  } catch {
    return new Date().toISOString().split('T')[0];
  }
}

export function buildBrandSitemap(market: string): NextResponse {
  const lastmod = getLastMod();
  const brands = getBrands(market).filter(b => b.slug && (b.similarBrands?.length ?? 0) >= 3);

  const entries = brands.map(b =>
    `  <url>
    <loc>${BASE}/${market}/brands-like/${b.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`
  );

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
