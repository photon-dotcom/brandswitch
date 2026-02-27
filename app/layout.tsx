import type { Metadata } from 'next';
import { DM_Sans } from 'next/font/google';
import './globals.css';

// Load DM Sans from Google Fonts — applied globally via CSS variable
const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
  weight: ['300', '400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'Brandswitch — Find Brands Like the Ones You Love',
  description:
    'Discover fresh alternatives to your favourite brands. Find similar brands across fashion, travel, beauty, tech and more.',
  metadataBase: new URL('https://brandswitch.com'),
};

// Root layout — wraps every page with the HTML shell and global font
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={dmSans.variable}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
