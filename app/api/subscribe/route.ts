import { type NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const runtime = 'nodejs';

const FILE = path.join(process.cwd(), 'data', 'subscribers.json');
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface Subscriber {
  email: string;
  category: string;
  locale: string;
  timestamp: string;
}

function loadSubscribers(): Subscriber[] {
  try {
    return JSON.parse(fs.readFileSync(FILE, 'utf-8')) as Subscriber[];
  } catch {
    return [];
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { email?: string; category?: string; locale?: string };
    const email = String(body.email ?? '').trim().toLowerCase().slice(0, 254);
    const category = String(body.category ?? '').slice(0, 100);
    const locale = String(body.locale ?? 'us').slice(0, 10);

    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ ok: false, error: 'invalid_email' }, { status: 400 });
    }

    const existing = loadSubscribers();
    if (existing.some(s => s.email === email)) {
      // Already subscribed — return success silently (no need to expose this)
      return NextResponse.json({ ok: true });
    }

    const entry: Subscriber = { email, category, locale, timestamp: new Date().toISOString() };
    existing.push(entry);
    fs.writeFileSync(FILE, JSON.stringify(existing, null, 2), 'utf-8');

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: 'server_error' }, { status: 500 });
  }
}
