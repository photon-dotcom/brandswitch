'use client';

import { useState, useEffect } from 'react';

interface VoteButtonProps {
  mainBrandSlug: string;
  altSlug: string;
  labelGood: string;
  labelNot: string;
  labelPercent: string;
}

function hashPair(a: string, b: string): number {
  const str = a + ':' + b;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function storageKey(mainSlug: string, altSlug: string) {
  return `vote:${mainSlug}:${altSlug}`;
}

function getStoredVote(mainSlug: string, altSlug: string): 'up' | 'down' | null {
  if (typeof window === 'undefined') return null;
  try {
    const v = localStorage.getItem(storageKey(mainSlug, altSlug));
    return v === 'up' || v === 'down' ? v : null;
  } catch {
    return null;
  }
}

function setStoredVote(mainSlug: string, altSlug: string, vote: 'up' | 'down' | null) {
  try {
    const key = storageKey(mainSlug, altSlug);
    if (vote) {
      localStorage.setItem(key, vote);
    } else {
      localStorage.removeItem(key);
    }
  } catch {}
}

export function VoteButton({ mainBrandSlug, altSlug, labelGood, labelNot, labelPercent }: VoteButtonProps) {
  const seed = hashPair(mainBrandSlug, altSlug);
  const baseUp = 5 + (seed % 46);       // 5–50
  const baseDown = (seed >> 8) % 6;      // 0–5

  const [vote, setVote] = useState<'up' | 'down' | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setVote(getStoredVote(mainBrandSlug, altSlug));
    setMounted(true);
  }, [mainBrandSlug, altSlug]);

  const upCount = baseUp + (vote === 'up' ? 1 : 0);
  const downCount = baseDown + (vote === 'down' ? 1 : 0);
  const total = upCount + downCount;
  const percent = total > 0 ? Math.round((upCount / total) * 100) : 0;

  function handleVote(dir: 'up' | 'down') {
    const next = vote === dir ? null : dir;
    setVote(next);
    setStoredVote(mainBrandSlug, altSlug, next);
  }

  if (!mounted) return null;

  return (
    <div className="flex items-center gap-3 mt-2.5">
      {/* Thumbs up */}
      <button
        onClick={() => handleVote('up')}
        className={`inline-flex items-center gap-1 text-xs rounded-full px-2 py-0.5 transition-colors ${
          vote === 'up'
            ? 'bg-bs-teal/10 text-bs-teal font-medium'
            : 'text-bs-gray/60 hover:text-bs-teal hover:bg-bs-teal/5'
        }`}
        aria-label={labelGood}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3" />
        </svg>
        {upCount}
      </button>

      {/* Thumbs down */}
      <button
        onClick={() => handleVote('down')}
        className={`inline-flex items-center gap-1 text-xs rounded-full px-2 py-0.5 transition-colors ${
          vote === 'down'
            ? 'bg-red-50 text-red-500 font-medium'
            : 'text-bs-gray/60 hover:text-red-400 hover:bg-red-50/50'
        }`}
        aria-label={labelNot}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 15V19a3 3 0 003 3l4-9V2H5.72a2 2 0 00-2 1.7l-1.38 9a2 2 0 002 2.3H10zM17 2h2.67A2.31 2.31 0 0122 4v7a2.31 2.31 0 01-2.33 2H17" />
        </svg>
        {downCount}
      </button>

      {/* Percentage */}
      <span className="text-xs text-bs-gray/50">
        {labelPercent.replace('{percent}', String(percent))}
      </span>
    </div>
  );
}
