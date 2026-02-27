import { redirect } from 'next/navigation';

// Root "/" → redirect to US market
// The middleware handles /us, /uk, /de, /fr validation
export default function RootPage() {
  redirect('/us');
}
