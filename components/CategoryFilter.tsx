'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

// Category definitions with icon characters (no emoji — clean editorial style)
const CATEGORIES = [
  { key: 'all',     icon: '◆' },
  { key: 'fashion', icon: '◻' },
  { key: 'travel',  icon: '◻' },
  { key: 'beauty',  icon: '◻' },
  { key: 'tech',    icon: '◻' },
  { key: 'home',    icon: '◻' },
  { key: 'outdoor', icon: '◻' },
  { key: 'food',    icon: '◻' },
] as const;

export function CategoryFilter() {
  const [selected, setSelected] = useState<string>('all');
  const t = useTranslations('categories');

  return (
    <section className="px-4 sm:px-6 pb-2">
      <div className="max-w-6xl mx-auto">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {CATEGORIES.map(cat => {
            const isActive = selected === cat.key;
            return (
              <button
                key={cat.key}
                onClick={() => setSelected(cat.key)}
                className={`
                  flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium
                  whitespace-nowrap transition-all duration-150 shrink-0
                  ${
                    isActive
                      ? 'bg-bs-teal text-white shadow-sm'
                      : 'bg-white border border-bs-border text-bs-dark hover:border-bs-teal/60 hover:text-bs-teal'
                  }
                `}
              >
                {t(cat.key)}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
