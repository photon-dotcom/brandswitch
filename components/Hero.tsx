import { getTranslations } from 'next-intl/server';
import { SearchBar } from './SearchBar';

interface HeroProps {
  locale: string;
}

// Quick-search suggestion chips — per market, slugs verified against real data
const MARKET_CHIPS: Record<string, Array<{ label: string; slug: string }>> = {
  us: [
    { label: 'Nike',     slug: 'nike'     },
    { label: 'ASOS',     slug: 'asos'     },
    { label: 'NordVPN',  slug: 'nordvpn'  },
    { label: 'Samsung',  slug: 'samsung'  },
    { label: 'Dyson',    slug: 'dyson'    },
    { label: 'Chewy',    slug: 'chewy'    },
  ],
  uk: [
    { label: 'Samsung',       slug: 'samsung'       },
    { label: 'Dyson',         slug: 'dyson'         },
    { label: 'Estée Lauder',  slug: 'estee-lauder'  },
    { label: 'NordVPN',       slug: 'nordvpn'       },
    { label: 'Reebok',        slug: 'reebok'        },
    { label: 'Stokke',        slug: 'stokke'        },
  ],
  de: [
    { label: 'Samsung',       slug: 'samsung'       },
    { label: 'ASOS',          slug: 'asos'          },
    { label: 'Dyson',         slug: 'dyson'         },
    { label: 'Under Armour',  slug: 'under-armour'  },
    { label: 'Reebok',        slug: 'reebok'        },
    { label: 'GetYourGuide',  slug: 'getyourguide'  },
  ],
  fr: [
    { label: 'NordVPN',       slug: 'nordvpn'       },
    { label: 'ASOS',          slug: 'asos'          },
    { label: 'Dyson',         slug: 'dyson'         },
    { label: 'Under Armour',  slug: 'under-armour'  },
    { label: 'Reebok',        slug: 'reebok'        },
    { label: 'GetYourGuide',  slug: 'getyourguide'  },
  ],
};

export async function Hero({ locale }: HeroProps) {
  const t = await getTranslations('hero');

  return (
    <section className="relative pt-20 pb-32 md:pt-28 md:pb-40 px-4 sm:px-6 overflow-hidden">
      {/* Subtle decorative background gradient */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(74,153,130,0.08) 0%, transparent 70%)',
        }}
      />

      <div className="relative max-w-3xl mx-auto text-center">
        {/* Eyebrow tag */}
        <div className="inline-flex items-center gap-2 bg-bs-teal-light text-bs-teal text-xs font-semibold px-3 py-1.5 rounded-full mb-6 tracking-wide uppercase">
          <span className="w-1.5 h-1.5 bg-bs-teal rounded-full" />
          Brand Discovery
        </div>

        {/* Headline */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-bs-dark leading-[1.1] tracking-tight mb-5">
          {t('title')}
        </h1>

        {/* Subtitle */}
        <p className="text-lg md:text-xl text-bs-gray max-w-xl mx-auto mb-10 leading-relaxed">
          {t('subtitle')}
        </p>

        {/* Search bar */}
        <div className="max-w-xl mx-auto">
          <SearchBar locale={locale} size="large" />
        </div>

        {/* Popular brand suggestion chips */}
        <div className="mt-6 flex flex-wrap justify-center items-center gap-2">
          <span className="text-xs text-bs-gray/70 font-medium">{t('try')}</span>
          {(MARKET_CHIPS[locale] ?? MARKET_CHIPS.us).map(chip => (
            <a
              key={chip.slug}
              href={`/${locale}/brands-like/${chip.slug}`}
              className="text-xs bg-white border border-bs-border text-bs-dark px-3 py-1.5 rounded-full hover:border-bs-teal hover:text-bs-teal transition-colors shadow-card"
            >
              {chip.label}
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
