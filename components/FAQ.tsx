'use client';

import { useState } from 'react';

export interface FAQItem {
  question: string;
  answer: string;
}

export function FAQ({ items }: { items: FAQItem[] }) {
  const [open, setOpen] = useState<number | null>(0); // first item open by default

  return (
    <div className="space-y-2">
      {items.map((item, i) => {
        const isOpen = open === i;
        return (
          <div
            key={i}
            className="border border-bs-border rounded-2xl overflow-hidden bg-white"
          >
            <button
              className="w-full px-5 py-4 text-left flex justify-between items-center gap-4"
              onClick={() => setOpen(isOpen ? null : i)}
              aria-expanded={isOpen}
            >
              <span className="font-semibold text-bs-dark text-sm leading-snug">
                {item.question}
              </span>
              <span
                className={`shrink-0 w-5 h-5 rounded-full border border-bs-border flex items-center justify-center text-bs-gray text-xs transition-transform ${isOpen ? 'rotate-45' : ''}`}
              >
                +
              </span>
            </button>
            {isOpen && (
              <div className="px-5 pb-5 text-sm text-bs-gray leading-relaxed border-t border-bs-border/50 pt-3">
                {item.answer}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
