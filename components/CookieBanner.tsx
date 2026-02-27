'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'bs_cookie_consent_v2';

// ── Consent shape ──────────────────────────────────────────────
interface ConsentState {
  analytics: boolean;
  marketing: boolean;
}

// ── Translations ───────────────────────────────────────────────
interface T {
  title: string;
  body: string;
  moreOptions: string;
  decline: string;
  acceptAll: string;
  prefsTitle: string;
  savePrefs: string;
  essential: string;
  essentialDesc: string;
  essentialAlways: string;
  analytics: string;
  analyticsDesc: string;
  marketing: string;
  marketingDesc: string;
}

const TRANSLATIONS: Record<string, T> = {
  en: {
    title: 'We value your privacy',
    body: 'We use cookies to enhance your browsing experience, serve personalised content, and analyse our traffic. By clicking "Accept All", you consent to our use of cookies.',
    moreOptions: 'More Options',
    decline: 'Decline',
    acceptAll: 'Accept All',
    prefsTitle: 'Cookie Preferences',
    savePrefs: 'Save Preferences',
    essential: 'Essential Cookies',
    essentialDesc: 'Required for the website to function. Cannot be disabled.',
    essentialAlways: 'Always active',
    analytics: 'Analytics Cookies',
    analyticsDesc: 'Help us understand how visitors interact with the site so we can improve the experience.',
    marketing: 'Marketing Cookies',
    marketingDesc: 'Used to deliver personalised advertisements and track campaign effectiveness.',
  },
  de: {
    title: 'Datenschutz ist uns wichtig',
    body: 'Wir verwenden Cookies, um Ihr Surferlebnis zu verbessern, personalisierte Inhalte anzubieten und unseren Datenverkehr zu analysieren. Mit „Alle akzeptieren" stimmen Sie unserer Cookie-Nutzung zu.',
    moreOptions: 'Weitere Optionen',
    decline: 'Ablehnen',
    acceptAll: 'Alle akzeptieren',
    prefsTitle: 'Cookie-Einstellungen',
    savePrefs: 'Einstellungen speichern',
    essential: 'Notwendige Cookies',
    essentialDesc: 'Für die Funktion der Website erforderlich. Können nicht deaktiviert werden.',
    essentialAlways: 'Immer aktiv',
    analytics: 'Analyse-Cookies',
    analyticsDesc: 'Helfen uns zu verstehen, wie Besucher mit der Website interagieren.',
    marketing: 'Marketing-Cookies',
    marketingDesc: 'Zur Bereitstellung personalisierter Werbung und Verfolgung von Kampagnenerfolgen.',
  },
  fr: {
    title: 'Nous respectons votre vie privée',
    body: 'Nous utilisons des cookies pour améliorer votre expérience de navigation, vous proposer du contenu personnalisé et analyser notre trafic. En cliquant sur « Tout accepter », vous consentez à notre utilisation des cookies.',
    moreOptions: 'Plus d\'options',
    decline: 'Refuser',
    acceptAll: 'Tout accepter',
    prefsTitle: 'Préférences de cookies',
    savePrefs: 'Enregistrer les préférences',
    essential: 'Cookies essentiels',
    essentialDesc: 'Nécessaires au fonctionnement du site. Ne peuvent pas être désactivés.',
    essentialAlways: 'Toujours actif',
    analytics: 'Cookies analytiques',
    analyticsDesc: 'Nous aident à comprendre comment les visiteurs interagissent avec le site.',
    marketing: 'Cookies marketing',
    marketingDesc: 'Utilisés pour diffuser des publicités personnalisées et mesurer l\'efficacité des campagnes.',
  },
  es: {
    title: 'Valoramos tu privacidad',
    body: 'Usamos cookies para mejorar tu experiencia de navegación, ofrecer contenido personalizado y analizar nuestro tráfico. Al hacer clic en "Aceptar todo", consientes el uso de cookies.',
    moreOptions: 'Más opciones',
    decline: 'Rechazar',
    acceptAll: 'Aceptar todo',
    prefsTitle: 'Preferencias de cookies',
    savePrefs: 'Guardar preferencias',
    essential: 'Cookies esenciales',
    essentialDesc: 'Necesarias para el funcionamiento del sitio. No pueden desactivarse.',
    essentialAlways: 'Siempre activas',
    analytics: 'Cookies analíticas',
    analyticsDesc: 'Nos ayudan a comprender cómo los visitantes interactúan con el sitio.',
    marketing: 'Cookies de marketing',
    marketingDesc: 'Utilizadas para mostrar anuncios personalizados y medir la eficacia de campañas.',
  },
  it: {
    title: 'Rispettiamo la tua privacy',
    body: 'Utilizziamo cookie per migliorare la tua esperienza di navigazione, offrirti contenuti personalizzati e analizzare il traffico. Cliccando "Accetta tutto", acconsenti all\'utilizzo dei cookie.',
    moreOptions: 'Altre opzioni',
    decline: 'Rifiuta',
    acceptAll: 'Accetta tutto',
    prefsTitle: 'Preferenze cookie',
    savePrefs: 'Salva preferenze',
    essential: 'Cookie essenziali',
    essentialDesc: 'Necessari per il funzionamento del sito. Non possono essere disabilitati.',
    essentialAlways: 'Sempre attivi',
    analytics: 'Cookie analitici',
    analyticsDesc: 'Ci aiutano a capire come i visitatori interagiscono con il sito.',
    marketing: 'Cookie di marketing',
    marketingDesc: 'Utilizzati per mostrare annunci personalizzati e misurare l\'efficacia delle campagne.',
  },
  pt: {
    title: 'Valorizamos sua privacidade',
    body: 'Usamos cookies para melhorar sua experiência de navegação, oferecer conteúdo personalizado e analisar o tráfego. Ao clicar em "Aceitar tudo", você consente com o uso de cookies.',
    moreOptions: 'Mais opções',
    decline: 'Recusar',
    acceptAll: 'Aceitar tudo',
    prefsTitle: 'Preferências de cookies',
    savePrefs: 'Salvar preferências',
    essential: 'Cookies essenciais',
    essentialDesc: 'Necessários para o funcionamento do site. Não podem ser desativados.',
    essentialAlways: 'Sempre ativo',
    analytics: 'Cookies analíticos',
    analyticsDesc: 'Nos ajudam a entender como os visitantes interagem com o site.',
    marketing: 'Cookies de marketing',
    marketingDesc: 'Usados para exibir anúncios personalizados e medir a eficácia de campanhas.',
  },
};

// locale → language key
const LOCALE_TO_LANG: Record<string, string> = {
  us: 'en', uk: 'en', au: 'en', ca: 'en', nl: 'en', se: 'en', dk: 'en', fi: 'en', no: 'en',
  de: 'de', at: 'de', ch: 'de',
  fr: 'fr', be: 'fr',
  es: 'es', mx: 'es',
  it: 'it',
  br: 'pt',
};

function getT(locale: string): T {
  const lang = LOCALE_TO_LANG[locale] ?? 'en';
  return TRANSLATIONS[lang] ?? TRANSLATIONS.en;
}

// ── Toggle component ───────────────────────────────────────────
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-bs-teal ${
        checked ? 'bg-bs-teal' : 'bg-gray-300'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

// ── Main component ─────────────────────────────────────────────
export function CookieBanner({ locale }: { locale: string }) {
  const t = getT(locale);

  const [visible, setVisible] = useState(false);
  const [showPrefs, setShowPrefs] = useState(false);
  const [showPrivacyIcon, setShowPrivacyIcon] = useState(false);
  const [analytics, setAnalytics] = useState(true);
  const [marketing, setMarketing] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      setVisible(true);
    } else {
      setShowPrivacyIcon(true);
    }
  }, []);

  function save(consent: ConsentState) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ essential: true, ...consent, ts: Date.now() }));
    setVisible(false);
    setShowPrefs(false);
    setShowPrivacyIcon(true);
  }

  function acceptAll() {
    save({ analytics: true, marketing: true });
  }

  function decline() {
    save({ analytics: false, marketing: false });
  }

  function savePreferences() {
    save({ analytics, marketing });
  }

  function reopenPrefs() {
    setVisible(true);
    setShowPrefs(true);
    setShowPrivacyIcon(false);
    // Load saved state
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const data = JSON.parse(stored) as ConsentState & { ts?: number };
        setAnalytics(data.analytics ?? true);
        setMarketing(data.marketing ?? true);
      } catch { /* ignore */ }
    }
  }

  return (
    <>
      {/* Privacy icon (post-dismiss) */}
      {showPrivacyIcon && !visible && (
        <button
          onClick={reopenPrefs}
          aria-label="Cookie preferences"
          className="fixed bottom-4 left-4 z-40 flex h-9 w-9 items-center justify-center rounded-full bg-bs-dark/80 text-white shadow-md hover:bg-bs-dark transition-colors backdrop-blur-sm border border-white/10"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 opacity-70">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
          </svg>
        </button>
      )}

      {/* Main banner */}
      {visible && (
        <div className="fixed inset-0 z-50 flex items-end" aria-modal="true" role="dialog" aria-labelledby="cookie-banner-title">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" />

          <div className="relative w-full bg-[#fafaf8] border-t border-gray-200 shadow-2xl">
            <div className="max-w-5xl mx-auto px-5 sm:px-8 py-6">

              {!showPrefs ? (
                // ── Main banner view ──
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8">
                  <div className="flex-1 min-w-0">
                    <h2 id="cookie-banner-title" className="text-base font-semibold text-bs-dark mb-1">
                      {t.title}
                    </h2>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {t.body}
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
                    <button
                      onClick={() => setShowPrefs(true)}
                      className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:border-gray-400 hover:bg-gray-50 transition-colors whitespace-nowrap"
                    >
                      {t.moreOptions}
                    </button>
                    <button
                      onClick={decline}
                      className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:border-gray-400 hover:bg-gray-50 transition-colors whitespace-nowrap"
                    >
                      {t.decline}
                    </button>
                    <button
                      onClick={acceptAll}
                      className="px-5 py-2 text-sm font-semibold text-white bg-bs-teal rounded-lg hover:bg-bs-teal/90 transition-colors whitespace-nowrap"
                    >
                      {t.acceptAll}
                    </button>
                  </div>
                </div>
              ) : (
                // ── Preferences panel ──
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <h2 id="cookie-banner-title" className="text-base font-semibold text-bs-dark">
                      {t.prefsTitle}
                    </h2>
                    <button
                      onClick={() => setShowPrefs(false)}
                      aria-label="Back"
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>

                  <div className="space-y-4 mb-6">
                    {/* Essential */}
                    <div className="flex items-start justify-between gap-4 p-3 rounded-lg bg-gray-50 border border-gray-200">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-bs-dark">{t.essential}</p>
                        <p className="text-xs text-gray-500 mt-0.5 leading-snug">{t.essentialDesc}</p>
                      </div>
                      <span className="shrink-0 text-xs font-medium text-bs-teal mt-0.5">{t.essentialAlways}</span>
                    </div>

                    {/* Analytics */}
                    <div className="flex items-start justify-between gap-4 p-3 rounded-lg bg-gray-50 border border-gray-200">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-bs-dark">{t.analytics}</p>
                        <p className="text-xs text-gray-500 mt-0.5 leading-snug">{t.analyticsDesc}</p>
                      </div>
                      <div className="shrink-0 mt-0.5">
                        <Toggle checked={analytics} onChange={setAnalytics} />
                      </div>
                    </div>

                    {/* Marketing */}
                    <div className="flex items-start justify-between gap-4 p-3 rounded-lg bg-gray-50 border border-gray-200">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-bs-dark">{t.marketing}</p>
                        <p className="text-xs text-gray-500 mt-0.5 leading-snug">{t.marketingDesc}</p>
                      </div>
                      <div className="shrink-0 mt-0.5">
                        <Toggle checked={marketing} onChange={setMarketing} />
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <button
                      onClick={decline}
                      className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:border-gray-400 hover:bg-gray-50 transition-colors"
                    >
                      {t.decline}
                    </button>
                    <button
                      onClick={savePreferences}
                      className="px-4 py-2 text-sm font-semibold text-white bg-bs-teal rounded-lg hover:bg-bs-teal/90 transition-colors"
                    >
                      {t.savePrefs}
                    </button>
                    <button
                      onClick={acceptAll}
                      className="px-4 py-2 text-sm font-semibold text-white bg-bs-dark rounded-lg hover:bg-bs-dark/80 transition-colors sm:ml-auto"
                    >
                      {t.acceptAll}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
