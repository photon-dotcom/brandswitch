// The core Brand data model — matches the Shoptastic API output
export interface Brand {
  id: string;
  name: string;
  slug: string;           // URL-safe: "patagonia"
  domain: string;         // "patagonia.com"
  description: string;    // AI-generated one-liner
  logo: string;           // Clearbit or favicon URL
  categories: string[];   // ["outdoor", "fashion"]
  tags: string[];         // ["sustainable", "outdoor", "adventure"]
  country: string;        // "US" | "UK" | "DE" | "FR"
  affiliateUrl: string;   // Click-out URL with commission tracking
  deeplinkUrl: string;
  supportsDeepLink: boolean;
  commission: string;     // "4.20%"
  commissionType: string;
  eCPC: string;
  similarBrands: string[]; // slugs of precomputed similar brands
  logoQuality: 'high' | 'medium' | 'low' | 'none';
}
