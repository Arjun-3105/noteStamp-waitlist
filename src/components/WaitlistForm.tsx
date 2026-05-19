'use client';
import { useState } from 'react';

export default function WaitlistForm() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [count] = useState(4218);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState('loading');
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error();
      setState('success');
    } catch {
      setState('error');
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
          {state === 'loading' ? '...' : 'JOIN WAITLIST'}
        </button>
      </div>
      {state === 'error' && (
        <p className="font-raleway text-red-400 text-xs mt-2">Something went wrong. Try again.</p>
      )}
      <p className="font-raleway text-xs text-white/30 mt-3 tracking-wide">
        Join <strong className="text-white/50">{(count).toLocaleString()}</strong> others already waiting. No spam, ever.
      </p>

      {/* Stats */}
      <div className="flex gap-10 mt-8">
        {[['10K+','Beta Spots'],['50+','AI Models'],['∞','Topics']].map(([num, label]) => (
          <div key={label} className="text-center">
            <span className="font-bebas text-3xl tracking-[3px] text-white block">{num}</span>
            <span className="font-raleway text-[10px] tracking-[2px] uppercase text-white/30">{label}</span>
          </div>
        ))}
      </div>
    </form>
  );
}
