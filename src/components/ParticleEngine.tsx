'use client';
import { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { MAX_PARTICLES, SHAPES, ShapeName, starfield } from '@/lib/particles/shapes';

interface Props {
  shapeName: ShapeName;
  color: string;
  secondaryColor?: string;
  onReady?: () => void;
}

export default function ParticleEngine({ shapeName, color, secondaryColor, onReady }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
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
  } | null>(null);

  const morphTo = useCallback((newShape: ShapeName) => {
    const s = stateRef.current;
    if (!s) return;
    s.targetPositions = SHAPES[newShape]();
    s.morphProgress = 0;
    s.morphing = true;
    s.morphStartTime = performance.now();
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

    // Main particle system
    const initPositions = SHAPES[shapeName]();
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(initPositions.slice(), 3));

    const col = new THREE.Color(color);
    const mat = new THREE.PointsMaterial({
      color: col,
      size: 0.045,
      transparent: true,
      opacity: 0.88,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });
    const mainPoints = new THREE.Points(geo, mat);
    scene.add(mainPoints);

    // Starfield
    const starPos = starfield(5000);
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0x8ec8f0, size: 0.06, transparent: true, opacity: 0.55,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const starPoints = new THREE.Points(starGeo, starMat);
    scene.add(starPoints);

    stateRef.current = {
      renderer, scene, camera, mainPoints, starPoints,
      currentPositions: initPositions.slice(),
      targetPositions: initPositions.slice(),
      morphProgress: 1,
      morphing: false,
      morphStartTime: 0,
      mouseX: 0, mouseY: 0, targetMouseX: 0, targetMouseY: 0,
      animId: 0, time: 0,
    };

    // Animate intro: scatter → form
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
    stateRef.current.targetPositions = initPositions.slice();
    stateRef.current.morphProgress = 0;
    stateRef.current.morphing = true;
    stateRef.current.morphStartTime = performance.now() + 300;

    // Easing
    function easeInOutCubic(t: number) { return t < 0.5 ? 4*t*t*t : 1-(-2*t+2)**3/2; }

    // Render loop
    function animate() {
      const s = stateRef.current;
      if (!s) return;
      s.animId = requestAnimationFrame(animate);
      s.time += 0.008;

      // Smooth mouse
      s.targetMouseX += (s.mouseX - s.targetMouseX) * 0.035;
      s.targetMouseY += (s.mouseY - s.targetMouseY) * 0.035;

      // Morphing
      if (s.morphing) {
        const elapsed = performance.now() - s.morphStartTime;
        const duration = 2600;
        if (elapsed < 0) {
          // waiting for delay
        } else {
          s.morphProgress = Math.min(elapsed / duration, 1);
          const ep = easeInOutCubic(s.morphProgress);
          const posAttr = s.mainPoints.geometry.attributes.position.array as Float32Array;
          for (let i = 0; i < posAttr.length; i++) {
            posAttr[i] = s.currentPositions[i] + (s.targetPositions[i] - s.currentPositions[i]) * ep;
          }
          s.mainPoints.geometry.attributes.position.needsUpdate = true;
          if (s.morphProgress >= 1) {
            s.morphing = false;
            for (let i = 0; i < s.currentPositions.length; i++)
              s.currentPositions[i] = s.targetPositions[i];
            onReady?.();
          }
        }
      }

      // Gentle rotation
      s.mainPoints.rotation.y = Math.sin(s.time*0.28)*0.12 + s.targetMouseX*0.28;
      s.mainPoints.rotation.x = Math.sin(s.time*0.22)*0.06 - s.targetMouseY*0.12;
      s.mainPoints.position.y = Math.sin(s.time*0.45)*0.14;

      // Star slow drift
      s.starPoints.rotation.y += 0.00008;
      s.starPoints.rotation.x += 0.00004;

      // Camera parallax
      s.camera.position.x = s.targetMouseX*0.5;
      s.camera.position.y = 0.4 - s.targetMouseY*0.25;
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

  // React to shapeName prop changes
  useEffect(() => {
    if (!stateRef.current) return;
    morphTo(shapeName);
    const mat = stateRef.current.mainPoints.material as THREE.PointsMaterial;
    mat.color.set(new THREE.Color(color));
  }, [shapeName, color, morphTo]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full"
      style={{ zIndex: 0 }}
    />
  );
}
