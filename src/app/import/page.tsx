'use client';
import { useState, useCallback, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Nav from '@/components/Nav';
import SceneOverlay from '@/components/SceneOverlay';
import WaitlistForm from '@/components/WaitlistForm';
import { useScrollJack } from '@/lib/useScrollJack';
import { ShapeName } from '@/lib/particles/shapes';

const ParticleEngine = dynamic(() => import('@/components/ParticleEngine'), { ssr: false });

const SCENES: {
  number: string; headline: string; sub: string;
  shape: ShapeName; color: string;
  counterLabel: string;
  counterStart: number; counterTarget: number;
  counterDuration: number;
  showForm?: boolean;
}[] = [
  {
    number: '001', shape: 'launchPad', color: '#88ccff',
    headline: 'DROP\nANYTHING',
    sub: 'YouTube videos. PDFs. Articles. Paste a link or upload a file — Notestamp accepts every format your learning comes in.',
    counterLabel: 'SOURCES LOADED',
    counterStart: 0, counterTarget: 0, counterDuration: 1000,
  },
  {
    number: '002', shape: 'rocket', color: '#00e5ff',
    headline: 'AI TAKES\nOFF',
    sub: 'Scroll to launch. Notestamp\'s AI reads, understands and extracts every concept from your source — nothing gets left on the pad.',
    counterLabel: 'ALTITUDE (m)',
    counterStart: 0, counterTarget: 12000, counterDuration: 8000,
  },
  {
    number: '003', shape: 'globe', color: '#00c8ff',
    headline: 'NOTES +\nFLASHCARDS',
    sub: 'Smart notes. Spaced-repetition flashcards. Feynman-style quizzes. Everything built automatically from your source in seconds.',
    counterLabel: 'VELOCITY (km/s)',
    counterStart: 8, counterTarget: 28, counterDuration: 5000,
  },
  {
    number: '004', shape: 'planet', color: '#b84fff',
    headline: 'REACH\nMASTERY',
    sub: 'Track your progress, earn skill badges and prove what you know. This is where passive consumption ends and real understanding begins.',
    counterLabel: '',
    counterStart: 0, counterTarget: 0, counterDuration: 1000,
    showForm: true,
  },
];

export default function ImportPage() {
  const [scene, setScene] = useState(0);
  const [rocketAltitude, setRocketAltitude] = useState(0);
  
  // Previous altitude reference for SceneOverlay smooth transition
  const prevAltitudeRef = useRef(0);
  const prevSceneRef = useRef(0);

  const onSceneChange = useCallback((idx: number) => {
    const prev = prevSceneRef.current;
    prevSceneRef.current = idx;
    
    setScene(idx);
    
    if (idx === 1) {
      if (prev === 2) {
        // Scrolling backward from Notes + Flashcards (Scene 2)
        setRocketAltitude(11999);
      } else {
        // Scrolling forward from launchpad stand
        setRocketAltitude(0);
      }
    } else {
      // Clear rocket altitude if we navigate away to other scenes
      setRocketAltitude(0);
      prevAltitudeRef.current = 0;
    }
  }, []);

  // Intercept scroll wheel events when in Rocket Launch scene (scene === 1)
  const isRocketScene = scene === 1;
  const isRocketCompleted = rocketAltitude >= 12000;

  const setSceneIndexRef = useRef<(index: number) => void>(() => {});

  // High-fidelity manual flight controller: direct tactile connection to the scroll wheel
  const handleScrollProgress = useCallback((deltaY: number) => {
    if (deltaY > 0) {
      setRocketAltitude((prev) => {
        if (prev >= 12000) {
          // Already at max altitude — advance to Notes + Flashcards on user scroll command!
          setScene(2);
          setSceneIndexRef.current(2);
          return 12000;
        }
        // Multiply deltaY so it takes ~3-4 solid scrolls to launch completely
        return Math.min(prev + Math.round(deltaY * 35.0), 12000);
      });
    } else if (deltaY < 0) {
      setRocketAltitude((prev) => {
        if (prev === 0) {
          setScene(0);
          setSceneIndexRef.current(0);
          return 0;
        }
        return Math.max(prev + Math.round(deltaY * 35.0), 0);
      });
    }
  }, []);

  const { setSceneIndex } = useScrollJack(
    SCENES.length, 
    onSceneChange,
    {
      paused: isRocketScene && !isRocketCompleted,
      onScrollProgress: handleScrollProgress
    }
  );

  useEffect(() => {
    setSceneIndexRef.current = setSceneIndex;
  }, [setSceneIndex]);

  // Manual press interaction to launch the rocket smoothly
  const handleManualPress = () => {
    if (isRocketScene && !isRocketCompleted) {
      handleScrollProgress(150); // Simulate scroll down
    }
  };

  const current = SCENES[scene];

  // Capture previous altitude to feed into SceneOverlay counterStart
  useEffect(() => {
    if (scene === 1) {
      prevAltitudeRef.current = rocketAltitude;
    }
  }, [rocketAltitude, scene]);

  return (
    <main 
      className="relative w-full h-screen overflow-hidden bg-[#030303] select-none cursor-pointer"
      onClick={handleManualPress}
    >
      <ParticleEngine 
        shapeName={current.shape} 
        color={current.color} 
        // Feed 0.0 to 1.0 throttle based on user scrolled altitude
        launchProgress={scene === 1 ? rocketAltitude / 12000 : 0}
      />
      <Nav />

      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 font-mono text-[10px] tracking-[4px] uppercase text-white/25">
        Import Journey
      </div>

      {/* Interactive HUD helper label during launch */}
      {isRocketScene && !isRocketCompleted && (
        <div className="fixed top-24 right-10 z-50 font-mono text-[9px] tracking-[3px] text-cyan-400 uppercase animate-pulse">
          [ SCROLL DOWN / CLICK TO IGNITE ]
        </div>
      )}

      {/* Scene dots */}
      <div className="fixed right-8 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-3">
        {SCENES.map((_, i) => (
          <button key={i} onClick={() => { setScene(i); onSceneChange(i); setSceneIndex(i); }}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${i === scene ? 'bg-cyan-400 scale-150' : 'bg-white/25 hover:bg-white/50'}`}
          />
        ))}
      </div>

      {!current.showForm ? (
        <SceneOverlay
          sceneNumber={current.number}
          headline={current.headline}
          sub={current.sub}
          counterLabel={current.counterLabel}
          // Ticks up exactly where it was scrolled
          counterStart={scene === 1 ? prevAltitudeRef.current : current.counterStart}
          counterTarget={scene === 1 ? rocketAltitude : current.counterTarget}
          counterDuration={scene === 1 ? 250 : current.counterDuration}
          color={current.color}
          visible={true}
          key={scene + (scene === 1 ? '_interactive' : '')}
        />
      ) : (
        <>
          {current.counterLabel && (
            <SceneOverlay
              sceneNumber={current.number}
              headline=""
              sub=""
              counterLabel={current.counterLabel}
              counterStart={current.counterStart}
              counterTarget={current.counterTarget}
              counterDuration={current.counterDuration}
              color={current.color}
              visible={true}
              key={scene}
            />
          )}
          <div className="fixed inset-0 z-20 flex flex-col justify-end pb-16 px-10 pointer-events-none">
            <div className="absolute top-24 left-10 font-mono text-xs tracking-[4px] text-white/30 uppercase">{current.number}</div>
            <div className="pointer-events-auto max-w-xl">
              <h2 className="font-bebas text-[clamp(48px,6vw,90px)] leading-none tracking-[4px] text-white mb-4 whitespace-pre-line">{current.headline}</h2>
              <p className="font-raleway text-sm text-white/50 mb-8 max-w-md leading-relaxed">{current.sub}</p>
              <WaitlistForm />
            </div>
          </div>
        </>
      )}

      {scene < SCENES.length - 1 && (!isRocketScene || isRocketCompleted) && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2 opacity-40">
          <div className="w-px h-10 bg-gradient-to-b from-white/60 to-transparent animate-pulse" />
          <span className="font-mono text-[9px] tracking-[3px] uppercase text-white/50">Scroll</span>
        </div>
      )}
    </main>
  );
}
