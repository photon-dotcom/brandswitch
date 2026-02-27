import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import type { Brand } from '@/types/brand';
import { BrandLogo } from './BrandLogo';

interface BrandCardProps {
  brand: Brand;
  locale: string;
}

export async function BrandCard({ brand, locale }: BrandCardProps) {
  const t = await getTranslations('ui');

  return (
    <Link
      href={`/${locale}/brands-like/${brand.slug}`}
      className="group flex flex-col items-center gap-3 p-4 bg-white border border-bs-border rounded-2xl hover:border-bs-teal/50 hover:shadow-card-hover transition-all duration-150"
    >
      <BrandLogo name={brand.name} logo={brand.logo} domain={brand.domain} size={48} logoQuality={brand.logoQuality} />

      <div className="text-center w-full">
        <p className="text-sm font-semibold text-bs-dark leading-tight line-clamp-2">
          {brand.name}
        </p>
        <p className="text-xs text-bs-gray mt-0.5 group-hover:text-bs-teal transition-colors">
          {t('view_alternatives')}
        </p>
      </div>
    </Link>
  );
}
