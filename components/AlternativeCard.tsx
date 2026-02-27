import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import type { Brand } from '@/types/brand';
import { sharedCategories, getBrandDescription, getAlternativeReason } from '@/lib/brands';
import { translateCategory } from '@/lib/translations';
import { BrandLogo } from './BrandLogo';
import { AffiliateButton } from './AffiliateButton';
import { SaveButton } from './SaveButton';

interface AlternativeCardProps {
  alternative: Brand;
  mainBrand: Brand;
  locale: string;
}

export async function AlternativeCard({ alternative, mainBrand, locale }: AlternativeCardProps) {
  const t = await getTranslations('ui');
  const shared = sharedCategories(mainBrand, alternative);
  const reason = getAlternativeReason(locale, mainBrand, alternative);

  return (
    <div className="group flex gap-4 p-4 sm:p-5 bg-white border border-bs-border rounded-2xl hover:border-bs-teal/40 hover:shadow-card-hover transition-all">
      {/* Logo */}
      <BrandLogo
        name={alternative.name}
        logo={alternative.logo}
        domain={alternative.domain}
        size={56}
        className="mt-0.5"
        logoQuality={alternative.logoQuality}
      />

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Name row */}
        <div className="flex items-start justify-between gap-3 mb-1">
          <div className="min-w-0">
            <Link
              href={`/${locale}/brands-like/${alternative.slug}`}
              className="font-semibold text-bs-dark hover:text-bs-teal transition-colors block truncate"
            >
              {alternative.name}
            </Link>
            <p className="text-xs text-bs-gray">{alternative.domain}</p>
            <p className="text-xs text-bs-gray/60 mt-0.5">{reason}</p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <AffiliateButton
              href={alternative.affiliateUrl}
              label={t('visit')}
              variant="secondary"
              size="sm"
            />
            <SaveButton slug={alternative.slug} />
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-bs-gray mt-1.5 line-clamp-2 leading-relaxed">
          {getBrandDescription(alternative)}
        </p>

        {/* Why similar + bottom link */}
        <div className="flex items-center justify-between mt-2.5 gap-2">
          {shared.length > 0 ? (
            <p className="text-xs text-bs-gray">
              <span className="font-medium text-bs-dark">{t('similar_label')}</span>{' '}
              {shared.slice(0, 2).map(c => translateCategory(locale, c)).join(', ')}
            </p>
          ) : (
            <div />
          )}
          <Link
            href={`/${locale}/brands-like/${alternative.slug}`}
            className="text-xs text-bs-teal hover:underline shrink-0"
          >
            {t('brands_like_this')}
          </Link>
        </div>
      </div>
    </div>
  );
}
