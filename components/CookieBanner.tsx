'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'bs_cookie_consent';

const MESSAGES: Record<string, { text: string; accept: string; decline: string }> = {
  de: {
    text: 'Wir verwenden Cookies, um Ihr Erlebnis zu verbessern.',
    accept: 'Akzeptieren',
    decline: 'Ablehnen',
  },
  fr: {
    text: 'Nous utilisons des cookies pour améliorer votre expérience.',
    accept: 'Accepter',
    decline: 'Refuser',
  },
};

function getMsg(locale: string) {
  return MESSAGES[locale] ?? {
    text: 'We use cookies to improve your experience.',
    accept: 'Accept',
    decline: 'Decline',
  };
}

export function CookieBanner({ locale }: { locale: string }) {
  const [visible, setVisible] = useState(false);
  const msg = getMsg(locale);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
  }, []);

  if (!visible) return null;

  function respond(accepted: boolean) {
    localStorage.setItem(STORAGE_KEY, accepted ? 'accepted' : 'declined');
    setVisible(false);
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-bs-dark/95 backdrop-blur-sm border-t border-white/10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6">
        <p className="text-sm text-white/80 flex-1 leading-snug">{msg.text}</p>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => respond(true)}
            className="bg-bs-teal text-white text-sm font-semibold px-4 py-1.5 rounded-lg hover:bg-bs-teal/90 transition-colors"
          >
            {msg.accept}
          </button>
          <button
            onClick={() => respond(false)}
            className="text-white/60 text-sm font-medium px-3 py-1.5 rounded-lg hover:text-white transition-colors"
          >
            {msg.decline}
          </button>
        </div>
      </div>
    </div>
  );
}
