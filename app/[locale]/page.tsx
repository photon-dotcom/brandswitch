import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { Hero } from '@/components/Hero';
import { BrandLogo } from '@/components/BrandLogo';
import { AffiliateButton } from '@/components/AffiliateButton';
import { PopularBrandsSection } from '@/components/PopularBrandsSection';
import type { PopularBrandItem, CategoryPill } from '@/components/PopularBrandsSection';
import fs from 'fs';
import path from 'path';
import {
  getHomepageBrands,
  getHomepageFeaturedBrands,
  getTopBrands,
  getCategories,
  getBrandBySlug,
  catToSlug,
  cleanDisplayName,
  getBrandDescription,
} from '@/lib/brands';
import { translateCategory } from '@/lib/translations';

interface PageProps {
  params: { locale: string };
}

export async function generateMetadata({ params }: PageProps): Promise<import('next').Metadata> {
  return {
    alternates: {
      canonical: `https://brandswitch.com/${params.locale}`,
    },
  };
}

export const revalidate = 86400;

export default async function HomePage({ params: { locale } }: PageProps) {
  const tPopular = await getTranslations('popular');
  const tui     = await getTranslations('ui');

  // ── Popular Searches data ──────────────────────────────────────────────
  const homepageBrands = getHomepageBrands(locale, 18);

  // Serialise to plain objects for the client component
  const brandItems: PopularBrandItem[] = homepageBrands.map(b => ({
    id:                   b.id,
    name:                 b.name,
    slug:                 b.slug,
    logo:                 b.logo,
    domain:               b.domain,
    logoQuality:          b.logoQuality,
    primaryCategorySlug:  catToSlug(b.categories[0] ?? ''),
    primaryCategoryLabel: translateCategory(locale, b.categories[0] ?? ''),
  }));

  // Derive unique categories from the displayed brands (in order of first appearance)
  const catsSeen = new Set<string>();
  const categoryPills: CategoryPill[] = [];
  for (const b of brandItems) {
    if (b.primaryCategorySlug && !catsSeen.has(b.primaryCategorySlug)) {
      catsSeen.add(b.primaryCategorySlug);
      categoryPills.push({ slug: b.primaryCategorySlug, label: b.primaryCategoryLabel });
    }
  }

  // ── Featured Brands data ───────────────────────────────────────────────
  const featuredBrands = getHomepageFeaturedBrands(locale, 6);

  // ── Category section data ──────────────────────────────────────────────
  const categories = getCategories(locale);
  const sortedCategories = [...categories].sort((a, b) => b.brandCount - a.brandCount);
  const totalBrands = getTopBrands(locale, 999999).length;

  // ── Trending section data ──────────────────────────────────────────────
  const STATIC_TRENDING = [
    'nike', 'adidas', 'samsung', 'dyson', 'asos', 'ulta-beauty',
  ];

  const trendingBrands = (() => {
    try {
      const logPath = path.join(process.cwd(), 'data', 'click-log.json');
      const raw = fs.readFileSync(logPath, 'utf-8');
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const counts = new Map<string, number>();
      for (const line of raw.split('\n').filter(Boolean)) {
        const evt = JSON.parse(line) as { brandSlug: string; market: string; timestamp: string };
        if (evt.market !== locale) continue;
        if (new Date(evt.timestamp).getTime() < sevenDaysAgo) continue;
        counts.set(evt.brandSlug, (counts.get(evt.brandSlug) ?? 0) + 1);
      }
      const topSlugs = Array.from(counts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([slug]) => slug);
      if (topSlugs.length >= 3) {
        return topSlugs.map(s => getBrandBySlug(locale, s)).filter(Boolean);
      }
    } catch { /* no click data yet */ }

    // Fall back to static list
    return STATIC_TRENDING.map(s => getBrandBySlug(locale, s)).filter(Boolean);
  })();

  return (
    <>
      {/* Hero — headline + search bar + chips */}
      <Hero locale={locale} />

      {/* ── Category section ──────────────────────────────────────────── */}
      <section className="px-4 sm:px-6 pb-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-bs-dark uppercase tracking-wide">
              {tui('browse_by_category')}
            </h2>
            <Link href={`/${locale}/category`} className="text-xs text-bs-teal hover:underline">
              {tui('all_categories')}
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
            {sortedCategories.slice(0, 6).map(cat => (
              <Link
                key={cat.slug}
                href={`/${locale}/category/${cat.slug}`}
                className="group flex flex-col gap-1 p-4 bg-white border border-bs-border rounded-2xl hover:border-bs-teal/50 hover:shadow-card-hover transition-all"
              >
                <p className="text-sm font-semibold text-bs-dark group-hover:text-bs-teal transition-colors leading-snug">
                  {translateCategory(locale, cat.name)}
                </p>
                <p className="text-xs text-bs-gray">
                  {cat.brandCount.toLocaleString()} {tui('brands_label')}
                </p>
              </Link>
            ))}
          </div>

          {sortedCategories.length > 6 && (
            <div className="flex flex-wrap gap-x-5 gap-y-2.5">
              {sortedCategories.slice(6).map(cat => (
                <Link
                  key={cat.slug}
                  href={`/${locale}/category/${cat.slug}`}
                  className="text-sm text-bs-gray hover:text-bs-teal transition-colors"
                >
                  {translateCategory(locale, cat.name)}
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Stats bar ─────────────────────────────────────────────────── */}
      <section className="px-4 sm:px-6 pb-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-wrap gap-6 text-sm text-bs-gray">
            <span>
              <strong className="text-bs-dark font-semibold">{totalBrands.toLocaleString()}</strong>{' '}
              brands in {locale.toUpperCase()}
            </span>
            <span>
              <strong className="text-bs-dark font-semibold">{categories.length}</strong>{' '}
              categories
            </span>
            <span>{tui('similarity_updated')}</span>
          </div>
        </div>
      </section>

      {/* ── Popular Searches (client component — handles category filtering) */}
      <PopularBrandsSection
        brands={brandItems}
        categories={categoryPills}
        locale={locale}
        title={tPopular('title')}
        viewAllLabel={tui('view_all')}
        viewAllHref={`/${locale}/brands-like`}
        viewAlternativesLabel={tui('view_alternatives')}
        allLabel={tui('all')}
      />

      {/* ── Trending Now ──────────────────────────────────────────────── */}
      {trendingBrands.length > 0 && (
        <section className="px-4 sm:px-6 py-4 pb-10">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-semibold text-bs-dark mb-0.5">Trending Now</h2>
                <p className="text-xs text-bs-gray">Most visited brands this week</p>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {trendingBrands.slice(0, 6).map(brand => {
                if (!brand) return null;
                return (
                  <div key={brand.id} className="flex flex-col gap-2 p-3 bg-white border border-bs-border rounded-2xl hover:border-bs-teal/50 hover:shadow-card-hover transition-all">
                    <BrandLogo name={brand.name} logo={brand.logo} domain={brand.domain} size={40} logoQuality={brand.logoQuality} />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-bs-dark truncate leading-tight">{cleanDisplayName(brand.name)}</p>
                      <span className="inline-block text-[10px] bg-bs-teal-light text-bs-teal px-1.5 py-0.5 rounded-full font-medium mt-0.5 truncate max-w-full">
                        {brand.categories[0] ?? ''}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1 mt-auto">
                      {brand.affiliateUrl && (
                        <AffiliateButton href={brand.affiliateUrl} label={tui('visit')} variant="secondary" size="sm" className="w-full justify-center" />
                      )}
                      <Link href={`/${locale}/brands-like/${brand.slug}`} className="text-[10px] text-center text-bs-teal hover:underline">
                        View alternatives →
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── Featured Brands ───────────────────────────────────────────── */}
      {featuredBrands.length > 0 && (
        <section className="px-4 sm:px-6 py-4 pb-14">
          <div className="max-w-6xl mx-auto">

            <div className="mb-6">
              <h2 className="text-lg font-semibold text-bs-dark mb-1">
                {tui('featured_brands_title')}
              </h2>
              <p className="text-sm text-bs-gray">{tui('featured_brands_subtitle')}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {featuredBrands.map(brand => (
                <div
                  key={brand.id}
                  className="flex flex-col gap-3 p-5 bg-white border border-bs-border rounded-2xl hover:border-bs-teal/40 hover:shadow-card-hover transition-all"
                >
                  {/* Logo + name row */}
                  <div className="flex items-center gap-3">
                    <BrandLogo
                      name={brand.name}
                      logo={brand.logo}
                      domain={brand.domain}
                      size={52}
                      logoQuality={brand.logoQuality}
                    />
                    <div className="min-w-0">
                      <p className="font-semibold text-bs-dark truncate">
                        {cleanDisplayName(brand.name)}
                      </p>
                      <p className="text-xs text-bs-gray truncate">{brand.domain}</p>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-bs-gray leading-relaxed line-clamp-2">
                    {getBrandDescription(brand)}
                  </p>

                  {/* CTAs */}
                  <div className="flex flex-col gap-2 mt-auto">
                    <AffiliateButton
                      href={brand.affiliateUrl}
                      label={`${tui('visit')} ${cleanDisplayName(brand.name)}`}
                      variant="primary"
                      size="sm"
                      className="w-full justify-center"
                    />
                    <Link
                      href={`/${locale}/brands-like/${brand.slug}`}
                      className="text-xs text-center text-bs-teal hover:underline"
                    >
                      {tui('view_alternatives')}
                    </Link>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </section>
      )}
    </>
  );
}
