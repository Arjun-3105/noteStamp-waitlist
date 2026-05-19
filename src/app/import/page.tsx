'use client';
import { useState, useCallback } from 'react';
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
  counterLabel: string; counterTarget: number;
  showForm?: boolean;
}[] = [
  {
    number: '001', shape: 'launchPad', color: '#88ccff',
    headline: 'WE LAUNCH\nIDEAS',
    sub: 'YouTube lectures. PDFs. Articles. Scattered notes. Your knowledge is ready on the launchpad — waiting for ignition.',
    counterLabel: 'ALTITUDE', counterTarget: 0,
  },
  {
    number: '002', shape: 'rocket', color: '#00e5ff',
    headline: 'IMPORT\nANYTHING',
    sub: 'One click. Notestamp ingests every source — video, PDF, URL, plain text — and structures it into a clean, AI-ready knowledge base.',
    counterLabel: 'ALTITUDE', counterTarget: 1500,
  },
  {
    number: '003', shape: 'sunCore', color: '#ffd700',
    headline: 'PURE\nPOWER',
    sub: 'AI processes your sources at full thrust. Notes generated. Flashcards crafted. Quizzes built. Your knowledge engine running hot.',
    counterLabel: 'VELOCITY', counterTarget: 39500,
  },
  {
    number: '004', shape: 'torusKnot', color: '#b84fff',
    headline: 'BREAK\nATMOSPHERE',
    sub: 'Your raw information, crystallized into pure intelligence. This is where ordinary studying ends and real mastery begins.',
    counterLabel: 'VELOCITY', counterTarget: 112000,
    showForm: true,
  },
];

export default function ImportPage() {
  const [scene, setScene] = useState(0);
  const onSceneChange = useCallback((idx: number) => setScene(idx), []);
  useScrollJack(SCENES.length, onSceneChange);
  const current = SCENES[scene];

  return (
    <main className="relative w-full h-screen overflow-hidden bg-[#030303]">
      <ParticleEngine shapeName={current.shape} color={current.color} />
      <Nav />

      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 font-mono text-[10px] tracking-[4px] uppercase text-white/25">
        Import Journey
      </div>

      {/* Scene dots */}
      <div className="fixed right-8 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-3">
        {SCENES.map((_, i) => (
          <button key={i} onClick={() => { setScene(i); onSceneChange(i); }}
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
          counterTarget={current.counterTarget}
          visible={true}
          key={scene}
        />
      ) : (
        <div className="fixed inset-0 z-20 flex flex-col justify-end pb-16 px-10 pointer-events-none">
          <div className="absolute top-24 left-10 font-mono text-xs tracking-[4px] text-white/30 uppercase">{current.number}</div>
          <div className="pointer-events-auto max-w-xl">
            <h2 className="font-bebas text-[clamp(48px,6vw,90px)] leading-none tracking-[4px] text-white mb-4 whitespace-pre-line">{current.headline}</h2>
            <p className="font-raleway text-sm text-white/50 mb-8 max-w-md leading-relaxed">{current.sub}</p>
            <WaitlistForm />
          </div>
        </div>
      )}

      {scene < SCENES.length - 1 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2 opacity-40">
          <div className="w-px h-10 bg-gradient-to-b from-white/60 to-transparent animate-pulse" />
          <span className="font-mono text-[9px] tracking-[3px] uppercase text-white/50">Scroll</span>
        </div>
      )}
    </main>
  );
}
