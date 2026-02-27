import Link from 'next/link';

export default function NotFound() {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'sans-serif', background: '#f5f5f0' }}>
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
            textAlign: 'center',
          }}
        >
          {/* Logo */}
          <Link href="/us" style={{ textDecoration: 'none', marginBottom: '2.5rem' }}>
            <span style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1a1a18' }}>brand</span>
            <span style={{ fontSize: '1.5rem', fontWeight: 700, color: '#4a9982' }}>switch</span>
          </Link>

          {/* Error indicator */}
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              background: '#4a998215',
              border: '2px solid #4a998230',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2rem',
              marginBottom: '1.5rem',
            }}
          >
            404
          </div>

          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1a1a18', margin: '0 0 0.75rem' }}>
            Page not found
          </h1>
          <p style={{ fontSize: '1rem', color: '#6b6b60', maxWidth: 380, lineHeight: 1.6, margin: '0 0 2rem' }}>
            The brand or page you&apos;re looking for doesn&apos;t exist in this market, or the URL may have changed.
          </p>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <Link
              href="/us"
              style={{
                background: '#4a9982',
                color: 'white',
                textDecoration: 'none',
                padding: '0.625rem 1.25rem',
                borderRadius: 10,
                fontWeight: 600,
                fontSize: '0.875rem',
              }}
            >
              Go to homepage
            </Link>
            <Link
              href="/us/category"
              style={{
                background: 'white',
                color: '#1a1a18',
                textDecoration: 'none',
                padding: '0.625rem 1.25rem',
                borderRadius: 10,
                fontWeight: 600,
                fontSize: '0.875rem',
                border: '1px solid #e4e4de',
              }}
            >
              Browse categories
            </Link>
          </div>

          {/* Popular links */}
          <div style={{ marginTop: '2.5rem' }}>
            <p style={{ fontSize: '0.75rem', color: '#9a9a92', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
              Popular searches
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
              {['nike', 'dyson', 'samsung', 'asos', 'nordvpn'].map(slug => (
                <Link
                  key={slug}
                  href={`/us/brands-like/${slug}`}
                  style={{
                    background: 'white',
                    border: '1px solid #e4e4de',
                    borderRadius: 20,
                    padding: '0.375rem 0.875rem',
                    fontSize: '0.8125rem',
                    color: '#1a1a18',
                    textDecoration: 'none',
                    fontWeight: 500,
                  }}
                >
                  {slug}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
