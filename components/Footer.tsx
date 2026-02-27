import Link from 'next/link';
import { getCategories } from '@/lib/brands';
import { translateCategory } from '@/lib/translations';
import { FooterMarkets } from '@/components/FooterMarkets';

interface FooterProps {
  locale: string;
}

const ALL_MARKETS = [
  { locale: 'us', flag: '🇺🇸', label: 'United States' },
  { locale: 'uk', flag: '🇬🇧', label: 'United Kingdom' },
  { locale: 'de', flag: '🇩🇪', label: 'Germany' },
  { locale: 'fr', flag: '🇫🇷', label: 'France' },
  { locale: 'au', flag: '🇦🇺', label: 'Australia' },
  { locale: 'ca', flag: '🇨🇦', label: 'Canada' },
  // Expandable below
  { locale: 'nl', flag: '🇳🇱', label: 'Netherlands' },
  { locale: 'es', flag: '🇪🇸', label: 'Spain' },
  { locale: 'it', flag: '🇮🇹', label: 'Italy' },
  { locale: 'se', flag: '🇸🇪', label: 'Sweden' },
  { locale: 'ch', flag: '🇨🇭', label: 'Switzerland' },
  { locale: 'at', flag: '🇦🇹', label: 'Austria' },
  { locale: 'dk', flag: '🇩🇰', label: 'Denmark' },
  { locale: 'fi', flag: '🇫🇮', label: 'Finland' },
  { locale: 'be', flag: '🇧🇪', label: 'Belgium' },
  { locale: 'no', flag: '🇳🇴', label: 'Norway' },
  { locale: 'mx', flag: '🇲🇽', label: 'Mexico' },
  { locale: 'br', flag: '🇧🇷', label: 'Brazil' },
];

const COLUMN_LABELS: Record<string, {
  categories: string;
  explore: string;
  company: string;
  markets: string;
  contact: string;
  popular: string;
  topBrands: string;
  blog: string;
  about: string;
  privacy: string;
  terms: string;
  tagline: string;
  disclosure: string;
}> = {
  de: {
    categories: 'Kategorien',
    explore: 'Entdecken',
    company: 'Unternehmen',
    markets: 'Märkte',
    contact: 'Kontakt',
    popular: 'Beliebt',
    topBrands: 'Top-Marken',
    blog: 'Blog',
    about: 'Über uns',
    privacy: 'Datenschutz',
    terms: 'Nutzungsbedingungen',
    tagline: 'Entdecke Marken, die du lieben wirst',
    disclosure: 'Brandswitch verdient Provisionen durch Partner-Links. Dies beeinflusst unsere Bewertungen oder Empfehlungen nicht.',
  },
  at: {
    categories: 'Kategorien',
    explore: 'Entdecken',
    company: 'Unternehmen',
    markets: 'Märkte',
    contact: 'Kontakt',
    popular: 'Beliebt',
    topBrands: 'Top-Marken',
    blog: 'Blog',
    about: 'Über uns',
    privacy: 'Datenschutz',
    terms: 'Nutzungsbedingungen',
    tagline: 'Entdecke Marken, die du lieben wirst',
    disclosure: 'Brandswitch verdient Provisionen durch Partner-Links. Dies beeinflusst unsere Bewertungen oder Empfehlungen nicht.',
  },
  ch: {
    categories: 'Kategorien',
    explore: 'Entdecken',
    company: 'Unternehmen',
    markets: 'Märkte',
    contact: 'Kontakt',
    popular: 'Beliebt',
    topBrands: 'Top-Marken',
    blog: 'Blog',
    about: 'Über uns',
    privacy: 'Datenschutz',
    terms: 'Nutzungsbedingungen',
    tagline: 'Entdecke Marken, die du lieben wirst',
    disclosure: 'Brandswitch verdient Provisionen durch Partner-Links. Dies beeinflusst unsere Bewertungen oder Empfehlungen nicht.',
  },
  fr: {
    categories: 'Catégories',
    explore: 'Explorer',
    company: 'Entreprise',
    markets: 'Marchés',
    contact: 'Contact',
    popular: 'Populaire',
    topBrands: 'Meilleures Marques',
    blog: 'Blog',
    about: 'À propos',
    privacy: 'Confidentialité',
    terms: 'Conditions',
    tagline: 'Découvrez des marques que vous allez adorer',
    disclosure: 'Brandswitch gagne des commissions via des liens partenaires. Cela n\'influence pas nos classements ou recommandations.',
  },
  be: {
    categories: 'Catégories',
    explore: 'Explorer',
    company: 'Entreprise',
    markets: 'Marchés',
    contact: 'Contact',
    popular: 'Populaire',
    topBrands: 'Meilleures Marques',
    blog: 'Blog',
    about: 'À propos',
    privacy: 'Confidentialité',
    terms: 'Conditions',
    tagline: 'Découvrez des marques que vous allez adorer',
    disclosure: 'Brandswitch gagne des commissions via des liens partenaires. Cela n\'influence pas nos classements ou recommandations.',
  },
  es: {
    categories: 'Categorías',
    explore: 'Explorar',
    company: 'Empresa',
    markets: 'Mercados',
    contact: 'Contacto',
    popular: 'Popular',
    topBrands: 'Mejores Marcas',
    blog: 'Blog',
    about: 'Acerca de',
    privacy: 'Privacidad',
    terms: 'Términos',
    tagline: 'Descubre marcas que vas a amar',
    disclosure: 'Brandswitch gana comisiones a través de enlaces de afiliados. Esto no influye en nuestras clasificaciones o recomendaciones.',
  },
  mx: {
    categories: 'Categorías',
    explore: 'Explorar',
    company: 'Empresa',
    markets: 'Mercados',
    contact: 'Contacto',
    popular: 'Popular',
    topBrands: 'Mejores Marcas',
    blog: 'Blog',
    about: 'Acerca de',
    privacy: 'Privacidad',
    terms: 'Términos',
    tagline: 'Descubre marcas que vas a amar',
    disclosure: 'Brandswitch gana comisiones a través de enlaces de afiliados. Esto no influye en nuestras clasificaciones o recomendaciones.',
  },
  it: {
    categories: 'Categorie',
    explore: 'Esplora',
    company: 'Azienda',
    markets: 'Mercati',
    contact: 'Contatto',
    popular: 'Popolare',
    topBrands: 'Top Brand',
    blog: 'Blog',
    about: 'Chi siamo',
    privacy: 'Privacy',
    terms: 'Termini',
    tagline: 'Scopri i brand che amerai',
    disclosure: 'Brandswitch guadagna commissioni tramite link di affiliazione. Questo non influenza le nostre classifiche o raccomandazioni.',
  },
  br: {
    categories: 'Categorias',
    explore: 'Explorar',
    company: 'Empresa',
    markets: 'Mercados',
    contact: 'Contato',
    popular: 'Popular',
    topBrands: 'Melhores Marcas',
    blog: 'Blog',
    about: 'Sobre',
    privacy: 'Privacidade',
    terms: 'Termos',
    tagline: 'Descubra marcas que você vai amar',
    disclosure: 'A Brandswitch ganha comissões através de links de afiliados. Isso não influencia nossas classificações ou recomendações.',
  },
};

function getLabels(locale: string) {
  return COLUMN_LABELS[locale] ?? {
    categories: 'Categories',
    explore: 'Explore',
    company: 'Company',
    markets: 'Markets',
    contact: 'Contact',
    popular: 'Popular',
    topBrands: 'Top Brands',
    blog: 'Blog',
    about: 'About',
    privacy: 'Privacy Policy',
    terms: 'Terms of Service',
    tagline: "Discover brands you'll love",
    disclosure: "Brandswitch earns a commission from qualifying purchases through our partner links. This doesn't affect our rankings or recommendations.",
  };
}

export async function Footer({ locale }: FooterProps) {
  const labels = getLabels(locale);
  const allCategories = getCategories(locale);
  const topCategories = [...allCategories]
    .sort((a, b) => b.brandCount - a.brandCount)
    .slice(0, 8);

  const year = new Date().getFullYear();

  return (
    <footer className="bg-bs-dark text-white/60 mt-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-12 pb-8">

        {/* ── Main grid ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-8 mb-10">

          {/* Col 1: Brand + tagline */}
          <div className="col-span-2 sm:col-span-3 lg:col-span-1">
            <Link href={`/${locale}`} className="inline-flex items-center gap-0.5 mb-3">
              <span className="text-lg font-bold text-white leading-none">brand</span>
              <span className="text-lg font-bold text-bs-teal leading-none">switch</span>
            </Link>
            <p className="text-sm text-white/50 leading-relaxed max-w-xs">{labels.tagline}</p>
          </div>

          {/* Col 2: Categories */}
          <div>
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider mb-3">
              {labels.categories}
            </h3>
            <ul className="space-y-2">
              {topCategories.map(cat => (
                <li key={cat.slug}>
                  <Link
                    href={`/${locale}/category/${cat.slug}`}
                    className="text-sm text-white/50 hover:text-white transition-colors"
                  >
                    {translateCategory(locale, cat.name)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 3: Explore */}
          <div>
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider mb-3">
              {labels.explore}
            </h3>
            <ul className="space-y-2">
              <li>
                <Link href={`/${locale}/top-brands`} className="text-sm text-white/50 hover:text-white transition-colors">
                  {labels.topBrands}
                </Link>
              </li>
              <li>
                <Link href={`/${locale}/brands-like`} className="text-sm text-white/50 hover:text-white transition-colors">
                  {labels.popular}
                </Link>
              </li>
              <li>
                <Link href={`/${locale}/category`} className="text-sm text-white/50 hover:text-white transition-colors">
                  {labels.categories}
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4: Company */}
          <div>
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider mb-3">
              {labels.company}
            </h3>
            <ul className="space-y-2">
              <li>
                <Link href={`/${locale}/about`} className="text-sm text-white/50 hover:text-white transition-colors">
                  {labels.about}
                </Link>
              </li>
              <li>
                <Link href={`/${locale}/privacy`} className="text-sm text-white/50 hover:text-white transition-colors">
                  {labels.privacy}
                </Link>
              </li>
              <li>
                <Link href={`/${locale}/terms`} className="text-sm text-white/50 hover:text-white transition-colors">
                  {labels.terms}
                </Link>
              </li>
              <li>
                <a href="mailto:contact@brandswitch.com" className="text-sm text-white/50 hover:text-white transition-colors">
                  {labels.contact}
                </a>
              </li>
            </ul>
          </div>

          {/* Col 5: Markets (expandable) */}
          <div>
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider mb-3">
              {labels.markets}
            </h3>
            <FooterMarkets markets={ALL_MARKETS} currentLocale={locale} />
          </div>
        </div>

        {/* ── Bottom bar ─────────────────────────────────────────────── */}
        <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
          <p className="text-xs text-white/20">
            © {year} Brandswitch. All rights reserved.
          </p>
          <p className="text-xs text-white/30 max-w-lg leading-relaxed">
            {labels.disclosure}
          </p>
        </div>

      </div>
    </footer>
  );
}
