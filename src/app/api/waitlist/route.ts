import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const FILE = path.join(process.cwd(), 'waitlist.json');

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    }

    let list: string[] = [];
    try {
      const raw = await fs.readFile(FILE, 'utf-8');
      list = JSON.parse(raw);
    } catch {
      list = [];
    }

    if (!list.includes(email)) {
      list.push(email);
      await fs.writeFile(FILE, JSON.stringify(list, null, 2));
    }

    return NextResponse.json({ ok: true, count: list.length });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const raw = await fs.readFile(FILE, 'utf-8');
    const list = JSON.parse(raw);
    return NextResponse.json({ count: list.length });
  } catch {
    return NextResponse.json({ count: 0 });
  }
}
