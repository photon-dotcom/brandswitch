import { ImageResponse } from 'next/og';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#4a9982',
          width: 32,
          height: 32,
          borderRadius: 7,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
        }}
      >
        <span style={{ color: 'white', fontSize: 20, fontWeight: 700, lineHeight: 1 }}>b</span>
      </div>
    ),
    { width: 32, height: 32 }
  );
}
