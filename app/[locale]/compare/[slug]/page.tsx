import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import {
  getBrandBySlug,
  getBrandAlternatives,
  getBrandMarkets,
  getComparisonPairs,
  cleanDisplayName,
  catToSlug,
} from '@/lib/brands';
import { translateCategory } from '@/lib/translations';
import { BrandLogo } from '@/components/BrandLogo';
import { AffiliateButton } from '@/components/AffiliateButton';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { AlternativeCard } from '@/components/AlternativeCard';

interface Props {
  params: { locale: string; slug: string };
}

// Pre-render top comparison pairs per market
export async function generateStaticParams() {
  const params: { locale: string; slug: string }[] = [];
  // Only pre-render US pairs; other markets rendered on demand
  for (const locale of ['us', 'uk', 'de']) {
    for (const { slug1, slug2 } of getComparisonPairs(locale, 100)) {
      params.push({ locale, slug: `${slug1}-vs-${slug2}` });
    }
  }
  return params;
}

export const dynamicParams = true;
export const revalidate = 604800;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const parts = params.slug.split('-vs-');
  if (parts.length < 2) return { title: 'Comparison Not Found' };
  const [s1, s2] = parts;
  const b1 = getBrandBySlug(params.locale, s1);
  const b2 = getBrandBySlug(params.locale, s2);
  if (!b1 || !b2) return { title: 'Comparison Not Found' };

  const n1 = cleanDisplayName(b1.name);
  const n2 = cleanDisplayName(b2.name);
  const cat = b1.categories[0] ?? b2.categories[0] ?? 'brand';
  const title = `${n1} vs ${n2}: Compare ${cat} Brands | Brandswitch`;
  const description = `${n1} vs ${n2} — side-by-side comparison of two ${cat.toLowerCase()} brands. See alternatives, markets, and which brand is right for you.`;

  return {
    title,
    description,
    alternates: {
      canonical: `https://brandswitch.com/${params.locale}/compare/${params.slug}`,
    },
    openGraph: { title, description, type: 'website' },
  };
}

export default async function ComparisonPage({ params: { locale, slug } }: Props) {
  const t = await getTranslations('ui');

  // Parse slug: "brand1-vs-brand2" — split on first occurrence of "-vs-"
  const vsIndex = slug.indexOf('-vs-');
  if (vsIndex === -1) notFound();
  const slug1 = slug.slice(0, vsIndex);
  const slug2 = slug.slice(vsIndex + 4);

  const brand1 = getBrandBySlug(locale, slug1);
  const brand2 = getBrandBySlug(locale, slug2);
  if (!brand1 || !brand2) notFound();

  const name1 = cleanDisplayName(brand1.name);
  const name2 = cleanDisplayName(brand2.name);
  const cat = brand1.categories[0] ?? brand2.categories[0] ?? 'brand';
  const catSlug = catToSlug(cat);
  const localizedCat = translateCategory(locale, cat);

  const alts1 = getBrandAlternatives(locale, brand1).filter(a => a.slug !== slug2).slice(0, 6);
  const alts2 = getBrandAlternatives(locale, brand2).filter(a => a.slug !== slug1).slice(0, 6);

  const markets1 = getBrandMarkets(slug1);
  const markets2 = getBrandMarkets(slug2);

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${name1} vs ${name2}`,
    description: `Comparison of ${name1} and ${name2}`,
    numberOfItems: 2,
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: name1, url: `https://brandswitch.com/${locale}/brands-like/${slug1}` },
      { '@type': 'ListItem', position: 2, name: name2, url: `https://brandswitch.com/${locale}/brands-like/${slug2}` },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <Breadcrumbs
          items={[
            { label: t('home'), href: `/${locale}` },
            { label: localizedCat, href: `/${locale}/category/${catSlug}` },
            { label: `${name1} vs ${name2}` },
          ]}
        />

        {/* ── H1 ────────────────────────────────────────────────────── */}
        <h1 className="text-3xl sm:text-4xl font-bold text-bs-dark mb-2">
          {name1} vs {name2} — Which is Better?
        </h1>
        <p className="text-bs-gray mb-8">
          Side-by-side comparison of two {localizedCat.toLowerCase()} brands.
        </p>

        {/* ── Side-by-side cards ────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-10">
          {[
            { brand: brand1, name: name1, slug: slug1, alts: alts1, markets: markets1 },
            { brand: brand2, name: name2, slug: slug2, alts: alts2, markets: markets2 },
          ].map(({ brand, name, slug: bSlug, markets }) => (
            <div key={bSlug} className="bg-white border border-bs-border rounded-3xl p-6 flex flex-col gap-4">
              {/* Logo + name */}
              <div className="flex items-center gap-4">
                <BrandLogo name={brand.name} logo={brand.logo} domain={brand.domain} size={64} logoQuality={brand.logoQuality} />
                <div>
                  <h2 className="text-xl font-bold text-bs-dark">{name}</h2>
                  <p className="text-xs text-bs-gray">{brand.domain}</p>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3 py-3 border-y border-bs-border">
                {[
                  { label: 'Category', value: translateCategory(locale, brand.categories[0] ?? '') },
                  { label: 'Markets', value: markets.length.toString() },
                  { label: 'Alternatives', value: (brand.similarBrands?.length ?? 0).toString() },
                ].map(({ label, value }) => (
                  <div key={label} className="text-center">
                    <p className="text-xs text-bs-gray mb-0.5">{label}</p>
                    <p className="text-sm font-semibold text-bs-dark">{value}</p>
                  </div>
                ))}
              </div>

              {/* CTAs */}
              <div className="flex flex-col gap-2 mt-auto">
                {brand.affiliateUrl && (
                  <AffiliateButton
                    href={brand.affiliateUrl}
                    label={`Visit ${name}`}
                    variant="primary"
                    size="md"
                    className="w-full justify-center"
                  />
                )}
                <Link
                  href={`/${locale}/brands-like/${bSlug}`}
                  className="text-xs text-center text-bs-teal hover:underline"
                >
                  {t('view_alternatives')}
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* ── Other alternatives sections ───────────────────────────── */}
        {alts1.length > 0 && (
          <section className="mb-10">
            <h2 className="text-xl font-bold text-bs-dark mb-5">
              Other alternatives to {name1}
            </h2>
            <div className="grid grid-cols-1 gap-3">
              {alts1.map(alt => (
                <AlternativeCard key={alt.id} alternative={alt} mainBrand={brand1} locale={locale} />
              ))}
            </div>
          </section>
        )}

        {alts2.length > 0 && (
          <section>
            <h2 className="text-xl font-bold text-bs-dark mb-5">
              Other alternatives to {name2}
            </h2>
            <div className="grid grid-cols-1 gap-3">
              {alts2.map(alt => (
                <AlternativeCard key={alt.id} alternative={alt} mainBrand={brand2} locale={locale} />
              ))}
            </div>
          </section>
        )}

        {/* ── Back links ────────────────────────────────────────────── */}
        <div className="mt-10 pt-6 border-t border-bs-border flex flex-wrap gap-4 text-sm">
          <Link href={`/${locale}/brands-like/${slug1}`} className="text-bs-teal hover:underline">
            ← All alternatives to {name1}
          </Link>
          <Link href={`/${locale}/brands-like/${slug2}`} className="text-bs-teal hover:underline">
            ← All alternatives to {name2}
          </Link>
        </div>
      </div>
    </>
  );
}
