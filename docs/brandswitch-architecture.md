# Brandswitch — Project Architecture & Setup Guide

## 1. Project Overview

**Brandswitch** is a brand alternatives discovery engine. Users search for a brand they know and find similar brands they can explore and shop. Revenue comes from affiliate commissions when users click through to brand sites and make purchases.

**Core value proposition:** "Find brands like the ones you love"

**Target pages (auto-generated from API data):**
- **Brand pages:** `/us/brands-like/patagonia` → targets "brands like Patagonia"
- **Category hubs:** `/us/travel-brands/` → targets "best travel brands"
- **Best-of pages:** `/us/best/outdoor-brands` → targets "best outdoor brands US"
- **VS pages (phase 2):** `/us/g-adventures-vs-intrepid-travel` → comparison queries
- **Blog:** `/us/blog/` → editorial content, brand features, seasonal guides

**Markets:** US, UK, DE, FR (subdirectory model: `/us/`, `/uk/`, `/de/`, `/fr/`)

---

## 2. Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Framework | **Next.js 14+ (App Router)** | Static generation, i18n, API routes, great DX |
| Styling | **Tailwind CSS** | Utility-first, fast iteration, consistent design |
| Hosting | **Vercel** | Free tier, auto-deploys from Git, edge CDN, perfect Next.js integration |
| CMS (Blog) | **Notion** (via Notion API) | You already use it, easy to write posts, free |
| Newsletter | **Beehiiv** | Free tier, monetization features, good for affiliates |
| Analytics | **Google Analytics 4 + Google Search Console** | Free, essential for SEO tracking |
| Source control | **GitHub** | Free, integrates with Vercel for auto-deploys |
| Data pipeline | **GitHub Actions** (cron) | Free, runs API sync on schedule |
| Brand logos | **Clearbit Logo API** or **Google Favicon API** | Free, auto-fetches logos by domain |

---

## 3. Site Architecture

```
brandswitch.com/
├── /                          → Homepage (language redirect or global landing)
├── /us/                       → US homepage
│   ├── /us/brands-like/       → Brand index (all US brands A-Z)
│   │   ├── /us/brands-like/patagonia
│   │   ├── /us/brands-like/asos
│   │   └── ... (thousands of pages)
│   ├── /us/category/          → Category index
│   │   ├── /us/category/travel-and-vacations
│   │   ├── /us/category/fashion-and-apparel
│   │   └── ...
│   ├── /us/best/              → Best-of pages
│   │   ├── /us/best/outdoor-brands
│   │   ├── /us/best/sustainable-fashion-brands
│   │   └── ...
│   ├── /us/blog/              → Blog index
│   │   ├── /us/blog/best-travel-brands-2026
│   │   └── ...
│   └── /us/newsletter         → Newsletter signup
├── /uk/                       → UK (same structure)
├── /de/                       → Germany (same structure, German UI)
├── /fr/                       → France (same structure, French UI)
├── /about                     → About page
├── /privacy                   → Privacy policy
├── /terms                     → Terms of use
└── /sitemap.xml               → Dynamic sitemap
```

---

## 4. Data Pipeline

### 4.1 API Sync (runs daily via GitHub Actions)

```
Shoptastic API → JSON files → Git commit → Vercel rebuild → Static pages
```

**Process:**
1. GitHub Action runs at 3 AM UTC daily
2. Calls both API endpoints (paginated, respecting 4 calls/hour rate limit)
3. Merges and deduplicates brands from both feeds
4. Generates `data/brands-us.json`, `data/brands-uk.json`, etc. (filtered by country field)
5. Computes similarity scores between brands (same category + shared tags)
6. Commits updated JSON to repo
7. Vercel auto-deploys on commit → all static pages regenerated

### 4.2 Brand Data Model

```typescript
interface Brand {
  id: string;                    // advertiserId
  name: string;                  // advertiserName
  slug: string;                  // auto-generated: "patagonia" from "Patagonia"
  domain: string;                // "patagonia.com"
  description: string;           // AI-generated from brand name + category (one-time)
  logo: string;                  // Clearbit/Google favicon URL
  categories: string[];          // from API
  tags: string[];                // derived from categories + description
  country: string;               // "US", "UK", "DE", "FR"
  affiliateUrl: string;          // commissionUrl from API
  deeplinkUrl: string;           // for deep linking
  supportsDeepLink: boolean;
  commission: string;            // "4.20%"
  commissionType: string;
  eCPC: string;
  similarBrands: string[];       // slugs of similar brands (precomputed)
}
```

### 4.3 Logo Strategy

For every brand, we fetch the logo automatically:
1. **Primary:** `https://logo.clearbit.com/{domain}` — free, high quality, ~70% coverage
2. **Fallback:** `https://www.google.com/s2/favicons?domain={domain}&sz=128` — universal but smaller
3. **API logo:** Use the `logoImg` field from Shoptastic if available
4. **Last resort:** Generated initial (like in the prototype) using brand color

---

## 5. SEO Strategy

### 5.1 Page Types & Target Keywords

| Page Type | URL Pattern | Target Keywords | Volume |
|-----------|------------|-----------------|--------|
| Brand page | `/us/brands-like/patagonia` | "brands like patagonia", "patagonia alternatives" | Medium-high per brand |
| Category hub | `/us/category/travel-and-vacations` | "best travel brands", "travel companies" | High |
| Best-of | `/us/best/sustainable-fashion-brands` | "best sustainable fashion brands" | High |
| Blog | `/us/blog/best-travel-brands-2026` | Long-tail editorial queries | Variable |

### 5.2 On-Page SEO (auto-generated)

Every brand page gets:
- **Title tag:** `10 Brands Like {Brand Name} — Best {Category} Alternatives | Brandswitch`
- **Meta description:** `Looking for alternatives to {Brand Name}? Discover {N} similar {category} brands ranked by similarity. Compare and find your perfect match.`
- **H1:** `Brands Like {Brand Name}`
- **Schema.org:** ItemList markup with brand entries
- **Internal links:** Every alternative links to its own brand page
- **FAQ section:** Auto-generated "Why look for alternatives?" + "How we rank" + "Is {Brand} good?"
- **Breadcrumbs:** Home > {Category} > Brands Like {Brand}
- **Canonical URL:** Self-referencing
- **Hreflang tags:** Cross-referencing US/UK/DE/FR versions

### 5.3 Technical SEO

- **Static generation:** All pages pre-rendered (fast TTFB)
- **XML sitemap:** Auto-generated, split by market and type
- **Robots.txt:** Allow all crawlers
- **Core Web Vitals:** Optimized by default with Next.js + Vercel
- **Internal linking:** Dense cross-linking between brands, categories, and blog posts
- **Structured data:** Organization, BreadcrumbList, ItemList schemas

### 5.4 Content Strategy for Blog

**AI-assisted content topics (examples):**
- "15 Best Sustainable Fashion Brands in 2026"
- "G Adventures vs Intrepid Travel: Which Adventure Company is Right for You?"
- "Top 10 DTC Mattress Brands Worth Trying"
- "Best Online Learning Platforms Compared"
- Seasonal: "Black Friday 2026: Best Brands by Category"

**Process:** Draft with AI → review and add personal expertise → publish via Notion

---

## 6. Multi-Language Support

### 6.1 UI Translations

Store in `/locales/{lang}.json`:

```json
{
  "hero.title": "Find brands like the ones you love",
  "hero.subtitle": "Discover alternatives to your favorite brands",
  "brand.alternatives": "{count} Alternatives to {brand}",
  "brand.visit": "Visit {brand}",
  "brand.similar_because": "Similar because",
  "brand.why_alternatives": "Why look for alternatives to {brand}?",
  "nav.categories": "Categories",
  "nav.popular": "Popular",
  "nav.blog": "Blog",
  "footer.affiliate_disclosure": "Some links are affiliate links. We may earn a commission at no extra cost to you.",
  "search.placeholder": "Search brands..."
}
```

**Languages:** EN (US/UK), DE, FR — 4 translation files.

### 6.2 Brand Descriptions

Brand descriptions need to be translated per market. Options:
1. **Phase 1:** Use English descriptions everywhere (acceptable for launch)
2. **Phase 2:** AI-translate descriptions per market during data pipeline
3. **Phase 3:** Native-quality translations for top brands

---

## 7. Newsletter (Beehiiv)

### Integration Points
- **Signup form:** Embedded on homepage, brand pages, and dedicated `/newsletter` page
- **Segmentation:** By market (US/UK/DE/FR) and category interests
- **Content:** Weekly "Brand Discoveries" email featuring new/trending brands
- **Monetization:** Beehiiv's built-in ad marketplace + your affiliate links

---

## 8. Monetization

| Revenue Stream | How It Works | Timeline |
|---------------|-------------|----------|
| **Affiliate commissions** | Users click brand links, make purchases | Day 1 |
| **Newsletter ads** | Beehiiv ad marketplace | Month 3+ |
| **Sponsored brand features** | Brands pay for featured placement in blog | Month 6+ |
| **Premium brand profiles** | Enhanced listings with custom content | Month 6+ |

---

## 9. Setup Guide (Step by Step)

### Phase 0: Prerequisites (1 hour)

1. **Create accounts:**
   - GitHub account (github.com) — free
   - Vercel account (vercel.com) — free, sign up with GitHub
   - Beehiiv account (beehiiv.com) — free tier
   - Google Search Console (search.google.com/search-console)
   - Google Analytics (analytics.google.com)

2. **Install on your computer:**
   - Node.js (nodejs.org) — download LTS version
   - Git (git-scm.com)
   - Claude Code (`npm install -g @anthropic-ai/claude-code`)
   - VS Code (code.visualstudio.com) — optional but helpful to see files

### Phase 1: Project Scaffold (Claude Code session 1)

Tell Claude Code:
```
Create a Next.js 14 project called "brandswitch" with:
- App Router
- Tailwind CSS
- TypeScript
- The following directory structure: [paste the architecture above]
- Multi-language support for en, de, fr using next-intl
- A data/ directory for brand JSON files
```

### Phase 2: Data Pipeline (Claude Code session 2)

Tell Claude Code:
```
Create a data sync script that:
1. Calls the Shoptastic API endpoints [provide both URLs + keys]
2. Paginates through all results (respecting rate limits)
3. Merges and deduplicates brands
4. Splits by country (US, UK, DE, FR)
5. Computes brand similarity scores
6. Fetches logos via Clearbit API
7. Generates AI descriptions for brands that don't have them
8. Outputs to data/brands-{country}.json
9. Create a GitHub Action that runs this daily
```

### Phase 3: Core Pages (Claude Code session 3-4)

Tell Claude Code:
```
Using the brand data JSON files, create:
1. Homepage with search and category filtering
2. Brand page template (/[locale]/brands-like/[slug])
3. Category hub pages (/[locale]/category/[slug])
4. Best-of pages (/[locale]/best/[slug])
5. Use the design from the brandswitch prototype [attach the .jsx file]
6. Include all SEO elements: meta tags, Schema.org, breadcrumbs, hreflang
7. Generate static pages at build time for all brands
```

### Phase 4: Blog + Newsletter (Claude Code session 5)

Tell Claude Code:
```
Add a blog section using Notion as CMS:
1. Connect to Notion API to fetch blog posts from a database
2. Create blog index and post pages
3. Add Beehiiv newsletter signup form (embed code: [from Beehiiv])
4. Add newsletter signup to homepage and brand pages
```

### Phase 5: Deploy (Claude Code session 6)

Tell Claude Code:
```
1. Set up GitHub repository
2. Connect to Vercel
3. Configure environment variables (API keys, Notion token)
4. Set up custom domain when ready
5. Submit sitemap to Google Search Console
```

---

## 10. Domain Strategy

Since you're starting from zero, a fresh domain is fine. Some tips:

- **brandswitch.com** — check availability, ideal if available
- **brandswitch.io** — tech-friendly alternative
- **getbrandswitch.com** — if .com is taken

**For existing authority on the cheap:** You could look at expired domains on platforms like ExpiredDomains.net that already have backlinks. Look for domains with DR 10-30 that were in a related niche (shopping, reviews, comparisons). Cost is usually just the registration fee ($10-15). But this is optional and a fresh domain with good content will work fine — it just takes a few months longer.

---

## 11. Timeline Estimate

| Phase | What | Time |
|-------|------|------|
| Phase 0 | Account setup | Day 1 |
| Phase 1 | Project scaffold | Day 1-2 |
| Phase 2 | Data pipeline | Day 2-3 |
| Phase 3 | Core pages | Day 3-7 |
| Phase 4 | Blog + newsletter | Day 7-10 |
| Phase 5 | Deploy + SEO setup | Day 10-12 |
| **Total to MVP** | | **~2 weeks** |

After launch: monitor Search Console, publish first blog posts, build newsletter, iterate on design based on real usage data.
