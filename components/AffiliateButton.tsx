'use client';

interface AffiliateButtonProps {
  href: string;
  label: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * All affiliate links must use these rel attributes per FTC guidelines
 * and common affiliate network requirements.
 *
 * On click, generates a unique subId (UUID) and appends it to the URL
 * as &subId=<uuid> for click tracking. The UUID is generated client-side
 * using crypto.randomUUID() which is available in all modern browsers.
 */
export function AffiliateButton({
  href,
  label,
  variant = 'primary',
  size = 'md',
  className = '',
}: AffiliateButtonProps) {
  if (!href) return null;

  function handleClick(e: React.MouseEvent<HTMLAnchorElement>) {
    e.preventDefault();
    const clickId = crypto.randomUUID();
    const url = href.includes('?')
      ? `${href}&subId=${clickId}`
      : `${href}?subId=${clickId}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  const base =
    'inline-flex items-center gap-1.5 font-semibold rounded-xl transition-colors whitespace-nowrap shrink-0';

  const variants = {
    primary:   'bg-bs-teal text-white hover:bg-bs-teal-dark',
    secondary: 'border-2 border-bs-teal text-bs-teal hover:bg-bs-teal-light',
    ghost:     'text-bs-teal hover:underline p-0',
  };

  const sizes = {
    sm: 'text-xs px-3 py-1.5',
    md: 'text-sm px-4 py-2.5',
    lg: 'text-base px-6 py-3.5',
  };

  return (
    <a
      href={href}
      onClick={handleClick}
      target="_blank"
      rel="noopener noreferrer nofollow sponsored"
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {label}
      <svg
        className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
        />
      </svg>
    </a>
  );
}
