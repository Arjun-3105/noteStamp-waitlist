'use client';
import { useEffect, useRef, useCallback } from 'react';

export function useScrollJack(
  totalScenes: number,
  onSceneChange: (index: number) => void
) {
  const sceneRef = useRef(0);
  const lockedRef = useRef(false);
  const accDeltaRef = useRef(0);       // accumulated scroll delta
  const touchStartY = useRef(0);

  const THRESHOLD = 700;               // requires deliberate scroll
  const LOCK_MS   = 1800;             // time before next scene allowed

  const advance = useCallback((dir: 1 | -1) => {
    if (lockedRef.current) return;
    const next = Math.max(0, Math.min(totalScenes - 1, sceneRef.current + dir));
    if (next === sceneRef.current) return;
    lockedRef.current = true;
    sceneRef.current = next;
    accDeltaRef.current = 0;
    onSceneChange(next);
    setTimeout(() => { lockedRef.current = false; }, LOCK_MS);
  }, [totalScenes, onSceneChange]);

  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (lockedRef.current) return;
      accDeltaRef.current += e.deltaY;
      if (Math.abs(accDeltaRef.current) >= THRESHOLD) {
        advance(accDeltaRef.current > 0 ? 1 : -1);
      }
    };
    const onTouchStart = (e: TouchEvent) => {
      touchStartY.current = e.touches[0].clientY;
    };
    const onTouchEnd = (e: TouchEvent) => {
      const dy = touchStartY.current - e.changedTouches[0].clientY;
      if (Math.abs(dy) > 80) advance(dy > 0 ? 1 : -1);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 'PageDown') advance(1);
      if (e.key === 'ArrowUp'   || e.key === 'PageUp')   advance(-1);
    };
    window.addEventListener('wheel',      onWheel,      { passive: false });
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchend',   onTouchEnd,   { passive: true });
    window.addEventListener('keydown',    onKey);
    return () => {
      window.removeEventListener('wheel',      onWheel);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchend',   onTouchEnd);
      window.removeEventListener('keydown',    onKey);
    };
  }, [advance]);

  return { advance };
}
