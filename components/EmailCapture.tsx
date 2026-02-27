'use client';

import { useState } from 'react';

interface EmailCaptureProps {
  category: string;
  locale: string;
}

const LABELS: Record<string, {
  title: (cat: string) => string;
  placeholder: string;
  button: string;
  success: string;
  disclaimer: string;
}> = {
  de: {
    title: (cat) => `Neue ${cat}-Marken entdecken`,
    placeholder: 'deine@email.de',
    button: 'Abonnieren',
    success: 'Dabei! Wir informieren dich über neue Marken.',
    disclaimer: 'Kein Spam. Jederzeit abbestellbar.',
  },
  at: {
    title: (cat) => `Neue ${cat}-Marken entdecken`,
    placeholder: 'deine@email.at',
    button: 'Abonnieren',
    success: 'Dabei! Wir informieren dich über neue Marken.',
    disclaimer: 'Kein Spam. Jederzeit abbestellbar.',
  },
  ch: {
    title: (cat) => `Neue ${cat}-Marken entdecken`,
    placeholder: 'deine@email.ch',
    button: 'Abonnieren',
    success: 'Dabei! Wir informieren dich über neue Marken.',
    disclaimer: 'Kein Spam. Jederzeit abbestellbar.',
  },
  fr: {
    title: (cat) => `Découvrez les nouvelles marques ${cat}`,
    placeholder: 'votre@email.fr',
    button: "S'abonner",
    success: "C'est fait ! Nous vous informerons des nouvelles marques.",
    disclaimer: 'Pas de spam. Désabonnement à tout moment.',
  },
  be: {
    title: (cat) => `Découvrez les nouvelles marques ${cat}`,
    placeholder: 'votre@email.be',
    button: "S'abonner",
    success: "C'est fait ! Nous vous informerons des nouvelles marques.",
    disclaimer: 'Pas de spam. Désabonnement à tout moment.',
  },
  es: {
    title: (cat) => `Descubre nuevas marcas de ${cat}`,
    placeholder: 'tu@email.com',
    button: 'Suscribirse',
    success: '¡Listo! Te notificaremos sobre nuevas marcas.',
    disclaimer: 'Sin spam. Cancela cuando quieras.',
  },
  mx: {
    title: (cat) => `Descubre nuevas marcas de ${cat}`,
    placeholder: 'tu@email.com',
    button: 'Suscribirse',
    success: '¡Listo! Te notificaremos sobre nuevas marcas.',
    disclaimer: 'Sin spam. Cancela cuando quieras.',
  },
  it: {
    title: (cat) => `Scopri i nuovi brand ${cat}`,
    placeholder: 'tua@email.it',
    button: 'Iscriviti',
    success: 'Perfetto! Ti avviseremo dei nuovi brand.',
    disclaimer: 'Niente spam. Disdici quando vuoi.',
  },
  br: {
    title: (cat) => `Descubra novas marcas de ${cat}`,
    placeholder: 'seu@email.com.br',
    button: 'Assinar',
    success: 'Pronto! Vamos te avisar sobre novas marcas.',
    disclaimer: 'Sem spam. Cancele quando quiser.',
  },
};

function getLabels(locale: string) {
  return LABELS[locale] ?? {
    title: (cat: string) => `Get notified about new ${cat} brands`,
    placeholder: 'your@email.com',
    button: 'Subscribe',
    success: "You're in! We'll notify you when we discover new brands.",
    disclaimer: 'No spam. Unsubscribe anytime.',
  };
}

export function EmailCapture({ category, locale }: EmailCaptureProps) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const labels = getLabels(locale);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || status === 'loading') return;
    setStatus('loading');
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), category, locale }),
      });
      if (res.ok) {
        setStatus('success');
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  }

  if (status === 'success') {
    return (
      <div className="bg-bs-teal-light border border-bs-teal/20 rounded-2xl p-5 text-center">
        <p className="text-sm font-semibold text-bs-teal">{labels.success}</p>
      </div>
    );
  }

  return (
    <div className="bg-bs-bg border border-bs-border rounded-2xl p-5">
      <h3 className="text-sm font-semibold text-bs-dark mb-1">{labels.title(category.toLowerCase())}</h3>
      <p className="text-xs text-bs-gray mb-3">{labels.disclaimer}</p>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder={labels.placeholder}
          required
          className="flex-1 min-w-0 text-sm border border-bs-border rounded-xl px-3 py-2 bg-white focus:outline-none focus:border-bs-teal transition-colors text-bs-dark placeholder:text-bs-gray/60"
        />
        <button
          type="submit"
          disabled={status === 'loading'}
          className="text-sm font-semibold bg-bs-teal text-white px-4 py-2 rounded-xl hover:bg-bs-teal-dark transition-colors disabled:opacity-60 shrink-0"
        >
          {status === 'loading' ? '...' : labels.button}
        </button>
      </form>
      {status === 'error' && (
        <p className="text-xs text-red-500 mt-2">Something went wrong. Please try again.</p>
      )}
    </div>
  );
}
