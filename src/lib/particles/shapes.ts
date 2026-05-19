// Particle shape generators — each returns a Float32Array of XYZ positions
// All shapes target MAX_PARTICLES; unused particles collapse to (0,0,0)

export type ShapeName =
  | 'chaos' | 'streams' | 'cube' | 'torusKnot'
  | 'disc' | 'sapling' | 'tree' | 'globe'
  | 'hexagon' | 'hexChain' | 'seal' | 'diamond'
  | 'hubSeal' | 'starfield'
  | 'rocket' | 'launchPad' | 'sunCore' | 'spacePlane' | 'planet' | 'forest' | 'seed';

export type ShapeResult = Float32Array | { positions: Float32Array, colors: Float32Array };

export const MAX_PARTICLES = 5000;

function gauss(std = 1): number {
  let u = 0, v = 0;
  while (!u) u = Math.random();
  while (!v) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v) * std;
}

function lerp3(a: number[], b: number[], t: number): number[] {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

function fill(pos: number[]): Float32Array {
  while (pos.length / 3 < MAX_PARTICLES) pos.push(0, 0, 0);
  return new Float32Array(pos.slice(0, MAX_PARTICLES * 3));
}

function fillColors(col: number[], defaultR: number, defaultG: number, defaultB: number): Float32Array {
  while (col.length / 3 < MAX_PARTICLES) col.push(defaultR, defaultG, defaultB);
  return new Float32Array(col.slice(0, MAX_PARTICLES * 3));
}

// Helper to push a tree into an existing position array and assign colors
function pushTree(pos: number[], col: number[], n: number, tx: number, ty: number, tz: number, scale: number) {
  // trunk (brown: #8B5A2B -> 0.54, 0.35, 0.17)
  const cTrunk = [0.54, 0.35, 0.17];
  for (let i = 0; i < Math.floor(n*0.13); i++) {
    const t = Math.random(); const r = 0.18*(1-t*0.65)*scale;
    pos.push(tx+gauss(r), ty+(t*3.8-1.6)*scale, tz+gauss(r));
    col.push(...cTrunk);
  }
  const branches = [
    {d:[1,1,0],h:0.9,l:2.0},{d:[-1,1,0],h:0.9,l:2.0},
    {d:[0.7,0.85,0.7],h:1.3,l:1.7},{d:[-0.7,0.85,0.7],h:1.3,l:1.7},
    {d:[0.7,0.85,-0.7],h:1.3,l:1.7},{d:[-0.7,0.85,-0.7],h:1.3,l:1.7},
    {d:[1,1.2,0.3],h:1.7,l:1.3},{d:[-1,1.2,-0.3],h:1.7,l:1.3},
  ];
  // branches (brown)
  const bp = Math.floor(n*0.44/branches.length);
  for (const b of branches) {
    const len = Math.sqrt(b.d[0]**2+b.d[1]**2+b.d[2]**2);
    const dn = b.d.map(v=>v/len);
    for (let i = 0; i < bp; i++) {
      const t = Math.random(); const sp = 0.1*(1+t)*scale;
      pos.push(tx+(dn[0]*t*b.l)*scale+gauss(sp), ty+(b.h+dn[1]*t*b.l)*scale+gauss(sp*0.5), tz+(dn[2]*t*b.l)*scale+gauss(sp));
      col.push(...cTrunk);
    }
  }
  // leaf clusters (green: #00ff88 -> 0.0, 1.0, 0.53)
  const cLeaf = [0.0, 1.0, 0.53];
  const lp = Math.floor(n*0.27/branches.length);
  for (const b of branches) {
    const len = Math.sqrt(b.d[0]**2+b.d[1]**2+b.d[2]**2);
    const dn = b.d.map(v=>v/len);
    const tip = [dn[0]*b.l, b.h+dn[1]*b.l, dn[2]*b.l];
    for (let i = 0; i < lp; i++) {
      pos.push(tx+(tip[0])*scale+gauss(0.45*scale), ty+(tip[1])*scale+gauss(0.45*scale), tz+(tip[2])*scale+gauss(0.45*scale));
      // Add slight color variation for leaves
      col.push(cLeaf[0] + gauss(0.05), cLeaf[1] + gauss(0.05), cLeaf[2] + gauss(0.05));
    }
  }
  // roots (brown)
  for (let i = 0; i < Math.floor(n*0.16); i++) {
    const t = Math.random(); const a = Math.random()*Math.PI*2;
    pos.push(tx+(Math.cos(a)*t*2.2)*scale+gauss(0.12*scale), ty+(-1.6-t*1.1)*scale+gauss(0.09*scale), tz+(Math.sin(a)*t*1.6)*scale+gauss(0.12*scale));
    col.push(...cTrunk);
  }
}

// ── 1. Chaos cloud ────────────────────────────────────────────────────────────
export function chaos(n = 4200): Float32Array {
  const pos: number[] = [];
  for (let i = 0; i < n; i++) pos.push(gauss(3.2), gauss(2.5), gauss(2));
  return fill(pos);
}

// ── 2. Converging streams ─────────────────────────────────────────────────────
export function streams(n = 4200): Float32Array {
  const pos: number[] = [];
  const srcs = [[-9,5,-3],[9,5,-3],[-9,-5,2],[9,-5,2],[0,9,0],[0,-9,0]];
  const pp = Math.floor(n / srcs.length);
  for (const src of srcs) {
    for (let i = 0; i < pp; i++) {
      const t = Math.random();
      const mid = src.map(v => v * 0.4);
      const p0 = lerp3(src, mid, t);
      const p = lerp3(p0, [0,0,0], t);
      pos.push(p[0]+gauss(0.12), p[1]+gauss(0.12), p[2]+gauss(0.06));
    }
  }
  return fill(pos);
}

// ── 3. Wireframe cube ─────────────────────────────────────────────────────────
export function cube(n = 3000): Float32Array {
  const pos: number[] = [];
  const s = 2.6;
  const verts: number[][] = [];
  for (const x of [-s,s]) for (const y of [-s,s]) for (const z of [-s,s]) verts.push([x,y,z]);
  const edges: [number,number][] = [
    [0,1],[2,3],[4,5],[6,7],[0,2],[1,3],[4,6],[5,7],[0,4],[1,5],[2,6],[3,7]
  ];
  const ep = Math.floor(n * 0.55 / edges.length);
  for (const [a,b] of edges) {
    for (let i = 0; i < ep; i++) {
      const p = lerp3(verts[a], verts[b], Math.random());
      pos.push(p[0]+gauss(0.04), p[1]+gauss(0.04), p[2]+gauss(0.04));
    }
  }
  const fp = Math.floor(n * 0.45);
  for (let i = 0; i < fp; i++) {
    const f = Math.floor(Math.random()*6);
    const u = (Math.random()*2-1)*s, v = (Math.random()*2-1)*s;
    const coords = [[u,v,-s],[u,v,s],[-s,u,v],[s,u,v],[u,-s,v],[u,s,v]];
    const [x,y,z] = coords[f];
    pos.push(x+gauss(0.03), y+gauss(0.03), z+gauss(0.03));
  }
  return fill(pos);
}

// ── 4. Torus knot ─────────────────────────────────────────────────────────────
export function torusKnot(n = 3500, p = 3, q = 2): Float32Array {
  const pos: number[] = [];
  const R = 1.6, r = 0.65, tr = 0.13;
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2;
    const cx = (R + r*Math.cos(q*t)) * Math.cos(p*t);
    const cy = (R + r*Math.cos(q*t)) * Math.sin(p*t);
    const cz = r * Math.sin(q*t);
    pos.push(cx+gauss(tr), cy+gauss(tr), cz+gauss(tr));
  }
  return fill(pos);
}

// ── 5. Flat disc (seed) ───────────────────────────────────────────────────────
export function disc(n = 2800): Float32Array {
  const pos: number[] = [];
  for (let i = 0; i < n; i++) {
    const r = 2.8 * Math.sqrt(Math.random());
    const theta = Math.random() * Math.PI * 2;
    pos.push(r*Math.cos(theta)+gauss(0.05), gauss(0.07), r*Math.sin(theta)+gauss(0.05));
  }
  return fill(pos);
}

// ── 5.5 Seed (teardrop/oval) ────────────────────────────────────────────────────
export function seed(n = 2500): ShapeResult {
  const pos: number[] = [];
  const col: number[] = [];
  const cSeed = [0.8, 0.6, 0.3]; // Warm golden-brown
  for (let i = 0; i < n; i++) {
    const t = Math.random();
    const rBase = Math.sqrt(Math.random()) * 0.8; // base radius
    // Taper radius towards top for a seed/teardrop shape
    const r = rBase * (1.0 - t * 0.6); 
    const theta = Math.random() * Math.PI * 2;
    // Height from -0.8 to 0.8
    const y = (t * 2.0 - 1.0) * 0.8;
    pos.push(r*Math.cos(theta)+gauss(0.04), y+gauss(0.04), r*Math.sin(theta)+gauss(0.04));
    col.push(cSeed[0] + gauss(0.02), cSeed[1] + gauss(0.02), cSeed[2] + gauss(0.02));
  }
  return { positions: fill(pos), colors: fillColors(col, 0.8, 0.6, 0.3) };
}

// ── 6. Sapling ────────────────────────────────────────────────────────────────
export function sapling(n = 3200): ShapeResult {
  const pos: number[] = [];
  const col: number[] = [];
  const cTrunk = [0.54, 0.35, 0.17];
  const cLeaf = [0.0, 1.0, 0.53];
  // trunk
  for (let i = 0; i < Math.floor(n*0.22); i++) {
    const t = Math.random();
    pos.push(gauss(0.09), t*2.8-0.6, gauss(0.09));
    col.push(...cTrunk);
  }
  // 2 branches (leaves at tips)
  for (const sx of [-1,1]) {
    for (let i = 0; i < Math.floor(n*0.22); i++) {
      const t = Math.random();
      pos.push(sx*t*1.6+gauss(0.08), 1.6+t*0.9+gauss(0.08), gauss(0.08));
      // Top 30% of branches get green leaves, bottom 70% get brown branch color
      if (t > 0.7) col.push(cLeaf[0]+gauss(0.05), cLeaf[1]+gauss(0.05), cLeaf[2]+gauss(0.05));
      else col.push(...cTrunk);
    }
  }
  // roots
  for (let i = 0; i < Math.floor(n*0.18); i++) {
    const t = Math.random(); const a = Math.random()*Math.PI*2;
    pos.push(Math.cos(a)*t*1.3+gauss(0.07), -0.6-t*0.9+gauss(0.07), Math.sin(a)*t*0.6+gauss(0.07));
    col.push(...cTrunk);
  }
  // dirt remnant
  const cDirt = [0.4, 0.25, 0.1];
  for (let i = 0; i < Math.floor(n*0.16); i++) {
    const r = 1.6*Math.sqrt(Math.random()), theta = Math.random()*Math.PI*2;
    pos.push(r*Math.cos(theta)+gauss(0.04), -0.6+gauss(0.04), r*Math.sin(theta)+gauss(0.04));
    col.push(cDirt[0]+gauss(0.02), cDirt[1]+gauss(0.02), cDirt[2]+gauss(0.02));
  }
  return { positions: fill(pos), colors: fillColors(col, 0.54, 0.35, 0.17) };
}

// ── 7. Full 3D tree ───────────────────────────────────────────────────────────
export function tree(n = 4500): Float32Array {
  const pos: number[] = [];
  pushTree(pos, n, 0, 0, 0, 1.0);
  return fill(pos);
}

// ── 7.5 Full 3D Forest ────────────────────────────────────────────────────────
export function forest(n = 4500): Float32Array {
  const pos: number[] = [];
  
  // Center large tree
  const centerN = Math.floor(n * 0.4);
  pushTree(pos, centerN, 0, 0, 0, 1.1);

  // Surrounding smaller trees
  const numTrees = 5;
  const treeN = Math.floor((n - centerN) / numTrees);
  
  for (let i = 0; i < numTrees; i++) {
    const angle = (i / numTrees) * Math.PI * 2 + Math.random() * 0.5;
    const dist = 3.5 + Math.random() * 1.5;
    const tx = Math.cos(angle) * dist;
    const tz = Math.sin(angle) * dist;
    const scale = 0.4 + Math.random() * 0.3;
    // Lower them slightly so they look planted on the same implicit ground level
    const ty = -1.6 * (1.1 - scale);
    pushTree(pos, treeN, tx, ty, tz, scale);
  }

  // Add some ground moss/grass scattering to fill space
  const remaining = n - pos.length / 3;
  for (let i = 0; i < remaining; i++) {
    const r = Math.sqrt(Math.random()) * 5.0;
    const a = Math.random() * Math.PI * 2;
    pos.push(r * Math.cos(a), -1.8 + gauss(0.1), r * Math.sin(a));
  }

  return fill(pos);
}

// ── 8. Knowledge globe ────────────────────────────────────────────────────────
export function globe(n = 4500): Float32Array {
  const pos: number[] = [];
  for (let i = 0; i < Math.floor(n*0.55); i++) {
    const r = 1.7*Math.cbrt(Math.random());
    const theta = Math.random()*Math.PI*2; const phi = Math.acos(2*Math.random()-1);
    pos.push(r*Math.sin(phi)*Math.cos(theta), r*Math.sin(phi)*Math.sin(theta), r*Math.cos(phi));
  }
  for (let i = 0; i < Math.floor(n*0.2); i++) {
    const theta = Math.random()*Math.PI*2;
    pos.push(2.4*Math.cos(theta)+gauss(0.05), gauss(0.05), 2.4*Math.sin(theta)+gauss(0.05));
  }
  for (let i = 0; i < Math.floor(n*0.25); i++) {
    const r = 2.0+Math.random()*1.1; const theta = Math.random()*Math.PI*2; const phi = Math.acos(2*Math.random()-1);
    pos.push(r*Math.sin(phi)*Math.cos(theta), r*Math.sin(phi)*Math.sin(theta), r*Math.cos(phi));
  }
  return fill(pos);
}

// ── 9. Hexagon badge ─────────────────────────────────────────────────────────
export function hexagon(n = 2000): Float32Array {
  const pos: number[] = [];
  const R = 2.0;
  for (let e = 0; e < 6; e++) {
    const v1 = [R*Math.cos((e/6)*Math.PI*2), 0, R*Math.sin((e/6)*Math.PI*2)];
    const v2 = [R*Math.cos(((e+1)/6)*Math.PI*2), 0, R*Math.sin(((e+1)/6)*Math.PI*2)];
    for (let i = 0; i < Math.floor(n*0.3/6); i++) {
      const p = lerp3(v1, v2, Math.random());
      pos.push(p[0]+gauss(0.04), gauss(0.03), p[2]+gauss(0.04));
    }
  }
  for (let i = 0; i < Math.floor(n*0.7); i++) {
    const r = R*Math.sqrt(Math.random())*0.92; const theta = Math.random()*Math.PI*2;
    pos.push(r*Math.cos(theta)+gauss(0.03), gauss(0.02), r*Math.sin(theta)+gauss(0.03));
  }
  return fill(pos);
}

// ── 10. Hex chain (5 badges) ─────────────────────────────────────────────────
export function hexChain(n = 3500): Float32Array {
  const pos: number[] = [];
  const R = 0.82; const spacing = 2.4;
  const startX = -(spacing*4)/2;
  for (let h = 0; h < 5; h++) {
    const cx = startX + h*spacing; const sc = 0.75+h*0.07;
    for (let e = 0; e < 6; e++) {
      const v1 = [cx+R*sc*Math.cos((e/6)*Math.PI*2), 0, R*sc*Math.sin((e/6)*Math.PI*2)];
      const v2 = [cx+R*sc*Math.cos(((e+1)/6)*Math.PI*2), 0, R*sc*Math.sin(((e+1)/6)*Math.PI*2)];
      for (let i = 0; i < Math.floor(n*0.28/(6*5)); i++) {
        const p = lerp3(v1, v2, Math.random());
        pos.push(p[0]+gauss(0.03), gauss(0.02), p[2]+gauss(0.03));
      }
    }
    for (let i = 0; i < Math.floor(n*0.58/5); i++) {
      const r = R*sc*Math.sqrt(Math.random())*0.9; const theta = Math.random()*Math.PI*2;
      pos.push(cx+r*Math.cos(theta)+gauss(0.02), gauss(0.02), r*Math.sin(theta)+gauss(0.02));
    }
    if (h < 4) {
      const nx = startX+(h+1)*spacing;
      for (let i = 0; i < Math.floor(n*0.028); i++) {
        const t = Math.random();
        pos.push(cx+(nx-cx)*t+gauss(0.03), gauss(0.04), gauss(0.04));
      }
    }
  }
  return fill(pos);
}

// ── 11. Ornate seal / stamp ───────────────────────────────────────────────────
export function seal(n = 4000): Float32Array {
  const pos: number[] = [];
  const R = 2.4;
  for (let i = 0; i < Math.floor(n*0.2); i++) {
    const theta = Math.random()*Math.PI*2;
    const notch = Math.sin(theta*24)*0.09;
    const r = R+notch+gauss(0.03);
    pos.push(r*Math.cos(theta), gauss(0.03), r*Math.sin(theta));
  }
  for (let sp = 0; sp < 12; sp++) {
    const angle = (sp/12)*Math.PI*2;
    for (let i = 0; i < Math.floor(n*0.24/12); i++) {
      const t = Math.random()*( R-0.4);
      pos.push(t*Math.cos(angle)+gauss(0.04), gauss(0.03), t*Math.sin(angle)+gauss(0.04));
    }
  }
  for (let i = 0; i < Math.floor(n*0.14); i++) {
    const theta = Math.random()*Math.PI*2; const r = 1.5+gauss(0.04);
    pos.push(r*Math.cos(theta), gauss(0.03), r*Math.sin(theta));
  }
  // center fill
  for (let i = 0; i < Math.floor(n*0.42); i++) {
    const r = 1.4*Math.sqrt(Math.random()); const theta = Math.random()*Math.PI*2;
    pos.push(r*Math.cos(theta)+gauss(0.03), gauss(0.02), r*Math.sin(theta)+gauss(0.03));
  }
  return fill(pos);
}

// ── 12. Diamond / icosahedron ─────────────────────────────────────────────────
export function diamond(n = 3800): Float32Array {
  const pos: number[] = [];
  const phi = (1+Math.sqrt(5))/2;
  const verts = [
    [0,1,phi],[0,-1,phi],[0,1,-phi],[0,-1,-phi],
    [1,phi,0],[-1,phi,0],[1,-phi,0],[-1,-phi,0],
    [phi,0,1],[phi,0,-1],[-phi,0,1],[-phi,0,-1],
  ].map(v => { const l=Math.sqrt(v[0]**2+v[1]**2+v[2]**2)*0.7; return v.map(c=>c/l*2.0); });
  const faces = [
    [0,1,8],[0,8,4],[0,4,5],[0,5,10],[0,10,1],
    [3,2,11],[3,11,7],[3,7,6],[3,6,9],[3,9,2],
    [1,6,8],[8,6,9],[8,9,4],[4,9,2],[4,2,5],
    [5,2,11],[5,11,10],[10,11,7],[10,7,1],[1,7,6],
  ];
  const fp = Math.floor(n/faces.length);
  for (const [a,b,c] of faces) {
    for (let i = 0; i < fp; i++) {
      let s = Math.random(), t = Math.random();
      if (s+t > 1) { s=1-s; t=1-t; }
      const u = 1-s-t;
      pos.push(
        u*verts[a][0]+s*verts[b][0]+t*verts[c][0]+gauss(0.04),
        u*verts[a][1]+s*verts[b][1]+t*verts[c][1]+gauss(0.04),
        u*verts[a][2]+s*verts[b][2]+t*verts[c][2]+gauss(0.04),
      );
    }
  }
  return fill(pos);
}

// ── 13. Hub seal (torus + disc face + center sphere) ─────────────────────────
export function hubSeal(n = 3500): Float32Array {
  const pos: number[] = [];
  // outer torus ring
  for (let i = 0; i < Math.floor(n*0.35); i++) {
    const theta = Math.random()*Math.PI*2; const phi = Math.random()*Math.PI*2;
    const R=2.2, r=0.18;
    pos.push((R+r*Math.cos(phi))*Math.cos(theta), (R+r*Math.cos(phi))*Math.sin(theta), r*Math.sin(phi));
  }
  // disc face fill
  for (let i = 0; i < Math.floor(n*0.45); i++) {
    const r = 2.1*Math.sqrt(Math.random()); const theta = Math.random()*Math.PI*2;
    pos.push(r*Math.cos(theta)+gauss(0.04), r*Math.sin(theta)+gauss(0.04), gauss(0.04));
  }
  // center sphere
  for (let i = 0; i < Math.floor(n*0.2); i++) {
    const r = 0.5*Math.cbrt(Math.random());
    const theta = Math.random()*Math.PI*2; const phi = Math.acos(2*Math.random()-1);
    pos.push(r*Math.sin(phi)*Math.cos(theta), r*Math.sin(phi)*Math.sin(theta), r*Math.cos(phi));
  }
  return fill(pos);
}

// ── 14. Starfield (background, static) ───────────────────────────────────────
export function starfield(n = 5000): Float32Array {
  const pos: number[] = [];
  for (let i = 0; i < n; i++) {
    const theta = Math.random()*Math.PI*2; const phi = Math.acos(2*Math.random()-1);
    const r = 22+Math.random()*60;
    pos.push(r*Math.sin(phi)*Math.cos(theta), r*Math.sin(phi)*Math.sin(theta), r*Math.cos(phi));
  }
  return fill(pos);
}

// ── Arch (half-torus, for hub portals) ───────────────────────────────────────
export function arch(arcAngle: number, innerR: number, tubeR: number, n: number): Float32Array {
  const pos: number[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i/n)*arcAngle - arcAngle/2;
    const ta = Math.random()*Math.PI*2; const rr = tubeR*Math.sqrt(Math.random());
    pos.push((innerR+rr*Math.cos(ta))*Math.cos(a), (innerR+rr*Math.cos(ta))*Math.sin(a), rr*Math.sin(ta));
  }
  return fill(pos);
}

// ── 15. Rocket (vertical: nosecone + body + 4 delta fins + engine bell) ───────
export function rocket(n = 4500): Float32Array {
  const pos: number[] = [];

  // We cap the body particle count to 2000 to free up a MASSIVE amount of particles for the gorgeous gas swirl
  const bodyN = Math.min(n, 2000);

  // Body cylinder: y = -1.0 → +1.7, radius 0.36
  for (let i = 0; i < Math.floor(bodyN * 0.28); i++) {
    const y = -1.0 + Math.random() * 2.7;
    const a = Math.random() * Math.PI * 2;
    const r = 0.36 + gauss(0.03);
    pos.push(r * Math.cos(a), y, r * Math.sin(a));
  }

  // Nose cone: y = 1.7 → 2.9, tapers 0.36 → 0
  for (let i = 0; i < Math.floor(bodyN * 0.16); i++) {
    const t = Math.random();
    const y = 1.7 + t * 1.2;
    const r = 0.36 * (1 - t) + gauss(0.03);
    const a = Math.random() * Math.PI * 2;
    pos.push(r * Math.cos(a), y, r * Math.sin(a));
  }

  // 4 delta fins (at 0°, 90°, 180°, 270°)
  for (let f = 0; f < 4; f++) {
    const fa = (f / 4) * Math.PI * 2;
    const pp = Math.floor(bodyN * 0.26 / 4);
    for (let i = 0; i < pp; i++) {
      const t = Math.random();          // 0 = root, 1 = tip along height
      const s = Math.random() * (1 - t * 0.75); // width tapers toward tip
      const y = -1.0 - t * 1.0;        // fin spans y: -1.0 → -2.0
      const r = 0.36 + s * 0.9;        // extends radially to 1.26
      pos.push(r * Math.cos(fa) + gauss(0.035), y + gauss(0.035), r * Math.sin(fa) + gauss(0.035));
    }
  }

  // Engine bell nozzle: y = -2.0 → -2.5, flares 0.36 → 0.85
  for (let i = 0; i < Math.floor(bodyN * 0.14); i++) {
    const t = Math.random();
    const y = -2.0 - t * 0.5;
    const r = 0.36 + t * 0.49 + gauss(0.035);
    const a = Math.random() * Math.PI * 2;
    pos.push(r * Math.cos(a), y, r * Math.sin(a));
  }

  // Window dome (porthole on body front face)
  for (let i = 0; i < Math.floor(bodyN * 0.08); i++) {
    const pr = Math.sqrt(Math.random()) * 0.2;
    const pa = Math.random() * Math.PI * 2;
    pos.push(0.36 + pr * Math.cos(pa) * 0.5 + gauss(0.02), 0.7 + pr * Math.sin(pa) + gauss(0.02), gauss(0.03));
  }

  // Body interior fill (stripes / panel lines)
  for (let i = 0; i < Math.floor(bodyN * 0.08); i++) {
    const y = -1.0 + Math.random() * 2.7;
    const r = Math.random() * 0.36;
    const a = Math.random() * Math.PI * 2;
    pos.push(r * Math.cos(a), y, r * Math.sin(a));
  }

  // Engine fire / flame plume: y = -2.5 to -5.5
  const flameN = MAX_PARTICLES - (pos.length / 3);
  for (let i = 0; i < flameN; i++) {
    const t = Math.random();
    const y = -2.5 - t * 3.0; // shoots down to -5.5
    const r = (0.45 * (1.0 - t * 0.5)) + gauss(0.08);
    const a = Math.random() * Math.PI * 2;
    pos.push(r * Math.cos(a), y, r * Math.sin(a));
  }

  return fill(pos);
}

// ── 16. Launch pad (grid floor + two towers + rocket sitting on pad) ──────────
export function launchPad(n = 4500): Float32Array {
  const pos: number[] = [];

  // Ground grid: flat XZ plane at y = -2.2
  for (let i = 0; i < Math.floor(n * 0.18); i++) {
    const x = (Math.random() * 2 - 1) * 3.8;
    const z = (Math.random() * 2 - 1) * 3.8;
    // Snap ~40% of points to grid lines for grid look
    const snap = Math.random() < 0.4;
    pos.push(
      snap ? Math.round(x / 0.75) * 0.75 + gauss(0.025) : x,
      -2.2 + gauss(0.04),
      snap ? Math.round(z / 0.75) * 0.75 + gauss(0.025) : z
    );
  }

  // Two vertical support towers at x = ±1.7
  for (const tx of [-1.7, 1.7]) {
    for (let i = 0; i < Math.floor(n * 0.12); i++) {
      pos.push(tx + gauss(0.08), -2.2 + Math.random() * 4.8, gauss(0.08));
    }
  }

  // Horizontal cross-arms connecting the towers at three heights
  for (const hy of [1.8, 0.4, -0.9]) {
    for (let i = 0; i < Math.floor(n * 0.04); i++) {
      pos.push((Math.random() * 2 - 1) * 1.7 + gauss(0.03), hy + gauss(0.04), gauss(0.06));
    }
  }

  // Rocket sitting on the pad (smaller, centred)
  const rn = Math.floor(n * 0.50);
  // body
  for (let i = 0; i < Math.floor(rn * 0.30); i++) {
    const y = -1.2 + Math.random() * 2.5; const a = Math.random() * Math.PI * 2;
    pos.push((0.28 + gauss(0.025)) * Math.cos(a), y, (0.28 + gauss(0.025)) * Math.sin(a));
  }
  // nosecone
  for (let i = 0; i < Math.floor(rn * 0.18); i++) {
    const t = Math.random();
    const y = 1.3 + t * 1.0; const r = 0.28 * (1 - t) + gauss(0.02);
    pos.push(r * Math.cos(Math.random() * Math.PI * 2), y, r * Math.sin(Math.random() * Math.PI * 2));
  }
  // fins
  for (let f = 0; f < 4; f++) {
    const fa = (f / 4) * Math.PI * 2;
    for (let i = 0; i < Math.floor(rn * 0.22 / 4); i++) {
      const t = Math.random(); const s = Math.random() * (1 - t * 0.75);
      pos.push((0.28 + s * 0.7) * Math.cos(fa) + gauss(0.025), -1.2 - t * 0.8 + gauss(0.025), (0.28 + s * 0.7) * Math.sin(fa) + gauss(0.025));
    }
  }
  // engine bell
  for (let i = 0; i < Math.floor(rn * 0.30); i++) {
    const t = Math.random(); const y = -2.0 - t * 0.35;
    const r = 0.28 + t * 0.38 + gauss(0.025);
    pos.push(r * Math.cos(Math.random() * Math.PI * 2), y, r * Math.sin(Math.random() * Math.PI * 2));
  }

  return fill(pos);
}

// ── 17. Sun / engine core (dense sphere + 3 orbital rings + corona) ───────────
export function sunCore(n = 4500): Float32Array {
  const pos: number[] = [];

  // Dense inner sphere
  for (let i = 0; i < Math.floor(n * 0.40); i++) {
    const r = 1.1 * Math.cbrt(Math.random());
    const theta = Math.random() * Math.PI * 2; const phi = Math.acos(2 * Math.random() - 1);
    pos.push(r * Math.sin(phi) * Math.cos(theta), r * Math.sin(phi) * Math.sin(theta), r * Math.cos(phi));
  }

  // 3 orbital rings at different tilt angles
  const ringDefs = [
    { R: 1.9, rx: 0,            rz: 0 },
    { R: 2.1, rx: Math.PI/3,   rz: 0 },
    { R: 1.7, rx: 0,            rz: Math.PI/4 },
  ];
  for (const rd of ringDefs) {
    for (let i = 0; i < Math.floor(n * 0.14); i++) {
      const theta = Math.random() * Math.PI * 2;
      // Ring in XZ plane, then rotate by rx around X and rz around Z
      const x0 = rd.R * Math.cos(theta);
      const y0 = rd.R * Math.sin(theta) * Math.cos(rd.rx);
      const z0 = rd.R * Math.sin(theta) * Math.sin(rd.rz);
      pos.push(x0 + gauss(0.06), y0 + gauss(0.06), z0 + gauss(0.06));
    }
  }

  // Corona / outer glow cloud
  for (let i = 0; i < Math.floor(n * 0.30); i++) {
    const r = 1.2 + Math.random() * 1.3;
    const theta = Math.random() * Math.PI * 2; const phi = Math.acos(2 * Math.random() - 1);
    pos.push(r * Math.sin(phi) * Math.cos(theta), r * Math.sin(phi) * Math.sin(theta), r * Math.cos(phi));
  }

  return fill(pos);
}

// ── 18. Space Plane / Bird (horizontal swept-wing silhouette) ───────────────
export function spacePlane(n = 4200): Float32Array {
  const pos: number[] = [];

  // Fuselage body (tapered cylinder along Z: nose at +2.2, tail at -1.6)
  for (let i = 0; i < Math.floor(n * 0.22); i++) {
    const z = -1.6 + Math.random() * 3.8;
    const taper = z > 1.0 ? Math.max(0.04, (2.2 - z) / 1.2) : 1.0;
    const r = (0.22 * taper) + gauss(0.025);
    const a = Math.random() * Math.PI * 2;
    pos.push(r * Math.cos(a) + gauss(0.02), r * Math.sin(a) * 0.65 + gauss(0.02), z);
  }

  // Left wing — sweeps back from (0,0,0.5) to (-2.4, -0.18, -0.8)
  for (let i = 0; i < Math.floor(n * 0.27); i++) {
    const t = Math.random();
    const x = -t * 2.4;
    const z = 0.5 - t * 1.3;
    const y = -t * 0.18;
    const chord = 0.35 * (1 - t * 0.72);
    pos.push(x + gauss(0.07), y + (Math.random() - 0.5) * chord + gauss(0.04), z + gauss(0.07));
  }

  // Right wing
  for (let i = 0; i < Math.floor(n * 0.27); i++) {
    const t = Math.random();
    const x = t * 2.4;
    const z = 0.5 - t * 1.3;
    const y = -t * 0.18;
    const chord = 0.35 * (1 - t * 0.72);
    pos.push(x + gauss(0.07), y + (Math.random() - 0.5) * chord + gauss(0.04), z + gauss(0.07));
  }

  // Horizontal tail (small rear stabiliser)
  for (let i = 0; i < Math.floor(n * 0.08); i++) {
    const x = (Math.random() * 2 - 1) * 0.75;
    const z = -1.3 - Math.random() * 0.28;
    pos.push(x + gauss(0.04), gauss(0.03), z + gauss(0.04));
  }

  // Vertical tail fin
  for (let i = 0; i < Math.floor(n * 0.06); i++) {
    const y = Math.random() * 0.55;
    const z = -1.2 - Math.random() * 0.38;
    pos.push(gauss(0.03), y + gauss(0.025), z + gauss(0.03));
  }

  // Engine nacelles (two pods under wings)
  for (const ex of [-0.85, 0.85]) {
    for (let i = 0; i < Math.floor(n * 0.05 / 2); i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 0.065 + gauss(0.018);
      const z = -0.4 + Math.random() * 0.9;
      pos.push(ex + r * Math.cos(a) + gauss(0.015), -0.19 + r * Math.sin(a) * 0.6 + gauss(0.015), z);
    }
  }

  // Cockpit canopy (small dome on top of fuselage)
  for (let i = 0; i < Math.floor(n * 0.05); i++) {
    const t = Math.random();
    const z = 0.5 + t * 0.9;
    const r = 0.12 * Math.sin(t * Math.PI) + gauss(0.02);
    const a = Math.random() * Math.PI * 2;
    pos.push(r * Math.cos(a) * 0.7 + gauss(0.015), 0.18 + r * Math.abs(Math.sin(a)) + gauss(0.015), z);
  }

  return fill(pos);
}

// ── 19. Planet — dense sphere + lat/lon grid + tilted orbital ring + atmosphere ──
export function planet(n = 4500): Float32Array {
  const pos: number[] = [];
  const R = 2.2;

  // Dense filled sphere (the planet body)
  for (let i = 0; i < Math.floor(n * 0.38); i++) {
    const r = R * Math.cbrt(Math.random());
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    pos.push(
      r * Math.sin(phi) * Math.cos(theta),
      r * Math.sin(phi) * Math.sin(theta),
      r * Math.cos(phi)
    );
  }

  // Latitude lines (horizontal parallels)
  const latLines = [-1.5, -1.0, -0.4, 0, 0.4, 1.0, 1.5];
  for (const latY of latLines) {
    const ringR = Math.sqrt(Math.max(0, R * R - latY * latY));
    for (let i = 0; i < Math.floor(n * 0.03); i++) {
      const theta = Math.random() * Math.PI * 2;
      pos.push(
        ringR * Math.cos(theta) + gauss(0.035),
        latY + gauss(0.025),
        ringR * Math.sin(theta) + gauss(0.035)
      );
    }
  }

  // Longitude lines (vertical meridians)
  for (let m = 0; m < 8; m++) {
    const baseAngle = (m / 8) * Math.PI * 2;
    for (let i = 0; i < Math.floor(n * 0.025); i++) {
      const phi = Math.random() * Math.PI;
      const r2 = R + gauss(0.03);
      pos.push(
        r2 * Math.sin(phi) * Math.cos(baseAngle) + gauss(0.025),
        r2 * Math.cos(phi),
        r2 * Math.sin(phi) * Math.sin(baseAngle) + gauss(0.025)
      );
    }
  }

  // Tilted orbital ring (like Saturn) — tilted 28° on X
  const ringTilt = Math.PI / 6.5;
  const ringInner = 2.9, ringOuter = 4.4;
  for (let i = 0; i < Math.floor(n * 0.22); i++) {
    const theta = Math.random() * Math.PI * 2;
    const r = ringInner + Math.random() * (ringOuter - ringInner);
    const x0 = r * Math.cos(theta) + gauss(0.05);
    const z0 = r * Math.sin(theta) + gauss(0.05);
    const y0 = gauss(0.04);
    // Rotate by ringTilt around X axis
    pos.push(
      x0,
      y0 * Math.cos(ringTilt) - z0 * Math.sin(ringTilt),
      y0 * Math.sin(ringTilt) + z0 * Math.cos(ringTilt)
    );
  }

  // Outer atmosphere / glow cloud
  for (let i = 0; i < Math.floor(n * 0.10); i++) {
    const r = R + 0.05 + Math.random() * 0.45;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    pos.push(
      r * Math.sin(phi) * Math.cos(theta),
      r * Math.sin(phi) * Math.sin(theta),
      r * Math.cos(phi)
    );
  }

  return fill(pos);
}

// Registry for dynamic lookup
export const SHAPES: Record<ShapeName, () => Float32Array> = {
  chaos, streams, cube, torusKnot,
  disc, sapling, tree, globe,
  hexagon, hexChain, seal, diamond,
  hubSeal, starfield,
  rocket, launchPad, sunCore, spacePlane, planet, forest,
};

