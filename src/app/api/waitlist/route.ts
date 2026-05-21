import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

const FREEWAITLISTS_ENDPOINT = process.env.FREEWAITLISTS_ENDPOINT;

function isValidEmail(value: unknown): value is string {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
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
    const { count, error } = await supabaseAdmin
      .from('waitlist')
      .select('*', {
        count: 'exact',
        head: true,
      })

    if (error) {
      console.error('Supabase error:', error)

      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      count: count ?? 0,
    })

  } catch (error) {
    console.error('Server error:', error)

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}