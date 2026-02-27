'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useParams } from 'next/navigation';

export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const params = useParams();
  const locale = (params?.locale as string) ?? 'us';

  useEffect(() => {
    console.error('[LocaleError]', error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <h1 className="text-3xl font-bold text-bs-dark mb-3">Something went wrong</h1>
        <p className="text-bs-gray mb-6">
          We hit an unexpected error loading this page. Try refreshing or go back to the homepage.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="px-5 py-2.5 bg-bs-teal text-white font-semibold rounded-xl hover:bg-bs-teal/90 transition-colors"
          >
            Try again
          </button>
          <Link
            href={`/${locale}`}
            className="px-5 py-2.5 border border-bs-border text-bs-dark font-semibold rounded-xl hover:bg-white transition-colors"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
