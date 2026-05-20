'use client';
import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Nav from '@/components/Nav';
import SceneOverlay from '@/components/SceneOverlay';
import JourneyLoader from '@/components/JourneyLoader';
import WaitlistForm from '@/components/WaitlistForm';
import { useScrollJack } from '@/lib/useScrollJack';
import { ShapeName } from '@/lib/particles/shapes';

const ParticleEngine = dynamic(() => import('@/components/ParticleEngine'), { ssr: false });

const SCENES: {
  number: string; headline: string; sub: string;
  shape: ShapeName; color: string;
  counterLabel: string; counterTarget: number;
  showForm?: boolean;
}[] = [
  {
    number: '001', shape: 'seed', color: '#ffd700',
    headline: 'EVERY IDEA\nSTARTS AS A NOTE',
    sub: 'Paste a source. Notestamp reads it and writes your first note automatically. Your seed of understanding, planted.',
    counterLabel: 'MASTERY', counterTarget: 0,
  },
  {
    number: '002', shape: 'sapling', color: '#00ff88',
    headline: 'AI BUILDS\nYOUR STUDY SET',
    sub: 'Flashcards generated. Quizzes crafted. In seconds, not hours. Your AI tutor already knows what you need to learn.',
    counterLabel: 'MASTERY', counterTarget: 40,
  },
  {
    number: '003', shape: 'tree', color: '#00ff88',
    headline: 'UNDERSTANDING\nTAKES SHAPE',
    sub: 'The more you quiz yourself, the stronger the connections. Your AI Feynman tutor fills the gaps in real time.',
    counterLabel: 'MASTERY', counterTarget: 80,
  },
  {
    number: '004', shape: 'forest', color: '#ffd700',
    headline: 'TOTAL\nMASTERY',
    sub: 'Earn a micro-badge for every source you complete. Stack them into skill badges. Stack those into master credentials.',
    counterLabel: 'MASTERY', counterTarget: 99,
    showForm: true,
  },
];

export default function LearnPage() {
  const [scene, setScene] = useState(0);
  const [particlesReady, setParticlesReady] = useState(false);

  const onSceneChange = useCallback((idx: number) => {
    setScene(idx);
    setParticlesReady(false);
  }, []);

  const onReady = useCallback(() => setParticlesReady(true), []);

  useScrollJack(SCENES.length, onSceneChange);
  const current = SCENES[scene];

  return (
    <main className="relative w-full h-screen overflow-hidden bg-[#030303]">
      <ParticleEngine shapeName={current.shape} color={current.color} onReady={onReady} />
      <Nav />

      {/* Persistent journey loader — never remounts, animates across whole sequence */}
      <JourneyLoader sceneIndex={scene} totalScenes={SCENES.length} color={current.color} />

      {/* Journey label */}
      <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 font-mono text-[9px] sm:text-[10px] tracking-[4px] uppercase text-white/25 pointer-events-none">
        Learn Journey
      </div>

      {/* Scene dot navigation */}
      <div className="fixed right-4 sm:right-8 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-3">
        {SCENES.map((_, i) => (
          <button
            key={i}
            onClick={() => onSceneChange(i)}
            aria-label={`Scene ${i + 1}`}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              i === scene ? 'bg-yellow-400 scale-150' : 'bg-white/25 hover:bg-white/50'
            }`}
          />
        ))}
      </div>

      {!current.showForm ? (
        <SceneOverlay
          key={scene}
          sceneNumber={current.number}
          headline={current.headline}
          sub={current.sub}
          counterLabel={current.counterLabel}
          counterTarget={current.counterTarget}
          color={current.color}
          visible
          particlesReady={particlesReady}
        />
      ) : (
        <div
          className="fixed inset-0 z-40 flex flex-col justify-end
                     pb-10 sm:pb-16 px-5 sm:px-10 pointer-events-none"
        >
          <div
            className="absolute top-[88px] sm:top-24 left-5 sm:left-10
                       font-mono text-[10px] sm:text-xs tracking-[4px] text-white/30 uppercase
                       transition-all duration-700"
            style={{
              opacity: particlesReady ? 1 : 0,
              transform: particlesReady ? 'translateY(0)' : 'translateY(-8px)',
            }}
          >
            {current.number}
          </div>

          <div
            className="pointer-events-auto max-w-xl w-full transition-all duration-700"
            style={{
              opacity: particlesReady ? 1 : 0,
              transform: particlesReady ? 'translateY(0)' : 'translateY(22px)',
            }}
          >
            <h2
              className="font-bebas leading-none tracking-[3px] sm:tracking-[4px] text-white
                         mb-3 sm:mb-4 whitespace-pre-line
                         text-[clamp(36px,9vw,90px)] sm:text-[clamp(48px,6vw,90px)]"
              style={{ textShadow: '0 0 80px rgba(0,0,0,0.95), 0 2px 40px rgba(0,0,0,0.8)' }}
            >
              {current.headline}
            </h2>
            <p
              className="font-raleway text-xs sm:text-sm text-white/55 mb-6 sm:mb-8
                         max-w-[min(100%,28rem)] leading-relaxed"
              style={{ textShadow: '0 2px 24px rgba(0,0,0,0.9)' }}
            >
              {current.sub}
            </p>
            <WaitlistForm />
          </div>
        </div>
      )}

      {scene < SCENES.length - 1 && (
        <div className="fixed bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2 opacity-40">
          <div className="w-px h-8 sm:h-10 bg-gradient-to-b from-white/60 to-transparent animate-pulse" />
          <span className="font-mono text-[8px] sm:text-[9px] tracking-[3px] uppercase text-white/50">Scroll</span>
        </div>
      )}
    </main>
  );
}
