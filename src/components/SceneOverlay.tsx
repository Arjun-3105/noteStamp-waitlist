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
  particlesReady?: boolean;
}

export default function SceneOverlay({
  sceneNumber, headline, sub,
  counterLabel, counterTarget, counterStart = 0,
  counterDuration = 8000, color = '#ffffff', visible,
  particlesReady = false,
}: Props) {
  const [counterVal, setCounterVal] = useState(counterStart);
  const [textVisible, setTextVisible] = useState(false);
  const rafRef = useRef(0);

  // Text fades in only after particles have settled
  useEffect(() => {
    if (!visible || !particlesReady) {
      setTextVisible(false);
      return;
    }
    const t = setTimeout(() => setTextVisible(true), 60);
    return () => clearTimeout(t);
  }, [visible, particlesReady]);

  // Counter ticks up after text appears
  useEffect(() => {
    if (!textVisible) { setCounterVal(counterStart); return; }
    const from = counterStart;
    const to = counterTarget;
    const start = performance.now();
    const step = (now: number) => {
      const elapsed = now - start;
      const p = Math.min(elapsed / counterDuration, 1);
      const eased = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      setCounterVal(Math.round(from + (to - from) * eased));
      if (p < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [textVisible, counterTarget, counterStart, counterDuration]);

  return (
    /* z-40 keeps text always above the z-0 canvas */
    <div className="fixed inset-0 z-40 pointer-events-none flex flex-col justify-end
                    pb-10 sm:pb-16 px-5 sm:px-10">

      {/* Scene number — top left, clears the nav */}
      <div
        className="absolute top-[88px] sm:top-24 left-5 sm:left-10
                   font-mono text-[10px] sm:text-xs tracking-[4px] text-white/30 uppercase
                   transition-all duration-600"
        style={{
          opacity: textVisible ? 1 : 0,
          transform: textVisible ? 'translateY(0)' : 'translateY(-8px)',
        }}
      >
        {sceneNumber}
      </div>

      {/* ── Main text — bottom left ── */}
      <div className="max-w-xl w-full">
        <h2
          className="font-bebas leading-none tracking-[3px] sm:tracking-[4px] text-white
                     mb-3 sm:mb-4 whitespace-pre-line
                     text-[clamp(40px,9vw,100px)] sm:text-[clamp(52px,7vw,100px)]
                     transition-all duration-700"
          style={{
            textShadow: '0 0 80px rgba(0,0,0,0.95), 0 2px 40px rgba(0,0,0,0.8)',
            opacity: textVisible ? 1 : 0,
            transform: textVisible ? 'translateY(0)' : 'translateY(20px)',
          }}
        >
          {headline}
        </h2>
        <p
          className="font-raleway font-light leading-relaxed text-white/55
                     text-xs sm:text-sm md:text-base
                     max-w-[min(100%,28rem)]
                     transition-all duration-700"
          style={{
            textShadow: '0 2px 24px rgba(0,0,0,0.9)',
            opacity: textVisible ? 1 : 0,
            transform: textVisible ? 'translateY(0)' : 'translateY(14px)',
            transitionDelay: '70ms',
          }}
        >
          {sub}
        </p>
      </div>

      {/* ── Counter — bottom right on desktop, below text on mobile ── */}
      <div
        className="absolute bottom-10 sm:bottom-16 right-5 sm:right-10 text-right
                   transition-all duration-700"
        style={{
          opacity: textVisible ? 1 : 0,
          transform: textVisible ? 'translateY(0)' : 'translateY(10px)',
          transitionDelay: '120ms',
        }}
      >
        <div
          className="font-mono text-2xl sm:text-3xl font-bold tabular-nums"
          style={{ color, textShadow: `0 0 20px ${color}55` }}
        >
          {counterVal.toLocaleString()}
        </div>
        <div className="font-mono text-[9px] sm:text-[10px] tracking-[3px] uppercase text-white/30 mt-1">
          {counterLabel}
        </div>
        <div className="flex items-center justify-end gap-1.5 mt-2">
          <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: color }} />
          <span className="font-mono text-[8px] tracking-[2px] uppercase" style={{ color: `${color}88` }}>
            live
          </span>
        </div>
      </div>
    </div>
  );
}
