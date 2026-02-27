'use client';

import { useState, useEffect } from 'react';

const STORAGE_KEY = 'bs_saved_brands';

function getSaved(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function setSaved(slugs: Set<string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(slugs)));
  // Notify other components on the same page
  window.dispatchEvent(new Event('bs-saved-changed'));
}

interface SaveButtonProps {
  slug: string;
  className?: string;
}

export function SaveButton({ slug, className = '' }: SaveButtonProps) {
  const [saved, setSavedState] = useState(false);

  useEffect(() => {
    setSavedState(getSaved().has(slug));

    function onChanged() {
      setSavedState(getSaved().has(slug));
    }
    window.addEventListener('bs-saved-changed', onChanged);
    return () => window.removeEventListener('bs-saved-changed', onChanged);
  }, [slug]);

  function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const current = getSaved();
    if (current.has(slug)) {
      current.delete(slug);
    } else {
      current.add(slug);
    }
    setSaved(current);
    setSavedState(current.has(slug));
  }

  return (
    <button
      onClick={toggle}
      aria-label={saved ? 'Remove from saved' : 'Save brand'}
      title={saved ? 'Remove from saved' : 'Save brand'}
      className={`p-1.5 rounded-lg transition-colors ${
        saved
          ? 'text-bs-teal bg-bs-teal-light'
          : 'text-bs-gray/50 hover:text-bs-teal hover:bg-bs-teal-light'
      } ${className}`}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill={saved ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
        />
      </svg>
    </button>
  );
}
