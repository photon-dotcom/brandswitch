import Link from 'next/link';

export interface Crumb {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: Crumb[];
  className?: string;
}

export function Breadcrumbs({ items, className = '' }: BreadcrumbsProps) {
  // Schema.org BreadcrumbList markup (injected as JSON-LD)
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.label,
      ...(item.href ? { item: `https://brandswitch.com${item.href}` } : {}),
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <nav
        aria-label="Breadcrumb"
        className={`flex items-center flex-wrap gap-1 text-sm text-bs-gray mb-6 ${className}`}
      >
        {items.map((item, i) => (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && <span className="text-bs-border select-none">/</span>}
            {item.href ? (
              <Link
                href={item.href}
                className="hover:text-bs-dark transition-colors"
              >
                {item.label}
              </Link>
            ) : (
              <span className="text-bs-dark font-medium">{item.label}</span>
            )}
          </span>
        ))}
      </nav>
    </>
  );
}
