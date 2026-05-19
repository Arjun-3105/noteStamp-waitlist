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
    s.targetPositions = SHAPES[newShape]();
    s.morphProgress = 0;
    s.morphing = true;
    s.morphStartTime = performance.now();
    s.activeShapeTime = 0;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 300);
    camera.position.set(0, 0, 8);

    // Main particle geometry
    const initPositions = SHAPES[shapeName]();
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(initPositions.slice(), 3));

    // Initialize custom vertex color attribute
    const colors = new Float32Array(MAX_PARTICLES * 3);
    const baseCol = new THREE.Color(color);
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const idx = i * 3;
      if (shapeName === 'rocket' && i >= FLAME_START) {
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

      // ── Default float ────────────────────────────────────────────────────
      else {
        s.mainPoints.rotation.y = Math.sin(s.time*0.28)*0.12 + s.targetMouseX*0.28;
        s.mainPoints.rotation.x = Math.sin(s.time*0.22)*0.06 - s.targetMouseY*0.12;
        s.mainPoints.position.y = Math.sin(s.time*0.45)*0.14;
        s.mainPoints.position.x = 0;
      }

      // Star slow drift
      s.starPoints.rotation.y += 0.00008;
      s.starPoints.rotation.x += 0.00004;

      // Camera parallax
      const px = currentShape === 'planet' ? 0.25 : 0.5;
      s.camera.position.x = s.targetMouseX * px;
      s.camera.position.y = 0.4 - s.targetMouseY * px * 0.5;
      s.camera.lookAt(0, 0, 0);

      s.renderer.render(s.scene, s.camera);
    }
    animate();

    const onResize = () => {
      const s = stateRef.current;
      if (!s) return;
      s.camera.aspect = window.innerWidth / window.innerHeight;
      s.camera.updateProjectionMatrix();
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
    const baseCol = new THREE.Color(color);
    const colorAttr = s.mainPoints.geometry.attributes.color as THREE.BufferAttribute;
    if (colorAttr) {
      const arr = colorAttr.array as Float32Array;
      for (let i = 0; i < MAX_PARTICLES; i++) {
        const idx = i * 3;
        if (shapeName === 'rocket' && i >= FLAME_START) {
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
