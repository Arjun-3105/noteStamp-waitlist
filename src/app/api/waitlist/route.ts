import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

const FREEWAITLISTS_ENDPOINT = process.env.FREEWAITLISTS_ENDPOINT;

function isValidEmail(value: unknown): value is string {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = isValidEmail(body.email) ? body.email.trim().toLowerCase() : '';
    const referral_link = typeof body.referral_link === 'string' ? body.referral_link : '';

    if (!email) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    }

    if (!FREEWAITLISTS_ENDPOINT) {
      return NextResponse.json({ error: 'Missing FREEWAITLISTS_ENDPOINT' }, { status: 500 });
    }

    const { error: supabaseError } = await supabaseAdmin.from('waitlist').insert(
      [
        {
          email,
          referral_link,
          source: 'landing-page',
        },
      ],
      { ignoreDuplicates: true },
    );

    if (supabaseError) {
      console.error('Supabase insert failed', supabaseError);
      return NextResponse.json({ error: 'Could not save waitlist entry' }, { status: 500 });
    }

    const response = await fetch(FREEWAITLISTS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        meta: {
          name: '',
          source: 'landing-page',
        },
      }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      console.error('FreeWaitlists signup failed', data || response.statusText);
      return NextResponse.json({ error: data?.message ?? 'Failed to register with FreeWaitlists' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Waitlist POST error', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const { count, error } = await supabaseAdmin
      .from('waitlist')
      .select('id', { count: 'exact', head: true });

    if (error) {
      console.error('Supabase count error', error);
      return NextResponse.json({ count: 0 });
    }

    return NextResponse.json({ count: count ?? 0 });
  } catch (error) {
    console.error('Waitlist GET error', error);
    return NextResponse.json({ count: 0 });
  }
}
