'use client';
import { useState, useEffect } from 'react';

interface Props {
  sceneNumber: string;
  headline: string;
  sub: string;
  counterLabel: string;
  counterTarget: number;
  counterDuration?: number;
  visible: boolean;
}

export default function SceneOverlay({
  sceneNumber, headline, sub,
  counterLabel, counterTarget, counterDuration = 2000, visible,
}: Props) {
  const [counterVal, setCounterVal] = useState(0);

  useEffect(() => {
    if (!visible) return;
    setCounterVal(0);
    const start = performance.now();
    const step = (now: number) => {
      const p = Math.min((now - start) / counterDuration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setCounterVal(Math.round(eased * counterTarget));
      if (p < 1) requestAnimationFrame(step);
    };
    const id = requestAnimationFrame(step);
    return () => cancelAnimationFrame(id);
  }, [visible, counterTarget, counterDuration]);

  return (
    <div
      className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-end pb-16 px-10"
      style={{ transition: 'opacity 0.7s ease', opacity: visible ? 1 : 0 }}
    >
      {/* Scene number */}
      <div className="absolute top-24 left-10 font-mono text-xs tracking-[4px] text-white/30 uppercase">
        {sceneNumber}
      </div>

      {/* Main text block — bottom left */}
      <div className="max-w-xl">
        <h2
          className="font-bebas text-[clamp(52px,7vw,100px)] leading-none tracking-[4px] text-white mb-4"
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
        <div className="font-mono text-3xl font-bold text-white tabular-nums">
          {counterVal.toLocaleString()}
        </div>
        <div className="font-mono text-[10px] tracking-[3px] uppercase text-white/30 mt-1">
          {counterLabel}
        </div>
      </div>
    </div>
  );
}
