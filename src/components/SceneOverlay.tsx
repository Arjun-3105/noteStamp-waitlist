'use client';
import { useState, useEffect, useRef } from 'react';

interface Props {
  sceneNumber: string;
  headline: string;
  sub: string;
  counterLabel: string;
  counterTarget: number;
  counterStart?: number;
  counterDuration?: number;
  color?: string;
  visible: boolean;
}

export default function SceneOverlay({
  sceneNumber, headline, sub,
  counterLabel, counterTarget, counterStart = 0,
  counterDuration = 8000, color = '#ffffff', visible,
}: Props) {
  const [counterVal, setCounterVal] = useState(counterStart);
  const rafRef = useRef(0);

  useEffect(() => {
    if (!visible) return;
    // Always animate from counterStart → counterTarget over counterDuration
    const from = counterStart;
    const to = counterTarget;
    const start = performance.now();

    const step = (now: number) => {
      const elapsed = now - start;
      const p = Math.min(elapsed / counterDuration, 1);
      // Linear rise so you can see every digit tick
      const eased = p < 0.5
        ? 2 * p * p                  // gentle ease-in
        : 1 - Math.pow(-2 * p + 2, 2) / 2; // gentle ease-out
      setCounterVal(Math.round(from + (to - from) * eased));
      if (p < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [visible, counterTarget, counterStart, counterDuration]);

  return (
    <div
      className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-end pb-16 px-10"
      style={{ transition: 'opacity 0.6s ease', opacity: visible ? 1 : 0 }}
    >
      {/* Scene number */}
      <div className="absolute top-24 left-10 font-mono text-xs tracking-[4px] text-white/30 uppercase">
        {sceneNumber}
      </div>

      {/* Main text block — bottom left */}
      <div className="max-w-xl">
        <h2
          className="font-bebas text-[clamp(52px,7vw,100px)] leading-none tracking-[4px] text-white mb-4 whitespace-pre-line"
          style={{ textShadow: '0 0 60px rgba(0,0,0,0.9)' }}
        >
          {headline}
        </h2>
        <p
          className="font-raleway text-sm md:text-base font-light leading-relaxed text-white/50 max-w-md"
          style={{ textShadow: '0 2px 20px rgba(0,0,0,0.8)' }}
        >
          {sub}
        </p>
      </div>

      {/* Counter — bottom right */}
      <div className="absolute bottom-16 right-10 text-right">
        <div
          className="font-mono text-3xl font-bold tabular-nums"
          style={{ color, textShadow: `0 0 20px ${color}55` }}
        >
          {counterVal.toLocaleString()}
        </div>
        <div className="font-mono text-[10px] tracking-[3px] uppercase text-white/30 mt-1">
          {counterLabel}
        </div>
        {/* Live feed indicator dot */}
        <div className="flex items-center justify-end gap-1.5 mt-2">
          <div
            className="w-1.5 h-1.5 rounded-full animate-pulse"
            style={{ background: color }}
          />
          <span className="font-mono text-[8px] tracking-[2px] uppercase" style={{ color: `${color}88` }}>
            live
          </span>
        </div>
      </div>
    </div>
  );
}
