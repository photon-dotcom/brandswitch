'use client';

import Link from 'next/link';
import { useState } from 'react';

interface MarketEntry {
  locale: string;
  flag: string;
  label: string;
}

interface FooterMarketsProps {
  markets: MarketEntry[];
  currentLocale: string;
}

export function FooterMarkets({ markets, currentLocale }: FooterMarketsProps) {
  const [expanded, setExpanded] = useState(false);

  const visible = expanded ? markets : markets.slice(0, 6);
  const hasMore = markets.length > 6;

  return (
    <ul className="space-y-2">
      {visible.map(m => (
        <li key={m.locale}>
          <Link
            href={`/${m.locale}`}
            className={`text-sm flex items-center gap-2 transition-colors ${
              m.locale === currentLocale ? 'text-white font-medium' : 'text-white/50 hover:text-white'
            }`}
          >
            <span>{m.flag}</span>
            <span>{m.label}</span>
          </Link>
        </li>
      ))}
      {hasMore && (
        <li>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-bs-teal hover:text-bs-teal/80 transition-colors"
          >
            {expanded ? 'Show less ↑' : `+${markets.length - 6} more ↓`}
          </button>
        </li>
      )}
    </ul>
  );
}
