/**
 * lib/brands.ts — Server-only data loading utilities
 *
 * Reads from the static JSON files in /data, caches in Node process memory,
 * and provides helpers used by all page types. This file is NEVER bundled
 * to the client — it uses Node's `fs` module which is server-only.
 */

import fs from 'fs';
import path from 'path';
import type { Brand } from '@/types/brand';

// ── Types ─────────────────────────────────────────────────────────────────

export interface CategorySummary {
  name: string;
  slug: string;
  brandCount: number;
}

export const MARKETS = ['us', 'uk', 'de', 'fr', 'nl', 'es', 'it', 'se', 'ch', 'at', 'au', 'dk', 'ca', 'fi', 'mx', 'br', 'be', 'no'] as const;
export type Market = (typeof MARKETS)[number];

// ── Best-of page definitions ───────────────────────────────────────────────
// Maps /best/[slug] → the category name it targets

export const BEST_OF_MAP: Record<string, string> = {
  'outdoor-brands':         'Sports, Outdoors & Fitness',
  'beauty-brands':          'Health & Beauty',
  'home-brands':            'Home & Garden',
  'fashion-brands':         'Clothing',
  'tech-brands':            'Electronics',
  'travel-brands':          'Travel & Vacations',
  'food-brands':            'Food, Drinks & Restaurants',
  'pet-brands':             'Pets',
  'shoe-brands':            'Shoes',
  'accessory-brands':       'Accessories',
  'subscription-brands':    'Subscription Boxes & Services',
  'entertainment-brands':   'Events & Entertainment',
};

// ── Curated top-brands types ──────────────────────────────────────────────

export interface CuratedEntry {
  rank: number;
  name: string;
  slug: string;
}

export interface CuratedBrand {
  rank: number;
  brand: Brand;
}

// ── In-process cache (survives across requests in the same Node server) ────

const brandCache         = new Map<string, Brand[]>();
const categoryCache      = new Map<string, CategorySummary[]>();
const categoryIndexCache = new Map<string, Map<string, Brand[]>>();
const slugIndexCache     = new Map<string, Map<string, Brand>>();
const curatedCache       = new Map<string, Record<string, CuratedEntry[]>>();
const searchIndexCache   = new Map<string, SearchEntry[]>();

// ── Search index type (lightweight, used by autocomplete) ─────────────────
export interface SearchEntry {
  name: string;
  slug: string;
  logo: string;
  logoQuality: 'high' | 'medium' | 'low' | 'none';
  domain: string;
  cat: string;
  eCPC: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────

function dataPath(filename: string) {
  return path.join(process.cwd(), 'data', filename);
}

/**
 * Strip market-specific suffixes from brand names for display only.
 * "Adidas US" → "Adidas", "NordVPN FR" → "NordVPN"
 * The full name is always kept in the data files.
 */
export function cleanDisplayName(name: string): string {
  return name
    .replace(/\s+(US|UK|DE|FR|CA|AU|NZ|IE|NL|BE|AT|CH|IT|ES|PL|SE|NO|DK|FI|PT|WW|EU|INT)\s*$/i, '')
    .trim();
}

/** Convert category name → URL slug: "Travel & Vacations" → "travel-and-vacations" */
export function catToSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Clean affiliate URLs — replace the template placeholder with a sub-ID */
function cleanAffiliateUrl(url: string): string {
  return (url ?? '').replace('{your tracking code}', 'brandswitch');
}

// ── Loaders ───────────────────────────────────────────────────────────────

export function getBrands(market: string): Brand[] {
  const key = market.toLowerCase();
  if (!brandCache.has(key)) {
    try {
      const raw = fs.readFileSync(dataPath(`brands-${key}.json`), 'utf-8');
      const brands: Brand[] = JSON.parse(raw);
      // Fix affiliate URLs on load
      for (const b of brands) {
        b.affiliateUrl = cleanAffiliateUrl(b.affiliateUrl);
        b.deeplinkUrl  = cleanAffiliateUrl(b.deeplinkUrl);
      }
      brandCache.set(key, brands);
    } catch {
      brandCache.set(key, []);
    }
  }
  return brandCache.get(key)!;
}

/** Lightweight search index — loads search-index-{market}.json if available, falls back to full brand list */
export function getSearchIndex(market: string): SearchEntry[] {
  const key = market.toLowerCase();
  if (!searchIndexCache.has(key)) {
    try {
      const raw = fs.readFileSync(dataPath(`search-index-${key}.json`), 'utf-8');
      searchIndexCache.set(key, JSON.parse(raw));
    } catch {
      // Fallback: build from full brand data
      const entries: SearchEntry[] = getBrands(market).map(b => ({
        name: b.name,
        slug: b.slug,
        logo: b.logo ?? '',
        logoQuality: b.logoQuality ?? 'low',
        domain: b.domain ?? '',
        cat: b.categories?.[0] ?? '',
        eCPC: b.eCPC ?? '0',
      }));
      searchIndexCache.set(key, entries);
    }
  }
  return searchIndexCache.get(key)!;
}

export function getCategories(market: string): CategorySummary[] {
  const key = market.toLowerCase();
  if (!categoryCache.has(key)) {
    try {
      const raw = fs.readFileSync(dataPath(`categories-${key}.json`), 'utf-8');
      categoryCache.set(key, JSON.parse(raw));
    } catch {
      categoryCache.set(key, []);
    }
  }
  return categoryCache.get(key)!;
}

// ── Index builders (built once, reused) ──────────────────────────────────

function getSlugIndex(market: string): Map<string, Brand> {
  const key = market.toLowerCase();
  if (!slugIndexCache.has(key)) {
    const index = new Map<string, Brand>();
    for (const b of getBrands(market)) {
      if (b.slug) index.set(b.slug, b);
    }
    slugIndexCache.set(key, index);
  }
  return slugIndexCache.get(key)!;
}

function getCategoryIndex(market: string): Map<string, Brand[]> {
  const key = market.toLowerCase();
  if (!categoryIndexCache.has(key)) {
    const index = new Map<string, Brand[]>();
    for (const b of getBrands(market)) {
      for (const cat of b.categories ?? []) {
        const slug = catToSlug(cat);
        if (!index.has(slug)) index.set(slug, []);
        index.get(slug)!.push(b);
      }
    }
    categoryIndexCache.set(key, index);
  }
  return categoryIndexCache.get(key)!;
}

// ── Public API ────────────────────────────────────────────────────────────

/** Find a brand by its slug in a specific market */
export function getBrandBySlug(market: string, slug: string): Brand | undefined {
  return getSlugIndex(market).get(slug);
}

/** Top N brands by eCPC (highest earning per click first) */
export function getTopBrands(market: string, limit = 100): Brand[] {
  return [...getBrands(market)]
    .filter(b => b.slug)
    .sort((a, b) => (parseFloat(b.eCPC) || 0) - (parseFloat(a.eCPC) || 0))
    .slice(0, limit);
}

/** All brands in a given category, sorted by eCPC */
export function getBrandsByCategory(market: string, categorySlug: string): Brand[] {
  return [...(getCategoryIndex(market).get(categorySlug) ?? [])].sort(
    (a, b) => (parseFloat(b.eCPC) || 0) - (parseFloat(a.eCPC) || 0)
  );
}

/** Resolve the similarBrands slug list into full Brand objects */
export function getBrandAlternatives(market: string, brand: Brand): Brand[] {
  const index = getSlugIndex(market);
  return (brand.similarBrands ?? [])
    .map(slug => index.get(slug))
    .filter((b): b is Brand => Boolean(b));
}

/**
 * Returns related brands from the same category, excluding the given slug.
 * Used as a fallback when a brand has fewer than 3 real alternatives.
 */
export function getRelatedBrands(market: string, categorySlug: string, excludeSlug: string, limit = 10): Brand[] {
  return getBrandsByCategory(market, categorySlug)
    .filter(b => b.slug !== excludeSlug)
    .slice(0, limit);
}

/** Returns the list of markets that have a brand with the given slug */
export function getBrandMarkets(slug: string): string[] {
  return MARKETS.filter(m => Boolean(getSlugIndex(m).get(slug)));
}

/** Locale → proper hreflang language tag */
export const LOCALE_TO_HREFLANG: Record<string, string> = {
  us: 'en', uk: 'en-GB', au: 'en-AU', ca: 'en-CA',
  nl: 'en', se: 'en', dk: 'en', fi: 'en', no: 'en',
  de: 'de', at: 'de-AT', ch: 'de-CH',
  fr: 'fr', be: 'fr-BE',
  es: 'es', mx: 'es-MX',
  it: 'it', br: 'pt-BR',
};

/** Slugs shared between two brands' category lists (for "Why similar") */
export function sharedCategories(a: Brand, b: Brand): string[] {
  const setB = new Set(b.categories);
  return (a.categories ?? []).filter(c => setB.has(c));
}

/** Human-readable category name from slug (for a given market) */
export function getCategoryName(market: string, slug: string): string {
  return getCategories(market).find(c => c.slug === slug)?.name ?? slug;
}

/** All valid slugs for generateStaticParams */
export function getTopBrandSlugs(market: string, limit = 500): string[] {
  return getTopBrands(market, limit)
    .map(b => b.slug)
    .filter(Boolean);
}

// ── Curated top-brands ─────────────────────────────────────────────────────

/** Load the matched curated data for a given market (falls back to US if per-market file is absent) */
function getCuratedData(market = 'us'): Record<string, CuratedEntry[]> {
  const key = market.toLowerCase();
  if (!curatedCache.has(key)) {
    // Try per-market file first, fall back to US
    let loaded = false;
    if (key !== 'us') {
      try {
        const raw = fs.readFileSync(dataPath(`top-brands-matched-${key}.json`), 'utf-8');
        curatedCache.set(key, JSON.parse(raw));
        loaded = true;
      } catch { /* fall through to US */ }
    }
    if (!loaded) {
      // Cache under 'us' key if not already
      if (!curatedCache.has('us')) {
        try {
          const raw = fs.readFileSync(dataPath('top-brands-matched-us.json'), 'utf-8');
          curatedCache.set('us', JSON.parse(raw));
        } catch {
          curatedCache.set('us', {});
        }
      }
      if (key !== 'us') curatedCache.set(key, curatedCache.get('us')!);
    }
  }
  return curatedCache.get(key)!;
}

/**
 * Returns the curated top brands for a given category in the given market.
 * Brands not present in the market's dataset are automatically skipped.
 */
export function getCuratedTopBrands(market: string, categorySlug: string): CuratedBrand[] {
  const data = getCuratedData(market);
  const entries = data[categorySlug] ?? [];
  const slugIndex = getSlugIndex(market);
  return entries
    .map(e => {
      const brand = slugIndex.get(e.slug);
      if (!brand) return null;
      return { rank: e.rank, brand } satisfies CuratedBrand;
    })
    .filter((x): x is CuratedBrand => x !== null);
}

/**
 * Returns all curated top brands across every category for a given market,
 * each annotated with their categorySlug.
 */
export function getAllCuratedTopBrands(
  market: string
): Array<CuratedBrand & { categorySlug: string }> {
  const data = getCuratedData(market);
  const slugIndex = getSlugIndex(market);
  const result: Array<CuratedBrand & { categorySlug: string }> = [];
  for (const [catSlug, entries] of Object.entries(data)) {
    for (const e of entries) {
      const brand = slugIndex.get(e.slug);
      if (brand) result.push({ rank: e.rank, brand, categorySlug: catSlug });
    }
  }
  return result;
}

/** All category slugs that have curated top-brand data (always from US source) */
export function getCuratedCategorySlugs(): string[] {
  return Object.keys(getCuratedData('us'));
}

// ── Homepage brand selection ───────────────────────────────────────────────

/**
 * Priority slugs to try first for the homepage Popular Searches grid.
 * Contains a mix of US-specific and international curated brand slugs.
 * For each market, only slugs that actually exist in that market's data will be used.
 */
const HOMEPAGE_PRIORITY_SLUGS = [
  // US-specific
  'nike', 'ulta-beauty', 'chewy', 'doordash', 'wayfair', 'casper-sleep',
  'yeti', 'callaway-golf', 'coach', 'ticketmaster', 'lego', 'hilton',
  'gopro', 'adidas-us',
  // Cross-market recognizable brands
  'samsung', 'dyson', 'nordvpn', 'adidas', 'estee-lauder', 'under-armour',
  'reebok', 'stokke', 'asos', 'charlotte-tilbury', 'mac-cosmetics',
  'getyourguide', 'viator', 'kate-spade', 'bitdefender', 'surfshark',
  'canon', 'playstation-direct', 'fabfitfun', 'lego',
];

/**
 * Returns up to `limit` homepage brands for the Popular Searches grid.
 * Tries priority slugs first (recognizable brands), then fills from
 * curated round-robin to ensure market coverage.
 */
export function getHomepageBrands(market: string, limit = 18): Brand[] {
  const slugIndex = getSlugIndex(market);
  const curated = getCuratedData(market);
  const seen = new Set<string>();
  const result: Brand[] = [];

  for (const slug of HOMEPAGE_PRIORITY_SLUGS) {
    const brand = slugIndex.get(slug);
    if (brand && !seen.has(slug)) {
      seen.add(slug);
      result.push(brand);
      if (result.length >= limit) return result;
    }
  }

  // Fill remaining slots round-robin across curated categories
  if (result.length < limit) {
    const byCategory = Object.values(curated)
      .map(entries => entries.map(e => slugIndex.get(e.slug)).filter((b): b is Brand => Boolean(b)))
      .filter(arr => arr.length > 0);

    let round = 0;
    outer: while (result.length < limit) {
      let added = false;
      for (const catBrands of byCategory) {
        if (round < catBrands.length) {
          const brand = catBrands[round];
          if (!seen.has(brand.slug)) {
            seen.add(brand.slug);
            result.push(brand);
            added = true;
            if (result.length >= limit) break outer;
          }
        }
      }
      round++;
      if (!added) break;
    }
  }

  return result;
}

/**
 * Returns up to `limit` featured brands sorted by eCPC (highest-earning first),
 * drawn from the curated top brands available in the given market.
 * Only brands with an affiliateUrl are included (to ensure the Visit button works).
 */
export function getHomepageFeaturedBrands(market: string, limit = 6): Brand[] {
  const curated = getCuratedData(market);
  const slugIndex = getSlugIndex(market);
  const seen = new Set<string>();

  return Object.values(curated)
    .flat()
    .map(e => slugIndex.get(e.slug))
    .filter((b): b is Brand => Boolean(b) && Boolean((b as Brand).affiliateUrl))
    .filter(b => {
      if (seen.has(b.slug)) return false;
      seen.add(b.slug);
      return true;
    })
    .sort((a, b) => (parseFloat(b.eCPC) || 0) - (parseFloat(a.eCPC) || 0))
    .slice(0, limit);
}

// ── Brand description templates ───────────────────────────────────────────

/** Simple string hash → deterministic template selection per brand */
function nameHash(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = (Math.imul(31, h) + name.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

type DescParams = { name: string; cat: string; count: number; domain: string };

const DESC_TEMPLATES: Array<(p: DescParams) => string> = [
  ({ name, cat, count }) =>
    `Looking for brands like ${name}? Explore ${count} similar ${cat} brands ranked by how closely they match.`,
  ({ name, cat, count, domain }) =>
    `Discover alternatives to ${name} (${domain}). We've found ${count} ${cat} brands that share a similar style.`,
  ({ name, cat }) =>
    `${name} is one of thousands of ${cat} brands in our directory. See which brands are most similar.`,
  ({ name, cat, count }) =>
    `Shop ${cat} brands like ${name}. Compare ${count} alternatives side by side and find your next favourite.`,
  ({ name, cat, count }) =>
    `Not sure about ${name}? Browse ${count} similar brands in ${cat} — ranked by similarity score.`,
  ({ name, cat, count }) =>
    `Find your perfect ${cat} match. ${name} fans also love these ${count} alternative brands.`,
];

/** Return the brand's existing description or auto-generate one using varied templates */
export function getBrandDescription(brand: {
  name: string;
  domain?: string;
  categories?: string[];
  similarBrands?: string[];
  description?: string;
}): string {
  if (brand.description) return brand.description;
  const name = brand.name;
  const cat = (brand.categories?.[0] ?? 'brand').toLowerCase();
  const count = brand.similarBrands?.length ?? 0;
  const domain = brand.domain ?? '';
  // Brands with no alternatives yet use the count-free template
  if (count === 0) {
    return `${name} is one of thousands of ${cat} brands in our directory. See which brands are most similar.`;
  }
  const idx = nameHash(name) % DESC_TEMPLATES.length;
  return DESC_TEMPLATES[idx]({ name, cat, count, domain });
}

// ── Similarity reason helpers ──────────────────────────────────────────────

/**
 * Returns true if the given slug appears in any curated category list for the market.
 */
export function isCuratedBrand(market: string, slug: string): boolean {
  const data = getCuratedData(market);
  for (const entries of Object.values(data)) {
    if (entries.some(e => e.slug === slug)) return true;
  }
  return false;
}

/**
 * Returns the rank of a brand in the curated list for its primary category (1-based),
 * or 0 if not found.
 */
export function getCuratedRank(market: string, slug: string, categorySlug: string): number {
  const data = getCuratedData(market);
  const entries = data[categorySlug] ?? [];
  const entry = entries.find(e => e.slug === slug);
  return entry?.rank ?? 0;
}

/**
 * Returns the number of markets that both brands are available in simultaneously.
 */
export function countSharedMarkets(slug1: string, slug2: string): number {
  let count = 0;
  for (const m of MARKETS) {
    const idx = getSlugIndex(m);
    if (idx.has(slug1) && idx.has(slug2)) count++;
  }
  return count;
}

/**
 * Generates a short "why this alternative?" reason string for display on brand pages.
 * Combines up to 2 signals into a human-readable phrase.
 */
export function getAlternativeReason(
  market: string,
  mainBrand: Brand,
  alternative: Brand,
): string {
  const shared = sharedCategories(mainBrand, alternative);
  const catName = shared[0] ?? (alternative.categories[0] ?? 'brand');
  const catLower = catName.toLowerCase();
  const altCategorySlug = catToSlug(alternative.categories[0] ?? '');

  const reasons: string[] = [];

  // Signal 1: top-ranked alternative
  const rank = getCuratedRank(market, alternative.slug, altCategorySlug);
  if (rank === 1) {
    reasons.push(`#1 ${catLower} brand`);
  } else if (rank === 2) {
    reasons.push(`#2 ${catLower} brand`);
  } else if (isCuratedBrand(market, alternative.slug) && isCuratedBrand(market, mainBrand.slug)) {
    reasons.push(`Both top-rated ${catLower} brands`);
  } else if (shared.length > 0) {
    reasons.push(`Both in ${catLower}`);
  }

  // Signal 2: market overlap
  const sharedMarkets = countSharedMarkets(mainBrand.slug, alternative.slug);
  if (sharedMarkets >= 6) {
    reasons.push(`Available in ${sharedMarkets} markets`);
  }

  if (reasons.length === 0) return `Similar ${catLower} brand`;
  return reasons.slice(0, 2).join(' · ');
}

// ── Comparison pair helpers ────────────────────────────────────────────────

export interface ComparisonPair {
  slug1: string;
  slug2: string;
}

/**
 * Generates up to `limit` comparison pairs for a market.
 * For each curated top brand, takes its top-3 similar brands that are also curated.
 * Deduplicates (A-vs-B = B-vs-A).
 */
export function getComparisonPairs(market: string, limit = 200): ComparisonPair[] {
  const slugIndex = getSlugIndex(market);
  const seen = new Set<string>();
  const pairs: ComparisonPair[] = [];

  const allCurated = getAllCuratedTopBrands(market);
  const curatedSlugs = new Set(allCurated.map(c => c.brand.slug));

  for (const { brand } of allCurated) {
    if (pairs.length >= limit) break;
    const topAlts = (brand.similarBrands ?? []).slice(0, 3);
    for (const altSlug of topAlts) {
      if (!curatedSlugs.has(altSlug)) continue;
      const alt = slugIndex.get(altSlug);
      if (!alt) continue;
      const key = [brand.slug, altSlug].sort().join('--');
      if (seen.has(key)) continue;
      seen.add(key);
      pairs.push({ slug1: brand.slug, slug2: altSlug });
      if (pairs.length >= limit) break;
    }
  }

  return pairs;
}
