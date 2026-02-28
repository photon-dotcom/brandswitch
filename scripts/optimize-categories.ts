#!/usr/bin/env tsx
/**
 * optimize-categories.ts — Brandswitch category optimization pass
 *
 * Handles:
 *   1. Add "Finance & Banking" category (from Digital Services)
 *   2. Add "Education & Learning" category (from Digital Services)
 *   3. Flag/reclassify gambling brands out of Events & Entertainment
 *   4. Merge descriptions from .desc-results.json into brand files
 *   5. Fix known miscategorizations (vaping → Electronics, etc.)
 *
 * Usage:
 *   npx tsx scripts/optimize-categories.ts
 *
 * No API keys needed — works entirely on local data files.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '../data');

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

// ── Classification rules ──────────────────────────────────────────────────────

// Finance & Banking: domains and name keywords
const FINANCE_DOMAIN_EXACT = new Set([
  'acorns.com', 'axosbank.com', 'badcreditloans.com', 'businessloans.com',
  'helcim.com', 'sumup.com', 'arise.financial', 'buddyloan.com',
  'creditkarma.com', 'nerdwallet.com', 'sofi.com', 'chime.com',
  'robinhood.com', 'wealthfront.com', 'betterment.com', 'ally.com',
  'marcus.com', 'paypal.com', 'stripe.com', 'square.com',
  'wise.com', 'revolut.com', 'n26.com', 'klarna.com',
]);

const FINANCE_NAME_KEYWORDS = [
  'bank', 'banking', ' loan', 'loans', 'credit',
  'mortgage', 'insurance', 'insure ',
  'invest', 'investing', 'investment',
  'trading', 'forex', 'crypto', 'bitcoin', 'wealth', 'savings',
  'fintech', 'financial', 'finance',
  'stock market', 'stocks',
  'lending', 'lender',
  'debt', 'refinanc', 'broker', 'brokerage',
  'bookkeep', 'tax prep', 'tax service',
  'payment processing', 'payments platform',
  'credit repair', 'credit build', 'credit score',
];

// Exclude these from Finance (they contain finance keywords but aren't finance)
const FINANCE_EXCLUDE_DOMAINS = new Set([
  'carolina.com',       // education
  'bostonifi.com',      // education (Boston Institute of Finance → Education)
  'gravityforms.com',   // WordPress plugin
  'inventory-planner.com', // inventory software
  'gala.com',           // blockchain entertainment
  'hellohelium.com',    // mobile wireless service
  'codapayments.com',   // game credits/top-ups
  'allpropertymanagement.com', // property management software
]);

// Education & Learning: domains and keywords
const EDU_DOMAIN_EXACT = new Set([
  'coursera.org', 'udemy.com', 'skillshare.com', 'masterclass.com',
  'edx.org', 'khanacademy.org', 'codecademy.com', 'educative.io',
  'futurelearn.com', 'informit.com', 'pluralsight.com', 'datacamp.com',
  'brilliant.org', 'duolingo.com', 'babbel.com', 'rosettastone.com',
  'training.linuxfoundation.org', 'bestmytest.com', 'varsitytutors.com',
  'learnlaughspeak.com', 'brainpop.com', 'testpreptraining.com',
  'bostonifi.com',
]);

const EDU_NAME_KEYWORDS = [
  'academy', 'school', 'university', 'college', 'education',
  'learning', 'courses', 'training course', 'tutor', 'tutoring',
  'certification', 'study', 'teaching',
  'lesson', 'lessons', 'bootcamp',
  'e-learning', 'elearning', 'online class', 'driving school',
  'language learn',
];

// Gambling keywords for flagging
const GAMBLING_KEYWORDS = [
  'casino', 'casinos', 'poker', 'gambling', 'gamble',
  'slots', 'sportsbook', 'bookie', 'wagering',
  'roulette', 'blackjack', 'sweepstake',
];

const GAMBLING_DOMAIN_KEYWORDS = [
  'casino', 'poker', 'slots', 'gambl', 'wager',
  'sportsbook', 'sweeps',
];

// Domains that match gambling keywords but aren't gambling
const GAMBLING_EXCLUDE_DOMAINS = new Set([
  'bettingonthewedding.com', // wedding planning
  'hardrock.com',            // hotel/restaurant chain
]);

// Vaping → Electronics (miscategorized as Accessories)
const VAPING_DOMAINS = new Set([
  'pax.com', 'geekvape.com', 'newvaping.com', 'vaporfi.com',
  'directvapor.com', 'elementvape.com', 'vapordna.com',
  'misteliquid.co.uk', 'vapestore.co.uk', 'smok.com',
]);

const VAPING_KEYWORDS = [
  'vape', 'vaping', 'vapor', 'vapour', 'e-cig', 'ecig',
  'e-liquid', 'eliquid', 'mod ', 'mods ',
];

// ── Main ──────────────────────────────────────────────────────────────────────

function main() {
  console.log('\n┌──────────────────────────────────────────┐');
  console.log('│  Brandswitch — Category Optimization     │');
  console.log('└──────────────────────────────────────────┘\n');

  // Load descriptions
  const descFile = path.join(DATA_DIR, '.desc-results.json');
  let descriptions: Record<string, string> = {};
  if (fs.existsSync(descFile)) {
    descriptions = JSON.parse(fs.readFileSync(descFile, 'utf-8'));
    console.log(`Loaded ${Object.keys(descriptions).length.toLocaleString()} descriptions from .desc-results.json`);
  } else {
    console.log('⚠ No .desc-results.json found — skipping description merge');
  }

  // Load all brands
  const byMarket: Record<string, Brand[]> = {};
  for (const market of MARKETS) {
    const file = path.join(DATA_DIR, `brands-${market}.json`);
    if (fs.existsSync(file)) {
      byMarket[market] = JSON.parse(fs.readFileSync(file, 'utf-8'));
    }
  }

  const totalBrands = Object.values(byMarket).reduce((s, b) => s + b.length, 0);
  console.log(`Loaded ${totalBrands.toLocaleString()} brands across ${Object.keys(byMarket).length} markets\n`);

  // Stats tracking
  let descsMerged = 0;
  let financeReclassified = 0;
  let eduReclassified = 0;
  let gamblingFlagged = 0;
  let vapingFixed = 0;
  let otherFixes = 0;

  for (const [market, brands] of Object.entries(byMarket)) {
    for (const brand of brands) {
      const nameLower = brand.name.toLowerCase();
      const domainLower = (brand.domain || '').toLowerCase();
      const descLower = (brand.description || '').toLowerCase();
      const ndLower = `${nameLower} ${domainLower} ${descLower}`;

      // ── Item 4: Merge descriptions ──────────────────────────────────────
      if ((!brand.description || brand.description === '') && brand.slug && descriptions[brand.slug]) {
        brand.description = descriptions[brand.slug];
        descsMerged++;
      }

      // After potential description merge, update with clean description
      // Exclude "I don't have" descriptions from keyword matching to avoid false positives
      const cleanDesc = (brand.description || '').toLowerCase().includes("don't have")
        ? ''
        : (brand.description || '').toLowerCase();
      const fullText = `${nameLower} ${domainLower} ${cleanDesc}`;

      // ── Item 1: Finance & Banking ───────────────────────────────────────
      // Only reclassify if currently in Digital Services or Products
      const inDigitalServices = brand.categories.includes('Digital Services & Streaming');
      const inProducts = brand.categories.includes('Products') || (brand.categories.length === 1 && brand.categories[0] === 'Products');

      if (inDigitalServices || inProducts) {
        // Use name + domain + clean description (no "I don't have" noise)
        const financeText = `${nameLower} ${domainLower} ${cleanDesc}`;
        const isFinance =
          FINANCE_DOMAIN_EXACT.has(domainLower) ||
          (!FINANCE_EXCLUDE_DOMAINS.has(domainLower) &&
            FINANCE_NAME_KEYWORDS.some(kw => financeText.includes(kw)));

        if (isFinance) {
          // Replace Digital Services with Finance & Banking
          brand.categories = brand.categories
            .filter(c => c !== 'Digital Services & Streaming' && c !== 'Products')
            .concat(['Finance & Banking']);
          // Deduplicate
          brand.categories = [...new Set(brand.categories)];
          brand.tags = deriveTags(brand.categories);
          financeReclassified++;
          continue; // skip further checks for this brand
        }
      }

      // ── Item 2: Education & Learning ────────────────────────────────────
      if (inDigitalServices || inProducts) {
        const isEdu =
          EDU_DOMAIN_EXACT.has(domainLower) ||
          EDU_NAME_KEYWORDS.some(kw => fullText.includes(kw));

        if (isEdu) {
          brand.categories = brand.categories
            .filter(c => c !== 'Digital Services & Streaming' && c !== 'Products')
            .concat(['Education & Learning']);
          brand.categories = [...new Set(brand.categories)];
          brand.tags = deriveTags(brand.categories);
          eduReclassified++;
          continue;
        }
      }

      // ── Item 3: Gambling flagging ───────────────────────────────────────
      if (brand.categories.includes('Events & Entertainment')) {
        const isGambling =
          !GAMBLING_EXCLUDE_DOMAINS.has(domainLower) &&
          (GAMBLING_KEYWORDS.some(kw => fullText.includes(kw)) ||
           GAMBLING_DOMAIN_KEYWORDS.some(kw => domainLower.includes(kw)));

        if (isGambling) {
          // Move from Events & Entertainment to its own category
          brand.categories = brand.categories
            .filter(c => c !== 'Events & Entertainment')
            .concat(['Gambling & Betting']);
          brand.categories = [...new Set(brand.categories)];
          brand.tags = deriveTags(brand.categories);
          gamblingFlagged++;
          continue;
        }
      }

      // ── Item 5: Vaping miscategorization ────────────────────────────────
      if (brand.categories.includes('Accessories') && !brand.categories.includes('Electronics')) {
        const isVaping =
          VAPING_DOMAINS.has(domainLower) ||
          VAPING_KEYWORDS.some(kw => fullText.includes(kw));

        if (isVaping) {
          brand.categories = brand.categories
            .filter(c => c !== 'Accessories')
            .concat(['Electronics']);
          brand.categories = [...new Set(brand.categories)];
          brand.tags = deriveTags(brand.categories);
          vapingFixed++;
        }
      }
    }
  }

  // ── Write updated files ──────────────────────────────────────────────────
  console.log('Writing updated files...\n');
  for (const [market, brands] of Object.entries(byMarket)) {
    // Write brands
    fs.writeFileSync(
      path.join(DATA_DIR, `brands-${market}.json`),
      JSON.stringify(brands, null, 2)
    );

    // Rebuild categories
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

  // ── Summary ──────────────────────────────────────────────────────────────
  console.log('┌──────────────────────────────────────────┐');
  console.log('│          Optimization Summary            │');
  console.log('└──────────────────────────────────────────┘');
  console.log(`\n  1. Descriptions merged:          ${descsMerged.toLocaleString()}`);
  console.log(`  2. Finance & Banking:            ${financeReclassified.toLocaleString()} brands reclassified`);
  console.log(`  3. Education & Learning:         ${eduReclassified.toLocaleString()} brands reclassified`);
  console.log(`  4. Gambling & Betting:           ${gamblingFlagged.toLocaleString()} brands separated`);
  console.log(`  5. Vaping → Electronics:         ${vapingFixed.toLocaleString()} brands fixed`);

  // Final category distribution
  console.log(`\n  Final category distribution (all markets):`);
  const globalCats: Record<string, number> = {};
  let total = 0;
  for (const brands of Object.values(byMarket)) {
    for (const brand of brands) {
      total++;
      for (const cat of brand.categories) {
        globalCats[cat] = (globalCats[cat] || 0) + 1;
      }
    }
  }
  const sorted = Object.entries(globalCats).sort((a, b) => b[1] - a[1]);
  console.log(`  ${'Category'.padEnd(40)} ${'Count'.padStart(7)} ${'Share'.padStart(7)}`);
  console.log(`  ${'-'.repeat(56)}`);
  for (const [cat, count] of sorted) {
    const pct = ((count / total) * 100).toFixed(1);
    console.log(`  ${cat.padEnd(40)} ${count.toLocaleString().padStart(7)} ${(pct + '%').padStart(7)}`);
  }

  // Description coverage
  let withDesc = 0;
  for (const brands of Object.values(byMarket)) {
    for (const brand of brands) {
      if (brand.description && brand.description.length > 10) withDesc++;
    }
  }
  console.log(`\n  Description coverage: ${withDesc.toLocaleString()} / ${total.toLocaleString()} (${((withDesc / total) * 100).toFixed(1)}%)`);
  console.log('\nDone!\n');
}

main();
