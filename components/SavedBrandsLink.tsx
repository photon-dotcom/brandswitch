'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const STORAGE_KEY = 'bs_saved_brands';

export function SavedBrandsLink({ locale }: { locale: string }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    function update() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const slugs: string[] = raw ? JSON.parse(raw) : [];
        setCount(slugs.length);
      } catch {
        setCount(0);
      }
    }
    update();
    window.addEventListener('bs-saved-changed', update);
    window.addEventListener('storage', update);
    return () => {
      window.removeEventListener('bs-saved-changed', update);
      window.removeEventListener('storage', update);
    };
  }, []);

  if (count === 0) return null;

  return (
    <Link
      href={`/${locale}/saved`}
      className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium text-bs-teal hover:text-bs-teal-dark transition-colors"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
      Saved ({count})
    </Link>
  );
}
