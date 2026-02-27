'use client';

import { useState } from 'react';
import Image from 'next/image';

interface BrandLogoProps {
  name: string;
  logo: string;
  domain?: string;
  size?: number;
  className?: string;
  logoQuality?: 'high' | 'medium' | 'low' | 'none';
}

// Deterministic colour from brand name initial
const PALETTE = ['#4a9982', '#3d8270', '#5aaa92', '#2d7260', '#6bbaa2', '#7bcab2', '#1d6250'];
function accentColor(name: string) {
  return PALETTE[(name?.charCodeAt(0) ?? 0) % PALETTE.length];
}

export function BrandLogo({ name, logo, domain, size = 48, className = '', logoQuality }: BrandLogoProps) {
  const [srcIndex, setSrcIndex] = useState(0);
  const initial = (name?.[0] ?? '?').toUpperCase();
  const bg = accentColor(name ?? '');

  const baseStyle = { width: size, height: size, minWidth: size };

  // No logo found at sync time — skip URL cascade, render coloured initial immediately
  if (logoQuality === 'none') {
    return (
      <div
        style={{ ...baseStyle, backgroundColor: bg }}
        className={`flex items-center justify-center rounded-xl text-white font-bold shrink-0 ${className}`}
      >
        <span style={{ fontSize: size * 0.4 }}>{initial}</span>
      </div>
    );
  }

  // Build the ordered list of logo URLs to try.
  // Each source is tried in turn; onError increments srcIndex to the next.
  const sources: string[] = [];
  if (logo) sources.push(logo);
  if (domain) {
    // Clearbit: high quality vector-rendered PNG at 200px
    const clearbit = `https://logo.clearbit.com/${domain}?size=200`;
    if (!sources.includes(clearbit)) sources.push(clearbit);
    // Logo.dev: broad coverage, 200px
    sources.push(`https://img.logo.dev/${domain}?token=pk_a]VaSaF5SQqihDsg7a8dKw&size=200`);
    // Google high-res favicon service (better than the old /s2/favicons endpoint)
    sources.push(`https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://${domain}&size=128`);
    // DuckDuckGo icon service (good coverage for non-US brands)
    sources.push(`https://icons.duckduckgo.com/ip3/${domain}.ico`);
  }

  // All sources exhausted — show coloured initial
  if (sources.length === 0 || srcIndex >= sources.length) {
    return (
      <div
        style={{ ...baseStyle, backgroundColor: bg }}
        className={`flex items-center justify-center rounded-xl text-white font-bold shrink-0 ${className}`}
      >
        <span style={{ fontSize: size * 0.4 }}>{initial}</span>
      </div>
    );
  }

  return (
    <div
      style={baseStyle}
      className={`relative rounded-xl overflow-hidden shrink-0 bg-white border border-bs-border/50 ${className}`}
    >
      <Image
        src={sources[srcIndex]}
        alt={`${name} logo`}
        fill
        // Request a source at least 2× the display size for retina sharpness
        sizes={`${Math.max(size * 2, 200)}px`}
        className="object-contain p-1"
        style={{ imageRendering: '-webkit-optimize-contrast' } as React.CSSProperties}
        onError={() => setSrcIndex(i => i + 1)}
        onLoad={(e) => {
          const img = e.currentTarget;
          // Reject tiny favicons (≤32px) — a crisp coloured initial looks better
          if (img.naturalWidth > 0 && img.naturalWidth <= 32) {
            setSrcIndex(i => i + 1);
          }
        }}
        unoptimized
      />
    </div>
  );
}
