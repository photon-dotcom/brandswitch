import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import {
  getCategories,
  getCuratedTopBrands,
  getCuratedCategorySlugs,
  MARKETS,
} from '@/lib/brands';
import { translateCategory } from '@/lib/translations';
import { BrandLogo } from '@/components/BrandLogo';
import { AffiliateButton } from '@/components/AffiliateButton';
import { Breadcrumbs } from '@/components/Breadcrumbs';

interface Props {
  params: { locale: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return {
    title: 'Top Brands | Brandswitch',
    description:
      'Our curated picks of the best brands across 18 categories — from fashion and beauty to tech and travel.',
    alternates: {
      canonical: `https://brandswitch.com/${params.locale}/top-brands`,
    },
  };
}

export async function generateStaticParams() {
  return MARKETS.map(locale => ({ locale }));
}
export const revalidate = 604800;

// Category display order (matches categories-us.json order)
const CAT_ICONS: Record<string, string> = {
  'health-and-beauty':              '✦',
  'accessories':                    '◆',
  'home-and-garden':                '◇',
  'clothing':                       '▲',
  'sports-outdoors-and-fitness':    '△',
  'digital-services-and-streaming': '○',
  'electronics':                    '□',
  'food-drinks-and-restaurants':    '◎',
  'travel-and-vacations':           '◈',
  'gifts-flowers-and-parties':      '✧',
  'shoes':                          '◉',
  'toys-and-games':                 '◐',
  'subscription-boxes-and-services':'◑',
  'events-and-entertainment':       '◒',
  'auto-and-tires':                 '◓',
  'pets':                           '◔',
  'baby-and-toddler':               '◕',
  'office-supplies':                '◖',
};

export default async function TopBrandsPage({ params: { locale } }: Props) {
  const t = await getTranslations('ui');
  const categories = getCategories(locale);
  const curatedSlugs = new Set(getCuratedCategorySlugs());

  // Build sections in category order, only for cats that have curated data
  const sections = categories
    .filter(cat => curatedSlugs.has(cat.slug))
    .map(cat => {
      const brands = getCuratedTopBrands(locale, cat.slug);
      return { cat, brands, preview: brands.slice(0, 10) };
    })
    .filter(s => s.preview.length > 0);

  const totalCats = sections.length;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      <Breadcrumbs
        items={[
          { label: t('home'), href: `/${locale}` },
          { label: t('top_brands_title') },
        ]}
      />

      {/* ── Page header ─────────────────────────────────────────────── */}
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-bs-dark mb-3">
          {t('top_brands_title')}
        </h1>
        <p className="text-bs-gray max-w-xl leading-relaxed">
          {t('top_brands_subtitle', { count: totalCats })}
        </p>
      </div>

      {/* ── Quick-jump tabs ──────────────────────────────────────────── */}
      <div className="flex gap-2 flex-wrap mb-10">
        {sections.map(({ cat }) => (
          <a
            key={cat.slug}
            href={`#${cat.slug}`}
            className="inline-flex items-center gap-1.5 text-xs font-medium bg-white border border-bs-border text-bs-gray px-3 py-1.5 rounded-full hover:border-bs-teal/50 hover:text-bs-teal transition-colors"
          >
            <span>{CAT_ICONS[cat.slug] ?? '◆'}</span>
            {translateCategory(locale, cat.name)}
          </a>
        ))}
      </div>

      {/* ── Category sections ────────────────────────────────────────── */}
      <div className="space-y-14">
        {sections.map(({ cat, brands, preview }) => (
          <section key={cat.slug} id={cat.slug} className="scroll-mt-20">

            {/* Section header */}
            <div className="flex items-center justify-between mb-4 gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-bs-teal-light flex items-center justify-center text-bs-teal font-bold text-base shrink-0">
                  {CAT_ICONS[cat.slug] ?? '◆'}
                </div>
                <h2 className="text-xl font-bold text-bs-dark">
                  {translateCategory(locale, cat.name)}
                </h2>
              </div>
              <Link
                href={`/${locale}/top-brands/${cat.slug}`}
                className="text-sm text-bs-teal hover:underline shrink-0"
              >
                {t('top_brands_see_all', {
                  count: brands.length,
                  category: translateCategory(locale, cat.name),
                })}
              </Link>
            </div>

            {/* Ranked list (top 10 preview) */}
            <ol className="space-y-2">
              {preview.map(({ rank, brand }) => (
                <li key={brand.id}>
                  <div className="flex items-center gap-3 p-3 sm:p-4 bg-white border border-bs-border rounded-xl hover:border-bs-teal/40 hover:shadow-card-hover transition-all">
                    {/* Rank */}
                    <span
                      className="text-xl font-black shrink-0 w-7 text-center leading-none tabular-nums"
                      style={{ color: rank === 1 ? '#4a9982' : rank <= 3 ? '#9a9a92' : '#d4d4cc' }}
                    >
                      {rank}
                    </span>

                    {/* Logo */}
                    <BrandLogo
                      name={brand.name}
                      logo={brand.logo}
                      domain={brand.domain}
                      size={44}
                      logoQuality={brand.logoQuality}
                    />

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-bs-dark text-sm truncate">{brand.name}</p>
                      <p className="text-xs text-bs-gray truncate">{brand.domain}</p>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      {brand.affiliateUrl && (
                        <AffiliateButton
                          href={brand.affiliateUrl}
                          label={t('visit')}
                          variant="secondary"
                          size="sm"
                        />
                      )}
                      <Link
                        href={`/${locale}/brands-like/${brand.slug}`}
                        className="text-xs text-bs-teal hover:underline"
                      >
                        {t('view_alternatives')}
                      </Link>
                    </div>
                  </div>
                </li>
              ))}
            </ol>

            {/* See all link (shown when there are more than 10) */}
            {brands.length > 10 && (
              <div className="mt-3 text-center">
                <Link
                  href={`/${locale}/top-brands/${cat.slug}`}
                  className="inline-flex items-center gap-1 text-sm text-bs-teal hover:underline"
                >
                  {t('top_brands_see_all', {
                    count: brands.length,
                    category: translateCategory(locale, cat.name),
                  })}
                </Link>
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
