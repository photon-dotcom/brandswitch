import { buildBrandSitemap } from '../_buildBrandSitemap';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 86400;
export function GET() { return buildBrandSitemap('no'); }
