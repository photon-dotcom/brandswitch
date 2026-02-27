'use client';

import { useState } from 'react';
import Link from 'next/link';
import { BrandLogo } from './BrandLogo';

// Serialisable subset of Brand passed from the server
export interface PopularBrandItem {
  id: string;
  name: string;
  slug: string;
  logo: string;
  domain: string;
  logoQuality: 'high' | 'medium' | 'low' | 'none';
  primaryCategorySlug: string;
  primaryCategoryLabel: string;
}

export interface CategoryPill {
  slug: string;
  label: string;
}

interface Props {
  brands: PopularBrandItem[];
  categories: CategoryPill[];
  locale: string;
  title: string;
  viewAllLabel: string;
  viewAllHref: string;
  viewAlternativesLabel: string;
  allLabel: string;
}

export function PopularBrandsSection({
  brands,
  categories,
  locale,
  title,
  viewAllLabel,
  viewAllHref,
  viewAlternativesLabel,
  allLabel,
}: Props) {
  const [selected, setSelected] = useState('all');

  const filtered =
    selected === 'all' ? brands : brands.filter(b => b.primaryCategorySlug === selected);

  return (
    <section className="px-4 sm:px-6 py-4 pb-8">
      <div className="max-w-6xl mx-auto">

        {/* Section header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-bs-dark">{title}</h2>
          <Link href={viewAllHref} className="text-sm text-bs-teal hover:underline">
            {viewAllLabel}
          </Link>
        </div>

        {/* Category filter pills — flex-wrap, no horizontal scroll */}
        <div className="flex flex-wrap gap-2 mb-5">
          <button
            onClick={() => setSelected('all')}
            className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-all ${
              selected === 'all'
                ? 'bg-bs-teal text-white border-bs-teal'
                : 'bg-white border-bs-border text-bs-dark hover:border-bs-teal/60 hover:text-bs-teal'
            }`}
          >
            {allLabel}
          </button>
          {categories.map(cat => (
            <button
              key={cat.slug}
              onClick={() => setSelected(cat.slug)}
              className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-all ${
                selected === cat.slug
                  ? 'bg-bs-teal text-white border-bs-teal'
                  : 'bg-white border-bs-border text-bs-dark hover:border-bs-teal/60 hover:text-bs-teal'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Brand grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {filtered.map(brand => (
            <Link
              key={brand.id}
              href={`/${locale}/brands-like/${brand.slug}`}
              className="group flex flex-col items-center gap-3 p-4 bg-white border border-bs-border rounded-2xl hover:border-bs-teal/50 hover:shadow-card-hover transition-all duration-150"
            >
              <BrandLogo
                name={brand.name}
                logo={brand.logo}
                domain={brand.domain}
                size={48}
                logoQuality={brand.logoQuality}
              />
              <div className="text-center w-full">
                <p className="text-sm font-semibold text-bs-dark leading-tight line-clamp-2">
                  {brand.name}
                </p>
                <p className="text-xs text-bs-gray mt-0.5 group-hover:text-bs-teal transition-colors">
                  {viewAlternativesLabel}
                </p>
              </div>
            </Link>
          ))}
        </div>

      </div>
    </section>
  );
}
