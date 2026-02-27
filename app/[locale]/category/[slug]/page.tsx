import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import {
  getCategories,
  getBrandsByCategory,
  getCategoryName,
  MARKETS,
} from '@/lib/brands';
import { translateCategory } from '@/lib/translations';
import { BrandCard } from '@/components/BrandCard';
import { Breadcrumbs } from '@/components/Breadcrumbs';

interface Props {
  params: { locale: string; slug: string };
}

export async function generateStaticParams() {
  const params: { slug: string }[] = [];
  for (const locale of MARKETS) {
    for (const cat of getCategories(locale)) {
      params.push({ slug: cat.slug });
    }
  }
  return params;
}
export const dynamicParams = false;
export const revalidate = 604800;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const name = getCategoryName(params.locale, params.slug);
  return {
    title: `Best ${name} Brands — Find Alternatives | Brandswitch`,
    description: `Discover the best ${name} brands. Browse alternatives and find brands similar to your favourites in the ${name} space.`,
    alternates: {
      canonical: `https://brandswitch.com/${params.locale}/category/${params.slug}`,
    },
  };
}

export default async function CategoryPage({ params: { locale, slug } }: Props) {
  const t = await getTranslations('ui');
  const categoryName = getCategoryName(locale, slug);
  if (!categoryName) notFound();

  const allBrands = getBrandsByCategory(locale, slug);
  if (allBrands.length === 0) notFound();

  // Show top 100 by eCPC (already sorted by getBrandsByCategory)
  const displayed = allBrands.slice(0, 100);
  const remaining = allBrands.length - displayed.length;
  const localizedName = translateCategory(locale, categoryName);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <Breadcrumbs
        items={[
          { label: t('home'), href: `/${locale}` },
          { label: t('browse_by_category'), href: `/${locale}/category` },
          { label: localizedName },
        ]}
      />

      {/* Header */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 bg-bs-teal-light text-bs-teal text-xs font-semibold px-3 py-1.5 rounded-full mb-3 uppercase tracking-wide">
          {t('category_label')}
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-bs-dark mb-2">
          {localizedName}
        </h1>
        <p className="text-bs-gray">
          {allBrands.length.toLocaleString()} {t('brands_label')} — {t('ranked_popularity')}
        </p>
      </div>

      {/* Brand grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 mb-8">
        {displayed.map(brand => (
          <BrandCard key={brand.id} brand={brand} locale={locale} />
        ))}
      </div>

      {/* More indicator */}
      {remaining > 0 && (
        <div className="text-center py-6 border-t border-bs-border">
          <p className="text-bs-gray text-sm mb-3">
            {t('showing_top', {
              shown: displayed.length.toLocaleString(),
              total: allBrands.length.toLocaleString(),
              category: localizedName,
            })}
          </p>
          <Link
            href={`/${locale}/best/${slug.replace(/-and-/g, '-').replace('sports-outdoors-and-fitness', 'outdoor-brands')}`}
            className="text-sm text-bs-teal hover:underline"
          >
            {t('see_best_of_link')}
          </Link>
        </div>
      )}
    </div>
  );
}
