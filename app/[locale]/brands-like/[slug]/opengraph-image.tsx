import { ImageResponse } from 'next/og';
import { getBrandBySlug, cleanDisplayName } from '@/lib/brands';

export const runtime = 'nodejs';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OgImage({
  params,
}: {
  params: { locale: string; slug: string };
}) {
  const brand = getBrandBySlug(params.locale, params.slug);
  const name = brand ? cleanDisplayName(brand.name) : 'Brand';
  const cat = brand?.categories?.[0] ?? 'brand';
  const altCount = brand?.similarBrands?.length ?? 0;
  const logo = brand?.logo;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#1a1a18',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'center',
          padding: '72px 80px',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Logo + name row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 28, marginBottom: 32 }}>
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logo}
              alt=""
              width={96}
              height={96}
              style={{ borderRadius: 20, background: '#fff', padding: 8, objectFit: 'contain' }}
            />
          ) : (
            <div
              style={{
                width: 96, height: 96, borderRadius: 20,
                background: '#4a9982',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 48, fontWeight: 700, color: '#fff',
              }}
            >
              {name[0]?.toUpperCase()}
            </div>
          )}
          <span style={{ fontSize: 56, fontWeight: 700, color: '#f5f5f0', lineHeight: 1.1 }}>
            {name}
          </span>
        </div>

        {/* Headline */}
        <div style={{ fontSize: 38, fontWeight: 600, color: '#4a9982', marginBottom: 16, lineHeight: 1.2 }}>
          {altCount > 0 ? `${altCount} brands like ${name}` : `Find brands like ${name}`}
        </div>

        {/* Sub-line */}
        <div style={{ fontSize: 24, color: '#a0a09a' }}>
          Best {cat} alternatives · brandswitch.com
        </div>
      </div>
    ),
    { ...size }
  );
}
