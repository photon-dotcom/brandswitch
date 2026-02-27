'use client';

import Link from 'next/link';
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[GlobalError]', error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center bg-bs-bg px-4">
          <div className="text-center max-w-md">
            <h1 className="text-4xl font-bold text-bs-dark mb-3">Something went wrong</h1>
            <p className="text-bs-gray mb-6">
              An unexpected error occurred. Please try again or go back to the homepage.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={reset}
                className="px-5 py-2.5 bg-bs-teal text-white font-semibold rounded-xl hover:bg-bs-teal/90 transition-colors"
              >
                Try again
              </button>
              <Link
                href="/"
                className="px-5 py-2.5 border border-bs-border text-bs-dark font-semibold rounded-xl hover:bg-white transition-colors"
              >
                Go home
              </Link>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
