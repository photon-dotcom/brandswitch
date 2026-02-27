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

// ── Static generation ──────────────────────────────────────────────────────

// Pre-render top 1000 brands per market at build time.
// All other brand pages are rendered on first request and cached.
export async function generateStaticParams() {
  const params: { slug: string }[] = [];
  for (const locale of MARKETS) {
    for (const slug of getTopBrandSlugs(locale, 1000)) {
      params.push({ slug });
    }
  }
  return params;
}

// Serve pages for brands not in the pre-rendered top-1000 (dynamic fallback)
export const dynamicParams = true;
// Cache for 24h then revalidate in background (ISR)
export const revalidate = 86400;

// ── SEO ───────────────────────────────────────────────────────────────────

interface Props {
  params: { locale: string; slug: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const brand = getBrandBySlug(params.locale, params.slug);
  if (!brand) return { title: 'Brand Not Found' };

  const displayName = cleanDisplayName(brand.name);
  const cat = brand.categories[0] ?? 'brand';
  const altCount = brand.similarBrands?.length ?? 0;

  return {
    title: `${altCount} Brands Like ${displayName} — Best ${cat} Alternatives | Brandswitch`,
    description: getBrandDescription({ ...brand, name: displayName }),
    alternates: {
      canonical: `https://brandswitch.com/${params.locale}/brands-like/${params.slug}`,
      languages: Object.fromEntries(
        MARKETS.map(m => [m === 'us' ? 'en-US' : m === 'uk' ? 'en-GB' : m, `https://brandswitch.com/${m}/brands-like/${params.slug}`])
      ),
    },
    robots: { index: true, follow: true },
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
  const seoText = generateSEOText(displayName, primaryCategory);
  const faqItems = buildFAQ({ ...brand, name: displayName });
  const description = getBrandDescription({ ...brand, name: displayName });

  return (
    <>
      <ItemListSchema brand={brand} alternatives={alternatives} locale={locale} />

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
                <div className="flex items-center gap-3">
                  <AffiliateButton
                    href={brand.affiliateUrl}
                    label={`Visit ${displayName}`}
                    variant="primary"
                    size="lg"
                  />
                  <span className="text-xs text-bs-gray/70">Affiliate link</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">

          {/* ── Main column ───────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-10">

            {/* Alternatives grid */}
            <section>
              <h2 className="text-xl font-bold text-bs-dark mb-5">
                {t('alternatives_title', { count: alternatives.length, brand: displayName })}
              </h2>

              {alternatives.length > 0 ? (
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
    </>
  );
}
