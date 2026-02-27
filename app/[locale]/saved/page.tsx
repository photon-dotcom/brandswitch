'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { SaveButton } from '@/components/SaveButton';

const STORAGE_KEY = 'bs_saved_brands';

interface SavedBrand {
  slug: string;
  name: string;
  domain: string;
  logo: string;
  affiliateUrl: string;
  categories: string[];
}

export default function SavedPage() {
  const params = useParams();
  const locale = (params?.locale as string) ?? 'us';
  const [slugs, setSlugs] = useState<string[]>([]);
  const [brands, setBrands] = useState<SavedBrand[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const saved: string[] = raw ? JSON.parse(raw) : [];
      setSlugs(saved);
    } catch {
      setSlugs([]);
    }

    function onChanged() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        setSlugs(raw ? JSON.parse(raw) : []);
      } catch {
        setSlugs([]);
      }
    }
    window.addEventListener('bs-saved-changed', onChanged);
    return () => window.removeEventListener('bs-saved-changed', onChanged);
  }, []);

  useEffect(() => {
    if (slugs.length === 0) {
      setBrands([]);
      setLoading(false);
      return;
    }

    // Fetch brand data for each saved slug via the search index
    setLoading(true);
    fetch(`/search-index-${locale}.json`)
      .then(r => r.json())
      .then((entries: Array<{ name: string; slug: string; logo: string; domain: string; cat: string; eCPC: string }>) => {
        const slugSet = new Set(slugs);
        const found: SavedBrand[] = entries
          .filter(e => slugSet.has(e.slug))
          .map(e => ({
            slug: e.slug,
            name: e.name,
            domain: e.domain,
            logo: e.logo,
            affiliateUrl: '',
            categories: e.cat ? [e.cat] : [],
          }));
        // Preserve the order from localStorage
        found.sort((a, b) => slugs.indexOf(a.slug) - slugs.indexOf(b.slug));
        setBrands(found);
      })
      .catch(() => setBrands([]))
      .finally(() => setLoading(false));
  }, [slugs, locale]);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      <div className="mb-8">
        <Link href={`/${locale}`} className="text-xs text-bs-gray hover:text-bs-teal mb-4 inline-block">
          ← Home
        </Link>
        <h1 className="text-3xl font-bold text-bs-dark mb-2">Saved Brands</h1>
        <p className="text-bs-gray text-sm">
          {slugs.length === 0 ? 'No saved brands yet.' : `${slugs.length} brand${slugs.length !== 1 ? 's' : ''} saved`}
        </p>
      </div>

      {loading && (
        <div className="grid grid-cols-1 gap-3">
          {Array.from({ length: Math.min(slugs.length, 6) }).map((_, i) => (
            <div key={i} className="h-20 bg-bs-border/30 rounded-2xl animate-pulse" />
          ))}
        </div>
      )}

      {!loading && brands.length === 0 && slugs.length === 0 && (
        <div className="text-center py-16">
          <p className="text-bs-gray mb-4">Save brands by clicking the heart icon on any brand page or alternative card.</p>
          <Link href={`/${locale}/top-brands`} className="text-bs-teal hover:underline text-sm">
            Browse top brands →
          </Link>
        </div>
      )}

      {!loading && brands.length > 0 && (
        <div className="grid grid-cols-1 gap-3">
          {brands.map(brand => (
            <div key={brand.slug} className="flex items-center gap-4 p-4 bg-white border border-bs-border rounded-2xl hover:border-bs-teal/40 transition-all">
              {/* Initial avatar (logo not available from search index) */}
              <div className="w-12 h-12 rounded-xl bg-bs-teal-light flex items-center justify-center text-bs-teal font-bold text-lg shrink-0">
                {brand.name[0]?.toUpperCase()}
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-semibold text-bs-dark truncate">{brand.name}</p>
                <p className="text-xs text-bs-gray">{brand.domain}</p>
                {brand.categories[0] && (
                  <p className="text-xs text-bs-gray/60 mt-0.5">{brand.categories[0]}</p>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Link
                  href={`/${locale}/brands-like/${brand.slug}`}
                  className="text-xs text-bs-teal hover:underline hidden sm:block"
                >
                  View alternatives
                </Link>
                <SaveButton slug={brand.slug} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
