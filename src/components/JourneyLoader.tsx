'use client';
import { useEffect, useRef, useState } from 'react';

interface Props {
  sceneIndex: number;
  totalScenes: number;
  color: string;
}

/**
 * Persistent progress bar that lives for the entire journey.
 * It never remounts — animates smoothly from previous → next scene %.
 */
export default function JourneyLoader({ sceneIndex, totalScenes, color }: Props) {
  const [width, setWidth] = useState(0);
  const rafRef = useRef(0);
  const fromRef = useRef(0);

  useEffect(() => {
    const target = ((sceneIndex + 1) / totalScenes) * 100;
    const from = fromRef.current;
    const DURATION = 900;
    const start = performance.now();

    cancelAnimationFrame(rafRef.current);

    const animate = (now: number) => {
      const p = Math.min((now - start) / DURATION, 1);
      const eased = 1 - Math.pow(1 - p, 3); // ease-out cubic
      const current = from + (target - from) * eased;
      setWidth(current);
      if (p < 1) rafRef.current = requestAnimationFrame(animate);
      else fromRef.current = target;
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [sceneIndex, totalScenes]);

  return (
    <div className="fixed top-0 left-0 right-0 z-[60] h-[3px]" style={{ background: 'rgba(255,255,255,0.06)' }}>
      {/* Glowing fill */}
      <div
        className="h-full"
        style={{
          width: `${width}%`,
          background: `linear-gradient(90deg, ${color}60, ${color}cc, ${color})`,
          boxShadow: `0 0 12px ${color}88, 0 0 4px ${color}`,
          transition: 'none',
        }}
      />
      {/* Scene tick marks */}
      <div className="absolute inset-0 flex pointer-events-none">
        {Array.from({ length: totalScenes - 1 }).map((_, i) => (
          <div
            key={i}
            className="flex-1 border-r"
            style={{ borderColor: 'rgba(255,255,255,0.12)' }}
          />
        ))}
        <div className="flex-1" />
      </div>
    </div>
  );
}
