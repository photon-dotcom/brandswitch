import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { getCategories, MARKETS } from '@/lib/brands';
import { translateCategory } from '@/lib/translations';

interface Props {
  params: { locale: string };
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Browse Brand Categories | Brandswitch',
    description: 'Explore brands by category. Find alternatives to your favourite fashion, travel, beauty, tech brands and more.',
  };
}

export async function generateStaticParams() {
  return MARKETS.map(locale => ({ locale }));
}
export const revalidate = 86400;

// Geometric icon map for category visual identity
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

export default async function CategoryIndexPage({ params: { locale } }: Props) {
  const t = await getTranslations('ui');
  const categories = getCategories(locale);
  const totalBrands = categories.reduce((s, c) => s + c.brandCount, 0);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-bs-dark mb-2">{t('browse_by_category')}</h1>
        <p className="text-bs-gray">
          {t('categories_subtitle', { cats: categories.length, total: totalBrands.toLocaleString() })}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {categories.map(cat => (
          <Link
            key={cat.slug}
            href={`/${locale}/category/${cat.slug}`}
            className="group flex items-center gap-4 p-5 bg-white border border-bs-border rounded-2xl hover:border-bs-teal/50 hover:shadow-card-hover transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-bs-teal-light flex items-center justify-center shrink-0 text-bs-teal font-bold text-lg group-hover:bg-bs-teal group-hover:text-white transition-colors">
              {CAT_ICONS[cat.slug] ?? '◆'}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-bs-dark group-hover:text-bs-teal transition-colors truncate">
                {translateCategory(locale, cat.name)}
              </p>
              <p className="text-xs text-bs-gray mt-0.5">
                {cat.brandCount.toLocaleString()} {t('brands_label')}
              </p>
            </div>
            <span className="ml-auto text-bs-gray group-hover:text-bs-teal transition-colors shrink-0">→</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
