/**
 * /sitemap.xml — Sitemap index pointing to per-market sub-sitemaps
 */
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 86400;

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
  const base = 'https://brandswitch.com';

  const sitemaps = [
    `${base}/sitemaps/pages.xml`,
    `${base}/sitemaps/comparisons.xml`,
    `${base}/sitemaps/brands-us.xml`,
    `${base}/sitemaps/brands-uk.xml`,
    `${base}/sitemaps/brands-de.xml`,
    `${base}/sitemaps/brands-fr.xml`,
    `${base}/sitemaps/brands-nl.xml`,
    `${base}/sitemaps/brands-es.xml`,
    `${base}/sitemaps/brands-it.xml`,
    `${base}/sitemaps/brands-se.xml`,
    `${base}/sitemaps/brands-ch.xml`,
    `${base}/sitemaps/brands-at.xml`,
    `${base}/sitemaps/brands-au.xml`,
    `${base}/sitemaps/brands-dk.xml`,
    `${base}/sitemaps/brands-ca.xml`,
    `${base}/sitemaps/brands-fi.xml`,
    `${base}/sitemaps/brands-mx.xml`,
    `${base}/sitemaps/brands-br.xml`,
    `${base}/sitemaps/brands-be.xml`,
    `${base}/sitemaps/brands-no.xml`,
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemaps.map(loc => `  <sitemap>
    <loc>${loc}</loc>
    <lastmod>${lastmod}</lastmod>
  </sitemap>`).join('\n')}
</sitemapindex>`;

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate',
    },
  });
}
