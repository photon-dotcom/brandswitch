import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import {
  getBrandBySlug,
  getBrandAlternatives,
  getBrandDescription,
  getTopBrandSlugs,
  getCuratedTopBrands,
  getRelatedBrands,
  getBrandMarkets,
  LOCALE_TO_HREFLANG,
  cleanDisplayName,
  catToSlug,
  MARKETS,
} from '@/lib/brands';
import { translateCategory } from '@/lib/translations';
import { BrandLogo } from '@/components/BrandLogo';
import { AffiliateButton } from '@/components/AffiliateButton';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { AlternativeCard } from '@/components/AlternativeCard';
import { FAQ, type FAQItem } from '@/components/FAQ';
import { EmailCapture } from '@/components/EmailCapture';
import { ExitIntentPopup } from '@/components/ExitIntentPopup';

// ── Static generation ──────────────────────────────────────────────────────

// Pre-render top 200 brands per market at build time with explicit locale+slug pairs.
// Without explicit locale, Next.js would multiply all slugs × all locales → ~200k pages.
// All other brand pages are rendered on first request and cached (ISR).
export async function generateStaticParams() {
  const params: { locale: string; slug: string }[] = [];
  for (const locale of MARKETS) {
    for (const slug of getTopBrandSlugs(locale, 200)) {
      params.push({ locale, slug });
    }
  }
  return params;
}

// Serve pages for brands not in the pre-rendered top-200 (dynamic fallback)
export const dynamicParams = true;
// Cache for 24h then revalidate in background (ISR)
export const revalidate = 604800;

// ── SEO ───────────────────────────────────────────────────────────────────

interface Props {
  params: { locale: string; slug: string };
}

function answerDescription(
  displayName: string,
  cat: string,
  altCount: number,
  altNames: string[],
): string {
  const year = new Date().getFullYear();
  const [a1, a2, a3] = altNames;
  const catLower = cat.toLowerCase();

  if (altCount < 3 || !a1) {
    return `Discover ${catLower} brands similar to ${displayName}. Browse ${altCount} alternatives and find the best match for you at Brandswitch.`;
  }

  // Pick template by name hash (deterministic rotation across pages)
  const hash = displayName.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const t = hash % 3;

  const candidates = [
    `The top ${altCount} alternatives to ${displayName} include ${a1}, ${a2}, and ${a3}. Compare similar ${catLower} brands at Brandswitch.`,
    `Looking for brands like ${displayName}? Top alternatives: ${a1}, ${a2}, ${a3}. ${altCount} ${catLower} brands compared by similarity.`,
    `Best ${displayName} alternatives for ${year}: ${a1}, ${a2}, ${a3} and ${altCount - 3} more ${catLower} brands ranked by similarity.`,
  ];

  // Truncate to 160 chars if needed
  const desc = candidates[t];
  return desc.length <= 160 ? desc : candidates[t].slice(0, 157) + '...';
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const brand = getBrandBySlug(params.locale, params.slug);
  if (!brand) return { title: 'Brand Not Found' };

  const displayName = cleanDisplayName(brand.name);
  const cat = brand.categories[0] ?? 'brand';
  const alternatives = getBrandAlternatives(params.locale, brand);
  const altCount = alternatives.length;
  const altNames = alternatives.slice(0, 3).map(a => cleanDisplayName(a.name));

  const title = `${altCount} Brands Like ${displayName} — Best ${cat} Alternatives | Brandswitch`;
  const description = answerDescription(displayName, cat, altCount, altNames);

  // Only add hreflang for markets where the brand actually exists
  const brandMarkets = getBrandMarkets(params.slug);
  const languages = Object.fromEntries(
    brandMarkets.map(m => [LOCALE_TO_HREFLANG[m], `https://brandswitch.com/${m}/brands-like/${params.slug}`])
  );
  // x-default points to US if available, otherwise first market
  const defaultMarket = brandMarkets.includes('us') ? 'us' : brandMarkets[0];
  if (defaultMarket) languages['x-default'] = `https://brandswitch.com/${defaultMarket}/brands-like/${params.slug}`;

  // Thin pages (< 3 real alternatives) get noindexed to preserve crawl budget
  const shouldIndex = altCount >= 3;

  return {
    title,
    description,
    alternates: {
      canonical: `https://brandswitch.com/${params.locale}/brands-like/${params.slug}`,
      languages,
    },
    openGraph: {
      title,
      description,
      url: `https://brandswitch.com/${params.locale}/brands-like/${params.slug}`,
      siteName: 'Brandswitch',
      type: 'website',
    },
    robots: shouldIndex
      ? { index: true, follow: true }
      : { index: false, follow: true },
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────

interface SavingsHack {
  title: string;
  description: string;
}

function generateSavingsHacks(category: string): SavingsHack[] {
  const cat = category.toLowerCase();

  const isFashion = ['clothing', 'fashion', 'apparel', 'wear', 'shoes', 'footwear', 'accessories',
    'lingerie', 'swimwear', 'bags', 'handbags', 'jewelry', 'jewellery', 'watches', 'eyewear',
    'sunglasses', 'sportswear', 'denim', 'suits', 'underwear'].some(k => cat.includes(k));

  const isTech = ['electronics', 'tech', 'computer', 'laptop', 'phone', 'smartphone', 'gadget',
    'software', 'gaming', 'camera', 'audio', 'headphones', 'tablet', 'wearable'].some(k => cat.includes(k));

  const isBeauty = ['beauty', 'cosmetic', 'skincare', 'skin care', 'haircare', 'hair care',
    'fragrance', 'makeup', 'make-up', 'grooming', 'perfume', 'wellness'].some(k => cat.includes(k));

  const isHome = ['home', 'furniture', 'decor', 'garden', 'kitchen', 'bedding', 'lighting',
    'interior', 'bath', 'storage', 'flooring', 'curtain', 'carpet'].some(k => cat.includes(k));

  const isSports = ['sport', 'fitness', 'outdoor', 'camping', 'hiking', 'cycling', 'running',
    'gym', 'athletic', 'yoga', 'climbing', 'skiing', 'swimming'].some(k => cat.includes(k));

  const isFood = ['food', 'drink', 'grocery', 'nutrition', 'coffee', 'wine', 'snack',
    'supplement', 'organic', 'meal', 'tea', 'beer', 'spirits'].some(k => cat.includes(k));

  const isTravel = ['travel', 'hotel', 'flight', 'holiday', 'luggage', 'suitcase',
    'accommodation', 'vacation', 'cruise', 'hostel'].some(k => cat.includes(k));

  if (isFashion) {
    return [
      {
        title: 'Shop end-of-season sales',
        description: 'Fashion brands discount last season\'s stock by 40–70% at the end of each season. January and July are typically the best months for clothing deals.',
      },
      {
        title: 'Sign up for newsletters',
        description: 'Most fashion brands offer 10–15% off your first order when you join their email list. Create a dedicated shopping inbox to keep discount codes organised.',
      },
      {
        title: 'Check brand outlet stores',
        description: 'Many brands run official outlet stores — both online and in-person — where you can find previous seasons\' styles at a fraction of the original price.',
      },
      {
        title: 'Use cashback extensions',
        description: 'Browser extensions like Honey or TopCashback automatically find discount codes and earn cashback on fashion purchases from hundreds of brands.',
      },
      {
        title: 'Buy off-season',
        description: 'Purchase winter coats in spring and summer dresses in autumn. Retailers need to clear inventory and mark prices down dramatically out of season.',
      },
    ];
  }

  if (isTech) {
    return [
      {
        title: 'Consider certified refurbished',
        description: 'Manufacturers sell refurbished devices at 20–40% below new prices with the same warranty. Apple Refurbished and Amazon Renewed are reliable starting points.',
      },
      {
        title: 'Use a price tracker',
        description: 'Tools like CamelCamelCamel (Amazon), Honey, or Google Shopping alerts notify you when a product drops to your target price — often saving 20%+ vs buying immediately.',
      },
      {
        title: 'Wait for the next model launch',
        description: 'When a new product is announced, last year\'s model typically drops 20–30%. A great opportunity to pick up proven, well-reviewed technology at a lower cost.',
      },
      {
        title: 'Explore open-box deals',
        description: 'Open-box or display models are lightly used items sold at a significant discount. Check retailer clearance sections or Best Buy\'s open-box listings for substantial savings.',
      },
      {
        title: 'Bundle for better value',
        description: 'Buying accessories, cases, or protection plans as a bundle from the same brand is usually cheaper than purchasing each separately — and often includes extras.',
      },
    ];
  }

  if (isBeauty) {
    return [
      {
        title: 'Request samples before committing',
        description: 'Before buying a full-size product, request samples or purchase travel-size versions. Many beauty brands offer free samples at checkout or sell minis of their bestsellers.',
      },
      {
        title: 'Join loyalty programmes',
        description: 'Beauty loyalty schemes (Sephora Beauty Insider, Boots Advantage) earn points on every purchase that can be redeemed for free products or exclusive discounts.',
      },
      {
        title: 'Subscribe and save',
        description: 'Many beauty brands offer 10–15% off and free shipping on subscription orders. Easy to cancel or pause, and the saving adds up quickly on daily-use products.',
      },
      {
        title: 'Explore high-quality dupes',
        description: 'Premium beauty products often have effective drugstore alternatives. Beauty communities on Reddit and TikTok regularly compare formulas and highlight near-identical options at a fraction of the price.',
      },
      {
        title: 'Shop multi-buy promotions',
        description: 'Brands like The Ordinary and ASOS Beauty frequently run "3 for 2" or "buy 2 get 1 free" events. Stock up on skincare staples you use consistently during these offers.',
      },
    ];
  }

  if (isHome) {
    return [
      {
        title: 'Ask about ex-display models',
        description: 'Showroom floor models are sold at 20–40% off and are typically in excellent condition. Ask in-store or check retailer websites for ex-display and return listings.',
      },
      {
        title: 'Shop major sale events',
        description: 'Home and furniture brands offer their biggest discounts during Black Friday, January sales, and bank holiday weekends. Planning large purchases around these events can save hundreds.',
      },
      {
        title: 'Look for end-of-line stock',
        description: 'When a product line is discontinued, retailers heavily discount remaining inventory. Check clearance sections online or ask in-store about ranges being phased out.',
      },
      {
        title: 'Choose flat-pack over assembled',
        description: 'Ready-assembled furniture costs significantly more than flat-pack equivalents with identical quality. If you\'re comfortable with basic self-assembly, flat-pack is almost always better value.',
      },
      {
        title: 'Measure carefully before ordering',
        description: 'Return shipping for large furniture and appliances can eliminate any saving. Measure your space twice before ordering online to avoid costly returns and restocking fees.',
      },
    ];
  }

  if (isSports) {
    return [
      {
        title: 'Buy last season\'s gear',
        description: 'Sports equipment is updated annually. Last season\'s models are often functionally identical to new releases but discounted by 30–50% to clear warehouse stock.',
      },
      {
        title: 'Rent before investing',
        description: 'For activities you\'re trying for the first time — skiing, surfing, cycling — renting equipment first lets you discover exactly what specs you need before spending hundreds.',
      },
      {
        title: 'Check secondhand platforms',
        description: 'eBay, Vinted, and Facebook Marketplace have large stocks of barely-used sports gear. Many items are sold after people try a hobby once, so condition is often near-new.',
      },
      {
        title: 'Shop at end of season',
        description: 'Ski gear is cheapest in spring; cycling and running gear goes on sale in autumn. Outdoor retailers heavily discount seasonal inventory to prepare for next season\'s arrivals.',
      },
      {
        title: 'Look into gear libraries',
        description: 'Some outdoor shops and community groups offer gear libraries or rental schemes. Borrowing rarely-used specialist equipment is far more cost-effective than buying it outright.',
      },
    ];
  }

  if (isFood) {
    return [
      {
        title: 'Subscribe for recurring discounts',
        description: 'Most food and supplement brands offer 10–20% off and free shipping on subscription orders. If you use a product daily, subscribing consistently beats one-off pricing.',
      },
      {
        title: 'Buy non-perishables in bulk',
        description: 'Coffee, protein powder, tinned goods, and supplements almost always cost less per unit in larger quantities. Compare cost-per-gram or cost-per-serving before adding to your cart.',
      },
      {
        title: 'Collect loyalty points',
        description: 'Supermarket loyalty cards (Tesco Clubcard, Lidl Plus) and brand apps offer points, cashback, and exclusive member pricing. Savings compound quickly on regular grocery shopping.',
      },
      {
        title: 'Compare own-brand alternatives',
        description: 'Own-brand products in categories like olive oil, pasta, and canned goods often match the quality of premium brands at 40–60% lower cost. Direct the saving to the items where brand genuinely matters to you.',
      },
      {
        title: 'Plan meals around weekly offers',
        description: 'Grocery retailers rotate promotions weekly. Planning meals around what\'s on sale — rather than a fixed shopping list — can meaningfully reduce your food bill without sacrificing quality.',
      },
    ];
  }

  if (isTravel) {
    return [
      {
        title: 'Set price drop alerts',
        description: 'Google Flights, Skyscanner, and Kayak let you track prices and alert you to drops. Being flexible by even one or two days can unlock savings of 30% or more on flights.',
      },
      {
        title: 'Earn points on everyday spend',
        description: 'Travel credit cards and airline loyalty programmes let you accumulate miles on everyday purchases. A focused strategy can cover flights and hotels — especially for business-class upgrades.',
      },
      {
        title: 'Travel in shoulder season',
        description: 'Visiting destinations just before or after peak season delivers the same experience at lower prices for flights, accommodation, and attractions — with smaller crowds.',
      },
      {
        title: 'Compare flight + hotel packages',
        description: 'Booking flights and hotels as a bundle is frequently cheaper than booking separately. OTAs like Expedia and TUI offer exclusive package rates not available when booking each element individually.',
      },
      {
        title: 'Factor in cancellation policies',
        description: 'Always compare total costs including cancellation terms. Refundable rates look pricier upfront but can save money if plans change — factor this in when booking non-refundable fares.',
      },
    ];
  }

  // Generic fallback for all other categories
  return [
    {
      title: 'Compare prices before buying',
      description: 'Use Google Shopping or price comparison sites to check whether the same product is available cheaper from another retailer before committing — a two-minute check that often pays off.',
    },
    {
      title: 'Sign up for brand newsletters',
      description: 'Most brands offer 10–15% off your first order when you join their email list. Create a dedicated shopping inbox to keep discount codes organised and easy to find at checkout.',
    },
    {
      title: 'Install a cashback extension',
      description: 'Browser extensions like Honey, Rakuten, or TopCashback automatically apply discount codes and earn cashback on purchases from thousands of brands — completely free to use.',
    },
    {
      title: 'Wait for seasonal sale events',
      description: 'Black Friday, Cyber Monday, January sales, and brand-specific events are the best times to buy non-urgent items. Setting a calendar reminder for these costs nothing.',
    },
    {
      title: 'Check the returns policy first',
      description: 'Before buying from a new brand, understand their returns process. A lower upfront price rarely pays off if returning an item costs more than the saving, or if the process is deliberately complicated.',
    },
  ];
}

function generateSEOText(brandName: string, category: string): string[] {
  const cat = category.toLowerCase();
  return [
    `If you've been shopping with ${brandName} and are curious what else is out there, you're in the right place. The ${cat} market has expanded significantly in recent years, with dozens of brands competing on price, design, sustainability, and customer experience.`,
    `Whether you're looking for a lower price point, a more sustainable option, a different aesthetic, or simply want to explore what the ${cat} space has to offer — our curated list gives you the best starting point. Every brand listed here shares key characteristics with ${brandName}: similar product categories, comparable quality tier, or overlapping customer base.`,
    `We rank alternatives by a combination of category overlap and customer signals, so the brands at the top of this list are genuinely the closest matches to ${brandName} — not just anything in the same broad space.`,
  ];
}

function buildFAQ(brand: { name: string; categories: string[]; domain: string }): FAQItem[] {
  const cat = (brand.categories[0] ?? 'product').toLowerCase();
  const name = brand.name;

  // All 7 candidate questions
  const all: FAQItem[] = [
    // Q0
    {
      question: `How do we rank alternatives to ${name}?`,
      answer: `We use a similarity scoring system based on shared categories and product tags. Brands that operate in the exact same category as ${name} score highest. We then refine by additional signals like price tier and market overlap.`,
    },
    // Q1
    {
      question: `Is ${name} worth it?`,
      answer: `${name} is an established brand in the ${cat} space. Whether it's the right fit depends on your specific needs and budget. The alternatives listed here offer similar products and may suit you better depending on price, style, or values.`,
    },
    // Q2
    {
      question: `What are the best ${cat} brands?`,
      answer: `The best ${cat} brands depend on your priorities. For sheer variety, ${name} is a solid choice. For alternatives, check our full list above — each brand has been evaluated for quality and customer satisfaction in the ${cat} market.`,
    },
    // Q3 (new)
    {
      question: `Are there cheaper brands similar to ${name}?`,
      answer: `Yes — several alternatives listed on this page offer a lower price point while covering similar ${cat} products. Brands ranked further down this list often trade some brand recognition for better value. Browse our full ${cat} category to compare options directly.`,
    },
    // Q4 (new)
    {
      question: `What makes a good ${cat} brand?`,
      answer: `A strong ${cat} brand combines consistent quality, transparent pricing, and reliable customer service. Beyond that, the best brand for you depends on your personal priorities — whether that's sustainability, design aesthetic, price, or product range. Every brand on this page was selected for its genuine similarity to ${name}, not just category proximity.`,
    },
    // Q5 (new)
    {
      question: `How often do we update alternatives for ${name}?`,
      answer: `Our brand data and similarity scores are refreshed daily via automated data feeds. When new ${cat} brands launch or existing ones change their product range, the list updates automatically. The alternatives you see here represent our most current similarity rankings for ${name}.`,
    },
    // Q6 — affiliate disclosure, always included
    {
      question: `Are the links on this page affiliate links?`,
      answer: `Yes, some "Visit" buttons on this page are affiliate links. We earn a small commission if you make a purchase — at no extra cost to you. This doesn't influence our rankings; we list brands based on similarity, not commission rates.`,
    },
  ];

  // Use a name hash to rotate which 5 of the 7 appear, keeping Q6 (affiliate) fixed.
  // Three rotations, each dropping a different pair from Q0–Q5.
  const hash = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const ROTATIONS: number[][] = [
    [0, 1, 2, 4, 6], // drops Q3, Q5
    [0, 2, 3, 5, 6], // drops Q1, Q4
    [1, 3, 4, 5, 6], // drops Q0, Q2
  ];
  const indices = ROTATIONS[hash % 3];
  return indices.map(i => all[i]);
}

// ── Schema.org ────────────────────────────────────────────────────────────

function FAQPageSchema({ items }: { items: FAQItem[] }) {
  if (items.length === 0) return null;

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map(item => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

function ItemListSchema({
  brand,
  alternatives,
  locale,
}: {
  brand: { name: string };
  alternatives: { name: string; slug: string }[];
  locale: string;
}) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Brands Like ${brand.name}`,
    description: `The best alternatives to ${brand.name}`,
    numberOfItems: alternatives.length,
    itemListElement: alternatives.map((alt, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: alt.name,
      url: `https://brandswitch.com/${locale}/brands-like/${alt.slug}`,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

// ── Page ──────────────────────────────────────────────────────────────────

export default async function BrandPage({ params: { locale, slug } }: Props) {
  const t = await getTranslations('ui');
  const brand = getBrandBySlug(locale, slug);
  if (!brand) notFound();

  const displayName = cleanDisplayName(brand.name);
  const alternatives = getBrandAlternatives(locale, brand);
  const primaryCategory = brand.categories[0] ?? 'Products';
  const categorySlug = catToSlug(primaryCategory);
  const localizedCategory = translateCategory(locale, primaryCategory);
  const topCategoryBrands = getCuratedTopBrands(locale, categorySlug).slice(0, 10);
  // Fallback for thin pages: related brands from same category when < 3 alternatives
  const relatedBrands = alternatives.length < 3
    ? getRelatedBrands(locale, categorySlug, brand.slug, 10)
    : [];
  const seoText = generateSEOText(displayName, primaryCategory);
  const savingsHacks = generateSavingsHacks(primaryCategory);
  const faqItems = buildFAQ({ ...brand, name: displayName });
  const description = getBrandDescription({ ...brand, name: displayName });

  return (
    <>
      <ItemListSchema brand={brand} alternatives={alternatives} locale={locale} />
      {alternatives.length >= 3 && <FAQPageSchema items={faqItems} />}

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">

        {/* ── Breadcrumbs ─────────────────────────────────────────── */}
        <Breadcrumbs
          items={[
            { label: t('home'), href: `/${locale}` },
            { label: localizedCategory, href: `/${locale}/category/${categorySlug}` },
            { label: `Brands Like ${displayName}` },
          ]}
        />

        {/* ── Brand hero card ──────────────────────────────────────── */}
        <div className="bg-white border border-bs-border rounded-3xl p-6 sm:p-8 mb-10">
          <div className="flex flex-col sm:flex-row items-start gap-6">

            <BrandLogo name={brand.name} logo={brand.logo} domain={brand.domain} size={80} logoQuality={brand.logoQuality} />

            <div className="flex-1 min-w-0">
              {/* Category labels */}
              <div className="flex flex-wrap gap-1.5 mb-2">
                {brand.categories.map(cat => (
                  <Link
                    key={cat}
                    href={`/${locale}/category/${catToSlug(cat)}`}
                    className="text-xs font-semibold text-bs-teal bg-bs-teal-light px-2.5 py-1 rounded-full hover:bg-bs-teal hover:text-white transition-colors"
                  >
                    {translateCategory(locale, cat)}
                  </Link>
                ))}
              </div>

              <h1 className="text-3xl sm:text-4xl font-bold text-bs-dark leading-tight mb-1">
                Brands Like {displayName}
              </h1>
              <p className="text-bs-gray text-sm mb-3">
                {brand.domain}
                {alternatives.length > 0 && (
                  <> · <strong className="text-bs-dark">{t('alternatives_discovered', { count: alternatives.length })}</strong></>
                )}
              </p>

              {/* Auto-generated description */}
              <p className="text-bs-gray text-sm mb-4 max-w-lg leading-relaxed">
                {description}
              </p>

              {/* CTA */}
              {brand.affiliateUrl && (
                <AffiliateButton
                  href={brand.affiliateUrl}
                  label={`Visit ${displayName}`}
                  variant="primary"
                  size="lg"
                  className="w-full sm:w-auto justify-center"
                  brandSlug={brand.slug}
                  market={locale}
                  affiliateSource={brand.affiliateSource}
                />
              )}

              {/* Quick alternatives chips */}
              {alternatives.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  <span className="text-xs text-bs-gray self-center mr-1">Alternatives:</span>
                  {alternatives.slice(0, 4).map(alt => (
                    <Link
                      key={alt.slug}
                      href={`/${locale}/brands-like/${alt.slug}`}
                      className="inline-flex items-center gap-1.5 bg-bs-bg border border-bs-border hover:border-bs-teal/50 hover:bg-white rounded-full px-3 py-1 text-xs font-medium text-bs-dark transition-colors"
                    >
                      <BrandLogo name={alt.name} logo={alt.logo} domain={alt.domain} size={16} logoQuality={alt.logoQuality} />
                      {cleanDisplayName(alt.name)}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Quick comparison table ───────────────────────────────── */}
        {alternatives.length >= 3 && (() => {
          const tableRows = [brand, ...alternatives.slice(0, 3)];
          return (
            <div className="mb-8 overflow-x-auto rounded-2xl border border-bs-border">
              <table className="w-full min-w-[500px] text-sm">
                <caption className="text-left px-4 pt-3 pb-2 text-xs font-semibold text-bs-gray uppercase tracking-wide">
                  Quick Comparison
                </caption>
                <thead>
                  <tr className="border-b border-bs-border bg-bs-bg/60">
                    <th className="text-left px-4 py-2.5 font-medium text-bs-gray text-xs">Brand</th>
                    <th className="text-left px-4 py-2.5 font-medium text-bs-gray text-xs">Category</th>
                    <th className="text-center px-4 py-2.5 font-medium text-bs-gray text-xs">Markets</th>
                    <th className="text-center px-4 py-2.5 font-medium text-bs-gray text-xs">Alternatives</th>
                    <th className="px-4 py-2.5"></th>
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map((row, i) => {
                    const isCurrent = i === 0;
                    const marketCount = getBrandMarkets(row.slug).length;
                    return (
                      <tr
                        key={row.id}
                        className={`border-b border-bs-border/50 last:border-0 ${isCurrent ? 'bg-bs-teal-light/30' : 'bg-white hover:bg-bs-bg/40'}`}
                      >
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <BrandLogo name={row.name} logo={row.logo} domain={row.domain} size={28} logoQuality={row.logoQuality} />
                            <span className={`font-medium truncate max-w-[120px] ${isCurrent ? 'text-bs-teal' : 'text-bs-dark'}`}>
                              {cleanDisplayName(row.name)}
                            </span>
                            {isCurrent && <span className="text-[10px] bg-bs-teal text-white px-1.5 py-0.5 rounded-full shrink-0">You</span>}
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-bs-gray text-xs">{translateCategory(locale, row.categories[0] ?? '')}</td>
                        <td className="px-4 py-2.5 text-center text-bs-dark font-medium text-xs">{marketCount}</td>
                        <td className="px-4 py-2.5 text-center text-bs-dark font-medium text-xs">{row.similarBrands?.length ?? 0}</td>
                        <td className="px-4 py-2.5 text-right">
                          {row.affiliateUrl ? (
                            <AffiliateButton href={row.affiliateUrl} label={t('visit')} variant={isCurrent ? 'primary' : 'secondary'} size="sm" />
                          ) : (
                            <Link href={`/${locale}/brands-like/${row.slug}`} className="text-xs text-bs-teal hover:underline">
                              {t('view_alternatives')}
                            </Link>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })()}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">

          {/* ── Main column ───────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-10">

            {/* Alternatives grid */}
            <section>
              <h2 className="text-xl font-bold text-bs-dark mb-5">
                {alternatives.length >= 3
                  ? t('alternatives_title', { count: alternatives.length, brand: displayName })
                  : `Related ${localizedCategory} brands you might like`}
              </h2>

              {alternatives.length >= 3 ? (
                <div className="grid grid-cols-1 gap-3">
                  {alternatives.map(alt => (
                    <AlternativeCard
                      key={alt.id}
                      alternative={alt}
                      mainBrand={brand}
                      locale={locale}
                    />
                  ))}
                </div>
              ) : relatedBrands.length > 0 ? (
                /* Fallback: related brands from same category */
                <div className="grid grid-cols-1 gap-3">
                  {relatedBrands.map(alt => (
                    <AlternativeCard
                      key={alt.id}
                      alternative={alt}
                      mainBrand={brand}
                      locale={locale}
                    />
                  ))}
                </div>
              ) : (
                <div className="bg-white border border-bs-border rounded-2xl p-8 text-center">
                  <p className="text-bs-gray">
                    {t('no_alternatives', { brand: displayName })}
                  </p>
                </div>
              )}
            </section>

            {/* SEO content */}
            <section>
              <h2 className="text-2xl font-bold text-bs-dark mb-4">
                {t('why_alternatives_title', { brand: displayName })}
              </h2>
              <div className="space-y-3 text-bs-gray leading-relaxed">
                {seoText.map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>
            </section>

            {/* Smart Shopping Tips */}
            <section>
              <h2 className="text-2xl font-bold text-bs-dark mb-5">
                {t('savings_hacks_title', { category: localizedCategory })}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {savingsHacks.map((hack, i) => (
                  <div key={i} className="flex gap-3 p-4 bg-white border border-bs-border rounded-2xl">
                    <span className="flex-shrink-0 w-7 h-7 rounded-full bg-bs-teal-light text-bs-teal text-xs font-bold flex items-center justify-center mt-0.5">
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="font-semibold text-bs-dark text-sm mb-1">{hack.title}</p>
                      <p className="text-xs text-bs-gray leading-relaxed">{hack.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Email capture */}
            <EmailCapture category={primaryCategory} locale={locale} />

            {/* FAQ */}
            <section>
              <h2 className="text-2xl font-bold text-bs-dark mb-5">
                {t('faq_title')}
              </h2>
              <FAQ items={faqItems} />
            </section>
          </div>

          {/* ── Sidebar ───────────────────────────────────────────── */}
          <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">

            {/* Browse by Category */}
            <div className="bg-white border border-bs-border rounded-2xl p-5">
              <h3 className="font-semibold text-bs-dark mb-4 text-sm uppercase tracking-wide">
                {t('sidebar_browse')}
              </h3>
              <div className="flex flex-col gap-2">
                {brand.categories.map(cat => (
                  <Link
                    key={cat}
                    href={`/${locale}/category/${catToSlug(cat)}`}
                    className="flex items-center justify-between text-sm text-bs-dark hover:text-bs-teal transition-colors py-1 border-b border-bs-border/50 last:border-0"
                  >
                    <span>{translateCategory(locale, cat)}</span>
                    <span className="text-bs-gray">→</span>
                  </Link>
                ))}
                <Link
                  href={`/${locale}/category`}
                  className="text-xs text-bs-teal hover:underline mt-2 text-center"
                >
                  {t('all_categories')}
                </Link>
              </div>
            </div>

            {/* Top Brands for this category */}
            {topCategoryBrands.length > 0 && (
              <div className="bg-white border border-bs-border rounded-2xl p-5">
                <h3 className="font-semibold text-bs-dark mb-4 text-sm uppercase tracking-wide">
                  {t('top_brands_sidebar_title', { category: localizedCategory })}
                </h3>
                <ol className="flex flex-col">
                  {topCategoryBrands.map(({ rank, brand: entry }) => {
                    const isCurrent = entry.slug === brand.slug;
                    return (
                      <li
                        key={entry.id}
                        className={`flex items-center gap-2 py-1.5 border-b border-bs-border/50 last:border-0 rounded-lg px-1.5 -mx-1.5 ${
                          isCurrent ? 'bg-bs-teal-light' : ''
                        }`}
                      >
                        {/* Rank */}
                        <span
                          className="text-xs font-bold tabular-nums w-4 text-center shrink-0"
                          style={{ color: rank === 1 ? '#4a9982' : rank <= 3 ? '#9a9a92' : '#c8c8c0' }}
                        >
                          {rank}
                        </span>

                        {/* Logo */}
                        <BrandLogo
                          name={entry.name}
                          logo={entry.logo}
                          domain={entry.domain}
                          size={28}
                          logoQuality={entry.logoQuality}
                        />

                        {/* Name */}
                        <Link
                          href={`/${locale}/brands-like/${entry.slug}`}
                          className={`flex-1 text-xs font-medium truncate hover:text-bs-teal transition-colors ${
                            isCurrent ? 'text-bs-teal' : 'text-bs-dark'
                          }`}
                        >
                          {entry.name}
                        </Link>

                        {/* Visit icon link */}
                        {entry.affiliateUrl && (
                          <a
                            href={entry.affiliateUrl}
                            target="_blank"
                            rel="noopener noreferrer nofollow sponsored"
                            className="shrink-0 text-bs-gray hover:text-bs-teal transition-colors"
                            aria-label={`Visit ${entry.name}`}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                        )}
                      </li>
                    );
                  })}
                </ol>

                {/* See all link */}
                <Link
                  href={`/${locale}/top-brands/${categorySlug}`}
                  className="block text-xs text-bs-teal hover:underline mt-3 text-center"
                >
                  {t('top_brands_sidebar_see_all')}
                </Link>
              </div>
            )}

          </aside>

        </div>
      </div>

      {/* Exit-intent popup — desktop only, once per session */}
      {alternatives.length >= 3 && (
        <ExitIntentPopup
          brandName={displayName}
          alternatives={alternatives.slice(0, 3).map(alt => ({
            name: cleanDisplayName(alt.name),
            slug: alt.slug,
            logo: alt.logo,
            domain: alt.domain,
            affiliateUrl: alt.affiliateUrl,
            logoQuality: alt.logoQuality,
          }))}
          locale={locale}
        />
      )}
    </>
  );
}
