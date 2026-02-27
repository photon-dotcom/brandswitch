import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { getTopBrands, MARKETS } from '@/lib/brands';
import { BrandCard } from '@/components/BrandCard';

interface Props {
  params: { locale: string };
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: `Popular Brands — Find Alternatives | Brandswitch`,
    description: `Browse thousands of brands and discover alternatives. Search for any brand to find similar options ranked by similarity.`,
  };
}

export async function generateStaticParams() {
  return MARKETS.map(locale => ({ locale }));
}
export const revalidate = 86400;

export default async function BrandsIndexPage({ params: { locale } }: Props) {
  const t = await getTranslations('ui');
  const brands = getTopBrands(locale, 120);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-bs-dark mb-2">{t('popular_brands_title')}</h1>
        <p className="text-bs-gray">{t('popular_brands_subtitle')}</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {brands.map(brand => (
          <BrandCard key={brand.id} brand={brand} locale={locale} />
        ))}
      </div>
    </div>
  );
}
