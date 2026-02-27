'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

interface SearchEntry {
  name: string;
  slug: string;
  logo: string;
  domain: string;
  cat: string;
  eCPC: string;
}

interface SearchResult {
  name: string;
  slug: string;
  logo: string;
  domain: string;
  categories: string[];
}

interface SearchBarProps {
  locale: string;
  size?: 'default' | 'large';
}

// Small markets — fall back to US index when local results are scarce
const SMALL_MARKETS = new Set(['fi', 'dk', 'no', 'mx', 'at', 'ch', 'be', 'se', 'nl']);


// In-memory cache: locale → loaded index (loaded once on first keystroke)
const indexCache = new Map<string, SearchEntry[]>();

function searchIndex(entries: SearchEntry[], q: string): SearchResult[] {
  const lower = q.toLowerCase();
  const prefix: (SearchEntry & { eCPC_n: number })[] = [];
  const contains: (SearchEntry & { eCPC_n: number })[] = [];
  for (const e of entries) {
    if (!e.slug || !e.name) continue;
    const name = e.name.toLowerCase();
    const item = { ...e, eCPC_n: parseFloat(e.eCPC) || 0 };
    if (name.startsWith(lower)) prefix.push(item);
    else if (name.includes(lower)) contains.push(item);
  }
  prefix.sort((a, b) => b.eCPC_n - a.eCPC_n);
  contains.sort((a, b) => b.eCPC_n - a.eCPC_n);
  return [...prefix, ...contains].slice(0, 8).map(e => ({
    name: e.name, slug: e.slug, logo: e.logo, domain: e.domain,
    categories: e.cat ? [e.cat] : [],
  }));
}

export function SearchBar({ locale, size = 'default' }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const router = useRouter();
  const t = useTranslations('search');
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadingRef = useRef(false);

  // Lazy-load the search index on first keystroke, then search in-memory
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.trim().length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      try {
        // Load index once per locale, cache in memory
        if (!indexCache.has(locale) && !loadingRef.current) {
          loadingRef.current = true;
          const res = await fetch(`/search-index-${locale}.json`);
          const data: SearchEntry[] = await res.json();
          indexCache.set(locale, data);
          loadingRef.current = false;
        }
        const entries = indexCache.get(locale);
        if (!entries) return;
        let data = searchIndex(entries, query.trim());

        // Small-market fallback: supplement with US results when local is sparse
        if (data.length < 3 && SMALL_MARKETS.has(locale)) {
          if (!indexCache.has('us') && !loadingRef.current) {
            loadingRef.current = true;
            const res = await fetch('/search-index-us.json');
            const usData: SearchEntry[] = await res.json();
            indexCache.set('us', usData);
            loadingRef.current = false;
          }
          const usEntries = indexCache.get('us');
          if (usEntries) {
            const localSlugs = new Set(data.map(r => r.slug));
            const usResults = searchIndex(usEntries, query.trim())
              .filter(r => !localSlugs.has(r.slug));
            data = [...data, ...usResults].slice(0, 8);
          }
        }

        setResults(data);
        setOpen(data.length > 0);
        setActiveIndex(-1);
      } catch {
        // Network errors silently ignored
      }
    }, 250);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, locale]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, []);

  function navigateTo(slug: string) {
    setOpen(false);
    setQuery('');
    router.push(`/${locale}/brands-like/${slug}`);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || results.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(i => Math.max(i - 1, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const idx = activeIndex >= 0 ? activeIndex : 0;
      if (results[idx]) navigateTo(results[idx].slug);
    } else if (e.key === 'Escape') {
      setOpen(false);
      setActiveIndex(-1);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (results.length > 0) {
      const idx = activeIndex >= 0 ? activeIndex : 0;
      navigateTo(results[idx].slug);
    }
  }

  const isLarge = size === 'large';

  return (
    <div ref={containerRef} className="w-full relative">
      <form onSubmit={handleSubmit}>
        <div className="relative">
          {/* Search icon */}
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
            <svg
              className={`text-bs-gray ${isLarge ? 'w-6 h-6' : 'w-5 h-5'}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>

          {/* Input */}
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => { if (results.length > 0) setOpen(true); }}
            placeholder={t('placeholder')}
            autoComplete="off"
            className={`
              w-full bg-white border-2 border-bs-border rounded-2xl
              text-bs-dark placeholder:text-bs-gray
              focus:outline-none focus:border-bs-teal transition-colors
              shadow-card
              ${isLarge ? 'pl-14 pr-36 py-5 text-lg' : 'pl-12 pr-28 py-4 text-base'}
            `}
          />

          {/* Submit button */}
          <button
            type="submit"
            disabled={!query.trim()}
            className={`
              absolute right-2 top-2 bottom-2
              bg-bs-teal text-white font-semibold rounded-xl
              hover:bg-bs-teal-dark transition-colors
              disabled:opacity-40 disabled:cursor-not-allowed
              ${isLarge ? 'px-7 text-base' : 'px-5 text-sm'}
            `}
          >
            {t('button')}
          </button>
        </div>
      </form>

      {/* Autocomplete dropdown */}
      {open && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-bs-border rounded-2xl shadow-card-hover z-50 max-h-80 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-bs-border">
          {results.map((result, i) => (
            <button
              key={result.slug}
              type="button"
              onMouseDown={() => navigateTo(result.slug)}
              className={`
                w-full flex items-center gap-3 px-4 py-3 text-left transition-colors
                ${i === activeIndex ? 'bg-bs-bg' : 'hover:bg-bs-bg'}
                ${i > 0 ? 'border-t border-bs-border/50' : ''}
              `}
            >
              {/* Logo thumbnail — initial shown as background, image overlaid if it loads */}
              <div
                className="w-9 h-9 rounded-lg shrink-0 flex items-center justify-center relative overflow-hidden border border-bs-border/50"
                style={{ backgroundColor: '#f5f5f0' }}
              >
                <span className="text-xs font-bold text-bs-teal absolute">
                  {result.name[0]?.toUpperCase()}
                </span>
                {result.logo && (
                  <Image
                    src={result.logo}
                    alt=""
                    fill
                    sizes="36px"
                    className="object-contain p-0.5 bg-white"
                    onError={e => {
                      (e.currentTarget as HTMLImageElement).style.display = 'none';
                    }}
                    unoptimized
                  />
                )}
              </div>

              {/* Brand info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-bs-dark truncate">{result.name}</p>
                {result.categories[0] && (
                  <p className="text-xs text-bs-gray truncate">{result.categories[0]}</p>
                )}
              </div>

              {/* Domain */}
              <span className="text-xs text-bs-gray shrink-0 hidden sm:block">{result.domain}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
