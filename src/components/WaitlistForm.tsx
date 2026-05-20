'use client';
import { useState, useEffect } from 'react';

export default function WaitlistForm() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [count, setCount] = useState<number | null>(null);
  const [loadingCount, setLoadingCount] = useState(true);

  const loadCount = async () => {
    setLoadingCount(true);

    try {
      const res = await fetch('/api/waitlist');
      if (!res.ok) return;
      const data = await res.json();
      if (typeof data.count === 'number') {
        setCount(data.count);
      }
    } catch {
      // ignore count load errors
    } finally {
      setLoadingCount(false);
    }
  };

  useEffect(() => {
    loadCount();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState('loading');
    setErrorMsg('');

    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          referral_link: typeof window !== 'undefined' ? window.location.href : '',
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? 'Something went wrong.');
      }

      setState('success');
      setCount(prev => (prev ?? 0) + 1);
    } catch (err) {
      setState('error');
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong. Try again.');
    }
  };

  if (state === 'success') {
    return (
      <div className="border border-green-400/30 bg-green-400/5 px-6 py-5 max-w-lg">
        <p className="font-raleway text-green-400 text-base tracking-wide">
          ✦ &nbsp;You&apos;re on the list! We&apos;ll be in touch soon.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-lg">
      <div className="flex border border-cyan-400/30 bg-cyan-400/5 focus-within:border-cyan-400 transition-colors">
        <input
          type="email"
          required
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="Enter your email address"
          className="flex-1 bg-transparent px-5 py-4 font-raleway text-sm text-white placeholder-white/30 outline-none"
        />
        <button
          type="submit"
          disabled={state === 'loading'}
          className="bg-cyan-400 hover:bg-cyan-300 transition-colors px-6 py-4 font-bebas text-lg tracking-[2px] text-black disabled:opacity-60 whitespace-nowrap"
        >
          {state === 'loading' ? '···' : 'JOIN WAITLIST'}
        </button>
      </div>
      {state === 'error' && (
        <p className="font-raleway text-red-400 text-xs mt-2">{errorMsg}</p>
      )}
      <p className="font-raleway text-xs text-white/30 mt-3 tracking-wide">
        No spam, ever. Unsubscribe anytime.
      </p>
      <div className="mt-3 flex flex-col gap-2 text-xs uppercase tracking-[2px] text-white/40 sm:flex-row sm:items-center sm:justify-between">
        <span>
          {loadingCount ? 'Loading waitlist total…' : `${count ?? 0} people already joined the waitlist`}
        </span>
        <button
          type="button"
          onClick={loadCount}
          disabled={loadingCount}
          className="inline-flex items-center justify-center rounded border border-white/10 bg-white/5 px-3 py-2 text-[10px] tracking-[2px] text-white transition hover:border-cyan-300 hover:bg-cyan-400/10 disabled:cursor-wait disabled:opacity-50"
        >
          {loadingCount ? (
            <span className="inline-flex items-center gap-2">
              <span className="h-3 w-3 animate-spin rounded-full border-[2px] border-white/30 border-t-white" />
              Refreshing
            </span>
          ) : (
            'Refresh count'
          )}
        </button>
      </div>
    </form>
  );
}
