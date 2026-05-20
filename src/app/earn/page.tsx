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
    number: '001', shape: 'disc', color: '#ffd700',
    headline: 'YOU\nEARNED IT',
    sub: 'Every source you complete, every quiz you pass — Notestamp records it as a micro-badge. Proof of what you\'ve learned.',
    counterLabel: 'BADGES MINTED', counterTarget: 0,
  },
  {
    number: '002', shape: 'cube', color: '#ffd700',
    headline: 'BADGES STACK\nINTO SKILLS',
    sub: 'Five micro-badges on the same topic? You\'ve earned a Skill Badge. Your learning compounds into something real.',
    counterLabel: 'BADGES MINTED', counterTarget: 413,
  },
  {
    number: '003', shape: 'hubSeal', color: '#ffd700',
    headline: 'YOUR LEARNING\nPASSPORT',
    sub: 'Skill badges become your passport. A living proof of everything you\'ve mastered — verifiable by anyone, anywhere.',
    counterLabel: 'BADGES MINTED', counterTarget: 891,
  },
  {
    number: '004', shape: 'torusKnot', color: '#00e5ff',
    headline: 'STAMPED ON-CHAIN.\nFOREVER.',
    sub: 'Master credentials minted as NFTs on Polygon. Your proof of mastery — immutable, transferable, and verifiable by any employer.',
    counterLabel: 'BADGES MINTED', counterTarget: 1247,
    showForm: true,
  },
];


export default function EarnPage() {
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
        Earn Journey
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

      {/* Overlay — content differs for form vs regular scenes */}
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
          {/* Scene number */}
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

      {/* Scroll hint */}
      {scene < SCENES.length - 1 && (
        <div className="fixed bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2 opacity-40">
          <div className="w-px h-8 sm:h-10 bg-gradient-to-b from-white/60 to-transparent animate-pulse" />
          <span className="font-mono text-[8px] sm:text-[9px] tracking-[3px] uppercase text-white/50">Scroll</span>
        </div>
      )}
    </main>
  );
}
