'use client';
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import * as THREE from 'three';
import Nav from '@/components/Nav';
import { spacePlane, starfield, arch, MAX_PARTICLES } from '@/lib/particles/shapes';

// ── Portal definitions ────────────────────────────────────────────────────────
const PORTAL_DEFS = [
  {
    id: 'import', route: '/import',
    label: 'IMPORT', sub: 'Bring your sources in',
    hex: '#00e5ff', threeColor: 0x00e5ff,
    pos: new THREE.Vector3(-12.0, 0.0, -8.0),
    rot: new THREE.Euler(0.0, 0.2, 0.0),
    arcAngle: Math.PI * 1.15, arcR: 2.6, tubeR: 0.14, n: 1100,
  },
  {
    id: 'learn', route: '/learn',
    label: 'LEARN', sub: 'AI builds your mastery',
    hex: '#00ff88', threeColor: 0x00ff88,
    pos: new THREE.Vector3(12.0, 0.0, -8.0),
    rot: new THREE.Euler(0.0, -0.2, 0.0),
    arcAngle: Math.PI * 1.1, arcR: 2.6, tubeR: 0.14, n: 1050,
  },
  {
    id: 'earn', route: '/earn',
    label: 'EARN', sub: 'Prove it on-chain',
    hex: '#ffd700', threeColor: 0xffd700,
    pos: new THREE.Vector3(0.0, 5.0, -12.0),
    rot: new THREE.Euler(-0.15, 0.0, 0.0),
    arcAngle: Math.PI * 1.2, arcR: 2.8, tubeR: 0.14, n: 1300,
  },
] as const;

type PortalId = typeof PORTAL_DEFS[number]['id'];

// ── Helper ────────────────────────────────────────────────────────────────────
function makePoints(pos: Float32Array, color: number, size: number) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({
    color, size, transparent: true, opacity: 0.9,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  return new THREE.Points(geo, mat);
}

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }
function easeOut3(t: number) { return 1 - Math.pow(1 - t, 3); }
function easeIn3(t: number) { return t * t * t; }

// ── Hub Canvas ────────────────────────────────────────────────────────────────
function HubCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hoveredRef = useRef<PortalId | null>(null);
  const flyingRef = useRef<PortalId | null>(null);
  const flyStartRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // ── Renderer ──
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(80, window.innerWidth / window.innerHeight, 0.1, 400);
    camera.position.set(0, 1.0, 12);
    camera.lookAt(0, 0, 0);

    // ── Starfield ──
    const starPts = makePoints(starfield(5000), 0x8ec8f0, 0.06);
    scene.add(starPts);

    // ── Plane ──
    const planePos = spacePlane();
    const planeGeo = new THREE.BufferGeometry();
    planeGeo.setAttribute('position', new THREE.BufferAttribute(planePos.slice(), 3));
    const planeMat = new THREE.PointsMaterial({
      color: 0xffffff, size: 0.048, transparent: true, opacity: 0.92,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const planeMesh = new THREE.Points(planeGeo, planeMat);
    planeMesh.rotation.y = Math.PI;
    scene.add(planeMesh);

    // ── Intro scatter ──
    const scattered = new Float32Array(MAX_PARTICLES * 3);
    for (let i = 0; i < MAX_PARTICLES; i++) {
      scattered[i * 3]     = (Math.random() - 0.5) * 24;
      scattered[i * 3 + 1] = (Math.random() - 0.5) * 14;
      scattered[i * 3 + 2] = (Math.random() - 0.5) * 18;
    }
    const planePosArr = planeGeo.attributes.position.array as Float32Array;
    for (let i = 0; i < planePosArr.length; i++) planePosArr[i] = scattered[i];
    planeGeo.attributes.position.needsUpdate = true;
    let introP = 0;
    const introStart = performance.now() + 300;
    const introDur = 2400;

    // ── Portals ──
    const portalMeshes: Record<string, THREE.Points> = {};
    for (const pd of PORTAL_DEFS) {
      const pts = makePoints(arch(pd.arcAngle, pd.arcR, pd.tubeR, pd.n), pd.threeColor, 0.058);
      pts.position.copy(pd.pos);
      pts.rotation.copy(pd.rot);
      scene.add(pts);
      portalMeshes[pd.id] = pts;
    }

    // ── State ──
    let mouseX = 0, mouseY = 0, tMouseX = 0, tMouseY = 0;
    let time = 0;
    let animId = 0;

    const planePosWorld = new THREE.Vector3(0, 0, 0);
    const cameraStartPos = camera.position.clone();
    const cameraStartFov = camera.fov;

    function animate() {
      animId = requestAnimationFrame(animate);
      time += 0.007;
      tMouseX += (mouseX - tMouseX) * 0.03;
      tMouseY += (mouseY - tMouseY) * 0.03;

      // ── Intro morph ──
      if (introP < 1) {
        const el = performance.now() - introStart;
        if (el > 0) {
          introP = Math.min(el / introDur, 1);
          const ep = easeOut3(introP);
          for (let i = 0; i < planePosArr.length; i++)
            planePosArr[i] = scattered[i] + (planePos[i] - scattered[i]) * ep;
          planeGeo.attributes.position.needsUpdate = true;
        }
      }

      // ── Portal glow pulse ──
      for (const pd of PORTAL_DEFS) {
        const m = portalMeshes[pd.id];
        const mat = m.material as THREE.PointsMaterial;
        const isHovered = hoveredRef.current === pd.id;
        const targetOpacity = isHovered ? 1.0 : 0.7 + Math.sin(time * 1.8 + PORTAL_DEFS.indexOf(pd)) * 0.12;
        const targetSize = isHovered ? 0.075 : 0.058;
        mat.opacity = lerp(mat.opacity, targetOpacity, 0.08);
        mat.size = lerp(mat.size, targetSize, 0.08);
        m.rotation.z += 0.003;
      }

      // ── Plane idle movement ──
      const flying = flyingRef.current;
      if (!flying) {
        const hov = hoveredRef.current;
        const targetPortal = hov ? PORTAL_DEFS.find(p => p.id === hov) : null;

        let targetRY = Math.PI + tMouseX * 0.18;
        let targetRX = tMouseY * -0.10;
        let targetRZ = -tMouseX * 0.06;

        let targetPX = Math.sin(time * 0.38) * 0.08;
        let targetPY = Math.sin(time * 0.6) * 0.18;
        let targetPZ = 0;

        if (targetPortal) {
          const diff = targetPortal.pos.clone().sub(planePosWorld);
          const angle = Math.atan2(-diff.x, -diff.z);
          targetRY = Math.PI + clamp(angle * 0.55, -0.5, 0.5);
          targetRX = clamp(diff.y * 0.12, -0.35, 0.35);
          targetRZ = -angle * 0.08;

          targetPX += targetPortal.pos.x * 0.15;
          targetPY += targetPortal.pos.y * 0.15;
          targetPZ += targetPortal.pos.z * 0.15;
        }

        planeMesh.rotation.y = lerp(planeMesh.rotation.y, targetRY, 0.04);
        planeMesh.rotation.x = lerp(planeMesh.rotation.x, targetRX, 0.04);
        planeMesh.rotation.z = lerp(planeMesh.rotation.z, targetRZ, 0.04);

        planeMesh.position.x = lerp(planeMesh.position.x, targetPX, 0.03);
        planeMesh.position.y = lerp(planeMesh.position.y, targetPY, 0.03);
        planeMesh.position.z = lerp(planeMesh.position.z, targetPZ, 0.03);

        camera.position.x = lerp(camera.position.x, tMouseX * 0.5, 0.04);
        camera.position.y = lerp(camera.position.y, 1.2 - tMouseY * 0.3, 0.04);
        camera.lookAt(0, 0.2, 0);
      } else {
        const pd = PORTAL_DEFS.find(p => p.id === flying)!;
        const elapsed = performance.now() - flyStartRef.current;
        const dur = 1100;
        const t = clamp(elapsed / dur, 0, 1);
        const tp = easeIn3(t);

        planeMesh.position.x = lerp(planeMesh.position.x, pd.pos.x * 0.75, tp);
        planeMesh.position.y = lerp(planeMesh.position.y, pd.pos.y * 0.75, tp);
        planeMesh.position.z = lerp(planeMesh.position.z, pd.pos.z * 0.65, tp);
        planeMesh.scale.setScalar(lerp(1, 0.35, tp));

        camera.position.z = lerp(cameraStartPos.z, 2.0, tp);
        camera.fov = lerp(cameraStartFov, 120, tp);
        camera.updateProjectionMatrix();
        camera.lookAt(pd.pos.x * 0.3, pd.pos.y * 0.3, 0);
      }

      // ── Stars rush forward ──
      const starPosAttr = starPts.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < MAX_PARTICLES; i++) {
        starPosAttr[i * 3 + 2] += 0.08;
        if (starPosAttr[i * 3 + 2] > 12) {
          starPosAttr[i * 3 + 2] = -40;
          starPosAttr[i * 3]     = (Math.random() - 0.5) * 80;
          starPosAttr[i * 3 + 1] = (Math.random() - 0.5) * 60;
        }
      }
      starPts.geometry.attributes.position.needsUpdate = true;
      starPts.rotation.y += 0.00006;

      renderer.render(scene, camera);
    }
    animate();

    const onMouse = (e: MouseEvent) => {
      mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
      mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    const handleFly = (e: CustomEvent<PortalId>) => {
      if (flyingRef.current) return;
      flyingRef.current = e.detail;
      flyStartRef.current = performance.now();
    };
    const handleHover = (e: CustomEvent<PortalId | null>) => {
      hoveredRef.current = e.detail;
    };

    window.addEventListener('mousemove', onMouse);
    window.addEventListener('resize', onResize);
    window.addEventListener('notestamp:fly',   handleFly   as EventListener);
    window.addEventListener('notestamp:hover', handleHover as EventListener);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('mousemove', onMouse);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('notestamp:fly',   handleFly   as EventListener);
      window.removeEventListener('notestamp:hover', handleHover as EventListener);
      renderer.dispose();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full"
      style={{ zIndex: 0 }}
    />
  );
}

// ── Main Hub Page ─────────────────────────────────────────────────────────────
export default function HubPage() {
  const router = useRouter();
  const [hovered, setHovered] = useState<PortalId | null>(null);
  const [flying, setFlying] = useState<PortalId | null>(null);
  const [flash, setFlash] = useState(false);

  const handlePortalClick = useCallback((id: PortalId) => {
    if (flying) return;
    setFlying(id);
    window.dispatchEvent(new CustomEvent('notestamp:fly', { detail: id }));
    setTimeout(() => setFlash(true), 800);
    setTimeout(() => {
      const pd = PORTAL_DEFS.find(p => p.id === id)!;
      router.push(pd.route);
    }, 1200);
  }, [flying, router]);

  const handlePortalHover = useCallback((id: PortalId | null) => {
    setHovered(id);
    window.dispatchEvent(new CustomEvent('notestamp:hover', { detail: id }));
  }, []);

  return (
    <main className="relative w-full h-screen overflow-hidden bg-[#030303]">
      <HubCanvas />
      <Nav hideContact />

      {/* ── Portal labels ─────────────────────────────────────────────────── */}
      {/* Desktop: left/right/top. Mobile: stacked row at bottom 3rd of screen */}

      {/* IMPORT — left on desktop, part of bottom row on mobile */}
      <PortalLabel
        pd={PORTAL_DEFS[0]}
        isHov={hovered === 'import'}
        onHover={handlePortalHover}
        onClick={handlePortalClick}
        desktopStyle={{ position: 'fixed', left: '26%', top: '52%', transform: 'translateY(-50%)' }}
        mobileOrder={0}
      />

      {/* LEARN — right on desktop */}
      <PortalLabel
        pd={PORTAL_DEFS[1]}
        isHov={hovered === 'learn'}
        onHover={handlePortalHover}
        onClick={handlePortalClick}
        desktopStyle={{ position: 'fixed', right: '26%', top: '52%', transform: 'translateY(-50%)' }}
        mobileOrder={2}
      />

      {/* EARN — top center on desktop */}
      <PortalLabel
        pd={PORTAL_DEFS[2]}
        isHov={hovered === 'earn'}
        onHover={handlePortalHover}
        onClick={handlePortalClick}
        desktopStyle={{ position: 'fixed', left: '50%', top: '22%', transform: 'translateX(-50%)' }}
        mobileOrder={1}
      />

      {/* ── Bottom copy ── */}
      <div className="fixed bottom-10 sm:bottom-12 left-1/2 -translate-x-1/2 z-20 text-center pointer-events-none px-4">
        <h1 className="font-bebas text-[clamp(18px,4vw,48px)] tracking-[4px] sm:tracking-[6px] text-white mb-1 sm:mb-2 whitespace-nowrap">
          WE STAMP YOUR KNOWLEDGE!
        </h1>
        <p className="font-raleway text-[10px] sm:text-xs text-white/35 tracking-[2px] hidden sm:block">
          Click on the portals and dive in.
        </p>
      </div>

      {/* ── Explore hint — hidden on mobile ── */}
      <div className="hidden sm:flex fixed bottom-6 right-8 z-20 flex-col items-center gap-2 opacity-25 pointer-events-none">
        <div className="w-px h-10 bg-gradient-to-b from-white/60 to-transparent animate-pulse" />
        <span className="font-mono text-[9px] tracking-[3px] uppercase text-white/50">Explore</span>
      </div>

      {/* ── Warp flash overlay ── */}
      <div
        className="fixed inset-0 z-50 pointer-events-none transition-opacity duration-500"
        style={{
          background: 'radial-gradient(circle at center, white 0%, transparent 70%)',
          opacity: flash ? 1 : 0,
        }}
      />
    </main>
  );
}

// ── Shared portal label component with responsive layout ─────────────────────
function PortalLabel({
  pd, isHov, onHover, onClick, desktopStyle, mobileOrder,
}: {
  pd: typeof PORTAL_DEFS[number];
  isHov: boolean;
  onHover: (id: PortalId | null) => void;
  onClick: (id: PortalId) => void;
  desktopStyle: React.CSSProperties;
  mobileOrder: number;
}) {
  return (
    <>
      {/* Desktop layout — position matches 3D arch projection */}
      <button
        className="hidden sm:flex z-30 flex-col items-center gap-3 cursor-pointer transition-all duration-400"
        style={desktopStyle}
        onMouseEnter={() => onHover(pd.id)}
        onMouseLeave={() => onHover(null)}
        onClick={() => onClick(pd.id)}
      >
        {/* Pulsing dot */}
        <div
          className="rounded-full transition-all duration-300"
          style={{
            width:  isHov ? 10 : 6,
            height: isHov ? 10 : 6,
            background: pd.hex,
            boxShadow: isHov ? `0 0 18px 4px ${pd.hex}88` : `0 0 8px 2px ${pd.hex}44`,
            animation: 'pulse 2s ease-in-out infinite',
          }}
        />
        {/* Label */}
        <span
          className="font-bebas tracking-[5px] transition-all duration-300 select-none"
          style={{
            fontSize: 'clamp(20px, 2.2vw, 28px)',
            color: pd.hex,
            textShadow: isHov ? `0 0 20px ${pd.hex}66` : 'none',
            opacity: isHov ? 1 : 0,
            transform: isHov ? 'translateY(0)' : 'translateY(10px)',
          }}
        >
          {pd.label}
        </span>
        {/* Sub */}
        <span
          className="font-raleway text-[10px] tracking-[2px] uppercase transition-all duration-300 select-none"
          style={{
            color: `${pd.hex}bb`,
            opacity: isHov ? 1 : 0,
            transform: isHov ? 'translateY(0)' : 'translateY(10px)',
          }}
        >
          {pd.sub}
        </span>
        {/* Enter arrow */}
        {isHov && (
          <span
            className="font-mono text-[10px] tracking-[3px] animate-bounce select-none block mt-1"
            style={{ color: pd.hex }}
          >
            → enter
          </span>
        )}
      </button>

      {/* Mobile layout — fixed card in a horizontal row at mid-screen */}
      <button
        className="sm:hidden z-30 flex flex-col items-center gap-2 cursor-pointer active:scale-95 transition-transform"
        style={{
          position: 'fixed',
          // Distribute 3 portals evenly at 17%, 50%, 83% across width
          left: `${17 + mobileOrder * 33}%`,
          top: '58%',
          transform: 'translate(-50%, -50%)',
        }}
        onClick={() => onClick(pd.id)}
      >
        {/* Always-visible glowing dot on mobile */}
        <div
          className="rounded-full"
          style={{
            width: 8, height: 8,
            background: pd.hex,
            boxShadow: `0 0 10px 3px ${pd.hex}66`,
            animation: 'pulse 2s ease-in-out infinite',
          }}
        />
        {/* Always-visible label on mobile */}
        <span
          className="font-bebas tracking-[4px] select-none"
          style={{
            fontSize: 'clamp(16px, 5vw, 22px)',
            color: pd.hex,
            textShadow: `0 0 12px ${pd.hex}55`,
          }}
        >
          {pd.label}
        </span>
        <span
          className="font-raleway tracking-[1px] uppercase select-none text-center leading-tight"
          style={{
            fontSize: 'clamp(8px, 2.2vw, 10px)',
            color: `${pd.hex}99`,
            maxWidth: '80px',
          }}
        >
          {pd.sub}
        </span>
        {/* Tap hint */}
        <span
          className="font-mono tracking-[2px] uppercase select-none"
          style={{ fontSize: '8px', color: `${pd.hex}66`, marginTop: 2 }}
        >
          tap
        </span>
      </button>
    </>
  );
}
