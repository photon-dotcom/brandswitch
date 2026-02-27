import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { CookieBanner } from '@/components/CookieBanner';
import { MARKETS } from '@/lib/brands';

// Tell Next.js which locale segments exist for static generation
export function generateStaticParams() {
  return MARKETS.map(locale => ({ locale }));
}

interface LocaleLayoutProps {
  children: React.ReactNode;
  params: { locale: string };
}

// Locale layout — wraps every market page with translations, header, footer
export default async function LocaleLayout({
  children,
  params: { locale },
}: LocaleLayoutProps) {
  // Load translation messages for this locale (en/de/fr)
  const messages = await getMessages();

  return (
    // NextIntlClientProvider makes translations available to client components
    <NextIntlClientProvider messages={messages}>
      <div className="min-h-screen flex flex-col bg-bs-bg">
        <Header locale={locale} />
        <main className="flex-1">{children}</main>
        <Footer locale={locale} />
        <CookieBanner locale={locale} />
      </div>
    </NextIntlClientProvider>
  );
}
