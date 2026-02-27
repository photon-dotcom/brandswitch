import { type NextRequest, NextResponse } from 'next/server';
import { getSearchIndex } from '@/lib/brands';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface SearchResult {
  name: string;
  slug: string;
  logo: string;
  domain: string;
  categories: string[];
}

export function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const q = (searchParams.get('q') ?? '').trim().toLowerCase();
  const locale = searchParams.get('locale') ?? 'us';

  if (q.length < 2) {
    return NextResponse.json([]);
  }

  const index = getSearchIndex(locale);
  const prefix: (SearchResult & { eCPC: number })[] = [];
  const contains: (SearchResult & { eCPC: number })[] = [];

  for (const entry of index) {
    if (!entry.slug || !entry.name) continue;
    const name = entry.name.toLowerCase();
    const item = {
      name: entry.name,
      slug: entry.slug,
      logo: entry.logo,
      domain: entry.domain,
      categories: entry.cat ? [entry.cat] : [],
      eCPC: parseFloat(entry.eCPC) || 0,
    };
    if (name.startsWith(q)) {
      prefix.push(item);
    } else if (name.includes(q)) {
      contains.push(item);
    }
  }

  prefix.sort((a, b) => b.eCPC - a.eCPC);
  contains.sort((a, b) => b.eCPC - a.eCPC);

  const results = [...prefix, ...contains]
    .slice(0, 8)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    .map(({ eCPC: _eCPC, ...r }): SearchResult => r);

  return NextResponse.json(results);
}
