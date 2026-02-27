import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import {
  getCuratedTopBrands,
  getCuratedCategorySlugs,
  getCategoryName,
  MARKETS,
} from '@/lib/brands';
import { translateCategory } from '@/lib/translations';
import { BrandLogo } from '@/components/BrandLogo';
import { AffiliateButton } from '@/components/AffiliateButton';
import { Breadcrumbs } from '@/components/Breadcrumbs';

interface Props {
  params: { locale: string; 'category-slug': string };
}

export async function generateStaticParams() {
  const slugs = getCuratedCategorySlugs();
  const params: { locale: string; 'category-slug': string }[] = [];
  for (const locale of MARKETS) {
    for (const slug of slugs) {
      params.push({ locale, 'category-slug': slug });
    }
  }
  return params;
}
export const dynamicParams = false;
export const revalidate = 86400;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const catSlug = params['category-slug'];
  const catName = getCategoryName('us', catSlug);
  if (!catName || catName === catSlug) return { title: 'Not Found' };

  return {
    title: `Top ${catName} Brands | Brandswitch`,
    description: `Discover the top ${catName} brands. Browse our curated picks and find great alternatives for each.`,
    alternates: {
      canonical: `https://brandswitch.com/${params.locale}/top-brands/${catSlug}`,
    },
  };
}

export default async function TopBrandsCategoryPage({ params }: Props) {
  const { locale } = params;
  const catSlug = params['category-slug'];
  const t = await getTranslations('ui');

  // Validate the category slug has curated data
  const curatedSlugs = getCuratedCategorySlugs();
  if (!curatedSlugs.includes(catSlug)) notFound();

  const brands = getCuratedTopBrands(locale, catSlug);
  if (brands.length === 0) notFound();

  const catNameEn = getCategoryName('us', catSlug);
  const localizedName = translateCategory(locale, catNameEn);

  const itemListSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Top ${catNameEn} Brands`,
    description: `Our curated list of the top ${catNameEn} brands`,
    numberOfItems: brands.length,
    itemListElement: brands.map(({ rank, brand }) => ({
      '@type': 'ListItem',
      position: rank,
      name: brand.name,
      url: `https://brandswitch.com/${locale}/brands-like/${brand.slug}`,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }}
      />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <Breadcrumbs
        items={[
          { label: t('home'), href: `/${locale}` },
          { label: t('top_brands_title'), href: `/${locale}/top-brands` },
          { label: localizedName },
        ]}
      />

      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 bg-bs-teal-light text-bs-teal text-xs font-semibold px-3 py-1.5 rounded-full mb-3 uppercase tracking-wide">
          {t('top_brands_title')}
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-bs-dark mb-3">
          Top {localizedName} Brands
        </h1>
        <p className="text-bs-gray max-w-xl leading-relaxed">
          {t('top_brands_intro', { category: localizedName })}
        </p>
      </div>

      {/* ── Ranked list ──────────────────────────────────────────── */}
      <ol className="space-y-3">
        {brands.map(({ rank, brand }) => (
          <li key={brand.id}>
            <div className="flex items-center gap-4 p-4 sm:p-5 bg-white border border-bs-border rounded-2xl hover:border-bs-teal/40 hover:shadow-card-hover transition-all">
              {/* Rank number */}
              <span
                className="text-2xl font-black shrink-0 w-8 text-center leading-none tabular-nums"
                style={{ color: rank === 1 ? '#4a9982' : rank <= 3 ? '#9a9a92' : '#e4e4de' }}
              >
                {rank}
              </span>

              {/* Logo */}
              <BrandLogo
                name={brand.name}
                logo={brand.logo}
                domain={brand.domain}
                size={52}
                logoQuality={brand.logoQuality}
              />

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-bs-dark truncate">{brand.name}</p>
                <p className="text-xs text-bs-gray mt-0.5">{brand.domain}</p>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {brand.categories.slice(0, 2).map(cat => (
                    <span
                      key={cat}
                      className="text-xs bg-bs-teal-light text-bs-teal px-2 py-0.5 rounded-full"
                    >
                      {translateCategory(locale, cat)}
                    </span>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col items-end gap-2 shrink-0">
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

      {/* ── Footer CTA ──────────────────────────────────────────── */}
      <div className="mt-10 p-6 bg-bs-teal-light rounded-2xl text-center">
        <p className="font-semibold text-bs-dark mb-1">
          {t('looking_for_more', { category: localizedName })}
        </p>
        <p className="text-sm text-bs-gray mb-4">
          {t('browse_full_list', { category: localizedName })}
        </p>
        <Link
          href={`/${locale}/category/${catSlug}`}
          className="inline-flex items-center gap-2 bg-bs-teal text-white font-semibold text-sm px-5 py-2.5 rounded-xl hover:bg-bs-teal-dark transition-colors"
        >
          {t('all_category_brands', { category: localizedName })}
        </Link>
      </div>
      </div>
    </>
  );
}
