'use client';
import { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { MAX_PARTICLES, SHAPES, ShapeName, starfield } from '@/lib/particles/shapes';

interface Props {
  shapeName: ShapeName;
  color: string;
  launchProgress?: number; // 0.0 to 1.0 based on scroll altitude
  onReady?: () => void;
}

const FLAME_START = 2000;

export default function ParticleEngine({ shapeName, color, launchProgress = 0, onReady }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Store shapeName and launchProgress in a ref to bypass stale closures inside requestAnimationFrame
  const activePropsRef = useRef({ shapeName, launchProgress });

  useEffect(() => {
    activePropsRef.current = { shapeName, launchProgress };
  }, [shapeName, launchProgress]);

  const stateRef = useRef<{
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    mainPoints: THREE.Points;
    starPoints: THREE.Points;
    animId: number;
    currentPositions: Float32Array;
    targetPositions: Float32Array;
    morphProgress: number;
    morphing: boolean;
    morphStartTime: number;
    mouseX: number;
    mouseY: number;
    targetMouseX: number;
    targetMouseY: number;
    time: number;
    activeShapeTime: number;
    smoothProgress:  number;        // gorgeous spring interpolation for fluid liftoff
    // Rocket swirl exhaust state
    flameVY:      Float32Array;   // downward velocity per particle
    flameAngle:   Float32Array;   // current angular position (radians)
    flameAngVel:  Float32Array;   // angular velocity — mix of CW and CCW for turbulence
    flameRadius:  Float32Array;   // base radius at nozzle
    // Cinematic camera glide state
    camPosX:      number;
    camPosY:      number;
    camPosZ:      number;
    lookAtX:      number;
    lookAtY:      number;
    lookAtZ:      number;
  } | null>(null);

  // Sync morphTo callback
  const morphTo = useCallback((newShape: ShapeName) => {
    const s = stateRef.current;
    if (!s) return;
    // Snapshot exact visual positions so the next morph starts seamlessly
    const posAttr = s.mainPoints.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < posAttr.length; i++) {
      s.currentPositions[i] = posAttr[i];
    }
    const result = SHAPES[newShape]();
    s.targetPositions = result instanceof Float32Array ? result : result.positions;
    s.morphProgress = 0;
    s.morphing = true;
    s.morphStartTime = performance.now();
    s.activeShapeTime = 0;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Renderer — use native device pixel ratio for crisp retina/high-DPI output
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 300);
    camera.position.set(0, 0, 8);

    // Main particle geometry
    const initRes = SHAPES[shapeName]();
    const initPositions = initRes instanceof Float32Array ? initRes : initRes.positions;
    const initColors = initRes instanceof Float32Array ? null : initRes.colors;

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(initPositions.slice(), 3));

    // Initialize custom vertex color attribute
    const colors = new Float32Array(MAX_PARTICLES * 3);
    const baseCol = new THREE.Color(color);
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const idx = i * 3;
      if (initColors) {
        colors[idx] = initColors[idx];
        colors[idx+1] = initColors[idx+1];
        colors[idx+2] = initColors[idx+2];
      } else if (shapeName === 'rocket' && i >= FLAME_START) {
        const rand = Math.random();
        if (rand < 0.45) {
          colors[idx] = 1.0; colors[idx+1] = 0.85; colors[idx+2] = 0.1; // Hot Yellow
        } else if (rand < 0.8) {
          colors[idx] = 1.0; colors[idx+1] = 0.4; colors[idx+2] = 0.0;  // Orange
        } else {
          colors[idx] = 0.9; colors[idx+1] = 0.08; colors[idx+2] = 0.02; // Deep Red
        }
      } else {
        colors[idx] = baseCol.r;
        colors[idx+1] = baseCol.g;
        colors[idx+2] = baseCol.b;
      }
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      vertexColors: true, // Enable vibrant, high-fidelity custom colors!
      size: 0.045,
      transparent: true,
      opacity: 0.88,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });
    const mainPoints = new THREE.Points(geo, mat);
    scene.add(mainPoints);

    // Starfield background
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starfield(5000), 3));
    const starPoints = new THREE.Points(starGeo, new THREE.PointsMaterial({
      color: 0x8ec8f0, size: 0.06, transparent: true, opacity: 0.55,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    scene.add(starPoints);

    // Dynamic swirling engine exhaust state
    const flameVY     = new Float32Array(MAX_PARTICLES);
    const flameAngle  = new Float32Array(MAX_PARTICLES);
    const flameAngVel = new Float32Array(MAX_PARTICLES);
    const flameRadius = new Float32Array(MAX_PARTICLES);

    for (let i = FLAME_START; i < MAX_PARTICLES; i++) {
      flameVY[i]     = 0.08 + Math.random() * 0.14;
      flameAngle[i]  = Math.random() * Math.PI * 2;
      flameAngVel[i] = (Math.random() < 0.5 ? 1 : -1) * (0.05 + Math.random() * 0.1);
      flameRadius[i] = 0.15 + Math.random() * 0.15;
    }

    stateRef.current = {
      renderer, scene, camera, mainPoints, starPoints,
      currentPositions: initPositions.slice(),
      targetPositions: initPositions.slice(),
      morphProgress: 1, morphing: false, morphStartTime: 0,
      mouseX: 0, mouseY: 0, targetMouseX: 0, targetMouseY: 0,
      animId: 0, time: 0, activeShapeTime: 0,
      smoothProgress: 0,
      flameVY, flameAngle, flameAngVel, flameRadius,
      camPosX: 0, camPosY: 0, camPosZ: 8,
      lookAtX: 0, lookAtY: 0, lookAtZ: 0,
    };

    // Scatter intro
    const scattered = new Float32Array(MAX_PARTICLES * 3);
    for (let i = 0; i < MAX_PARTICLES; i++) {
      scattered[i*3]   = (Math.random()-0.5)*22;
      scattered[i*3+1] = (Math.random()-0.5)*14;
      scattered[i*3+2] = (Math.random()-0.5)*16;
    }
    const posArr = geo.attributes.position.array as Float32Array;
    for (let i = 0; i < posArr.length; i++) posArr[i] = scattered[i];
    geo.attributes.position.needsUpdate = true;
    stateRef.current.currentPositions = scattered.slice();
    stateRef.current.targetPositions  = initPositions.slice();
    stateRef.current.morphProgress    = 0;
    stateRef.current.morphing         = true;
    stateRef.current.morphStartTime   = performance.now() + 300;

    const easeInOutCubic = (t: number) => t < 0.5 ? 4*t*t*t : 1-(-2*t+2)**3/2;

    // Helper to get custom camera settings for scrollytelling scenes
    const getCameraTargets = (shape: ShapeName) => {
      switch (shape) {
        // Earn journey
        case 'sunCore':
          return { cx: 0,   cy: 0,   cz: 6.5, lx: 0, ly: 0, lz: 0 };
        case 'disc':
          return { cx: 0,   cy: 0.3, cz: 5.5, lx: 0, ly: 0, lz: 0 }; // eye-level medal
        case 'cube':
          return { cx: 0.8, cy: 0.5, cz: 6.2, lx: 0, ly: 0, lz: 0 }; // 3/4 corner view
        case 'streams':
          return { cx: 0,   cy: 0,   cz: 9.5, lx: 0, ly: 0, lz: 0 }; // pull back to see all 6 streams
        case 'hubSeal':
          return { cx: 0.5, cy: 0.5, cz: 6.0, lx: 0, ly: 0, lz: 0 }; // slight high-angle
        case 'torusKnot':
          return { cx: 0,   cy: 0.3, cz: 5.8, lx: 0, ly: 0, lz: 0 }; // close & dramatic
        // Learn / Import journeys keep default camera
        case 'hexagon':
          return { cx: 0, cy: 0.3, cz: 4.6, lx: 0, ly: 0, lz: 0 };
        case 'hexChain':
          return { cx: 0, cy: 0, cz: 7.8, lx: 0, ly: 0, lz: 0 };
        case 'seal':
          return { cx: 1.4, cy: 1.2, cz: 5.2, lx: 0, ly: 0, lz: 0 };
        case 'diamond':
          return { cx: 0, cy: 0, cz: 4.2, lx: 0, ly: 0, lz: 0 };
        default:
          return { cx: 0, cy: 0, cz: 8, lx: 0, ly: 0, lz: 0 };
      }
    };

    // sunCore original radii tracking
    const sunBaseR = new Float32Array(MAX_PARTICLES);
    let sunBaseReady = false;

    // ── Render loop ───────────────────────────────────────────────────────────
    function animate() {
      const s = stateRef.current;
      if (!s) return;
      s.animId = requestAnimationFrame(animate);
      s.time += 0.008;
      s.activeShapeTime += 0.016;

      s.targetMouseX += (s.mouseX - s.targetMouseX) * 0.035;
      s.targetMouseY += (s.mouseY - s.targetMouseY) * 0.035;

      const posAttr = s.mainPoints.geometry.attributes.position.array as Float32Array;

      // Read live prop values from the ref to bypass stale closures
      const { shapeName: currentShape, launchProgress: progress } = activePropsRef.current;

      // ── Morphing ────────────────────────────────────────────────────────
      if (s.morphing) {
        const elapsed = performance.now() - s.morphStartTime;
        if (elapsed >= 0) {
          s.morphProgress = Math.min(elapsed / 1400, 1);
          const ep = easeInOutCubic(s.morphProgress);
          for (let i = 0; i < posAttr.length; i++) {
            posAttr[i] = s.currentPositions[i] + (s.targetPositions[i] - s.currentPositions[i]) * ep;
          }
          s.mainPoints.geometry.attributes.position.needsUpdate = true;
          if (s.morphProgress >= 1) {
            s.morphing = false;
            for (let i = 0; i < s.currentPositions.length; i++)
              s.currentPositions[i] = s.targetPositions[i];
            sunBaseReady = false;
            onReady?.();
          }
        }
      }

      // ╔═══════════════════════════════════════════════════════════════════╗
      // ║  ROCKET — fully scroll-interactive liftoff + swirling gas cyclone ║
      // ╚═══════════════════════════════════════════════════════════════════╝
      let ascentY = 0, jitterX = 0, jitterY = 0;

      if (currentShape === 'rocket') {
        const nozzleY = -2.2;
        // Flame becomes active immediately during morph to show early ignition!
        const flameActive = s.morphProgress > 0.05 || !s.morphing;

        // Smoothly interpolate progress towards target (tighter spring for manual control)
        s.smoothProgress += (progress - s.smoothProgress) * 0.12;
        const sp = s.smoothProgress;

        // Base gas throttle starts at 0.68 on the stand so you see active cyclone, rises to 1.25 under full scroll thrust
        const activeThrottle = 0.68 + sp * 0.57;

        if (flameActive) {
          for (let i = FLAME_START; i < MAX_PARTICLES; i++) {
            const idx = i * 3;

            // 1. Move downward based on dynamic engine speed throttle
            posAttr[idx + 1] -= s.flameVY[i] * activeThrottle;

            // 2. Rotate swirling angle (yellow rotating cyclone motion)
            //    Angular velocity scales up with scroll progress!
            s.flameAngle[i] += s.flameAngVel[i] * (0.85 + sp * 2.15);

            const distBelow = Math.max(0, nozzleY - posAttr[idx + 1]);

            // 3. Volumetric cyclone swirl formula:
            //    Adding distBelow * 0.85 generates a beautiful twisted spiral vortex cloud underneath!
            const cycloneAngle = s.flameAngle[i] + distBelow * 0.85;

            // Sudden ignition gas burst inflow on the very first scroll (sp between 0 and 0.12)
            // This spikes a massive radial expansion, then sucks back in.
            const burstMultiplier = (sp > 0.001 && sp < 0.15) ? Math.sin((sp / 0.15) * Math.PI) * 3.5 : 0;

            // 4. Cone-like gas cloud expansion
            const breathe = 1.0 + Math.sin(s.time * 4 + i * 0.45) * 0.16;
            const coneRadius = s.flameRadius[i] + distBelow * (0.35 + sp * 0.65) * breathe + burstMultiplier;

            posAttr[idx]     = coneRadius * Math.cos(cycloneAngle);
            posAttr[idx + 2] = coneRadius * Math.sin(cycloneAngle);

            // 5. Turbulent noise (amplified during the burst!)
            const noise = 0.05 + burstMultiplier * 0.08;
            posAttr[idx]     += (Math.random() - 0.5) * noise;
            posAttr[idx + 2] += (Math.random() - 0.5) * noise;

            // 6. Recycle exhaust particles
            if (posAttr[idx + 1] < nozzleY - 4.5) {
              posAttr[idx + 1] = nozzleY + Math.random() * 0.2;
              s.flameRadius[i] = 0.14 + Math.random() * 0.15;
              s.flameAngle[i]  = Math.random() * Math.PI * 2;
              s.flameVY[i]     = 0.08 + Math.random() * 0.14;
            }
          }
          s.mainPoints.geometry.attributes.position.needsUpdate = true;
        }

        // The rocket stays physically parked on the pad for the first 15% of the scroll (ignition phase!)
        // Once sp > 0.15, the clamp releases and it majestically lifts off.
        const liftOffSp = Math.max(0, sp - 0.15) / 0.85;
        ascentY = liftOffSp * 0.8;

        // Violent structural rumble during the ignition burst while still clamped to the stand!
        const ignitionRumble = (sp > 0.001 && sp < 0.15) ? Math.sin((sp / 0.15) * Math.PI) * 0.14 : 0;
        const idleShake = sp < 0.05 ? 0.024 : 0;
        const shakeAmt = Math.max(0, 0.045 - sp * 0.04) + idleShake + ignitionRumble;
        jitterX = (Math.random() - 0.5) * shakeAmt;
        jitterY = (Math.random() - 0.5) * shakeAmt * 0.6;

        // Parallax and updates
        s.mainPoints.rotation.y = Math.sin(s.time * 0.2) * 0.04 + s.targetMouseX * 0.12;
        s.mainPoints.rotation.x = s.targetMouseY * -0.05;
        s.mainPoints.position.y = ascentY + jitterY;
        s.mainPoints.position.x = jitterX;
      }

      // ╔═══════════════════════════════════════════════════════════════════╗
      // ║  SUN CORE (PURE POWER) — nuclear boiling, flares + orbital spin  ║
      // ╚═══════════════════════════════════════════════════════════════════╝
      else if (currentShape === 'sunCore') {
        const t = s.time;
        const mat2 = s.mainPoints.material as THREE.PointsMaterial;

        // Sample base radii once morph completes
        if (!sunBaseReady && !s.morphing) {
          for (let i = 0; i < MAX_PARTICLES; i++) {
            const idx = i * 3;
            const x = posAttr[idx], y = posAttr[idx+1], z = posAttr[idx+2];
            sunBaseR[i] = Math.sqrt(x*x + y*y + z*z);
          }
          sunBaseReady = true;
        }

        // Fast dramatic core spin
        s.mainPoints.rotation.y += 0.026;
        s.mainPoints.rotation.z  = Math.sin(t * 1.1) * 0.15;

        // Oblate/prolate axis breathing pulsing
        const breathPhase = Math.sin(t * 2.2);
        s.mainPoints.scale.set(
          1.0 + breathPhase * 0.12,
          1.0 - breathPhase * 0.10,
          1.0 + breathPhase * 0.12
        );

        // Intense plasma core flickering
        mat2.opacity = 0.68 + Math.abs(Math.sin(t * 3.4)) * 0.32;
        mat2.size = 0.045 + Math.abs(Math.sin(t * 4.2)) * 0.015; // material size flares!

        if (sunBaseReady) {
          for (let i = 0; i < MAX_PARTICLES; i++) {
            const br = sunBaseR[i];
            if (br < 0.4) continue; // skip zero-padding
            const idx = i * 3;
            const x = posAttr[idx], y = posAttr[idx+1], z = posAttr[idx+2];
            const r = Math.sqrt(x*x + y*y + z*z) || 0.0001;

            // 1. Kinetic boiling: high-frequency noise displacement on all body particles
            const boilX = Math.sin(t * 18 + i * 0.22) * 0.055;
            const boilY = Math.cos(t * 18 + i * 0.22) * 0.055;
            const boilZ = Math.sin(t * 14 + i * 0.35) * 0.055;

            // 2. Plasma corona bursts on outer edge particles
            let coronaScale = 1.0;
            if (br > 1.2) {
              coronaScale = 1.0 + Math.sin(t * 8.5 + i * 0.1) * 0.16;
            }

            posAttr[idx]   = (x / r) * br * coronaScale + boilX;
            posAttr[idx+1] = (y / r) * br * coronaScale + boilY;
            posAttr[idx+2] = (z / r) * br * coronaScale + boilZ;
          }
          s.mainPoints.geometry.attributes.position.needsUpdate = true;
        }

        s.mainPoints.rotation.x = Math.sin(t * 0.22) * 0.06 - s.targetMouseY * 0.10;
        s.mainPoints.position.x = s.targetMouseX * 0.3;
        s.mainPoints.position.y = -s.targetMouseY * 0.2 + Math.sin(t * 0.45) * 0.1;
      }

      // ╔═══════════════════════════════════════════════════════════════════╗
      // ║  GLOBE (UPPER ATMOSPHERE) — fast spin + ionosphere aurora shimmer  ║
      // ╚═══════════════════════════════════════════════════════════════════╝
      else if (currentShape === 'globe') {
        const t = s.time;
        const matG = s.mainPoints.material as THREE.PointsMaterial;

        // Fast axial spin — you're moving at orbital velocity!
        s.mainPoints.rotation.y += 0.018;
        // Slight wobble on other axes for realism
        s.mainPoints.rotation.x = Math.sin(t * 0.6) * 0.08 - s.targetMouseY * 0.08;
        s.mainPoints.rotation.z = Math.cos(t * 0.45) * 0.04;

        // Ionosphere aurora shimmer — size and opacity pulse like northern lights
        matG.size    = 0.04 + Math.abs(Math.sin(t * 3.8)) * 0.022;
        matG.opacity = 0.72 + Math.abs(Math.sin(t * 2.5)) * 0.28;

        // Outer halo particles breathe outward like an ionosphere expanding with solar wind
        for (let i = 0; i < MAX_PARTICLES; i++) {
          const idx = i * 3;
          const x = posAttr[idx], y = posAttr[idx+1], z = posAttr[idx+2];
          const r = Math.sqrt(x*x + y*y + z*z);
          // Only affect outer halo particles (r > 2.2 in globe shape)
          if (r > 2.2) {
            const breathe = 1.0 + Math.sin(t * 2.2 + i * 0.08) * 0.06;
            posAttr[idx]   = (x / r) * r * breathe;
            posAttr[idx+1] = (y / r) * r * breathe;
            posAttr[idx+2] = (z / r) * r * breathe;
          }
        }
        s.mainPoints.geometry.attributes.position.needsUpdate = true;

        s.mainPoints.position.x = s.targetMouseX * 0.3;
        s.mainPoints.position.y = -s.targetMouseY * 0.2 + Math.sin(t * 0.5) * 0.08;
      }
      // ╔═══════════════════════════════════════════════════════════════════╗
      // ║  PLANET — slow spin + tilt                                        ║
      // ╚═══════════════════════════════════════════════════════════════════╝
      else if (currentShape === 'planet') {
        s.mainPoints.rotation.y += 0.003;
        s.mainPoints.rotation.z  = 0.41 + Math.sin(s.time * 0.3) * 0.02;
        s.mainPoints.rotation.x  = -0.1 - s.targetMouseY * 0.08;
        s.mainPoints.position.x  = s.targetMouseX * 0.3;
        s.mainPoints.position.y  = -s.targetMouseY * 0.2;
      }
      // ╔═══════════════════════════════════════════════════════════════════╗
      // ║  DISC — spinning gold medal / badge presentation                  ║
      // ╚═══════════════════════════════════════════════════════════════════╝
      else if (currentShape === 'disc') {
        const t = s.time;
        const matD2 = s.mainPoints.material as THREE.PointsMaterial;
        // Tilt so disc reads as a 3D coin (not flat-on)
        // Coin-flip spin on Y, slight wobble on X for depth
        s.mainPoints.rotation.y += 0.014;
        s.mainPoints.rotation.x = 0.52 + Math.sin(t * 0.5) * 0.10 - s.targetMouseY * 0.08;
        s.mainPoints.rotation.z = Math.sin(t * 0.35) * 0.06;
        // Gold shimmer — surface reflects as coin spins
        matD2.opacity = 0.75 + Math.abs(Math.sin(t * 2.8 + s.mainPoints.rotation.y)) * 0.25;
        matD2.size = 0.044 + Math.abs(Math.sin(t * 3.2)) * 0.012;
        // Gentle floating
        s.mainPoints.position.y = Math.sin(t * 0.38) * 0.12 - s.targetMouseY * 0.1;
        s.mainPoints.position.x = s.targetMouseX * 0.25;
      }
      // ╔═══════════════════════════════════════════════════════════════════╗
      // ║  CUBE — badges crystallising into a solid geometric skill block    ║
      // ╚═══════════════════════════════════════════════════════════════════╝
      else if (currentShape === 'cube') {
        const t = s.time;
        const matC = s.mainPoints.material as THREE.PointsMaterial;
        // Steady tumble showing all 3 axes — the structure has depth, solidity
        s.mainPoints.rotation.y += 0.006;
        s.mainPoints.rotation.x += 0.004;
        s.mainPoints.rotation.z = Math.sin(t * 0.2) * 0.05;
        // Steady bright glow — the solid achievement radiates
        matC.opacity = 0.80 + Math.abs(Math.sin(t * 1.4)) * 0.20;
        matC.size = 0.048 + Math.abs(Math.sin(t * 1.8)) * 0.010;
        s.mainPoints.position.y = Math.sin(t * 0.3) * 0.10 - s.targetMouseY * 0.10;
        s.mainPoints.position.x = s.targetMouseX * 0.3;
      }
      // ╔═══════════════════════════════════════════════════════════════════╗
      // ║  HUB SEAL — slow dignified credential spin                        ║
      // ╚═══════════════════════════════════════════════════════════════════╝
      else if (currentShape === 'hubSeal') {
        const t = s.time;
        const matS = s.mainPoints.material as THREE.PointsMaterial;
        // Steady coin-like rotation — authoritative, official
        s.mainPoints.rotation.y += 0.008;
        s.mainPoints.rotation.x = Math.sin(t * 0.3) * 0.12 - s.targetMouseY * 0.10;
        s.mainPoints.rotation.z = Math.cos(t * 0.22) * 0.04;
        // Gentle pulse — like a heartbeat of authority
        matS.opacity = 0.78 + Math.abs(Math.sin(t * 1.6)) * 0.22;
        s.mainPoints.position.y = Math.sin(t * 0.4) * 0.1 - s.targetMouseY * 0.15;
        s.mainPoints.position.x = s.targetMouseX * 0.3;
      }
      // ╔═══════════════════════════════════════════════════════════════════╗
      // ║  TORUS KNOT — on-chain permanence, mathematical immutability      ║
      // ╚═══════════════════════════════════════════════════════════════════╝
      else if (currentShape === 'torusKnot') {
        const t = s.time;
        const matK = s.mainPoints.material as THREE.PointsMaterial;
        // Slow majestic rotation on all axes — the knot turns in space forever
        s.mainPoints.rotation.y += 0.009;
        s.mainPoints.rotation.x += 0.004;
        s.mainPoints.rotation.z = Math.sin(t * 0.18) * 0.08;
        // Cyan blockchain shimmer
        matK.opacity = 0.70 + Math.abs(Math.sin(t * 2.2)) * 0.30;
        matK.size = 0.045 + Math.abs(Math.sin(t * 2.8)) * 0.012;
        s.mainPoints.position.y = Math.sin(t * 0.35) * 0.08 - s.targetMouseY * 0.12;
        s.mainPoints.position.x = s.targetMouseX * 0.3;
      }

      // ── Default float ────────────────────────────────────────────────────
      else {
        s.mainPoints.rotation.y = Math.sin(s.time*0.28)*0.12 + s.targetMouseX*0.28;
        s.mainPoints.rotation.x = Math.sin(s.time*0.22)*0.06 - s.targetMouseY*0.12;
        s.mainPoints.position.y = Math.sin(s.time*0.45)*0.14;
        s.mainPoints.position.x = 0;
      }

      // Star drift — hyperdrive warp on the final torusKnot (on-chain) scene
      let starSpeedY = 0.00008;
      let starSpeedX = 0.00004;
      if (currentShape === 'torusKnot') {
        // On-chain finale: stars warp outward as the knot spins eternally
        starSpeedY = 0.0020;
        starSpeedX = 0.0010;
        const starMat = s.starPoints.material as THREE.PointsMaterial;
        starMat.size = 0.07 + Math.abs(Math.sin(s.time * 1.6)) * 0.05;
      } else if (currentShape === 'planet') {
        starSpeedY = 0.0018;
        starSpeedX = 0.0009;
        const starMat = s.starPoints.material as THREE.PointsMaterial;
        starMat.size = 0.07 + Math.abs(Math.sin(s.time * 1.8)) * 0.04;
      } else if (currentShape === 'diamond') {
        starSpeedY = 0.0016;
        starSpeedX = 0.0008;
        const starMat = s.starPoints.material as THREE.PointsMaterial;
        starMat.size = 0.06 + Math.abs(Math.sin(s.time * 2.0)) * 0.03;
      } else {
        const starMat = s.starPoints.material as THREE.PointsMaterial;
        starMat.size = 0.06;
      }
      s.starPoints.rotation.y += starSpeedY;
      s.starPoints.rotation.x += starSpeedX;

      // Glide Camera dynamically to shape targets
      const targets = getCameraTargets(currentShape);
      s.camPosX += (targets.cx - s.camPosX) * 0.05;
      s.camPosY += (targets.cy - s.camPosY) * 0.05;
      s.camPosZ += (targets.cz - s.camPosZ) * 0.05;
      s.lookAtX += (targets.lx - s.lookAtX) * 0.05;
      s.lookAtY += (targets.ly - s.lookAtY) * 0.05;
      s.lookAtZ += (targets.lz - s.lookAtZ) * 0.05;

      // Camera parallax with smooth position glide
      const px = (currentShape === 'planet' || currentShape === 'streams') ? 0.22 : 0.5;
      s.camera.position.x = s.camPosX + s.targetMouseX * px;
      s.camera.position.y = s.camPosY - s.targetMouseY * px * 0.5;
      s.camera.position.z = s.camPosZ;
      s.camera.lookAt(s.lookAtX, s.lookAtY, s.lookAtZ);

      s.renderer.render(s.scene, s.camera);
    }
    animate();

    const onResize = () => {
      const s = stateRef.current;
      if (!s) return;
      s.camera.aspect = window.innerWidth / window.innerHeight;
      s.camera.updateProjectionMatrix();
      // Re-apply pixel ratio in case user moved window to a different screen
      s.renderer.setPixelRatio(window.devicePixelRatio);
      s.renderer.setSize(window.innerWidth, window.innerHeight);
    };
    const onMouse = (e: MouseEvent) => {
      const s = stateRef.current;
      if (!s) return;
      s.mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
      s.mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('mousemove', onMouse);

    return () => {
      cancelAnimationFrame(stateRef.current?.animId ?? 0);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('mousemove', onMouse);
      renderer.dispose();
      stateRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // React to shapeName / color / launchProgress changes
  useEffect(() => {
    if (!stateRef.current) return;
    
    const s = stateRef.current;
    
    // Trigger morph
    morphTo(shapeName);

    // Rebuild colors dynamically
    const res = SHAPES[shapeName]();
    const shapeColors = res instanceof Float32Array ? null : res.colors;

    const baseCol = new THREE.Color(color);
    const colorAttr = s.mainPoints.geometry.attributes.color as THREE.BufferAttribute;
    if (colorAttr) {
      const arr = colorAttr.array as Float32Array;
      for (let i = 0; i < MAX_PARTICLES; i++) {
        const idx = i * 3;
        if (shapeColors) {
          arr[idx] = shapeColors[idx];
          arr[idx+1] = shapeColors[idx+1];
          arr[idx+2] = shapeColors[idx+2];
        } else if (shapeName === 'rocket' && i >= FLAME_START) {
          const rand = Math.random();
          if (rand < 0.45) {
            arr[idx] = 1.0; arr[idx+1] = 0.85; arr[idx+2] = 0.1; // Yellow
          } else if (rand < 0.8) {
            arr[idx] = 1.0; arr[idx+1] = 0.4; arr[idx+2] = 0.0;  // Orange
          } else {
            arr[idx] = 0.9; arr[idx+1] = 0.08; arr[idx+2] = 0.02; // Red
          }
        } else {
          arr[idx] = baseCol.r;
          arr[idx+1] = baseCol.g;
          arr[idx+2] = baseCol.b;
        }
      }
      colorAttr.needsUpdate = true;
    }

    const mat = s.mainPoints.material as THREE.PointsMaterial;
    mat.opacity = 0.88;
    mat.size = 0.045; // reset base material size

    // Reset scales/rotations on new shape
    s.mainPoints.scale.setScalar(1);
    s.mainPoints.rotation.set(0, 0, 0);
    s.mainPoints.position.set(0, 0, 0);
  }, [shapeName, color, morphTo]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full"
      style={{ zIndex: 0 }}
    />
  );
}
