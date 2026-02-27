'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

interface HeaderProps {
  locale: string;
}

const COUNTRY_GROUPS = [
  { region: 'Americas', countries: [
    { locale: 'us', flag: '🇺🇸', name: 'United States', label: 'US' },
    { locale: 'ca', flag: '🇨🇦', name: 'Canada',         label: 'CA' },
    { locale: 'mx', flag: '🇲🇽', name: 'Mexico',         label: 'MX' },
    { locale: 'br', flag: '🇧🇷', name: 'Brazil',         label: 'BR' },
  ]},
  { region: 'Europe', countries: [
    { locale: 'uk', flag: '🇬🇧', name: 'United Kingdom', label: 'UK' },
    { locale: 'de', flag: '🇩🇪', name: 'Germany',        label: 'DE' },
    { locale: 'fr', flag: '🇫🇷', name: 'France',         label: 'FR' },
    { locale: 'nl', flag: '🇳🇱', name: 'Netherlands',    label: 'NL' },
    { locale: 'es', flag: '🇪🇸', name: 'Spain',          label: 'ES' },
    { locale: 'it', flag: '🇮🇹', name: 'Italy',          label: 'IT' },
    { locale: 'se', flag: '🇸🇪', name: 'Sweden',         label: 'SE' },
    { locale: 'ch', flag: '🇨🇭', name: 'Switzerland',    label: 'CH' },
    { locale: 'at', flag: '🇦🇹', name: 'Austria',        label: 'AT' },
    { locale: 'dk', flag: '🇩🇰', name: 'Denmark',        label: 'DK' },
    { locale: 'fi', flag: '🇫🇮', name: 'Finland',        label: 'FI' },
    { locale: 'be', flag: '🇧🇪', name: 'Belgium',        label: 'BE' },
    { locale: 'no', flag: '🇳🇴', name: 'Norway',         label: 'NO' },
  ]},
  { region: 'Oceania', countries: [
    { locale: 'au', flag: '🇦🇺', name: 'Australia',      label: 'AU' },
  ]},
];

const ALL_LOCALES = ['us','uk','de','fr','nl','es','it','se','ch','at','au','dk','ca','fi','mx','br','be','no'];

function getLocaleRegex() {
  return new RegExp(`^\\/(${ALL_LOCALES.join('|')})`);
}

export function Header({ locale }: HeaderProps) {
  const t = useTranslations('nav');
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [marketOpen, setMarketOpen] = useState(false);

  // Strip the locale prefix from the current path
  const pathWithoutLocale = pathname.replace(getLocaleRegex(), '');

  const currentCountry = COUNTRY_GROUPS.flatMap(g => g.countries).find(c => c.locale === locale)
    ?? { locale: 'us', flag: '🇺🇸', name: 'United States', label: 'US' };

  function handleCountrySelect(targetLocale: string) {
    // Set cookie so middleware remembers the choice
    document.cookie = `bs-locale=${targetLocale}; path=/; max-age=31536000; SameSite=Lax`;
    setMarketOpen(false);
    setMobileOpen(false);
    router.push(`/${targetLocale}${pathWithoutLocale}`);
  }

  return (
    <header className="sticky top-0 z-50 bg-bs-bg/95 backdrop-blur-sm border-b border-bs-border">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">

        {/* ── Logo ─────────────────────────────── */}
        <Link href={`/${locale}`} className="flex items-center gap-0.5 shrink-0">
          <span className="text-xl font-bold text-bs-dark tracking-tight leading-none">brand</span>
          <span className="text-xl font-bold text-bs-teal tracking-tight leading-none">switch</span>
        </Link>

        {/* ── Desktop nav ──────────────────────── */}
        <nav className="hidden md:flex items-center gap-7">
          <Link href={`/${locale}/category`} className="text-sm font-medium text-bs-gray hover:text-bs-dark transition-colors">
            {t('categories')}
          </Link>
          <Link href={`/${locale}/brands-like`} className="text-sm font-medium text-bs-gray hover:text-bs-dark transition-colors">
            {t('popular')}
          </Link>
          <Link href={`/${locale}/top-brands`} className="text-sm font-medium text-bs-gray hover:text-bs-dark transition-colors">
            {t('top_brands')}
          </Link>
          <Link href={`/${locale}/blog`} className="text-sm font-medium text-bs-gray hover:text-bs-dark transition-colors">
            {t('blog')}
          </Link>
        </nav>

        {/* ── Right side ───────────────────────── */}
        <div className="flex items-center gap-3">

          {/* Market switcher dropdown */}
          <div className="relative hidden sm:block">
            <button
              onClick={() => setMarketOpen(!marketOpen)}
              className="inline-flex items-center gap-1.5 text-xs font-medium bg-bs-teal-light text-bs-teal px-2.5 py-1 rounded-full hover:bg-bs-teal/15 transition-colors"
              aria-haspopup="true"
              aria-expanded={marketOpen}
            >
              <span>{currentCountry.flag}</span>
              <span>{currentCountry.label}</span>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" className="opacity-60">
                <path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
              </svg>
            </button>

            {marketOpen && (
              <>
                {/* Backdrop */}
                <div className="fixed inset-0 z-10" onClick={() => setMarketOpen(false)} />
                {/* Dropdown */}
                <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-bs-border rounded-xl shadow-lg py-2 w-56 max-h-[80vh] overflow-y-auto">
                  {COUNTRY_GROUPS.map(group => (
                    <div key={group.region}>
                      <div className="px-3 pt-2 pb-1">
                        <span className="text-[10px] font-semibold text-bs-gray/60 uppercase tracking-wider">{group.region}</span>
                      </div>
                      {group.countries.map(c => (
                        <button
                          key={c.locale}
                          onClick={() => handleCountrySelect(c.locale)}
                          className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-sm transition-colors hover:bg-bs-bg text-left ${
                            c.locale === locale
                              ? 'font-semibold text-bs-teal'
                              : 'text-bs-dark'
                          }`}
                        >
                          <span>{c.flag}</span>
                          <span>{c.name}</span>
                          {c.locale === locale && (
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="ml-auto text-bs-teal">
                              <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 -mr-2 text-bs-dark rounded-lg hover:bg-bs-border/50 transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <rect y="3" width="20" height="2" rx="1" />
                <rect y="9" width="20" height="2" rx="1" />
                <rect y="15" width="20" height="2" rx="1" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* ── Mobile menu ──────────────────────── */}
      {mobileOpen && (
        <div className="md:hidden border-t border-bs-border bg-bs-bg">
          <nav className="max-w-6xl mx-auto px-4 py-5 flex flex-col gap-4">
            <Link href={`/${locale}/category`} className="text-sm font-medium text-bs-dark" onClick={() => setMobileOpen(false)}>
              {t('categories')}
            </Link>
            <Link href={`/${locale}/brands-like`} className="text-sm font-medium text-bs-dark" onClick={() => setMobileOpen(false)}>
              {t('popular')}
            </Link>
            <Link href={`/${locale}/top-brands`} className="text-sm font-medium text-bs-dark" onClick={() => setMobileOpen(false)}>
              {t('top_brands')}
            </Link>
            <Link href={`/${locale}/blog`} className="text-sm font-medium text-bs-dark" onClick={() => setMobileOpen(false)}>
              {t('blog')}
            </Link>

            {/* Mobile market switcher */}
            <div className="border-t border-bs-border pt-4">
              <p className="text-xs text-bs-gray uppercase tracking-wide mb-3">Market</p>
              {COUNTRY_GROUPS.map(group => (
                <div key={group.region} className="mb-3">
                  <p className="text-[10px] text-bs-gray/60 uppercase tracking-wide mb-2">{group.region}</p>
                  <div className="flex gap-2 flex-wrap">
                    {group.countries.map(c => (
                      <button
                        key={c.locale}
                        onClick={() => handleCountrySelect(c.locale)}
                        className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-full transition-colors ${
                          c.locale === locale
                            ? 'bg-bs-teal text-white font-semibold'
                            : 'bg-bs-border/60 text-bs-dark hover:bg-bs-teal-light'
                        }`}
                      >
                        {c.flag} {c.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
