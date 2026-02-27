'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { BrandLogo } from './BrandLogo';
import { AffiliateButton } from './AffiliateButton';

interface PopupBrand {
  name: string;
  slug: string;
  logo?: string;
  domain: string;
  affiliateUrl?: string;
  logoQuality: string;
}

interface ExitIntentPopupProps {
  brandName: string;
  alternatives: PopupBrand[];
  locale: string;
}

export function ExitIntentPopup({ brandName, alternatives, locale }: ExitIntentPopupProps) {
  const [visible, setVisible] = useState(false);
  const affiliateClicked = useRef(false);

  useEffect(() => {
    // Desktop only — skip on narrow viewports
    if (window.innerWidth < 768) return;
    // Only show once per session
    if (sessionStorage.getItem('bs_exit_shown')) return;

    function handleMouseLeave(e: MouseEvent) {
      if (e.clientY < 10 && !affiliateClicked.current) {
        setVisible(true);
        sessionStorage.setItem('bs_exit_shown', '1');
      }
    }

    function handleAffiliateClick(e: MouseEvent) {
      if ((e.target as HTMLElement).closest('a[rel~="sponsored"]')) {
        affiliateClicked.current = true;
      }
    }

    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('click', handleAffiliateClick, { capture: true });

    return () => {
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('click', handleAffiliateClick, { capture: true });
    };
  }, []);

  if (!visible) return null;

  return (
    <>
      {/* Dark overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-50"
        onClick={() => setVisible(false)}
      />

      {/* Popup card */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 mx-4">

        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <p className="text-xs text-bs-gray uppercase tracking-wide mb-0.5">Before you leave</p>
            <h3 className="text-lg font-bold text-bs-dark leading-snug">
              Top alternatives to {brandName}
            </h3>
          </div>
          <button
            onClick={() => setVisible(false)}
            className="text-bs-gray hover:text-bs-dark transition-colors ml-4 shrink-0 p-1 -mt-1 -mr-1 rounded-lg hover:bg-bs-bg"
            aria-label="Close"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Alternatives list */}
        <div className="flex flex-col gap-3">
          {alternatives.slice(0, 3).map(alt => (
            <div key={alt.slug} className="flex items-center gap-3 p-3 bg-bs-bg rounded-2xl">
              <BrandLogo
                name={alt.name}
                logo={alt.logo ?? ''}
                domain={alt.domain}
                size={40}
                logoQuality={alt.logoQuality as 'high' | 'medium' | 'low' | 'none'}
              />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-bs-dark text-sm truncate">{alt.name}</p>
                <p className="text-xs text-bs-gray truncate">{alt.domain}</p>
              </div>
              <div className="shrink-0">
                {alt.affiliateUrl ? (
                  <AffiliateButton href={alt.affiliateUrl} label="Visit" variant="primary" size="sm" />
                ) : (
                  <Link
                    href={`/${locale}/brands-like/${alt.slug}`}
                    className="text-xs text-bs-teal hover:underline"
                    onClick={() => setVisible(false)}
                  >
                    View →
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Dismiss link */}
        <div className="mt-4 text-center">
          <button
            onClick={() => setVisible(false)}
            className="text-xs text-bs-gray hover:text-bs-dark transition-colors"
          >
            View all alternatives on this page →
          </button>
        </div>
      </div>
    </>
  );
}
