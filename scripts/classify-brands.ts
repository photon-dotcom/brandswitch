#!/usr/bin/env tsx
/**
 * classify-brands.ts — Standalone LLM classification for brandswitch
 *
 * Reads existing brand JSON files from data/, classifies brands that only
 * have "Products" as their category, and writes updated files back.
 *
 * Usage:
 *   npx tsx scripts/classify-brands.ts
 *
 * Env vars:
 *   ANTHROPIC_API_KEY  required
 *
 * This script does NOT fetch from affiliate APIs — it only reads/writes
 * the local data/*.json files.
 */

import fs from 'fs';
import https from 'https';
import path from 'path';
import { fileURLToPath } from 'url';

// ── Load .env ─────────────────────────────────────────────────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../.env');
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

// ── Config ────────────────────────────────────────────────────────────────────
const DATA_DIR = path.resolve(__dirname, '../data');
const LLM_CACHE_FILE = path.join(DATA_DIR, 'llm-categories.json');
const BATCH_SIZE = 50;

const VALID_CATEGORIES = new Set([
  'Health & Beauty', 'Accessories', 'Home & Garden', 'Clothing',
  'Sports, Outdoors & Fitness', 'Digital Services & Streaming', 'Electronics',
  'Food, Drinks & Restaurants', 'Travel & Vacations', 'Gifts, Flowers & Parties',
  'Shoes', 'Subscription Boxes & Services', 'Toys & Games',
  'Events & Entertainment', 'Auto & Tires', 'Pets', 'Baby & Toddler', 'Office Supplies',
  'Finance & Banking', 'Education & Learning', 'Gambling & Betting',
]);

const GENERIC_CATS = new Set(['Products', 'products', '']);

const MARKETS = [
  'us', 'uk', 'de', 'fr', 'nl', 'es', 'it', 'se', 'ch', 'at',
  'au', 'dk', 'ca', 'fi', 'mx', 'br', 'be', 'no',
];

interface Brand {
  name: string;
  slug: string;
  domain: string;
  description: string;
  categories: string[];
  tags: string[];
  [key: string]: unknown;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

function deriveTags(categories: string[]): string[] {
  const tagSet = new Set<string>();
  for (const cat of categories) {
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

function loadLLMCache(): Record<string, string> {
  if (fs.existsSync(LLM_CACHE_FILE)) {
    return JSON.parse(fs.readFileSync(LLM_CACHE_FILE, 'utf-8'));
  }
  return {};
}

function saveLLMCache(cache: Record<string, string>): void {
  fs.writeFileSync(LLM_CACHE_FILE, JSON.stringify(cache, null, 2));
}

async function callClaudeAPI(prompt: string, apiKey: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4096,
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

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('✗ ANTHROPIC_API_KEY not set. Add it to .env or pass inline.');
    process.exit(1);
  }

  console.log('\n┌──────────────────────────────────────────┐');
  console.log('│   Brandswitch — LLM Category Classifier  │');
  console.log('└──────────────────────────────────────────┘\n');

  // Load all brand files
  const byMarket: Record<string, Brand[]> = {};
  for (const market of MARKETS) {
    const file = path.join(DATA_DIR, `brands-${market}.json`);
    if (fs.existsSync(file)) {
      byMarket[market] = JSON.parse(fs.readFileSync(file, 'utf-8'));
    }
  }

  const totalBrands = Object.values(byMarket).reduce((s, b) => s + b.length, 0);
  console.log(`Loaded ${totalBrands.toLocaleString()} brands across ${Object.keys(byMarket).length} markets`);

  // ── Step 1: Remove redundant "Products" from brands that have real categories ──
  let productsStripped = 0;
  for (const brands of Object.values(byMarket)) {
    for (const brand of brands) {
      const cats = brand.categories;
      if (cats.includes('Products') && cats.length > 1) {
        brand.categories = cats.filter(c => c !== 'Products');
        brand.tags = deriveTags(brand.categories);
        productsStripped++;
      }
    }
  }
  console.log(`✓ Step 1: Stripped redundant "Products" from ${productsStripped.toLocaleString()} brands`);

  // ── Step 2: Merge duplicate category names ──
  const MERGE_MAP: Record<string, string> = {
    'Food Drinks & Restaurants': 'Food, Drinks & Restaurants',
    'Sports Outdoors & Fitness': 'Sports, Outdoors & Fitness',
    'Gifts Flowers & Parties': 'Gifts, Flowers & Parties',
  };
  let merged = 0;
  for (const brands of Object.values(byMarket)) {
    for (const brand of brands) {
      let changed = false;
      const newCats: string[] = [];
      for (const c of brand.categories) {
        const canonical = MERGE_MAP[c] || c;
        if (!newCats.includes(canonical)) newCats.push(canonical);
        if (MERGE_MAP[c]) changed = true;
      }
      if (changed) {
        brand.categories = newCats;
        brand.tags = deriveTags(newCats);
        merged++;
      }
    }
  }
  console.log(`✓ Step 2: Merged duplicate category names in ${merged.toLocaleString()} brands`);

  // ── Step 3: Cross-market name inheritance ──
  const nameCats = new Map<string, string[]>();
  for (const brands of Object.values(byMarket)) {
    for (const brand of brands) {
      const name = brand.name.trim().toLowerCase();
      const realCats = brand.categories.filter(c => !GENERIC_CATS.has(c));
      if (realCats.length > 0 && name) {
        const existing = nameCats.get(name) || [];
        for (const c of realCats) {
          if (!existing.includes(c)) existing.push(c);
        }
        nameCats.set(name, existing);
      }
    }
  }
  let crossFixed = 0;
  for (const brands of Object.values(byMarket)) {
    for (const brand of brands) {
      if (brand.categories.length === 1 && GENERIC_CATS.has(brand.categories[0])) {
        const name = brand.name.trim().toLowerCase();
        const inherited = nameCats.get(name);
        if (inherited && inherited.length > 0) {
          brand.categories = [...inherited].sort();
          brand.tags = deriveTags(brand.categories);
          crossFixed++;
        }
      }
    }
  }
  console.log(`✓ Step 3: Cross-market name match fixed ${crossFixed.toLocaleString()} brands`);

  // ── Step 4: Apply existing LLM cache ──
  const cache = loadLLMCache();

  // Fix old category names in cache
  let cacheFixed = 0;
  for (const [domain, cat] of Object.entries(cache)) {
    if (MERGE_MAP[cat]) {
      cache[domain] = MERGE_MAP[cat];
      cacheFixed++;
    }
  }
  if (cacheFixed > 0) {
    saveLLMCache(cache);
    console.log(`✓ Step 4a: Fixed ${cacheFixed} old category names in LLM cache`);
  }

  let cacheApplied = 0;
  for (const brands of Object.values(byMarket)) {
    for (const brand of brands) {
      if (!brand.domain) continue;
      const hasReal = brand.categories.some(c => !GENERIC_CATS.has(c));
      if (hasReal) continue;
      const llmCat = cache[brand.domain];
      if (llmCat && VALID_CATEGORIES.has(llmCat)) {
        brand.categories = [llmCat];
        brand.tags = deriveTags([llmCat]);
        cacheApplied++;
      }
    }
  }
  console.log(`✓ Step 4b: Applied ${cacheApplied.toLocaleString()} cached LLM classifications`);

  // ── Step 5: Classify remaining Products-only brands via Claude API ──
  const toClassify: Array<{ name: string; domain: string; description: string }> = [];
  const seen = new Set<string>();
  for (const brands of Object.values(byMarket)) {
    for (const brand of brands) {
      if (!brand.domain || seen.has(brand.domain)) continue;
      seen.add(brand.domain);
      const hasReal = brand.categories.some(c => !GENERIC_CATS.has(c));
      if (hasReal) continue;
      // Classify if not in cache, or if previously Unknown
      if (cache[brand.domain] !== undefined && cache[brand.domain] !== 'Unknown') continue;
      toClassify.push({ name: brand.name, domain: brand.domain, description: brand.description ?? '' });
    }
  }

  const unknowns = Object.values(cache).filter(v => v === 'Unknown').length;
  console.log(`\n→ ${toClassify.length.toLocaleString()} domains to classify (${unknowns.toLocaleString()} Unknown retries, ${toClassify.length - unknowns} new)`);

  if (toClassify.length > 0) {
    const totalBatches = Math.ceil(toClassify.length / BATCH_SIZE);
    let newlyClassified = 0;
    let errors = 0;

    for (let i = 0; i < toClassify.length; i += BATCH_SIZE) {
      const batch = toClassify.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      process.stdout.write(`  Batch ${batchNum}/${totalBatches} (${batch.length} brands)...`);

      const brandList = batch.map(b => {
        const desc = b.description && !b.description.toLowerCase().includes("don't have")
          ? ` — ${b.description.slice(0, 150)}`
          : '';
        return `${b.name} (${b.domain})${desc}`;
      }).join('\n');

      const prompt = `Classify each brand into exactly ONE of these categories based on the brand name, domain, and description:
Health & Beauty, Accessories, Home & Garden, Clothing, Sports, Outdoors & Fitness, Digital Services & Streaming, Electronics, Food, Drinks & Restaurants, Travel & Vacations, Gifts, Flowers & Parties, Shoes, Subscription Boxes & Services, Toys & Games, Events & Entertainment, Auto & Tires, Pets, Baby & Toddler, Office Supplies, Finance & Banking, Education & Learning, Gambling & Betting

Important rules:
- Financial services, banking, insurance, loans, crypto, investing → Finance & Banking
- Gambling, betting, casino, poker, slots → Gambling & Betting
- Education, courses, online learning, tutoring, language learning → Education & Learning
- VPN, software, apps, SaaS → Digital Services & Streaming
- General/multi-category retailers (like Amazon, Walmart) → Accessories
- If the domain looks like spam or gibberish (e.g. hex strings, random characters), respond with "Junk"
- Only respond "Unknown" if you truly cannot determine any reasonable category

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
          errors++;
          continue;
        }

        const classifications = JSON.parse(jsonMatch[0]) as Record<string, string>;
        let batchNew = 0;
        for (const [domain, category] of Object.entries(classifications)) {
          if (VALID_CATEGORIES.has(category)) {
            cache[domain] = category;
            batchNew++;
          } else if (category === 'Junk') {
            cache[domain] = 'Junk';
            batchNew++;
          } else if (category === 'Unknown') {
            cache[domain] = 'Unknown';
          }
        }
        newlyClassified += batchNew;
        console.log(` ✓ ${batchNew}/${batch.length} classified`);

        // Save after every batch
        saveLLMCache(cache);

        if (i + BATCH_SIZE < toClassify.length) await sleep(500);
      } catch (err) {
        console.log(` ✗ ${err}`);
        errors++;
        // Save progress and continue
        saveLLMCache(cache);
        await sleep(2000);
      }
    }

    console.log(`\n✓ LLM classification complete: ${newlyClassified.toLocaleString()} newly classified, ${errors} errors`);

    // Apply new classifications
    let newApplied = 0;
    for (const brands of Object.values(byMarket)) {
      for (const brand of brands) {
        if (!brand.domain) continue;
        const hasReal = brand.categories.some(c => !GENERIC_CATS.has(c));
        if (hasReal) continue;
        const llmCat = cache[brand.domain];
        if (llmCat && VALID_CATEGORIES.has(llmCat)) {
          brand.categories = [llmCat];
          brand.tags = deriveTags([llmCat]);
          newApplied++;
        }
      }
    }
    console.log(`✓ Applied ${newApplied.toLocaleString()} new LLM classifications to brands`);
  }

  // ── Step 6: Write updated files ──
  console.log('\nWriting updated files...');
  for (const [market, brands] of Object.entries(byMarket)) {
    // Write brands
    const brandFile = path.join(DATA_DIR, `brands-${market}.json`);
    fs.writeFileSync(brandFile, JSON.stringify(brands, null, 2));

    // Rebuild and write categories
    const catCount: Record<string, number> = {};
    for (const brand of brands) {
      for (const cat of brand.categories) {
        catCount[cat] = (catCount[cat] || 0) + 1;
      }
    }
    const categories = Object.entries(catCount)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({
        name,
        slug: name.toLowerCase().replace(/ & /g, '-and-').replace(/, /g, '-').replace(/ /g, '-'),
        brandCount: count,
      }));
    fs.writeFileSync(
      path.join(DATA_DIR, `categories-${market}.json`),
      JSON.stringify(categories, null, 2)
    );
  }

  // ── Summary ──
  console.log('\n┌──────────────────────────────────────────┐');
  console.log('│           Classification Summary          │');
  console.log('└──────────────────────────────────────────┘');

  const cacheValues = Object.values(cache);
  const cacheTotal = cacheValues.length;
  const cacheValid = cacheValues.filter(v => VALID_CATEGORIES.has(v)).length;
  const cacheJunk = cacheValues.filter(v => v === 'Junk').length;
  const cacheUnknown = cacheValues.filter(v => v === 'Unknown').length;
  console.log(`\nLLM cache: ${cacheTotal.toLocaleString()} entries (${cacheValid} valid, ${cacheJunk} junk, ${cacheUnknown} unknown)`);

  let totalProducts = 0;
  let totalAll = 0;
  for (const [market, brands] of Object.entries(byMarket)) {
    const productsOnly = brands.filter(b => b.categories.length === 1 && GENERIC_CATS.has(b.categories[0]));
    totalProducts += productsOnly.length;
    totalAll += brands.length;
    const pct = ((productsOnly.length / brands.length) * 100).toFixed(1);
    console.log(`  ${market.toUpperCase()}: ${productsOnly.length} still "Products" out of ${brands.length} (${pct}%)`);
  }
  console.log(`\n  TOTAL: ${totalProducts.toLocaleString()} / ${totalAll.toLocaleString()} still "Products" (${((totalProducts / totalAll) * 100).toFixed(1)}%)`);
  console.log('\nDone! Files written to data/\n');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
