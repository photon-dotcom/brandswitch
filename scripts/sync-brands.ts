#!/usr/bin/env tsx
/**
 * sync-brands.ts — Brandswitch data pipeline
 *
 * Fetches brands from multiple affiliate network APIs, normalises them,
 * computes similarity scores, and writes static JSON files for each market.
 *
 * Usage:
 *   npx tsx scripts/sync-brands.ts              # full run
 *   npx tsx scripts/sync-brands.ts --max-pages 5  # quick test (5 pages)
 *   npx tsx scripts/sync-brands.ts --resume       # continue from checkpoint
 *   npx tsx scripts/sync-brands.ts --classify     # also run LLM classification (costs money)
 *
 * Env vars:
 *   PICKALINK_CPA_KEY  Pickalink CPA authorization key (required)
 *   PICKALINK_CPC_KEY  Pickalink CPC authorization key (required)
 *   SHOPTASTIC_CPA_KEY Shoptastic CPA authorization key (required)
 *   SHOPTASTIC_CPC_KEY Shoptastic CPC authorization key (required)
 *   LOGODEV_TOKEN      Logo.dev API token (required)
 *   ANTHROPIC_API_KEY  required when using --classify
 *   PAGE_DELAY_MS      ms to wait between pages  (default: 0 for local, set high in CI)
 *   MAX_PAGES          max pages to fetch this run (default: all)
 *
 * Copy .env.example → .env and fill in values before running.
 */

import fs from 'fs';
import https from 'https';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env file if present (tsx/node doesn't auto-load it)
const envPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (key && !(key in process.env)) process.env[key] = val;
  }
}

// ── Types ────────────────────────────────────────────────────────────────────

interface Brand {
  id: string;
  name: string;
  slug: string;
  domain: string;
  description: string;
  logo: string;
  categories: string[];
  tags: string[];
  country: string;
  affiliateUrl: string;
  deeplinkUrl: string;
  supportsDeepLink: boolean;
  commission: string;
  commissionType: string;
  eCPC: string;
  similarBrands: string[];
  logoQuality: 'high' | 'medium' | 'low' | 'none';
  logoSource: 'api' | 'logodev' | 'companyenrich' | 'debounce' | 'clearbit' | 'google-favicon' | 'inherited' | 'none';
  logoInheritedFrom?: string;
  quality: 'good' | 'suspect';
  affiliateSource: string;  // e.g. "Pickalink CPA", "Shoptastic CPC"
}

interface CategorySummary {
  name: string;
  slug: string;
  brandCount: number;
}

/** Raw shape returned by affiliate network APIs (same format for all networks) */
interface ApiRecord {
  advertiserId: number;
  advertiserName: string;
  country: string;
  advertiserHome: string;
  commissionUrl: string;
  deeplinkUrl: string;
  supportDeepLink: boolean;
  commission: string;
  commissionType: string;
  eCPC: string;
  logoImg: string | null;
  categories: string[];
  domain: string;
  groupCommissionUrl: string | null;
  // Internal fields added during fetch (not from API)
  _feedName?: string;
  _feedPriority?: number;
}

interface ApiResponse {
  code: string;
  pageNumber: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
  results: ApiRecord[];
}

interface Checkpoint {
  completedFeeds: string[];               // feed names that fully completed
  lastPageByFeed: Record<string, number>; // last page fetched for in-progress feeds
  rawBrands: ApiRecord[];                 // all collected raw brands (with _feedName/_feedPriority)
  completedAt: string | null;
}

// ── Feed Config ───────────────────────────────────────────────────────────────

interface FeedConfig {
  name: string;       // Display name for logging and affiliateSource field
  type: 'cpa' | 'cpc';
  baseUrl: string;    // Full URL with pubId and any required query params (no pageNumber/pageSize)
  apiKey: string;     // Value for the "authorization" header (no Bearer prefix)
  priority: number;   // 1 = highest priority. Lower number wins when same brand appears in multiple feeds.
}

/**
 * FEEDS — one entry per affiliate network / commission type.
 *
 * To add a new network in the future:
 *   1. Add a new entry to this array with a unique name, the network's API
 *      base URL (including pubId and any required query params), your API key,
 *      and a priority (1 = highest). Lower numbers win when the same brand
 *      appears in multiple feeds.
 *   2. Ensure the API uses the same response format (code, results[], etc.)
 *      and the same "authorization: <key>" header (no Bearer prefix).
 *   3. Run: npm run sync
 *
 * Current priority order:
 *   1 → Pickalink CPA  (CPA, highest quality)
 *   2 → Pickalink CPC  (CPC)
 *   3 → Shoptastic CPA (CPA)
 *   4 → Shoptastic CPC (CPC, lowest priority)
 */
const FEEDS: FeedConfig[] = [
  {
    name: 'Pickalink CPA',
    type: 'cpa',
    baseUrl: 'https://api.pickalink.com/publisher/advertiserSearch?pubId=88888903&programId=10735',
    apiKey: process.env.PICKALINK_CPA_KEY ?? '',
    priority: 1,
  },
  {
    name: 'Pickalink CPC',
    type: 'cpc',
    baseUrl: 'https://api.pickalink.com/publisher/advertiserSearch?pubId=88888903&programId=10736',
    apiKey: process.env.PICKALINK_CPC_KEY ?? '',
    priority: 2,
  },
  {
    name: 'Shoptastic CPA',
    type: 'cpa',
    baseUrl: 'https://api.shoptastic.io/publisher/advertiserSearch?pubId=88888889',
    apiKey: process.env.SHOPTASTIC_CPA_KEY ?? '',
    priority: 3,
  },
  {
    name: 'Shoptastic CPC',
    type: 'cpc',
    baseUrl: 'https://api.shoptastic.io/publisher/advertiserSearch?pubId=88888890',
    apiKey: process.env.SHOPTASTIC_CPC_KEY ?? '',
    priority: 4,
  },
];

// ── Config ───────────────────────────────────────────────────────────────────

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const CHECKPOINT_FILE = path.join(DATA_DIR, '.sync-checkpoint.json');

// Markets we care about — everything else is filtered out
const TARGET_MARKETS = new Set(['US','UK','DE','FR','NL','ES','IT','SE','CH','AT','AU','DK','CA','FI','MX','BR','BE','NO']);

const PAGE_SIZE = 1000; // Maximum supported by the API

// Parse CLI args
const args = process.argv.slice(2);
const argMap: Record<string, string> = {};
for (let i = 0; i < args.length; i++) {
  if (args[i].startsWith('--')) {
    const nextArg = args[i + 1];
    // Only consume the next arg as a value if it doesn't look like a flag itself
    if (nextArg !== undefined && !nextArg.startsWith('--')) {
      argMap[args[i].slice(2)] = nextArg;
      i++;
    } else {
      argMap[args[i].slice(2)] = 'true';
    }
  }
}

const PAGE_DELAY_MS = parseInt(
  process.env.PAGE_DELAY_MS ?? argMap['page-delay-ms'] ?? '0',
  10
);
const MAX_PAGES = parseInt(
  process.env.MAX_PAGES ?? argMap['max-pages'] ?? '9999',
  10
);
const RESUME = argMap['resume'] === 'true' || !!argMap['resume'];
const CLASSIFY = argMap['classify'] === 'true' || !!argMap['classify'];

// ── Utilities ────────────────────────────────────────────────────────────────

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/** Slugify a brand name: "G Adventures US" → "g-adventures-us" */
function slugify(name: string | null | undefined): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/[&]/g, 'and')
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Strip trailing zeros: "4.2000%" → "4.20%" */
function formatCommission(raw: string | null | undefined): string {
  if (!raw) return '';
  const match = raw.match(/^(\d+\.?\d*)/);
  if (!match) return raw;
  const num = parseFloat(match[1]);
  return `${num.toFixed(2)}%`;
}

/** Strip "$" and parse eCPC: "$3.989994" → "3.99" */
function formatECPC(raw: string | null | undefined): string {
  if (!raw) return '';
  const num = parseFloat(raw.replace(/[^0-9.]/g, ''));
  return isNaN(num) ? raw : num.toFixed(2);
}

/** Extract bare domain (without www. or shop. prefix) and lowercase */
function normalizeDomain(domain: string, fallbackUrl?: string): string {
  const src = domain || fallbackUrl || '';
  try {
    const url = src.includes('://') ? new URL(src) : new URL('https://' + src);
    let host = url.hostname.toLowerCase();
    host = host.replace(/^www\./, '');
    host = host.replace(/^shop\./, ''); // shop.nike.com → nike.com
    return host;
  } catch {
    return src.toLowerCase()
      .replace(/^www\./, '')
      .replace(/^shop\./, '')
      .split('/')[0];
  }
}

/** Derive keyword tags from category strings */
function deriveTags(categories: string[]): string[] {
  const tagSet = new Set<string>();
  for (const cat of categories) {
    // e.g. "Travel & Vacations" → ["travel", "vacations"]
    const words = cat
      .toLowerCase()
      .replace(/&/g, ' ')
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 2 && !['and', 'the', 'for'].includes(w));
    words.forEach(w => tagSet.add(w));
  }
  return Array.from(tagSet);
}

// ── Brand Name Cleanup ────────────────────────────────────────────────────────

/** Trailing noise patterns stripped from the end of API brand names */
// All 18 market codes plus common ISO/regional variants used across patterns below
const CC = 'US|UK|GB|DE|FR|CA|AU|NL|ES|IT|SE|CH|AT|DK|NO|FI|MX|BR|PT|BE|IE|NZ|SG|HK|WW|EU|APAC';

const NAME_NOISE_PATTERNS: RegExp[] = [
  /\s*[-–|]\s*Official\s+Site\s*$/i,
  /\s*[|]\s*Shop\s+Now\s*$/i,
  /\s*\(\s*Official\s*\)\s*$/i,
  /\s+Online\s+Store\s*$/i,
  /\s+Online\s+Shop\s*$/i,

  // Underscore-separated commission+country chains at end: "_CPS_US", "_CA_FR_AU_UK", "_WW" etc.
  // Matches one or more groups of _XX or _CPS etc. (including comma-separated combos like _US,CA,MX)
  /(?:_(?:US|UK|DE|FR|CA|AU|NL|ES|IT|SE|CH|AT|DK|NO|FI|MX|BR|BE|WW|EU|IE|NZ|SG|HK|CP[ACSLR]))+(?:,[A-Z]{2})*\s*\*?\s*$/i,

  // Affiliate model indicators: trailing CPA, CPC, CPL, CPS, CPR (with optional dash)
  /\s*[-–]?\s*\bCP[ACSLR]\b\s*$/i,

  // Combined country + commission at end: "DE CPS", "ES CPA", "IT CPC"
  new RegExp(`\\s+(?:${CC})\\s+CP[ACSLR]\\s*$`),

  // Comma-separated market list before commission: "US, FR, SE, UK, ES CPS"
  /\s+(?:[A-Z]{2}(?:,\s*|\s+))+[A-Z]{2}\s+CP[ACSLR]\s*$/,

  // Market/region suffixes with preceding dash: "Nike - US", "Foreo – DE"
  new RegExp(`\\s*[-–]\\s*(?:${CC})(?:\\/[A-Z]+)*\\s*$`),

  // Multi-market combos: "ES & IT", "US & CA", "US &" — all 18 market codes
  new RegExp(`\\s+(?:${CC})\\s*[&+].*$`, 'i'),

  // Multi-market space-separated: "US CA MX", "US CA"
  new RegExp(`\\s+(?:${CC})\\s+[A-Z]{2}(?:\\s+[A-Z]{2})*\\s*$`),

  // Comma-separated market list at end: "UK, AU, US" or "_US,CA,MX" (after underscore chain stripped)
  /\s*,\s*(?:[A-Z]{2}(?:,\s*)?)+[A-Z]{2}\s*$/,

  // Standalone trailing market code: "Nike US", "Foreo ES", "Brand WW"
  new RegExp(`\\s+(?:${CC})(?:\\/[A-Z]+)*\\s*$`),

  // Extended region suffixes
  /\s+GCC\s*$/i,
  /\s+EU\s*$/i,
  /\s+USA\s*$/i,

  // Parenthesized country code: "(US)", "(ES)", "(IT)", "(NL)" etc. — all markets, optional trailing number
  new RegExp(`\\s*\\(\\s*(?:${CC}|SL)\\s*\\)\\s*(?:\\d+)?\\s*$`, 'i'),

  // Parenthesized comma-list: "(CA,AU,UK)", "(US, CA)"
  /\s*\(\s*[A-Z]{2}(?:,\s*[A-Z]{2})+\s*\)\s*$/,

  // Affiliate reporting noise
  /\s*\(\s*Reporting\s*(?:Realtime|\+?\s*\d*\s*days?)\s*\)\s*$/i,
  /\s*\(\s*Realtime\s*\)\s*$/i,
  /\s+offline\s+codes?\s*&?\s*links?\s*$/i,

  // Trailing bracket junk: [Official], [US], [New], [Sale], [Global] etc.
  /\s*\[[^\]]{1,30}\]\s*$/,

  // Trailing dangling punctuation left after other patterns run
  /\s*[&+|,\-–]\s*$/,

  // Trailing lone number (e.g. "Handyhuellen 4" after country strip)
  /\s+\d+\s*$/,
];

/** Leading prefixes stripped from the start of API brand names */
const NAME_LEADING_PREFIXES: RegExp[] = [
  /^Deeplink\s+/i,       // "Deeplink Brand" → "Brand" (case-insensitive covers DeepLink too)
  /^Links\s+/i,          // "Links Brand" → "Brand"
  /^[A-Z]{2}-\s*/,       // "AP- Brand", "AT- Brand" → "Brand" (affiliate platform prefixes)
];

/** True if a brand name is just a raw domain (no spaces, has a TLD extension) */
function looksLikeDomainName(name: string): boolean {
  return !/\s/.test(name) &&
    /\.(com|net|org|io|co\.uk|co\.au|co|uk|de|fr|ca|au|shop|store|me|app|biz|info|us|eu|online|site|tech|health|care)(\.[a-z]{2})?$/i.test(name);
}

/** Turn a raw domain into a readable brand name.
 *  acnenomore.com → Acnenomore  |  big-wave-drops.com → Big Wave Drops
 */
function humanizeDomainName(name: string): string {
  let base = name
    .replace(/\.co\.[a-z]{2}$/i, '')
    .replace(/\.[a-z]{2,10}$/i, '');

  // Strip affiliate/tracking prefixes embedded in domain names
  base = base.replace(/^deeplink[-_]/i, '').replace(/^deep-link[-_]/i, '');

  if (/[-_.]/.test(base)) {
    return base
      .split(/[-_.]+/)
      .filter(Boolean)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }

  const camelSplit = base.replace(/([a-z])([A-Z])/g, '$1 $2');
  if (camelSplit !== base) {
    return camelSplit.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }

  return base.charAt(0).toUpperCase() + base.slice(1);
}

function cleanBrandName(raw: string | null | undefined): string {
  if (!raw) return '';
  let name = raw.trim();

  // Strip leading bracket blocks: "[USA, CA] Brand" → "Brand"
  name = name.replace(/^\s*\[[^\]]*\]\s*/, '').trim();

  // Strip leading affiliate prefixes
  for (const pat of NAME_LEADING_PREFIXES) {
    name = name.replace(pat, '').trim();
  }

  // Apply trailing noise patterns in a loop until stable.
  // Multiple passes are needed because stripping one suffix can reveal another
  // (e.g. "Brand_CPS_UK (Reporting Realtime) GB" → strip GB → strip Reporting → strip _CPS_UK).
  for (let pass = 0; pass < 4; pass++) {
    const before = name;
    for (const pat of NAME_NOISE_PATTERNS) {
      name = name.replace(pat, '').trim();
    }
    // Underscore→space runs inside the loop so revealed country codes get stripped on the next pass
    // (e.g. "JR Pass_US, AU, UK" → comma strip → "JR Pass_US" → underscore→space → "JR Pass US" → US strip)
    if (name.includes('_')) {
      name = name.replace(/_+/g, ' ').trim();
    }
    name = name.replace(/\s{2,}/g, ' ').trim();
    name = name.replace(/[\s,\-–|&+]+$/, '').trim();
    if (name === before) break;
  }

  // If the result looks like a raw domain, humanize it
  if (looksLikeDomainName(name)) {
    name = humanizeDomainName(name);
  }

  return name || raw.trim(); // never return empty
}

/** True if name is ALL CAPS (4+ letters — short acronyms like HP/BMW are intentional) */
function isAllCaps(name: string): boolean {
  const letters = name.replace(/[^a-zA-Z]/g, '');
  return letters.length >= 4 && letters === letters.toUpperCase();
}

/** True if name has mixed case mid-word (e.g. AliExpress, iPhone) — signals intentional branding */
function hasMixedCase(name: string): boolean {
  const letters = name.replace(/[^a-zA-Z]/g, '');
  return letters.length >= 3 && /[A-Z]/.test(letters.slice(1));
}

/** Pick the more natural-looking display name between two candidates */
function pickBetterName(a: string, b: string): string {
  const aAllCaps = isAllCaps(a);
  const bAllCaps = isAllCaps(b);
  if (aAllCaps && !bAllCaps) return b;
  if (bAllCaps && !aAllCaps) return a;
  const aMixed = hasMixedCase(a);
  const bMixed = hasMixedCase(b);
  if (aMixed && !bMixed) return a;
  if (bMixed && !aMixed) return b;
  return a.length <= b.length ? a : b;
}

// ── SOI Detection ─────────────────────────────────────────────────────────────

/**
 * True if the brand is a lead-gen (SOI = Single Opt-In) offer.
 * SOI brands are not real product brands — they're email/survey offers.
 * Checked against the RAW API name before any cleanup.
 */
function isSOIBrand(rawName: string): boolean {
  return /\bSOI\b/.test(rawName);
}

// ── Commission Parsing ────────────────────────────────────────────────────────

/** Extract numeric commission value from strings like "4.20%" or "Up to 4.20%" */
function parseCommissionValue(commission: string): number {
  if (!commission) return 0;
  const match = commission.match(/(\d+\.?\d*)/);
  return match ? parseFloat(match[1]) : 0;
}

// ── Deduplication ─────────────────────────────────────────────────────────────

interface DedupeStats {
  removed: number;
  enriched: number;
}

/**
 * Deduplicate brands within one market by normalised domain.
 * Winner = highest commission rate; ties broken by logo presence, then shorter name.
 * Categories and tags from ALL duplicates are merged into the winner.
 */
function deduplicateMarket(brands: Brand[]): { result: Brand[]; stats: DedupeStats } {
  const groups = new Map<string, Brand[]>();
  for (const b of brands) {
    const key = b.domain.toLowerCase();
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(b);
  }

  const result: Brand[] = [];
  let removed = 0;
  let enriched = 0;

  for (const group of Array.from(groups.values())) {
    if (group.length === 1) {
      result.push(group[0]);
      continue;
    }

    // Sort: highest commission, then logo-bearing, then shorter name
    group.sort((a: Brand, b: Brand) => {
      const commDiff = parseCommissionValue(b.commission) - parseCommissionValue(a.commission);
      if (commDiff !== 0) return commDiff;
      const aLogo = a.logoQuality !== 'none' ? 1 : 0;
      const bLogo = b.logoQuality !== 'none' ? 1 : 0;
      if (aLogo !== bLogo) return bLogo - aLogo;
      return a.name.length - b.name.length;
    });

    const winner = { ...group[0] };

    const catSet = new Set(winner.categories);
    let newCats = false;
    for (let i = 1; i < group.length; i++) {
      for (const cat of group[i].categories) {
        if (!catSet.has(cat)) { catSet.add(cat); newCats = true; }
      }
    }
    if (newCats) {
      winner.categories = Array.from(catSet);
      winner.tags = deriveTags(winner.categories);
      enriched++;
    }

    let bestName = winner.name;
    for (let i = 1; i < group.length; i++) {
      bestName = pickBetterName(bestName, group[i].name);
    }
    winner.name = bestName;

    result.push(winner);
    removed += group.length - 1;
  }

  return { result, stats: { removed, enriched } };
}

/**
 * Cross-feed priority deduplication.
 * When brands from different feeds have the same domain+country, keep the one
 * from the highest-priority feed (lowest priority number = best).
 * Merges categories from lower-priority duplicates into the winner.
 */
function priorityDedup(brands: Brand[]): { result: Brand[]; conflicts: number } {
  const feedPriority = (source: string): number =>
    FEEDS.find(f => f.name === source)?.priority ?? 99;

  const key = (b: Brand) => `${b.domain}|${b.country}`;
  const groups = new Map<string, Brand[]>();
  for (const b of brands) {
    const k = key(b);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(b);
  }

  const result: Brand[] = [];
  let conflicts = 0;

  for (const group of Array.from(groups.values())) {
    if (group.length === 1) {
      result.push(group[0]);
      continue;
    }

    // Sort by feed priority (lowest number = highest priority)
    group.sort((a, b) => feedPriority(a.affiliateSource) - feedPriority(b.affiliateSource));

    const winner = { ...group[0] };

    // Merge categories from all entries
    const catSet = new Set(winner.categories);
    for (let i = 1; i < group.length; i++) {
      for (const cat of group[i].categories) catSet.add(cat);
    }
    winner.categories = Array.from(catSet);
    winner.tags = deriveTags(winner.categories);

    // Pick best display name across all entries
    let bestName = winner.name;
    for (let i = 1; i < group.length; i++) {
      bestName = pickBetterName(bestName, group[i].name);
    }
    winner.name = bestName;

    // Rescue best logo from lower-priority entries if winner has no actual logoImg.
    // A logo containing clearbit.com is a generated fallback, not a real logoImg.
    if (!winner.logo || winner.logo.includes('clearbit.com')) {
      for (let i = 1; i < group.length; i++) {
        if (group[i].logo && !group[i].logo.includes('clearbit.com')) {
          winner.logo = group[i].logo;
          break;
        }
      }
    }

    result.push(winner);
    conflicts += group.length - 1;
  }

  return { result, conflicts };
}

// ── Slug Assignment ───────────────────────────────────────────────────────────

function assignSlugs(brands: Brand[]): void {
  const slugDomains = new Map<string, Set<string>>();
  for (const b of brands) {
    const s = slugify(b.name);
    if (!slugDomains.has(s)) slugDomains.set(s, new Set());
    slugDomains.get(s)!.add(b.domain);
  }

  for (const b of brands) {
    const cleanSlug = slugify(b.name);
    const domains = slugDomains.get(cleanSlug)!;
    b.slug = domains.size > 1
      ? slugify(b.name + ' ' + b.country)
      : cleanSlug;
  }

  const seen = new Map<string, number>();
  for (const b of brands) {
    const count = seen.get(b.slug) ?? 0;
    if (count > 0) b.slug = `${b.slug}-${count}`;
    seen.set(b.slug, count + 1);
  }
}

// ── Junk Detection ────────────────────────────────────────────────────────────

const SPAM_FIRST_WORDS = new Set([
  'buy', 'cheap', 'free', 'discount', 'deals', 'sale', 'bargain',
  'wholesale', 'clearance',
]);

function isIpAddress(domain: string): boolean {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(domain);
}

function isDomainName(name: string, domain: string): boolean {
  const stripped = name.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9.]/g, '');
  const d = domain.toLowerCase();
  return stripped === d || stripped === d.replace(/\.[^.]+$/, '');
}

function detectJunk(brand: Brand): 'good' | 'suspect' {
  if (isIpAddress(brand.domain)) return 'suspect';
  const isDomainBrand = isDomainName(brand.name, brand.domain);
  // "N/A" commission = undisclosed rate (Pickalink CPA pattern) — treat as valid
  // CPC brands may have 0% commission but still have eCPC > 0 — don't flag them
  const commStr = (brand.commission || '').trim().toUpperCase();
  const hasRevenue = commStr === 'N/A'
    || parseCommissionValue(brand.commission) > 0
    || parseFloat(brand.eCPC) > 0;
  if (!isDomainBrand && !hasRevenue) return 'suspect';
  const firstWord = brand.name.trim().split(/\s+/)[0].toLowerCase();
  if (!isDomainBrand && SPAM_FIRST_WORDS.has(firstWord)) return 'suspect';
  return 'good';
}

// ── Logo Resolution (initial pass) ───────────────────────────────────────────

function resolveLogo(record: ApiRecord): string {
  if (record.logoImg) return record.logoImg;
  const domain = normalizeDomain(record.domain, record.advertiserHome);
  if (domain) return `https://logo.clearbit.com/${domain}?size=200`;
  return '';
}

// ── Logo Quality Detection ────────────────────────────────────────────────────

const SUB_BRAND_SUFFIXES = [
  'strength', 'outdoor', 'factory', 'outlet', 'store', 'shop', 'online',
  'direct', 'official', 'plus', 'pro', 'kids', 'junior', 'baby', 'men',
  'women', 'sport', 'sports', 'run', 'running', 'golf', 'tennis',
  'home', 'global', 'fit', 'fitness', 'travel', 'training', 'swim',
];

function deriveParentDomain(domain: string): string | null {
  const hostPart = domain.split('.')[0];
  for (const suffix of SUB_BRAND_SUFFIXES) {
    if (hostPart.endsWith(suffix) && hostPart.length > suffix.length) {
      const tld = domain.slice(domain.indexOf('.'));
      return hostPart.slice(0, hostPart.length - suffix.length) + tld;
    }
  }
  return null;
}

const LOGO_CHECK_CONCURRENCY = 30;
const urlCache = new Map<string, { ok: boolean; size: number; isImage: boolean }>();

async function checkUrl(
  url: string,
  method: 'HEAD' | 'GET' = 'HEAD',
): Promise<{ ok: boolean; size: number; isImage: boolean }> {
  if (urlCache.has(url)) return urlCache.get(url)!;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(url, { method, signal: controller.signal, redirect: 'follow' });
    clearTimeout(timer);
    const contentType = res.headers.get('content-type') ?? '';
    let size = parseInt(res.headers.get('content-length') ?? '0', 10);
    const isImage = contentType.startsWith('image/');

    // Read up to 4KB when size is unknown — covers GET responses with no Content-Length
    // and HEAD responses where Content-Length is missing on a CDN
    if (res.ok && isImage && size === 0) {
      const bodyRes = method === 'GET' ? res : await (async () => {
        const ctrl2 = new AbortController();
        const t2 = setTimeout(() => ctrl2.abort(), 6000);
        const r = await fetch(url, { signal: ctrl2.signal, redirect: 'follow' });
        clearTimeout(t2);
        return r;
      })();
      const reader = bodyRes.body?.getReader();
      if (reader) {
        let bytes = 0;
        while (bytes < 4096) {
          const { done, value } = await reader.read();
          if (done) break;
          bytes += value.length;
        }
        reader.cancel().catch(() => {});
        size = bytes;
      }
    }

    const result = { ok: res.ok, size, isImage };
    urlCache.set(url, result);
    return result;
  } catch {
    const result = { ok: false, size: 0, isImage: false };
    urlCache.set(url, result);
    return result;
  }
}

interface LogoResolution {
  logo: string;
  logoQuality: 'high' | 'medium' | 'low' | 'none';
  logoSource: Brand['logoSource'];
}

const LOGO_MIN_SIZE = 1024; // 1KB — filters out blank/placeholder images

async function resolveLogoQuality(brand: Brand): Promise<LogoResolution> {
  const domain = brand.domain;
  if (!domain) return { logo: '', logoQuality: 'none', logoSource: 'none' };

  // 1. API-provided logo (real asset from affiliate feed, not a Clearbit fallback)
  if (brand.logo && !brand.logo.includes('clearbit.com')) {
    const r = await checkUrl(brand.logo);
    if (r.ok && r.isImage && r.size > LOGO_MIN_SIZE) {
      return { logo: brand.logo, logoQuality: 'high', logoSource: 'api' };
    }
  }

  // 2. CompanyEnrich — free, no auth (50ms politeness delay)
  const ceUrl = `https://api.companyenrich.com/logo/${domain}`;
  const ce = await checkUrl(ceUrl);
  await sleep(50);
  if (ce.ok && ce.isImage && ce.size > LOGO_MIN_SIZE) {
    return { logo: ceUrl, logoQuality: 'high', logoSource: 'companyenrich' };
  }

  // 3. DeBounce — free, no auth (50ms politeness delay)
  const dbUrl = `https://logo.debounce.com/${domain}`;
  const db = await checkUrl(dbUrl);
  await sleep(50);
  if (db.ok && db.isImage && db.size > LOGO_MIN_SIZE) {
    return { logo: dbUrl, logoQuality: 'high', logoSource: 'debounce' };
  }

  // 4. Logo.dev — lower priority due to occasional incorrect logos; GET required
  const logoDevToken = process.env.LOGODEV_TOKEN ?? '';
  const logoDevUrl = `https://img.logo.dev/${domain}?token=${logoDevToken}&size=200&format=png`;
  const ld = await checkUrl(logoDevUrl, 'GET');
  await sleep(100);
  if (ld.ok && ld.isImage && ld.size > LOGO_MIN_SIZE) {
    return { logo: logoDevUrl, logoQuality: 'high', logoSource: 'logodev' };
  }

  // 5. Clearbit — existing fallback
  const parentDomain = deriveParentDomain(domain);
  const clearbitUrl = `https://logo.clearbit.com/${domain}?size=200`;
  const cb = await checkUrl(clearbitUrl);
  if (cb.ok && cb.isImage && cb.size > LOGO_MIN_SIZE) {
    return { logo: clearbitUrl, logoQuality: 'high', logoSource: 'clearbit' };
  }
  if (parentDomain) {
    const cbParent = `https://logo.clearbit.com/${parentDomain}?size=200`;
    const cbp = await checkUrl(cbParent);
    if (cbp.ok && cbp.isImage && cbp.size > LOGO_MIN_SIZE) {
      return { logo: cbParent, logoQuality: 'high', logoSource: 'clearbit' };
    }
  }

  // 6. Google Favicon — last resort (high-res, 128px)
  const gfUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
  const gf = await checkUrl(gfUrl);
  if (gf.ok && gf.isImage && gf.size > LOGO_MIN_SIZE) {
    return { logo: gfUrl, logoQuality: 'low', logoSource: 'google-favicon' };
  }

  return { logo: '', logoQuality: 'none', logoSource: 'none' };
}

/** Load logo data from the last sync to skip re-fetching already-resolved logos */
function loadExistingLogoCache(): Map<string, { logo: string; logoQuality: Brand['logoQuality']; logoSource: Brand['logoSource']; logoInheritedFrom?: string }> {
  const cache = new Map<string, { logo: string; logoQuality: Brand['logoQuality']; logoSource: Brand['logoSource']; logoInheritedFrom?: string }>();
  for (const market of Array.from(TARGET_MARKETS).map(m => m.toLowerCase())) {
    const file = path.join(DATA_DIR, `brands-${market}.json`);
    if (!fs.existsSync(file)) continue;
    try {
      const brands: Brand[] = JSON.parse(fs.readFileSync(file, 'utf8'));
      for (const b of brands) {
        if ((b.logoQuality === 'high' || b.logoQuality === 'medium') && b.logo && b.domain) {
          if (!cache.has(b.domain)) {
            cache.set(b.domain, {
              logo: b.logo,
              logoQuality: b.logoQuality,
              logoSource: b.logoSource ?? 'none',
              logoInheritedFrom: b.logoInheritedFrom,
            });
          }
        }
      }
    } catch { /* skip unreadable file */ }
  }
  return cache;
}

async function resolveAllLogos(brands: Brand[]): Promise<void> {
  const existingCache = loadExistingLogoCache();

  // Apply cached logos — skip brands already resolved from stable high-quality sources.
  // Logo.dev is NOT stable: CompanyEnrich/DeBounce now outrank it, so logodev brands get re-fetched.
  const STABLE_SOURCES = new Set<Brand['logoSource']>(['api', 'clearbit', 'inherited', 'companyenrich', 'debounce']);
  for (const brand of brands) {
    const cached = existingCache.get(brand.domain);
    if (!cached) continue;
    if (STABLE_SOURCES.has(cached.logoSource)) {
      brand.logo = cached.logo;
      brand.logoQuality = cached.logoQuality;
      brand.logoSource = cached.logoSource;
      if (cached.logoInheritedFrom) brand.logoInheritedFrom = cached.logoInheritedFrom;
    }
    // companyenrich/debounce/google-favicon brands stay as-is (logoQuality: 'none' default)
    // so they get re-checked through the cascade — Logo.dev may outrank them now
  }

  const stillToFetch = brands.filter(b => b.logoQuality === 'none' || b.logoQuality === 'low');
  console.log(`\n✓ Logo checks: ${stillToFetch.length.toLocaleString()} to fetch, ${brands.length - stillToFetch.length} from cache (concurrency=${LOGO_CHECK_CONCURRENCY})…`);

  let done = 0;
  for (let i = 0; i < stillToFetch.length; i += LOGO_CHECK_CONCURRENCY) {
    const batch = stillToFetch.slice(i, i + LOGO_CHECK_CONCURRENCY);
    const results = await Promise.all(batch.map(b => resolveLogoQuality(b)));
    for (let j = 0; j < batch.length; j++) {
      batch[j].logo = results[j].logo;
      batch[j].logoQuality = results[j].logoQuality;
      batch[j].logoSource = results[j].logoSource;
    }
    done += batch.length;
    const pct = Math.round((done / stillToFetch.length) * 100);
    process.stdout.write(`\r  Logo checks: ${done.toLocaleString()}/${stillToFetch.length.toLocaleString()} (${pct}%)    `);
  }
  if (stillToFetch.length > 0) console.log('');
}

function inheritLogos(brands: Brand[]): number {
  const qualityRank: Record<Brand['logoQuality'], number> = { high: 3, medium: 2, low: 1, none: 0 };

  // Build parent map keyed by first domain segment — only from non-inherited brands
  // (to avoid chaining off another sub-brand's possibly-wrong logo)
  const parentMap = new Map<string, { logo: string; logoQuality: Brand['logoQuality']; logoSource: Brand['logoSource']; domain: string }>();
  for (const brand of brands) {
    if (!brand.logo || brand.logoSource === 'inherited') continue;
    const root = brand.domain.split('.')[0];
    const existing = parentMap.get(root);
    if (!existing || qualityRank[brand.logoQuality] > qualityRank[existing.logoQuality]) {
      parentMap.set(root, { logo: brand.logo, logoQuality: brand.logoQuality, logoSource: brand.logoSource, domain: brand.domain });
    }
  }

  let inherited = 0;
  for (const brand of brands) {
    const host = brand.domain.split('.')[0];

    // Check every sub-brand suffix — no quality guard, always override
    // A wrong CompanyEnrich logo on nikestrength.com must be replaced with Nike's
    for (const suffix of SUB_BRAND_SUFFIXES) {
      if (host.endsWith(suffix) && host.length > suffix.length + 1) {
        const root = host.slice(0, host.length - suffix.length);
        if (root.length < 2) continue;
        const parent = parentMap.get(root);
        if (parent && parent.logo) {
          const alreadyInherited =
            brand.logoSource === 'inherited' && brand.logoInheritedFrom === parent.domain;
          if (alreadyInherited) break; // idempotent — nothing to change
          brand.logo = parent.logo;
          brand.logoQuality = parent.logoQuality;
          brand.logoSource = 'inherited';
          brand.logoInheritedFrom = parent.domain;
          inherited++;
          break;
        }
      }
    }
  }
  return inherited;
}

// ── API Fetching ──────────────────────────────────────────────────────────────

async function fetchPage(feed: FeedConfig, pageNumber: number): Promise<ApiResponse> {
  const url = `${feed.baseUrl}&pageNumber=${pageNumber}&pageSize=${PAGE_SIZE}`;
  const response = await fetch(url, {
    headers: { authorization: feed.apiKey },
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} on page ${pageNumber}`);
  }
  const data = (await response.json()) as ApiResponse;
  if (data.code === 'noDataFound') {
    // Feed has no data — return empty response so we skip gracefully
    return { ...data, code: 'success', results: [], totalRecords: 0, totalPages: 0 };
  }
  if (data.code !== 'success') {
    throw new Error(`API error on page ${pageNumber}: ${JSON.stringify(data)}`);
  }
  return data;
}

/**
 * Fetch all pages from a single feed.
 * Tags each record with _feedName and _feedPriority for later priority dedup.
 */
async function fetchFeedBrands(
  feed: FeedConfig,
  existingRaw: ApiRecord[],
  startPage: number,
  onCheckpoint: (page: number, records: ApiRecord[]) => void
): Promise<ApiRecord[]> {
  const allRecords = [...existingRaw];
  const existingIds = new Set(existingRaw.map(r => `${feed.name}:${r.advertiserId}`));

  console.log(`\n[${feed.name}] Fetching from page ${startPage}…`);

  const first = await fetchPage(feed, startPage);
  const totalPages = Math.min(first.totalPages, startPage + MAX_PAGES - 1);

  if (totalPages === 0) {
    console.log(`[${feed.name}] No data available — skipping`);
    return allRecords;
  }

  console.log(
    `[${feed.name}] ${first.totalRecords.toLocaleString()} total brands across ${first.totalPages} pages`
  );
  console.log(
    `[${feed.name}] Fetching pages ${startPage}–${totalPages} (${PAGE_SIZE}/page)`
  );

  for (const r of first.results) {
    const id = `${feed.name}:${r.advertiserId}`;
    if (!existingIds.has(id)) {
      allRecords.push({ ...r, _feedName: feed.name, _feedPriority: feed.priority });
      existingIds.add(id);
    }
  }

  for (let page = startPage + 1; page <= totalPages; page++) {
    if (PAGE_DELAY_MS > 0) {
      const mins = (PAGE_DELAY_MS / 60000).toFixed(1);
      process.stdout.write(
        `\r[${feed.name}] Page ${page}/${totalPages} — waiting ${mins}m delay…    `
      );
      await sleep(PAGE_DELAY_MS);
    }

    try {
      const data = await fetchPage(feed, page);
      let added = 0;
      for (const r of data.results) {
        const id = `${feed.name}:${r.advertiserId}`;
        if (!existingIds.has(id)) {
          allRecords.push({ ...r, _feedName: feed.name, _feedPriority: feed.priority });
          existingIds.add(id);
          added++;
        }
      }

      const progress = Math.round((page / totalPages) * 100);
      process.stdout.write(
        `\r[${feed.name}] Page ${page}/${totalPages} (${progress}%) — ${allRecords.length.toLocaleString()} total (+${added})    `
      );

      if (page % 10 === 0) {
        onCheckpoint(page, allRecords);
      }
    } catch (err) {
      console.error(`\nError on page ${page}: ${err}. Skipping.`);
    }
  }

  console.log('');
  return allRecords;
}

// ── Checkpoint ───────────────────────────────────────────────────────────────

function loadCheckpoint(): Checkpoint | null {
  try {
    if (fs.existsSync(CHECKPOINT_FILE)) {
      const raw = JSON.parse(fs.readFileSync(CHECKPOINT_FILE, 'utf-8'));
      // Detect new format by presence of completedFeeds array
      if (Array.isArray(raw.completedFeeds)) {
        return raw as Checkpoint;
      }
      // Old format — incompatible, ignore
      console.log('  Old checkpoint format detected — starting fresh.');
    }
  } catch {}
  return null;
}

function saveCheckpoint(checkpoint: Checkpoint) {
  fs.writeFileSync(CHECKPOINT_FILE, JSON.stringify(checkpoint, null, 2));
}

// ── Brand Normalisation ───────────────────────────────────────────────────────

function normalise(record: ApiRecord): Brand {
  const domain = normalizeDomain(record.domain, record.advertiserHome);
  const categories = (record.categories ?? []).filter(Boolean);
  const tags = deriveTags(categories);
  const name = cleanBrandName(record.advertiserName);

  return {
    id: String(record.advertiserId),
    name,
    slug: slugify(name),
    domain,
    description: '',
    logo: resolveLogo(record),
    categories,
    tags,
    country: record.country,
    affiliateUrl: record.commissionUrl ?? '',
    deeplinkUrl: record.deeplinkUrl ?? '',
    supportsDeepLink: record.supportDeepLink ?? false,
    commission: formatCommission(record.commission ?? ''),
    commissionType: record.commissionType ?? '',
    eCPC: formatECPC(record.eCPC ?? ''),
    similarBrands: [],
    logoQuality: 'none',
    logoSource: 'none',
    quality: 'good',
    affiliateSource: record._feedName ?? 'unknown',
  };
}

// ── Similarity ───────────────────────────────────────────────────────────────

function computeSimilarity(brands: Brand[], topN = 15): Brand[] {
  const categoryIndex = new Map<string, number[]>();
  for (let i = 0; i < brands.length; i++) {
    for (const cat of brands[i].categories) {
      if (!categoryIndex.has(cat)) categoryIndex.set(cat, []);
      categoryIndex.get(cat)!.push(i);
    }
  }

  let selfRefs = 0;

  for (let i = 0; i < brands.length; i++) {
    const brand = brands[i];
    const scoreMap = new Map<number, number>();

    for (const cat of brand.categories) {
      for (const j of categoryIndex.get(cat) ?? []) {
        if (j === i) continue;
        scoreMap.set(j, (scoreMap.get(j) ?? 0) + 3);
      }
    }

    for (const [j, _] of Array.from(scoreMap)) {
      const other = brands[j];
      for (const tag of brand.tags) {
        if (other.tags.includes(tag)) {
          scoreMap.set(j, scoreMap.get(j)! + 1);
        }
      }
    }

    const candidates = Array.from(scoreMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, topN)
      .map(([j]) => brands[j]);

    // Filter self-references: remove alternatives with the same domain
    const filtered = candidates.filter(other => {
      if (brand.domain && other.domain && brand.domain === other.domain) {
        selfRefs++;
        return false;
      }
      return true;
    });

    brand.similarBrands = filtered.map(b => b.slug);
  }

  if (selfRefs > 0) {
    console.log(`✓ Self-reference filter: ${selfRefs} self-referencing alternatives removed`);
  }

  return brands;
}

// ── Category Inference ────────────────────────────────────────────────────────

/** Maps keyword patterns to canonical API category names (must match translations.ts exactly) */
const CATEGORY_KEYWORDS: Array<{ pattern: RegExp; category: string }> = [
  { pattern: /shoe|boot|sneaker|footwear|heel|sandal|clog/i,                                                         category: 'Shoes' },
  { pattern: /beauty|skincare|skin.?care|makeup|cosmetic|hair|fragrance|perfume|nail|lotion|serum|moistur/i,         category: 'Health & Beauty' },
  { pattern: /cloth|apparel|fashion|dress|shirt|jeans|outfitter|wear|wardrob|jacket|coat|trouser|skirt|suit/i,       category: 'Clothing' },
  { pattern: /sport|gym|fitness|yoga|athlet|outdoor|hiking|camping|running|cycling|swimming|golf|tennis|workout/i,   category: 'Sports, Outdoors & Fitness' },
  { pattern: /electron|gadget|computer|laptop|phone|tablet|software|gaming|wireless|headphone|speaker/i,             category: 'Electronics' },
  { pattern: /travel|hotel|flight|vacation|holiday|cruise|booking|airbnb|resort|accommodation/i,                     category: 'Travel & Vacations' },
  { pattern: /furniture|garden|kitchen|decor|living|bedding|bath|rug|curtain|sofa|lamp|mattress/i,                   category: 'Home & Garden' },
  { pattern: /food|drink|restaurant|coffee|tea|wine|beer|grocery|meal|snack|nutrition|organic|supplement|vitamin/i,  category: 'Food, Drinks & Restaurants' },
  { pattern: /jewel|jewellery|watch|handbag|purse|accessory|wallet|belt|scarf|sunglasses|luggage/i,                  category: 'Accessories' },
  { pattern: /pet|dog|cat|veterinar|animal|puppy|kitten|aquarium/i,                                                  category: 'Pets' },
  { pattern: /baby|infant|toddler|nursery|maternity|nappy|diaper|stroller/i,                                         category: 'Baby & Toddler' },
  { pattern: /toy|board.?game|video.?game|console|lego|puzzle/i,                                                     category: 'Toys & Games' },
  { pattern: /streaming|podcast|music|ebook|magazine|subscription.?box|monthly.?box/i,                               category: 'Digital Services & Streaming' },
  { pattern: /\bcar\b|tyre|tire|automotive|vehicle|truck|motorcycle|motorbike/i,                                     category: 'Auto & Tires' },
  { pattern: /gift|flower|floral|party|occasion|wedding|celebration|balloon|greeting/i,                              category: 'Gifts, Flowers & Parties' },
  { pattern: /event|ticket|entertainment|concert|theater|theatre|cinema|festival|sport.?event/i,                     category: 'Events & Entertainment' },
  { pattern: /office|stationery|printer|ink|toner|business.?supply|supplies/i,                                       category: 'Office Supplies' },
];

/** Try to infer a category from brand name + domain keywords. Returns null if no match. */
function inferCategoryFromText(name: string, domain: string): string | null {
  const text = `${name} ${domain}`.toLowerCase();
  for (const { pattern, category } of CATEGORY_KEYWORDS) {
    if (pattern.test(text)) return category;
  }
  return null;
}

/**
 * For brands with empty or generic "Products" categories, attempt to infer
 * a better category from brand name + domain. Brands that remain uncategorised
 * keep "Products" as a fallback.
 * Returns stats and the list of brands that couldn't be categorised.
 */
function assignMissingCategories(brands: Brand[]): {
  assigned: number;
  stillMissing: number;
  noCategoryBrands: Array<{ name: string; domain: string; country: string }>;
} {
  const GENERIC_CATS = new Set(['Products', 'products']);
  let assigned = 0;
  let stillMissing = 0;
  const noCategoryBrands: Array<{ name: string; domain: string; country: string }> = [];

  for (const brand of brands) {
    const hasRealCategory = brand.categories.some(c => c && !GENERIC_CATS.has(c));
    if (hasRealCategory) continue; // already has a real category

    const inferred = inferCategoryFromText(brand.name, brand.domain);
    if (inferred) {
      // Replace generic/empty with inferred (keep generic as secondary for breadcrumb fallback)
      brand.categories = [inferred, ...brand.categories.filter(c => GENERIC_CATS.has(c))];
      brand.tags = deriveTags([inferred]);
      assigned++;
    } else {
      // No inference possible — ensure "Products" fallback exists
      if (brand.categories.length === 0) {
        brand.categories = ['Products'];
        brand.tags = ['products'];
      }
      stillMissing++;
      noCategoryBrands.push({ name: brand.name, domain: brand.domain, country: brand.country });
    }
  }

  return { assigned, stillMissing, noCategoryBrands };
}

// ── Strategy 1: Cross-market category inheritance ─────────────────────────────

const GENERIC_CATS_SET = new Set(['Products', 'products', '']);

/**
 * For each brand that only has a generic "Products" category, check whether
 * the same domain has a real category in any other market and inherit it.
 * Returns the count of brands that received an inherited category.
 */
function crossMarketInheritance(byMarket: Record<string, Brand[]>): number {
  // Pass 1: build domain → best category from brands that have a real category
  const domainCategory = new Map<string, string>();
  for (const brands of Object.values(byMarket)) {
    for (const brand of brands) {
      if (!brand.domain) continue;
      const realCat = brand.categories.find(c => c && !GENERIC_CATS_SET.has(c));
      if (realCat && !domainCategory.has(brand.domain)) {
        domainCategory.set(brand.domain, realCat);
      }
    }
  }

  // Pass 2: apply inherited categories to brands that only have "Products"
  let inherited = 0;
  for (const brands of Object.values(byMarket)) {
    for (const brand of brands) {
      if (!brand.domain) continue;
      const hasReal = brand.categories.some(c => c && !GENERIC_CATS_SET.has(c));
      if (hasReal) continue;
      const inheritedCat = domainCategory.get(brand.domain);
      if (inheritedCat) {
        brand.categories = [inheritedCat];
        brand.tags = deriveTags([inheritedCat]);
        inherited++;
      }
    }
  }

  return inherited;
}

// ── Strategy 2: LLM batch classification ──────────────────────────────────────

const LLM_CACHE_FILE = path.join(DATA_DIR, 'llm-categories.json');

const VALID_LLM_CATEGORIES = new Set([
  'Health & Beauty', 'Accessories', 'Home & Garden', 'Clothing',
  'Sports Outdoors & Fitness', 'Digital Services & Streaming', 'Electronics',
  'Food Drinks & Restaurants', 'Travel & Vacations', 'Gifts Flowers & Parties',
  'Shoes', 'Subscription Boxes & Services', 'Toys & Games',
  'Events & Entertainment', 'Auto & Tires', 'Pets', 'Baby & Toddler', 'Office Supplies',
]);

function loadLLMCache(): Record<string, string> {
  if (fs.existsSync(LLM_CACHE_FILE)) {
    return JSON.parse(fs.readFileSync(LLM_CACHE_FILE, 'utf-8'));
  }
  return {};
}

function saveLLMCache(cache: Record<string, string>): void {
  fs.writeFileSync(LLM_CACHE_FILE, JSON.stringify(cache, null, 2));
}

/** POST to the Anthropic Messages API. Returns raw response text. */
async function callClaudeAPI(prompt: string, apiKey: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    });

    const req = https.request({
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
        'content-length': Buffer.byteLength(body),
      },
    }, (res) => {
      let data = '';
      res.on('data', (chunk: Buffer) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          resolve(data);
        } else {
          reject(new Error(`Anthropic API ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

/** Apply the LLM cache to brands that still have "Products" only. Returns count applied. */
function applyLLMCache(byMarket: Record<string, Brand[]>, cache: Record<string, string>): number {
  let applied = 0;
  for (const brands of Object.values(byMarket)) {
    for (const brand of brands) {
      if (!brand.domain) continue;
      const hasReal = brand.categories.some(c => c && !GENERIC_CATS_SET.has(c));
      if (hasReal) continue;
      const llmCat = cache[brand.domain];
      if (llmCat && VALID_LLM_CATEGORIES.has(llmCat)) {
        brand.categories = [llmCat];
        brand.tags = deriveTags([llmCat]);
        applied++;
      }
    }
  }
  return applied;
}

/**
 * Uses the Claude API to classify brands that still have "Products" as their
 * only category. Results are cached in data/llm-categories.json so subsequent
 * syncs reuse classifications without calling the API again.
 *
 * Only runs when --classify flag is passed (costs money).
 */
async function classifyWithLLM(byMarket: Record<string, Brand[]>): Promise<number> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('  ✗ ANTHROPIC_API_KEY not set — skipping LLM classification');
    return 0;
  }

  const cache = loadLLMCache();

  // Collect unique domains still on "Products" that aren't yet in cache
  const toClassify: Array<{ name: string; domain: string }> = [];
  const seen = new Set<string>();
  for (const brands of Object.values(byMarket)) {
    for (const brand of brands) {
      if (!brand.domain || seen.has(brand.domain)) continue;
      seen.add(brand.domain);
      const hasReal = brand.categories.some(c => c && !GENERIC_CATS_SET.has(c));
      if (hasReal || cache[brand.domain] !== undefined) continue;
      toClassify.push({ name: brand.name, domain: brand.domain });
    }
  }

  const cachedCount = Object.keys(cache).length;
  console.log(`  Domains to classify: ${toClassify.length.toLocaleString()} new  (${cachedCount.toLocaleString()} already cached)`);

  if (toClassify.length === 0) {
    const applied = applyLLMCache(byMarket, cache);
    console.log(`  ✓ Applied ${applied} cached LLM classifications`);
    return applied;
  }

  // Process in batches of 50
  const BATCH_SIZE = 50;
  let newlyClassified = 0;
  const totalBatches = Math.ceil(toClassify.length / BATCH_SIZE);

  for (let i = 0; i < toClassify.length; i += BATCH_SIZE) {
    const batch = toClassify.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    process.stdout.write(`  Batch ${batchNum}/${totalBatches} (${batch.length} brands)...`);

    const brandList = batch.map(b => `${b.name} (${b.domain})`).join('\n');
    const prompt = `Classify each brand into exactly ONE of these categories based on the brand name and domain:
Health & Beauty, Accessories, Home & Garden, Clothing, Sports Outdoors & Fitness, Digital Services & Streaming, Electronics, Food Drinks & Restaurants, Travel & Vacations, Gifts Flowers & Parties, Shoes, Subscription Boxes & Services, Toys & Games, Events & Entertainment, Auto & Tires, Pets, Baby & Toddler, Office Supplies

If you cannot determine the category with reasonable confidence, respond with "Unknown".

Respond ONLY in JSON format (no other text): {"domain1.com": "Category", "domain2.com": "Category", ...}

Brands to classify:
${brandList}`;

    try {
      const rawResponse = await callClaudeAPI(prompt, apiKey);
      const parsed = JSON.parse(rawResponse) as { content?: Array<{ text?: string }> };
      const text = parsed.content?.[0]?.text ?? '';

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.log(' ✗ no JSON in response');
        continue;
      }

      const classifications = JSON.parse(jsonMatch[0]) as Record<string, string>;
      let batchNew = 0;
      for (const [domain, category] of Object.entries(classifications)) {
        if (VALID_LLM_CATEGORIES.has(category)) {
          cache[domain] = category;
          batchNew++;
        } else if (category === 'Unknown') {
          cache[domain] = 'Unknown'; // mark as checked so we don't retry
        }
      }
      newlyClassified += batchNew;
      console.log(` ✓ ${batchNew}/${batch.length} classified`);

      // Save after every batch so progress survives interruption
      saveLLMCache(cache);

      if (i + BATCH_SIZE < toClassify.length) await sleep(500);
    } catch (err) {
      console.log(` ✗ ${err}`);
    }
  }

  const applied = applyLLMCache(byMarket, cache);
  console.log(`  ✓ LLM total: ${newlyClassified} newly classified, ${applied} brands updated across all markets`);
  return applied;
}

// ── Category Summaries ────────────────────────────────────────────────────────

function buildCategories(brands: Brand[]): CategorySummary[] {
  const counts = new Map<string, number>();
  for (const brand of brands) {
    for (const cat of brand.categories) {
      counts.set(cat, (counts.get(cat) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([name, brandCount]) => ({
      name,
      slug: slugify(name),
      brandCount,
    }));
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('╔══════════════════════════════════════════╗');
  console.log('║   Brandswitch — Brand Sync Pipeline      ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log(`Page size: ${PAGE_SIZE} | Max pages: ${MAX_PAGES} | Delay: ${PAGE_DELAY_MS}ms`);
  console.log(`Feeds: ${FEEDS.map(f => f.name).join(', ')}`);

  fs.mkdirSync(DATA_DIR, { recursive: true });

  // Load or init checkpoint
  let checkpoint = loadCheckpoint();
  let completedFeeds: string[] = [];
  let lastPageByFeed: Record<string, number> = {};
  let allRawBrands: ApiRecord[] = [];

  if (RESUME && checkpoint && !checkpoint.completedAt) {
    completedFeeds = checkpoint.completedFeeds;
    lastPageByFeed = checkpoint.lastPageByFeed;
    allRawBrands = checkpoint.rawBrands;
    console.log(
      `\nResuming — completed feeds: [${completedFeeds.join(', ') || 'none'}] — ${allRawBrands.length.toLocaleString()} records so far`
    );
  } else if (checkpoint?.completedAt) {
    console.log(`\nPrevious sync completed at ${checkpoint.completedAt}. Starting fresh.`);
  } else {
    console.log('\nNo checkpoint found — starting fresh.');
  }

  // ── Step 1: Fetch from all FEEDS ─────────────────────────────────────────
  for (const feed of FEEDS) {
    if (completedFeeds.includes(feed.name)) {
      const existing = allRawBrands.filter(r => r._feedName === feed.name);
      console.log(`\n[${feed.name}] Already completed — skipping (${existing.length.toLocaleString()} records cached)`);
      continue;
    }

    const feedStartPage = lastPageByFeed[feed.name] ?? 1;
    const feedExisting = allRawBrands.filter(r => r._feedName === feed.name);

    const feedBrands = await fetchFeedBrands(
      feed,
      feedExisting,
      feedStartPage,
      (page, records) => {
        // Update checkpoint with partial progress for this feed
        const otherBrands = allRawBrands.filter(r => r._feedName !== feed.name);
        saveCheckpoint({
          completedFeeds,
          lastPageByFeed: { ...lastPageByFeed, [feed.name]: page },
          rawBrands: [...otherBrands, ...records],
          completedAt: null,
        });
      }
    );

    // Replace this feed's records in the combined array
    allRawBrands = allRawBrands.filter(r => r._feedName !== feed.name);
    allRawBrands.push(...feedBrands);

    completedFeeds = [...completedFeeds, feed.name];
    saveCheckpoint({
      completedFeeds,
      lastPageByFeed,
      rawBrands: allRawBrands,
      completedAt: null,
    });

    console.log(`✓ [${feed.name}] Completed: ${feedBrands.length.toLocaleString()} records`);
  }

  console.log(`\n✓ Fetched ${allRawBrands.length.toLocaleString()} total raw records across all feeds`);

  // ── Step 2: SOI filter (before normalization) ─────────────────────────────
  const beforeSOI = allRawBrands.length;
  const soiFiltered = allRawBrands.filter(r => !isSOIBrand(r.advertiserName));
  const soiRemoved = beforeSOI - soiFiltered.length;
  if (soiRemoved > 0) console.log(`✓ SOI filter: removed ${soiRemoved} lead-gen brands`);

  // ── Step 3: Normalise ────────────────────────────────────────────────────
  const normalised = soiFiltered.map(normalise);

  // ── Step 3.5: Assign missing categories ──────────────────────────────────
  const { assigned: catAssigned, stillMissing: catMissing, noCategoryBrands } = assignMissingCategories(normalised);
  console.log(`✓ Category inference: ${catAssigned} brands assigned a category, ${catMissing} still uncategorised (keeping "Products" fallback)`);
  fs.writeFileSync(
    path.join(DATA_DIR, 'no-category-brands.json'),
    JSON.stringify(noCategoryBrands, null, 2)
  );

  // ── Step 4: Filter to target markets ────────────────────────────────────
  const byMarket: Record<string, Brand[]> = Object.fromEntries(
    Array.from(TARGET_MARKETS).map(m => [m, []])
  );
  let filteredOut = 0;
  for (const brand of normalised) {
    if (TARGET_MARKETS.has(brand.country)) {
      byMarket[brand.country].push(brand);
    } else {
      filteredOut++;
    }
  }
  console.log(`✓ Filtered out ${filteredOut.toLocaleString()} non-target-market brands`);

  // ── Step 4.5: Cross-feed priority dedup ──────────────────────────────────
  const allTargetBrandsBeforePriority = Object.values(byMarket).flat();
  const { result: priorityDeduped, conflicts } = priorityDedup(allTargetBrandsBeforePriority);
  console.log(`✓ Cross-feed priority dedup: ${conflicts} lower-priority duplicates resolved`);

  // Re-populate byMarket with deduped brands
  for (const market of Object.keys(byMarket)) byMarket[market] = [];
  for (const brand of priorityDeduped) {
    if (TARGET_MARKETS.has(brand.country)) byMarket[brand.country].push(brand);
  }

  // ── Step 5: Junk detection ───────────────────────────────────────────────
  const flaggedByMarket: Record<string, Brand[]> = { US: [], UK: [], DE: [], FR: [] };
  for (const market of Object.keys(byMarket)) {
    const { good, flagged } = byMarket[market].reduce(
      (acc, b) => {
        b.quality = detectJunk(b);
        if (b.quality === 'suspect') acc.flagged.push(b);
        else acc.good.push(b);
        return acc;
      },
      { good: [] as Brand[], flagged: [] as Brand[] }
    );
    byMarket[market] = good;
    flaggedByMarket[market] = flagged;
  }
  const totalFlagged = Object.values(flaggedByMarket).reduce((s, v) => s + v.length, 0);
  console.log(`✓ Junk detection: ${totalFlagged} suspect brands flagged`);

  // Write flagged files for review
  for (const market of Object.keys(flaggedByMarket)) {
    fs.writeFileSync(
      path.join(DATA_DIR, `flagged-${market.toLowerCase()}.json`),
      JSON.stringify(flaggedByMarket[market], null, 2)
    );
  }

  // ── Step 6: Resolve logo quality ─────────────────────────────────────────
  const allTargetBrands = Object.values(byMarket).flat();
  await resolveAllLogos(allTargetBrands);

  // ── Step 6.5: Logo inheritance ───────────────────────────────────────────
  const inheritedCount = inheritLogos(allTargetBrands);
  console.log(`✓ Logo inheritance: ${inheritedCount} brands inherited logo from a parent brand`);

  // ── Step 7: Deduplication by domain within each market ───────────────────
  const beforeDedup = Object.values(byMarket).reduce((s, v) => s + v.length, 0);
  const dedupeStatsByMarket: Record<string, DedupeStats> = {};
  let totalDupesRemoved = 0;
  let totalEnriched = 0;
  for (const market of Object.keys(byMarket)) {
    const { result, stats } = deduplicateMarket(byMarket[market]);
    byMarket[market] = result;
    dedupeStatsByMarket[market] = stats;
    totalDupesRemoved += stats.removed;
    totalEnriched += stats.enriched;
  }
  console.log(`✓ Domain dedup: ${totalDupesRemoved.toLocaleString()} duplicates removed, ${totalEnriched} brands enriched`);

  // ── Step 7.5: Cross-market category inheritance ──────────────────────────
  const crossMarketInherited = crossMarketInheritance(byMarket);
  console.log(`✓ Cross-market inheritance: ${crossMarketInherited.toLocaleString()} brands got a category from another market`);

  // ── Step 7.6: LLM classification (only with --classify flag) ─────────────
  let llmApplied = 0;
  if (CLASSIFY) {
    console.log('✓ LLM classification (--classify flag detected)...');
    llmApplied = await classifyWithLLM(byMarket);
  } else {
    // Always apply cached LLM results from previous --classify runs
    llmApplied = applyLLMCache(byMarket, loadLLMCache());
    if (llmApplied > 0) {
      console.log(`✓ Applied ${llmApplied} cached LLM classifications (run with --classify to update cache)`);
    }
  }

  // ── Step 8: Assign clean slugs ───────────────────────────────────────────
  for (const market of Object.keys(byMarket)) {
    assignSlugs(byMarket[market]);
  }

  // ── Step 9: Compute similarity scores ────────────────────────────────────
  console.log('✓ Computing similarity scores…');
  for (const market of Object.keys(byMarket)) {
    byMarket[market] = computeSimilarity(byMarket[market]);
  }

  // ── Step 10: Write output files ──────────────────────────────────────────
  const counts: Record<string, number> = {};

  for (const market of Object.keys(byMarket)) {
    const key = market.toLowerCase();
    const brands = byMarket[market];
    counts[market] = brands.length;

    // brands-{market}.json — strip internal-only fields
    fs.writeFileSync(
      path.join(DATA_DIR, `brands-${key}.json`),
      JSON.stringify(brands.map(({ quality: _q, ...rest }) => rest), null, 2)
    );

    // search-index-{market}.json — lightweight index for autocomplete
    const searchIndex = brands.map(b => ({
      name: b.name,
      slug: b.slug,
      logo: b.logo ?? '',
      logoQuality: b.logoQuality ?? 'low',
      domain: b.domain ?? '',
      cat: b.categories?.[0] ?? '',
      eCPC: b.eCPC ?? '0',
    }));
    const searchIndexJson = JSON.stringify(searchIndex);
    fs.writeFileSync(path.join(DATA_DIR, `search-index-${key}.json`), searchIndexJson);
    // Also write to public/ so it can be fetched client-side (bypasses /api/search)
    const publicDir = path.join(ROOT, 'public');
    if (fs.existsSync(publicDir)) {
      fs.writeFileSync(path.join(publicDir, `search-index-${key}.json`), searchIndexJson);
    }

    // categories-{market}.json
    const categories = buildCategories(brands);
    fs.writeFileSync(
      path.join(DATA_DIR, `categories-${key}.json`),
      JSON.stringify(categories, null, 2)
    );
  }

  // ── Step 10b: Generate per-market top-brands-matched files ───────────────
  // For each market (other than US), filter the US curated list to brands
  // that exist in that market's slug index, then write the result.
  const usMatchedFile = path.join(DATA_DIR, 'top-brands-matched-us.json');
  if (fs.existsSync(usMatchedFile)) {
    const usMatched: Record<string, Array<{ rank: number; name: string; slug: string }>> =
      JSON.parse(fs.readFileSync(usMatchedFile, 'utf-8'));

    for (const market of Object.keys(byMarket)) {
      if (market === 'US') continue; // US file already exists
      const marketKey = market.toLowerCase();
      const slugSet = new Set(byMarket[market].map(b => b.slug));
      const marketMatched: Record<string, Array<{ rank: number; name: string; slug: string }>> = {};
      for (const [cat, entries] of Object.entries(usMatched)) {
        const filtered = entries.filter(e => slugSet.has(e.slug));
        if (filtered.length > 0) marketMatched[cat] = filtered;
      }
      fs.writeFileSync(
        path.join(DATA_DIR, `top-brands-matched-${marketKey}.json`),
        JSON.stringify(marketMatched, null, 2)
      );
    }
    console.log(`✓ Per-market top-brands-matched files written`);
  }

  // ── Step 11: Write summary ───────────────────────────────────────────────
  const totalGood = Object.values(counts).reduce((a, b) => a + b, 0);
  const summary = {
    syncedAt: new Date().toISOString(),
    markets: counts,
    total: totalGood,
    pagesSource: MAX_PAGES >= 9999 ? 'all' : `first ${MAX_PAGES}`,
  };
  fs.writeFileSync(
    path.join(DATA_DIR, 'sync-summary.json'),
    JSON.stringify(summary, null, 2)
  );

  // ── Step 12: Save completed checkpoint ───────────────────────────────────
  saveCheckpoint({
    completedFeeds: FEEDS.map(f => f.name),
    lastPageByFeed: {},
    rawBrands: allRawBrands,
    completedAt: new Date().toISOString(),
  });

  // ── Network stats ─────────────────────────────────────────────────────────
  const networkStats: Record<string, Record<string, number>> = {};
  for (const market of Object.keys(byMarket)) {
    for (const brand of byMarket[market]) {
      const src = brand.affiliateSource ?? 'unknown';
      if (!networkStats[src]) networkStats[src] = {};
      networkStats[src][market] = (networkStats[src][market] ?? 0) + 1;
    }
  }

  // ── Logo source breakdown ──────────────────────────────────────────────────
  const allFinalBrands = Object.values(byMarket).flat();
  const logoSourceCounts: Record<string, number> = {};
  for (const brand of allFinalBrands) {
    const src = brand.logoSource ?? 'none';
    logoSourceCounts[src] = (logoSourceCounts[src] ?? 0) + 1;
  }

  // ── Final summary log ─────────────────────────────────────────────────────
  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║              Sync Complete               ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log('\n  Pipeline summary:');
  console.log(`    Raw records across all feeds: ${allRawBrands.length.toLocaleString()}`);
  console.log(`    SOI brands removed:           ${soiRemoved}`);
  console.log(`    Category-inferred:            ${catAssigned} (keyword patterns)`);
  console.log(`    Category cross-market:        ${crossMarketInherited.toLocaleString()} (inherited from other markets)`);
  console.log(`    Category LLM:                 ${llmApplied.toLocaleString()} (from llm-categories.json cache)`);
  console.log(`    Still uncategorised:          ${catMissing} → no-category-brands.json`);
  console.log(`    Non-target market:            ${filteredOut.toLocaleString()}`);
  console.log(`    Cross-feed conflicts:         ${conflicts} (lower priority brands dropped)`);
  console.log(`    Junk brands flagged:          ${totalFlagged}`);
  console.log(`    Domain dupes removed:         ${totalDupesRemoved.toLocaleString()}`);
  console.log(`    Categories enriched:          ${totalEnriched}`);
  console.log(`    Logos inherited:              ${inheritedCount}`);
  console.log('\n  Final counts by market:');
  for (const market of Object.keys(counts)) {
    const d = dedupeStatsByMarket[market] ?? { removed: 0, enriched: 0 };
    const total = (counts[market] ?? 0).toLocaleString();
    console.log(`    ${market}: ${total} brands  (${d.removed} dupes removed, ${d.enriched} enriched)`);
  }
  console.log(`    Total: ${totalGood.toLocaleString()} brands`);
  console.log('\n  Brands by network:');
  for (const feed of FEEDS) {
    const s = networkStats[feed.name];
    if (!s) { console.log(`    ${feed.name}: (none)`); continue; }
    const breakdown = Object.keys(byMarket)
      .map(m => `${m}=${(s[m] ?? 0).toLocaleString()}`)
      .join(', ');
    const total = Object.values(s).reduce((a, b) => a + b, 0);
    console.log(`    ${feed.name}: ${total.toLocaleString()} total  (${breakdown})`);
  }
  console.log('\n  Logo sources:');
  const sourceOrder: Array<Brand['logoSource']> = ['api', 'logodev', 'companyenrich', 'debounce', 'clearbit', 'inherited', 'google-favicon', 'none'];
  for (const src of sourceOrder) {
    const count = logoSourceCounts[src] ?? 0;
    if (count === 0) continue;
    const pct = ((count / allFinalBrands.length) * 100).toFixed(1);
    console.log(`    ${src.padEnd(16)}: ${count.toLocaleString().padStart(6)}  (${pct}%)`);
  }
  console.log(`\n  Synced at: ${summary.syncedAt}`);
}

main().catch(err => {
  console.error('\nFatal error:', err);
  process.exit(1);
});
