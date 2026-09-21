'use client';

import { useEffect, useRef, useState } from 'react';
import {
  AmbientLight,
  BoxGeometry,
  CircleGeometry,
  Color,
  CylinderGeometry,
  DirectionalLight,
  Group,
  InstancedMesh,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  PerspectiveCamera,
  Scene,
  Vector3,
  WebGLRenderer,
} from 'three';
import { WECHAT_QR_ROWS, WECHAT_QR_SIZE } from '@/lib/wechat-qr';

/* timeline (ms): grow -> hold -> flatten into a scannable QR -> stay */
const T_HOLD_END = 3800;
const T_FLAT_END = 5450;
const T_FINAL = 1e9; // far-future timestamp: every clamp saturates at the crisp end state

const CANOPY = { cx: 0, cy: 4, cz: 0, rx: 15, ry: 12, rz: 11 };
const GROUND_Y = -16.5;
const TRUNK_TOP = -1;

/** Deterministic RNG so the tree looks identical on every visit and every build. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const easeInOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const easeOutBack = (x: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};

/** Static flat QR on a 2D canvas — fallback when WebGL is unavailable. */
function FlatQrCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    const S = 720;
    c.width = S;
    c.height = S;
    const N = WECHAT_QR_SIZE;
    const cell = S / (N + 8);
    const off = 4 * cell;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, S, S);
    ctx.fillStyle = '#0d0d10';
    WECHAT_QR_ROWS.forEach((row, j) => {
      for (let i = 0; i < N; i++) {
        if (row[i] === '1') ctx.fillRect(off + i * cell, off + j * cell, cell * 0.96, cell * 0.96);
      }
    });
  }, []);
  return <canvas ref={ref} className="h-full w-full" aria-label="WeChat QR code" />;
}

interface BranchSeg {
  ax: number; ay: number; az: number;
  bx: number; by: number; bz: number;
  r: number;
  birth: number;
}

/**
 * The 3D WeChat QR tree: leaves grow on a procedural tree, then settle into
 * the exact module grid of the owner's WeChat QR code (see src/lib/wechat-qr.ts).
 * The final state is a crisp, high-contrast, scanner-friendly QR that stays put.
 */
export default function QrTreeScene() {
  const hostRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    /* ---------- data: dark modules -> leaf list ---------- */
    const rng = mulberry32(20260921);
    const N = WECHAT_QR_SIZE;
    const half = (N - 1) / 2;
    const cells: number[] = [];
    WECHAT_QR_ROWS.forEach((row, j) => {
      for (let i = 0; i < N; i++) if (row[i] === '1') cells.push(i - half, j - half);
    });
    const K = cells.length / 2;

    /* canopy anchors: fibonacci distribution inside an ellipsoid */
    const anchors = new Float32Array(K * 3);
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let k = 0; k < K; k++) {
      const yy = 1 - (2 * (k + 0.5)) / K;
      const rr = Math.sqrt(Math.max(0, 1 - yy * yy));
      const th = golden * k;
      const depth = 0.38 + 0.62 * Math.sqrt(rng());
      anchors[k * 3] = CANOPY.cx + Math.cos(th) * rr * CANOPY.rx * depth + (rng() - 0.5) * 1.4;
      anchors[k * 3 + 1] = CANOPY.cy + yy * CANOPY.ry * depth + (rng() - 0.5) * 1.1;
      anchors[k * 3 + 2] = CANOPY.cz + Math.sin(th) * rr * CANOPY.rz * depth + (rng() - 0.5) * 1.4;
    }
    const anchorR = (k: number) =>
      Math.hypot(
        (anchors[k * 3] - CANOPY.cx) / CANOPY.rx,
        (anchors[k * 3 + 1] - CANOPY.cy) / CANOPY.ry,
        (anchors[k * 3 + 2] - CANOPY.cz) / CANOPY.rz
      );
    const cellR = (k: number) => Math.hypot(cells[2 * k], cells[2 * k + 1]);

    /* pair anchors <-> cells by radius so the collapse reads as a radial unfurl */
    const byAnchor = Array.from({ length: K }, (_, i) => i);
    const byCell = Array.from({ length: K }, (_, i) => i);
    byAnchor.sort((a, b) => anchorR(a) - anchorR(b));
    byCell.sort((a, b) => cellR(a) - cellR(b));
    let maxCellR = 1;
    for (let k = 0; k < K; k++) maxCellR = Math.max(maxCellR, cellR(k));

    const A = new Float32Array(K * 3);
    const C = new Float32Array(K * 3);
    const growDelay = new Float32Array(K);
    const flatDelay = new Float32Array(K);
    const rot0 = new Float32Array(K * 3);
    const sizeVar = new Float32Array(K);
    const toneMix = new Float32Array(K);
    for (let t = 0; t < K; t++) {
      const a = byAnchor[t];
      const c = byCell[t];
      A[t * 3] = anchors[a * 3];
      A[t * 3 + 1] = anchors[a * 3 + 1];
      A[t * 3 + 2] = anchors[a * 3 + 2];
      C[t * 3] = cells[2 * c];
      C[t * 3 + 1] = cells[2 * c + 1];
      C[t * 3 + 2] = 0;
      const up = clamp01((A[t * 3 + 1] - (CANOPY.cy - CANOPY.ry)) / (2 * CANOPY.ry));
      growDelay[t] = up * 1650 + rng() * 260;
      flatDelay[t] = (cellR(c) / maxCellR) * 820 + rng() * 90;
      rot0[t * 3] = (rng() - 0.5) * 1.7;
      rot0[t * 3 + 1] = (rng() - 0.5) * 1.7;
      rot0[t * 3 + 2] = (rng() - 0.5) * 1.7;
      sizeVar[t] = rng();
      toneMix[t] = rng();
    }

    /* ---------- procedural branches ---------- */
    const segs: BranchSeg[] = [];
    const branch = (
      px: number, py: number, pz: number,
      dx: number, dy: number, dz: number,
      len: number, rad: number, depth: number, birth: number
    ): void => {
      const ex = px + dx * len;
      const ey = py + dy * len;
      const ez = pz + dz * len;
      segs.push({ ax: px, ay: py, az: pz, bx: ex, by: ey, bz: ez, r: rad, birth });
      if (depth >= 4) return;
      const kids = depth === 0 ? 4 : 2 + (rng() < 0.4 ? 1 : 0);
      for (let i = 0; i < kids; i++) {
        const ndx = dx + (rng() - 0.5) * 1.6;
        const ndy = dy * 0.65 + rng() * 1.1 + 0.2;
        const ndz = dz + (rng() - 0.5) * 1.6;
        const inv = 1 / (Math.hypot(ndx, ndy, ndz) || 1);
        branch(ex, ey, ez, ndx * inv, ndy * inv, ndz * inv, len * (0.66 + rng() * 0.14), rad * 0.6, depth + 1, birth + 240);
      }
    };
    branch(0, TRUNK_TOP, 0, 0, 1, 0, 9.5, 0.8, 0, 340);

    /* ---------- renderer (with graceful WebGL failure) ---------- */
    let renderer: WebGLRenderer;
    try {
      if (!('WebGLRenderingContext' in window)) throw new Error('WebGL unavailable');
      renderer = new WebGLRenderer({ antialias: true });
      if (!renderer.getContext()) throw new Error('WebGL context failed');
    } catch {
      setFailed(true);
      return;
    }
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    host.appendChild(renderer.domElement);
    renderer.domElement.style.touchAction = 'none';

    const scene = new Scene();
    scene.background = new Color('#0d1421');
    const camera = new PerspectiveCamera(38, 1, 0.1, 400);
    const world = new Group();
    scene.add(world);

    const amb = new AmbientLight(0xffffff, 0.95);
    scene.add(amb);
    const dir = new DirectionalLight(0xffffff, 1.5);
    dir.position.set(12, 20, 16);
    scene.add(dir);

    const woodColor = 0x4a3b57;
    const trunkMat = new MeshStandardMaterial({ color: woodColor, roughness: 0.85, transparent: true });
    const trunk = new Mesh(new CylinderGeometry(0.85, 1.3, 14.5, 7), trunkMat);
    trunk.position.set(0, -8.25, 0);
    world.add(trunk);

    const groundMat = new MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.25 });
    const ground = new Mesh(new CircleGeometry(13.5, 40), groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = GROUND_Y;
    world.add(ground);

    const branchMat = new MeshStandardMaterial({ color: woodColor, roughness: 0.85, transparent: true });
    const branchMesh = new InstancedMesh(new CylinderGeometry(1, 1, 1, 5), branchMat, segs.length);
    branchMesh.frustumCulled = false;
    world.add(branchMesh);

    const leafMat = new MeshStandardMaterial({ roughness: 0.5, metalness: 0.05, transparent: true });
    const leafMesh = new InstancedMesh(new BoxGeometry(0.94, 0.94, 0.16), leafMat, K);
    leafMesh.frustumCulled = false;
    world.add(leafMesh);

    /* ---------- palettes ---------- */
    const ink = new Color('#0d0d10');
    const white = new Color('#ffffff');
    const bgTreeDark = new Color('#0d1421');
    const bgTreeLight = new Color('#f3f0e9');
    const leafDarkA = new Color('#2dd4bf');
    const leafDarkB = new Color('#5eead4');
    const leafLightA = new Color('#0d9488');
    const leafLightB = new Color('#14b8a6');
    const tmpColor = new Color();
    const isDark = () => document.documentElement.classList.contains('dark');

    const dummy = new Object3D();
    const UP = new Vector3(0, 1, 0);
    const segDir = new Vector3();

    let D = 74; // frontal camera distance that frames grid + quiet zone (set on resize)
    let finalRendered = false;
    const resize = () => {
      const w = host.clientWidth || 320;
      const h = host.clientHeight || 320;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      const margin = (N + 8) / 2;
      const halfTan = Math.tan(MathUtils.degToRad(camera.fov / 2));
      D = Math.max(margin / halfTan, margin / (halfTan * camera.aspect)) * 1.02;
      camera.updateProjectionMatrix();
      if (finalRendered) drawFrame(T_FINAL);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(host);
    resize();

    /* ---------- drag-to-rotate (tree phase only) ---------- */
    let dragging = false;
    let px0 = 0;
    let py0 = 0;
    let rotY = 0;
    let rotX = 0;
    let rotYT = 0;
    let rotXT = 0;
    const ac = new AbortController();
    const el = renderer.domElement;
    el.addEventListener('pointerdown', (e) => {
      dragging = true;
      px0 = e.clientX;
      py0 = e.clientY;
      el.setPointerCapture(e.pointerId);
    }, { signal: ac.signal });
    el.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      rotYT += (e.clientX - px0) * 0.006;
      rotXT = MathUtils.clamp(rotXT + (e.clientY - py0) * 0.004, -0.6, 0.6);
      px0 = e.clientX;
      py0 = e.clientY;
    }, { signal: ac.signal });
    const endDrag = () => { dragging = false; };
    el.addEventListener('pointerup', endDrag, { signal: ac.signal });
    el.addEventListener('pointercancel', endDrag, { signal: ac.signal });

    /* ---------- the animation ---------- */
    const dark = isDark();
    const cA = dark ? leafDarkA : leafLightA;
    const cB = dark ? leafDarkB : leafLightB;

    function drawFrame(t: number): void {
      const fColor = clamp01((t - T_HOLD_END) / 950);       // leaf ink + bg blend
      const fCam = easeInOut(clamp01((t - T_HOLD_END) / 1200)); // camera move
      const fTree = 1 - easeInOut(clamp01((t - T_HOLD_END) / 800)); // sway/drag fade-out

      /* background + lights */
      (scene.background as Color).copy(isDark() ? bgTreeDark : bgTreeLight).lerp(white, clamp01((t - T_HOLD_END - 150) / 800));
      amb.intensity = 0.95 + 0.3 * fColor;
      dir.intensity = 1.5 * (1 - fColor) + 0.3 * fColor;

      /* world orientation: sway + user drag, both fading to frontal */
      rotY += (rotYT - rotY) * 0.12;
      rotX += (rotXT - rotX) * 0.12;
      world.rotation.y = (Math.sin(t * 0.00055) * 0.08 + rotY) * fTree;
      world.rotation.x = rotX * fTree;

      /* camera: three-quarter view -> straight-on frontal */
      camera.position.set(0, 1 * (1 - fCam), 54 + (D - 54) * fCam);
      camera.lookAt(0, -1.5 * (1 - fCam), 0);

      /* trunk / branches / ground grow then dissolve */
      const woodFade = 1 - clamp01((t - T_HOLD_END) / 700);
      trunkMat.opacity = woodFade;
      branchMat.opacity = woodFade;
      groundMat.opacity = 0.25 * woodFade;

      segs.forEach((s, i) => {
        const k = easeOutBack(clamp01((t - s.birth) / 450));
        if (k <= 0) collapseBranch(i, s);
        else {
          segDir.set(s.bx - s.ax, s.by - s.ay, s.bz - s.az);
          const len = segDir.length() || 0.001;
          dummy.position.set(s.ax + (s.bx - s.ax) * (k / 2), s.ay + (s.by - s.ay) * (k / 2), s.az + (s.bz - s.az) * (k / 2));
          dummy.quaternion.setFromUnitVectors(UP, segDir.normalize());
          dummy.scale.set(s.r * (0.5 + 0.5 * k), len * Math.max(k, 0.001), s.r * (0.5 + 0.5 * k));
          dummy.updateMatrix();
          branchMesh.setMatrixAt(i, dummy.matrix);
        }
      });
      branchMesh.instanceMatrix.needsUpdate = true;

      /* leaves: pop in on the tree, then settle into the QR grid */
      for (let k = 0; k < K; k++) {
        const growP = clamp01((t - growDelay[k]) / 430);
        const pop = growP <= 0 ? 0 : easeOutBack(growP);
        const flatP = easeInOut(clamp01((t - T_HOLD_END - flatDelay[k]) / 620));
        const treeScale = pop * (0.6 + 0.45 * sizeVar[k]);
        dummy.position.set(
          A[k * 3] + (C[k * 3] - A[k * 3]) * flatP,
          A[k * 3 + 1] + (C[k * 3 + 1] - A[k * 3 + 1]) * flatP,
          A[k * 3 + 2] + (C[k * 3 + 2] - A[k * 3 + 2]) * flatP
        );
        const rotBlend = 1 - flatP;
        dummy.rotation.set(rot0[k * 3] * rotBlend, rot0[k * 3 + 1] * rotBlend, rot0[k * 3 + 2] * rotBlend);
        const s = treeScale * (1 - flatP) + flatP;
        dummy.scale.set(Math.max(s, 0.001), Math.max(s, 0.001), Math.max(s, 0.001));
        dummy.updateMatrix();
        leafMesh.setMatrixAt(k, dummy.matrix);

        tmpColor.copy(cA).lerp(cB, toneMix[k]).lerp(ink, fColor);
        leafMesh.setColorAt(k, tmpColor);
      }
      leafMesh.instanceMatrix.needsUpdate = true;
      if (leafMesh.instanceColor) leafMesh.instanceColor.needsUpdate = true;

      renderer.render(scene, camera);
    }

    /** collapsed helper so hidden early branches don't flicker at the origin */
    function collapseBranch(i: number, s: BranchSeg): void {
      dummy.position.set(s.ax, s.ay, s.az);
      dummy.scale.set(0.001, 0.001, 0.001);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      branchMesh.setMatrixAt(i, dummy.matrix);
    }

    let raf = 0;

    /* reduced motion: jump straight to the scannable state */
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      drawFrame(T_FINAL);
      finalRendered = true;
      return () => cleanup();
    }

    const t0 = performance.now();
    const loop = (now: number): void => {
      const t = now - t0;
      if (t > T_FLAT_END) {
        drawFrame(T_FINAL);
        finalRendered = true;
        return; // stay crisp and scannable; stop burning frames
      }
      drawFrame(t);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    function cleanup(): void {
      ac.abort();
      ro.disconnect();
      cancelAnimationFrame(raf);
      world.traverse((obj) => {
        const m = obj as Mesh | InstancedMesh;
        if (m.geometry) m.geometry.dispose();
        const mat = m.material as MeshStandardMaterial | MeshBasicMaterial | undefined;
        if (mat && 'dispose' in mat) mat.dispose();
      });
      renderer.dispose();
      if (el.parentElement === host) host.removeChild(el);
    }

    return () => cleanup();
  }, []);

  return (
    <div className="h-full w-full">
      {failed ? <FlatQrCanvas /> : <div ref={hostRef} className="h-full w-full" />}
    </div>
  );
}
