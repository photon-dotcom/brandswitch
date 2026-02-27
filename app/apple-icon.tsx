import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#4a9982',
          width: 180,
          height: 180,
          borderRadius: 40,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
        }}
      >
        <span style={{ color: 'white', fontSize: 110, fontWeight: 700, lineHeight: 1 }}>b</span>
      </div>
    ),
    { width: 180, height: 180 }
  );
}
