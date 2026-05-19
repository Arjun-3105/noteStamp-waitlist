'use client';
import { useEffect, useRef, useCallback } from 'react';

export function useScrollJack(
  totalScenes: number,
  onSceneChange: (index: number) => void,
  options?: {
    paused?: boolean;
    onScrollProgress?: (deltaY: number) => void;
  }
) {
  const sceneRef = useRef(0);
  const lockedRef = useRef(false);
  const accDeltaRef = useRef(0);       // accumulated scroll delta
  const touchStartY = useRef(0);

  const THRESHOLD = 110;               // triggers instantly on first notch
  const LOCK_MS   = 1350;             // time before next scene allowed

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

  // Keep a ref of options so the listeners don't re-bind continuously
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (optionsRef.current?.paused) {
        optionsRef.current.onScrollProgress?.(e.deltaY);
        return;
      }
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
      if (Math.abs(dy) > 80) {
        if (optionsRef.current?.paused) {
          optionsRef.current.onScrollProgress?.(dy * 3);
          return;
        }
        advance(dy > 0 ? 1 : -1);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (optionsRef.current?.paused) {
        if (e.key === 'ArrowDown' || e.key === 'PageDown') {
          optionsRef.current.onScrollProgress?.(200);
        } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
          optionsRef.current.onScrollProgress?.(-200);
        }
        return;
      }
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

  // Expose sceneRef to allow manual external sync
  const setSceneIndex = useCallback((index: number) => {
    sceneRef.current = index;
    accDeltaRef.current = 0;           // Clear any scroll debt instantly
  }, []);

  // Clear accumulated delta whenever paused state changes to prevent carrying over scroll debt
  useEffect(() => {
    accDeltaRef.current = 0;
  }, [options?.paused]);

  return { advance, setSceneIndex };
}


