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
  return [
    {
      question: `How do we rank alternatives to ${name}?`,
      answer: `We use a similarity scoring system based on shared categories and product tags. Brands that operate in the exact same category as ${name} score highest. We then refine by additional signals like price tier and market overlap.`,
    },
    {
      question: `Is ${name} worth it?`,
      answer: `${name} is an established brand in the ${cat} space. Whether it's the right fit depends on your specific needs and budget. The alternatives listed here offer similar products and may suit you better depending on price, style, or values.`,
    },
    {
      question: `What are the best ${cat} brands?`,
      answer: `The best ${cat} brands depend on your priorities. For sheer variety, ${name} is a solid choice. For alternatives, check our full list above — each brand has been evaluated for quality and customer satisfaction in the ${cat} market.`,
    },
    {
      question: `Are the links on this page affiliate links?`,
      answer: `Yes, some "Visit" buttons on this page are affiliate links. We earn a small commission if you make a purchase — at no extra cost to you. This doesn't influence our rankings; we list brands based on similarity, not commission rates.`,
    },
  ];
}

// ── Schema.org ────────────────────────────────────────────────────────────

function FAQPageSchema({
  brand,
  category,
  alternatives,
}: {
  brand: { name: string; domain: string };
  category: string;
  alternatives: { name: string }[];
}) {
  if (alternatives.length < 3) return null;
  const [a1, a2, a3] = alternatives.map(a => cleanDisplayName(a.name));
  const count = alternatives.length;
  const cat = category.toLowerCase();
  const name = brand.name;

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: `What are the best alternatives to ${name}?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `The top alternatives to ${name} include ${a1}, ${a2}, and ${a3}. We've found ${count} similar ${cat} brands ranked by similarity.`,
        },
      },
      {
        '@type': 'Question',
        name: `What brands are similar to ${name}?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `Brands similar to ${name} include ${a1}, ${a2}, ${a3}, and ${count - 3} more. These are ${cat} brands that share a similar audience and style.`,
        },
      },
      {
        '@type': 'Question',
        name: `Is ${name} a good ${cat} brand?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `${name} is a popular ${cat} brand available at ${brand.domain}. Compare it with ${count} alternatives to find the best option for you.`,
        },
      },
    ],
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
  const faqItems = buildFAQ({ ...brand, name: displayName });
  const description = getBrandDescription({ ...brand, name: displayName });

  return (
    <>
      <ItemListSchema brand={brand} alternatives={alternatives} locale={locale} />
      <FAQPageSchema brand={brand} category={primaryCategory} alternatives={alternatives} />

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
