import fs from 'fs';
import path from 'path';

interface ClickEvent {
  brandSlug: string;
  market: string;
  affiliateSource: string;
  subId: string;
  timestamp: string;
}

function loadEvents(): ClickEvent[] {
  const logPath = path.join(process.cwd(), 'data', 'click-log.json');
  try {
    const raw = fs.readFileSync(logPath, 'utf-8');
    return raw
      .split('\n')
      .filter(Boolean)
      .map(line => JSON.parse(line) as ClickEvent);
  } catch {
    return [];
  }
}

function top<T extends string>(arr: T[], n = 20): [T, number][] {
  const counts = new Map<T, number>();
  for (const v of arr) counts.set(v, (counts.get(v) ?? 0) + 1);
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, n) as [T, number][];
}

export default function AdminClicksPage() {
  const events = loadEvents();
  const total = events.length;

  const topBrands = top(events.map(e => e.brandSlug));
  const byMarket = top(events.map(e => e.market));
  const bySource = top(events.map(e => e.affiliateSource || 'unknown'));

  // Clicks by day (last 14 days)
  const dayMap = new Map<string, number>();
  for (const e of events) {
    const day = e.timestamp?.slice(0, 10) ?? 'unknown';
    dayMap.set(day, (dayMap.get(day) ?? 0) + 1);
  }
  const byDay = Array.from(dayMap.entries()).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 14);

  return (
    <div className="min-h-screen bg-bs-bg">
    <div className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-bs-dark mb-1">Click Analytics</h1>
      <p className="text-bs-gray text-sm mb-8">Affiliate click tracking — raw data from click-log.json</p>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
        {[
          { label: 'Total Clicks', value: total.toLocaleString() },
          { label: 'Unique Brands', value: new Set(events.map(e => e.brandSlug)).size.toLocaleString() },
          { label: 'Markets', value: new Set(events.map(e => e.market)).size.toLocaleString() },
          { label: 'Sources', value: new Set(events.map(e => e.affiliateSource)).size.toLocaleString() },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white rounded-2xl border border-bs-border p-4">
            <p className="text-xs text-bs-gray uppercase tracking-wide mb-1">{label}</p>
            <p className="text-2xl font-bold text-bs-dark">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
        {/* Top brands */}
        <div className="bg-white rounded-2xl border border-bs-border p-5">
          <h2 className="text-sm font-semibold text-bs-dark mb-4">Top 20 Brands</h2>
          {topBrands.length === 0 ? (
            <p className="text-sm text-bs-gray">No data yet.</p>
          ) : (
            <div className="space-y-2">
              {topBrands.map(([slug, count]) => (
                <div key={slug} className="flex items-center justify-between gap-2">
                  <span className="text-sm text-bs-dark truncate font-mono">{slug}</span>
                  <span className="text-sm font-semibold text-bs-teal shrink-0">{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* By market */}
        <div className="bg-white rounded-2xl border border-bs-border p-5">
          <h2 className="text-sm font-semibold text-bs-dark mb-4">By Market</h2>
          {byMarket.length === 0 ? (
            <p className="text-sm text-bs-gray">No data yet.</p>
          ) : (
            <div className="space-y-2">
              {byMarket.map(([market, count]) => (
                <div key={market} className="flex items-center justify-between gap-2">
                  <span className="text-sm text-bs-dark font-semibold">{market.toUpperCase()}</span>
                  <div className="flex items-center gap-2 flex-1 mx-3">
                    <div
                      className="h-2 bg-bs-teal rounded-full"
                      style={{ width: `${Math.round((count / total) * 100)}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-bs-teal shrink-0">
                    {count} ({Math.round((count / total) * 100)}%)
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* By source */}
        <div className="bg-white rounded-2xl border border-bs-border p-5">
          <h2 className="text-sm font-semibold text-bs-dark mb-4">By Affiliate Source</h2>
          {bySource.length === 0 ? (
            <p className="text-sm text-bs-gray">No data yet.</p>
          ) : (
            <div className="space-y-2">
              {bySource.map(([source, count]) => (
                <div key={source} className="flex items-center justify-between gap-2">
                  <span className="text-sm text-bs-dark truncate">{source || 'unknown'}</span>
                  <span className="text-sm font-semibold text-bs-teal shrink-0">{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* By day */}
        <div className="bg-white rounded-2xl border border-bs-border p-5">
          <h2 className="text-sm font-semibold text-bs-dark mb-4">By Day (last 14)</h2>
          {byDay.length === 0 ? (
            <p className="text-sm text-bs-gray">No data yet.</p>
          ) : (
            <div className="space-y-2">
              {byDay.map(([day, count]) => (
                <div key={day} className="flex items-center justify-between gap-2">
                  <span className="text-sm text-bs-dark font-mono">{day}</span>
                  <span className="text-sm font-semibold text-bs-teal shrink-0">{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
    </div>
  );
}
