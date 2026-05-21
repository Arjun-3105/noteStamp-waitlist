import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

const FREEWAITLISTS_ENDPOINT = process.env.FREEWAITLISTS_ENDPOINT;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

function isValidEmail(value: unknown): value is string {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function extractCountFromFreeWaitlists(data: unknown): number | null {
  if (!data || typeof data !== 'object') return null;
  const payload = data as Record<string, unknown>;
  const keys = ['count', 'total', 'subscribers', 'participants', 'waitlistCount'];

  for (const key of keys) {
    const value = payload[key];
    if (typeof value === 'number') return value;
    if (typeof value === 'string' && /^\d+$/.test(value)) return parseInt(value, 10);
  }

  return null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const email = isValidEmail(body.email)
      ? body.email.trim().toLowerCase()
      : '';

    if (!email) {
      return NextResponse.json(
        { error: 'Invalid email' },
        { status: 400 }
      );
    }

    /*
      PRIMARY: Supabase
    */
    const { error: supabaseError } = await supabaseAdmin
      .from('waitlist')
      .insert([{ email }]);

    if (supabaseError) {
      console.error('Supabase insert failed', supabaseError);

      return NextResponse.json(
        { error: 'Failed to join waitlist' },
        { status: 500 }
      );
    }

    /*
      SECONDARY / FALLBACK:
      FreeWaitlists (best effort only)
    */
    if (FREEWAITLISTS_ENDPOINT) {
      try {
        const response = await fetch(FREEWAITLISTS_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email,
          }),
        });

        if (!response.ok) {
          console.warn(
            'FreeWaitlists sync failed',
            response.statusText
          );
        }
      } catch (err) {
        console.warn('FreeWaitlists request failed', err);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Waitlist POST error', error);

    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
}


export async function GET() {
  try {
    const { data, count, error } = await supabaseAdmin
      .from('waitlist')
      .select('id', { count: 'exact' })

    if (error) {
      console.error('Supabase error:', error)

      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    const countValue =
      typeof count === 'number'
        ? count
        : Array.isArray(data)
        ? data.length
        : 0

    if (count === null || count === undefined) {
      console.warn('Supabase count metadata missing, using fallback row length', {
        fallback: countValue,
        dataLength: Array.isArray(data) ? data.length : null,
      })
    }

    return NextResponse.json({
      count: countValue,
    })

  } catch (error) {
    console.error('Server error:', error)

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}