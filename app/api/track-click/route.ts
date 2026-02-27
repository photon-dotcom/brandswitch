import { type NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const runtime = 'nodejs';

const LOG_FILE = path.join(process.cwd(), 'data', 'click-log.json');

interface ClickEvent {
  brandSlug: string;
  market: string;
  affiliateSource: string;
  subId: string;
  timestamp: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as Partial<ClickEvent>;
    if (!body.brandSlug || !body.timestamp) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const event: ClickEvent = {
      brandSlug: String(body.brandSlug ?? '').slice(0, 100),
      market:    String(body.market ?? 'us').slice(0, 10),
      affiliateSource: String(body.affiliateSource ?? '').slice(0, 50),
      subId:     String(body.subId ?? '').slice(0, 40),
      timestamp: String(body.timestamp ?? '').slice(0, 30),
    };

    // Append to click-log.json (newline-delimited JSON for easy streaming reads)
    const line = JSON.stringify(event) + '\n';
    fs.appendFileSync(LOG_FILE, line, 'utf-8');

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
