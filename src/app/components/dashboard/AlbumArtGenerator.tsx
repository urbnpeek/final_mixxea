import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import * as api from './api';
import {
  X, Download, Shuffle, Zap, CheckCircle, Star, Sparkles,
  Info, Lock, ImageIcon, ChevronRight, RefreshCw,
} from 'lucide-react';

// ── Seeded PRNG (Mulberry32) ──────────────────────────────────────────────────
function mkRng(seed: number) {
  let s = (seed ^ 0xDEADBEEF) >>> 0;
  return (): number => {
    s += 0x6D2B79F5;
    let t = Math.imul(s ^ (s >>> 15), s | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Color helpers ─────────────────────────────────────────────────────────────
function hexA(hex: string, a: number): string {
  if (!hex || hex.length < 7) return `rgba(128,128,128,${a})`;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a})`;
}
function hexRgb(hex: string): [number, number, number] {
  if (!hex || hex.length < 7) return [128, 128, 128];
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
}

// ── Palettes ──────────────────────────────────────────────────────────────────
const PALETTES: Record<string, { name: string; colors: string[]; swatch: string[] }> = {
  mixxea:    { name: 'MIXXEA',        colors: ['#00C4FF', '#7B5FFF', '#D63DF6', '#FF5252'],   swatch: ['#00C4FF', '#7B5FFF', '#D63DF6', '#FF5252'] },
  gold:      { name: 'Gold Rush',     colors: ['#FFD700', '#FF8C00', '#FF4500', '#1A0500'],   swatch: ['#FFD700', '#FF8C00', '#FF4500', '#1A0500'] },
  midnight:  { name: 'Midnight',      colors: ['#00BFFF', '#0088FF', '#0033CC', '#000033'],   swatch: ['#00BFFF', '#0088FF', '#0033CC', '#000022'] },
  crimson:   { name: 'Crimson',       colors: ['#FF4466', '#CC0033', '#880022', '#220011'],   swatch: ['#FF4466', '#CC0033', '#880022', '#110008'] },
  emerald:   { name: 'Emerald',       colors: ['#00FF88', '#00CC66', '#009944', '#003311'],   swatch: ['#00FF88', '#00CC66', '#009944', '#002211'] },
  mono:      { name: 'Monochrome',    colors: ['#FFFFFF', '#AAAAAA', '#555555', '#111111'],   swatch: ['#FFFFFF', '#AAAAAA', '#555555', '#111111'] },
  sunset:    { name: 'Sunset',        colors: ['#FF6B6B', '#FF9500', '#FFD000', '#FF1493'],   swatch: ['#FF6B6B', '#FF9500', '#FFD000', '#FF1493'] },
  ocean:     { name: 'Ocean',         colors: ['#00F5FF', '#0080FF', '#0030AA', '#000820'],   swatch: ['#00F5FF', '#0080FF', '#0030AA', '#000820'] },
};

// ── Style definitions ─────────────────────────────────────────────────────────
const STYLES = [
  { id: 'cosmic',    name: 'Cosmic',       desc: 'Galaxy & nebula',     bg: 'radial-gradient(ellipse at 30% 40%,rgba(123,95,255,.5),transparent 55%),radial-gradient(ellipse at 75% 65%,rgba(214,61,246,.4),transparent 55%),#000010' },
  { id: 'lowpoly',   name: 'Low Poly',     desc: 'Geometric triangles', bg: 'linear-gradient(135deg,#7B5FFF 0%,#D63DF6 50%,#FF5252 100%)' },
  { id: 'gradient',  name: 'Gradient',     desc: 'Mesh colour flow',    bg: 'radial-gradient(ellipse at 20% 25%,rgba(0,196,255,.6),transparent 50%),radial-gradient(ellipse at 80% 75%,rgba(214,61,246,.6),transparent 50%),#050514' },
  { id: 'minimal',   name: 'Minimal',      desc: 'Clean & bold',        bg: 'linear-gradient(145deg,#141414 0%,#222 100%)' },
  { id: 'glitch',    name: 'Glitch',       desc: 'Digital / cyber',     bg: 'linear-gradient(180deg,#000 0%,#001533 45%,#000 100%)' },
  { id: 'retrowave', name: 'Retrowave',    desc: '80s synthwave',       bg: 'linear-gradient(180deg,#0A001A 0%,#1A0033 30%,#CC0055 55%,#FF6600 65%,#000010 66%)' },
];

// ── Plan config ───────────────────────────────────────────────────────────────
const PLAN_CFG: Record<string, { free: number; cost: number; color: string; label: string }> = {
  starter: { free: 0,  cost: 5, color: '#9CA3AF', label: 'Starter' },
  growth:  { free: 3,  cost: 3, color: '#10B981', label: 'Growth'  },
  pro:     { free: 10, cost: 2, color: '#7B5FFF', label: 'Pro'     },
};

// ═══════════════════════════════════════════════════════════════════════════════
//  CANVAS DRAWING FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/** Shared text overlay – renders artist + title with dark gradient base */
function drawText(ctx: CanvasRenderingContext2D, s: number, artist: string, title: string, accent: string) {
  if (!artist && !title) return;
  const p = s * 0.055;
  // Bottom vignette
  const oh = s * 0.34;
  const grad = ctx.createLinearGradient(0, s - oh, 0, s);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(0.55, 'rgba(0,0,0,0.55)');
  grad.addColorStop(1, 'rgba(0,0,0,0.92)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, s - oh, s, oh);

  let yOff = 0;
  if (title) {
    const fs = s * 0.072;
    ctx.font = `900 ${fs}px Arial, sans-serif`;
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.shadowColor = 'rgba(0,0,0,0.95)';
    ctx.shadowBlur = s * 0.018;
    let t = title;
    while (ctx.measureText(t).width > s - p * 2 && t.length > 3) t = t.slice(0, -4) + '…';
    ctx.fillText(t, p, s - p);
    ctx.shadowBlur = 0;
    yOff = fs * 1.28;
  }
  if (artist) {
    const fs = s * 0.038;
    ctx.font = `600 ${fs}px Arial, sans-serif`;
    ctx.fillStyle = accent;
    ctx.textBaseline = 'bottom';
    ctx.shadowColor = 'rgba(0,0,0,0.9)';
    ctx.shadowBlur = s * 0.012;
    let a = artist.toUpperCase();
    while (ctx.measureText(a).width > s - p * 2 && a.length > 3) a = a.slice(0, -4) + '…';
    ctx.fillText(a, p, s - p - yOff);
    ctx.shadowBlur = 0;
  }
}

// ── Cosmic ────────────────────────────────────────────────────────────────────
function drawCosmic(ctx: CanvasRenderingContext2D, s: number, C: string[], rng: () => number, artist: string, title: string) {
  // Background
  const bg = ctx.createLinearGradient(0, 0, s * 0.4, s);
  bg.addColorStop(0, '#000008'); bg.addColorStop(1, '#00001A');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, s, s);

  // Nebula clouds
  for (let i = 0; i < 4; i++) {
    const x = rng() * s, y = rng() * s, r = (0.2 + rng() * 0.38) * s;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const col = C[i % C.length];
    g.addColorStop(0, hexA(col, 0.3)); g.addColorStop(0.55, hexA(col, 0.1)); g.addColorStop(1, hexA(col, 0));
    ctx.fillStyle = g; ctx.fillRect(0, 0, s, s);
  }

  // Stars — three size classes
  for (let i = 0; i < 420; i++) {
    const x = rng() * s, y = rng() * s, v = rng();
    const r = v > 0.96 ? (rng() * 2 + 1.5) * s / 3000
            : v > 0.82 ? (rng() * 1 + 0.7) * s / 3000
            : (rng() * 0.5 + 0.2) * s / 3000;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = v > 0.88 ? `rgba(255,255,240,${0.5 + rng() * 0.5})` : `rgba(200,210,255,${0.3 + rng() * 0.5})`;
    ctx.fill();
  }

  // Bright accent star + lens cross-rays
  const lx = (0.18 + rng() * 0.64) * s, ly = (0.1 + rng() * 0.52) * s;
  const lg = ctx.createRadialGradient(lx, ly, 0, lx, ly, s * 0.1);
  lg.addColorStop(0, hexA(C[0], 0.95)); lg.addColorStop(0.1, hexA(C[0], 0.5)); lg.addColorStop(1, hexA(C[0], 0));
  ctx.fillStyle = lg; ctx.fillRect(0, 0, s, s);
  ctx.save(); ctx.translate(lx, ly);
  for (let i = 0; i < 4; i++) {
    ctx.save(); ctx.rotate(i * Math.PI / 4 + Math.PI / 8);
    const rG = ctx.createLinearGradient(0, 0, 0, -s * 0.2);
    rG.addColorStop(0, hexA(C[0], 0.75)); rG.addColorStop(1, hexA(C[0], 0));
    ctx.fillStyle = rG;
    const lw = s * 0.0016;
    ctx.fillRect(-lw, 0, lw * 2, -s * 0.2);
    ctx.restore();
  }
  ctx.restore();
  drawText(ctx, s, artist, title, C[0]);
}

// ── Low-Poly ──────────────────────────────────────────────────────────────────
function drawLowPoly(ctx: CanvasRenderingContext2D, s: number, C: string[], rng: () => number, artist: string, title: string) {
  ctx.fillStyle = '#080812'; ctx.fillRect(0, 0, s, s);

  const COLS = 11, ROWS = 11;
  const cw = s / COLS, rh = s / ROWS;
  const W = COLS + 2;
  const pts: [number, number][] = [];
  for (let r = 0; r <= ROWS + 1; r++) {
    for (let c = 0; c <= COLS + 1; c++) {
      const jx = (c === 0 || c === COLS + 1) ? 0 : (rng() - 0.5) * cw * 0.85;
      const jy = (r === 0 || r === ROWS + 1) ? 0 : (rng() - 0.5) * rh * 0.85;
      pts.push([c * cw + jx, r * rh + jy]);
    }
  }
  const triCol = (y: number): string => {
    const t = Math.max(0, Math.min(1, y / s + (rng() - 0.5) * 0.2));
    const ci = Math.min(Math.floor(t * (C.length - 1)), C.length - 2);
    const cf = t * (C.length - 1) - ci;
    const [r1, g1, b1] = hexRgb(C[ci]), [r2, g2, b2] = hexRgb(C[ci + 1] || C[ci]);
    const d = 0.4 + rng() * 0.6;
    return `rgb(${Math.round((r1 + (r2-r1)*cf)*d)},${Math.round((g1+(g2-g1)*cf)*d)},${Math.round((b1+(b2-b1)*cf)*d)})`;
  };
  for (let r = 0; r < ROWS + 1; r++) {
    for (let c = 0; c < COLS + 1; c++) {
      const tl = pts[r*W+c], tr = pts[r*W+c+1], bl = pts[(r+1)*W+c], br = pts[(r+1)*W+c+1];
      ctx.beginPath(); ctx.moveTo(tl[0],tl[1]); ctx.lineTo(tr[0],tr[1]); ctx.lineTo(br[0],br[1]); ctx.closePath();
      ctx.fillStyle = triCol((tl[1]+tr[1]+br[1])/3); ctx.fill();
      ctx.beginPath(); ctx.moveTo(tl[0],tl[1]); ctx.lineTo(bl[0],bl[1]); ctx.lineTo(br[0],br[1]); ctx.closePath();
      ctx.fillStyle = triCol((tl[1]+bl[1]+br[1])/3); ctx.fill();
    }
  }
  drawText(ctx, s, artist, title, '#FFFFFF');
}

// ── Gradient Flow ─────────────────────────────────────────────────────────────
function drawGradient(ctx: CanvasRenderingContext2D, s: number, C: string[], rng: () => number, artist: string, title: string) {
  ctx.fillStyle = '#030310'; ctx.fillRect(0, 0, s, s);

  const blobs = [
    { x: 0.15, y: 0.22, r: 0.58 }, { x: 0.8, y: 0.28, r: 0.52 },
    { x: 0.3, y: 0.78, r: 0.5 },   { x: 0.78, y: 0.75, r: 0.48 },
    { x: 0.5, y: 0.5,  r: 0.4 },
  ];
  blobs.forEach((b, i) => {
    const x = (b.x + (rng()-0.5)*0.18) * s;
    const y = (b.y + (rng()-0.5)*0.18) * s;
    const r = (b.r + (rng()-0.5)*0.08) * s;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const col = C[i % C.length];
    g.addColorStop(0, hexA(col, 0.58)); g.addColorStop(0.5, hexA(col, 0.2)); g.addColorStop(1, hexA(col, 0));
    ctx.fillStyle = g; ctx.fillRect(0, 0, s, s);
  });

  // Subtle grain
  for (let i = 0; i < 2500; i++) {
    const x = rng()*s, y = rng()*s;
    ctx.fillStyle = `rgba(255,255,255,${rng()*0.04})`;
    const dot = s/3000 * 1.5;
    ctx.fillRect(x, y, dot, dot);
  }
  // Vignette
  const vig = ctx.createRadialGradient(s/2, s/2, s*0.22, s/2, s/2, s*0.9);
  vig.addColorStop(0, 'rgba(0,0,0,0)'); vig.addColorStop(1, 'rgba(0,0,0,0.72)');
  ctx.fillStyle = vig; ctx.fillRect(0, 0, s, s);
  drawText(ctx, s, artist, title, C[0]);
}

// ── Minimal ───────────────────────────────────────────────────────────────────
function drawMinimal(ctx: CanvasRenderingContext2D, s: number, C: string[], rng: () => number, artist: string, title: string) {
  ctx.fillStyle = '#0A0A0A'; ctx.fillRect(0, 0, s, s);
  const v = Math.floor(rng() * 3);

  if (v === 0) {
    // Large gradient circle
    const cx = s/2, cy = s*0.42, r = s*0.32;
    const g = ctx.createRadialGradient(cx - r*0.18, cy - r*0.18, 0, cx, cy, r);
    g.addColorStop(0, C[0]); g.addColorStop(0.55, C[1]); g.addColorStop(1, C[2] || C[1]);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2); ctx.fill();
    // Outer ring
    ctx.beginPath(); ctx.arc(cx, cy, r + s*0.022, 0, Math.PI*2);
    ctx.strokeStyle = hexA(C[0], 0.28); ctx.lineWidth = s*0.003; ctx.stroke();
    // Inner ring
    ctx.beginPath(); ctx.arc(cx, cy, r*0.55, 0, Math.PI*2);
    ctx.strokeStyle = hexA('#FFFFFF', 0.15); ctx.lineWidth = s*0.002; ctx.stroke();

  } else if (v === 1) {
    // Diagonal colour split
    const g = ctx.createLinearGradient(0, 0, s, s);
    g.addColorStop(0, C[1]); g.addColorStop(1, C[0]);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(s,0); ctx.lineTo(s, s*0.65); ctx.lineTo(0, s*0.38); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(0, s*0.38); ctx.lineTo(s, s*0.65);
    ctx.strokeStyle = hexA('#FFFFFF', 0.3); ctx.lineWidth = s*0.004; ctx.stroke();

  } else {
    // Nested squares
    for (let i = 0; i < 5; i++) {
      const sz = s*(0.9 - i*0.15), off = (s-sz)/2;
      ctx.strokeStyle = hexA(C[i%C.length], 0.7 - i*0.1);
      ctx.lineWidth = s*0.005; ctx.strokeRect(off, off, sz, sz);
    }
    const gf = ctx.createLinearGradient(s*0.28, s*0.28, s*0.72, s*0.72);
    gf.addColorStop(0, hexA(C[0], 0.85)); gf.addColorStop(1, hexA(C[1], 0.85));
    ctx.fillStyle = gf; ctx.fillRect(s*0.28, s*0.28, s*0.44, s*0.44);
  }

  // Top-left accent bar
  ctx.fillStyle = C[0]; ctx.fillRect(0, 0, s*0.14, s*0.0045);
  drawText(ctx, s, artist, title, C[0]);
}

// ── Glitch ────────────────────────────────────────────────────────────────────
function drawGlitch(ctx: CanvasRenderingContext2D, s: number, C: string[], rng: () => number, artist: string, title: string) {
  ctx.fillStyle = '#010510'; ctx.fillRect(0, 0, s, s);

  // Base gradient
  const bg = ctx.createLinearGradient(0, 0, 0, s);
  bg.addColorStop(0, hexA(C[2]||C[1], 0.18)); bg.addColorStop(0.5, hexA(C[1], 0.08)); bg.addColorStop(1, hexA(C[0], 0.22));
  ctx.fillStyle = bg; ctx.fillRect(0, 0, s, s);

  // Glitch horizontal strips with channel separation
  const strips = Math.floor(9 + rng()*14);
  for (let i = 0; i < strips; i++) {
    const y = rng()*s, h = (rng()*0.055 + 0.005)*s;
    const ox = (rng()-0.5)*s*0.15;
    ctx.fillStyle = hexA(C[0], 0.6); ctx.fillRect(ox + s*0.02, y, s, h);
    ctx.fillStyle = hexA(C[1], 0.5); ctx.fillRect(-ox*0.65, y + h*0.28, s, h*0.72);
    if (rng() > 0.65) { ctx.fillStyle = `rgba(255,255,255,${rng()*0.18})`; ctx.fillRect(0, y, s, h*0.28); }
  }
  // Vertical neon bars
  for (let i = 0; i < 7; i++) {
    const x = rng()*s, w = (rng()*0.005+0.001)*s;
    ctx.fillStyle = hexA(C[i%C.length], 0.42 + rng()*0.3);
    ctx.fillRect(x, 0, w, s);
  }
  // Scanlines
  ctx.globalAlpha = 0.09;
  for (let y = 0; y < s; y += s*0.0038) {
    ctx.fillStyle = '#000000'; ctx.fillRect(0, y, s, s*0.002);
  }
  ctx.globalAlpha = 1;
  drawText(ctx, s, artist, title, C[0]);
}

// ── Retrowave ─────────────────────────────────────────────────────────────────
function drawRetrowave(ctx: CanvasRenderingContext2D, s: number, C: string[], rng: () => number, artist: string, title: string) {
  const hy = s * 0.54;

  // Sky
  const sky = ctx.createLinearGradient(0, 0, 0, hy);
  sky.addColorStop(0, '#010012'); sky.addColorStop(0.45, '#0D0028');
  sky.addColorStop(0.78, hexA(C[2]||'#440033', 0.85)); sky.addColorStop(1, hexA(C[3]||'#880033', 0.92));
  ctx.fillStyle = sky; ctx.fillRect(0, 0, s, hy);

  // Ground
  ctx.fillStyle = '#000012'; ctx.fillRect(0, hy, s, s - hy);

  // Stars
  for (let i = 0; i < 140; i++) {
    const x = rng()*s, y = rng()*hy*0.78, v = rng();
    const r = (v*0.9+0.3)*s/3000;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2);
    ctx.fillStyle = `rgba(255,255,255,${0.3+rng()*0.7})`; ctx.fill();
  }

  // Sun — upper semicircle
  const sunR = s * 0.2, sx = s/2;
  const sunG = ctx.createRadialGradient(sx, hy, 0, sx, hy, sunR);
  sunG.addColorStop(0, '#FFFFFF'); sunG.addColorStop(0.06, C[0]);
  sunG.addColorStop(0.5, C[2]||'#FF0066'); sunG.addColorStop(1, C[3]||'#FF6600');
  ctx.fillStyle = sunG;
  ctx.beginPath(); ctx.arc(sx, hy, sunR, Math.PI, 0, false); ctx.closePath(); ctx.fill();

  // Horizontal cuts through sun (lower portion)
  ctx.fillStyle = '#000012';
  const cuts = 8;
  for (let i = 0; i < cuts; i++) {
    const t = i / cuts;
    const lY = hy + sunR * t * 0.92;
    const lH = (sunR / cuts) * (0.18 + t*0.5);
    if (lY < hy + sunR) ctx.fillRect(sx - sunR, lY, sunR*2, lH);
  }
  ctx.fillRect(0, hy, s, s-hy); // re-fill ground over sun lower half

  // Perspective grid lines
  const vp = { x: s/2, y: hy };
  const gridCol = C[1] || '#FF00FF';
  ctx.globalAlpha = 0.75;
  // Vertical (convergent) lines
  for (let i = -18; i <= 18; i++) {
    ctx.beginPath(); ctx.moveTo(vp.x, vp.y); ctx.lineTo(vp.x + i*(s*0.065), s);
    ctx.strokeStyle = hexA(gridCol, 0.75); ctx.lineWidth = s*0.0012; ctx.stroke();
  }
  // Horizontal (perspective-spaced) lines
  for (let i = 1; i <= 10; i++) {
    const t = Math.pow(i/10, 2.2);
    const ly = hy + t*(s - hy);
    ctx.beginPath(); ctx.moveTo(0, ly); ctx.lineTo(s, ly);
    ctx.strokeStyle = hexA(gridCol, 0.65); ctx.lineWidth = s*0.001; ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // Neon text (special glow)
  if (artist || title) {
    const p = s*0.055, oh = s*0.32;
    const og = ctx.createLinearGradient(0, s-oh, 0, s);
    og.addColorStop(0,'rgba(0,0,0,0)'); og.addColorStop(1,'rgba(0,0,10,0.92)');
    ctx.fillStyle = og; ctx.fillRect(0, s-oh, s, oh);
    let yOff = 0;
    if (title) {
      const fs = s*0.072;
      ctx.font = `900 ${fs}px Arial, sans-serif`;
      ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
      ctx.shadowColor = C[0]; ctx.shadowBlur = s*0.028; ctx.fillStyle = '#FFFFFF';
      let t = title;
      while (ctx.measureText(t).width > s-p*2 && t.length > 3) t = t.slice(0,-4)+'…';
      ctx.fillText(t, p, s-p); ctx.shadowBlur = 0; yOff = fs*1.28;
    }
    if (artist) {
      const fs = s*0.038;
      ctx.font = `600 ${fs}px Arial, sans-serif`;
      ctx.fillStyle = C[1]||'#FF00FF';
      ctx.shadowColor = C[1]||'#FF00FF'; ctx.shadowBlur = s*0.014;
      let a = artist.toUpperCase();
      while (ctx.measureText(a).width > s-p*2 && a.length > 3) a = a.slice(0,-4)+'…';
      ctx.fillText(a, p, s-p-yOff); ctx.shadowBlur = 0;
    }
  }
}

// ── Master draw dispatcher ────────────────────────────────────────────────────
function drawArt(ctx: CanvasRenderingContext2D, s: number, style: string, palKey: string, seed: number, artist: string, title: string) {
  const C = PALETTES[palKey]?.colors || PALETTES.mixxea.colors;
  const rng = mkRng(seed);
  ctx.clearRect(0, 0, s, s);
  switch (style) {
    case 'cosmic':    drawCosmic(ctx, s, C, rng, artist, title); break;
    case 'lowpoly':   drawLowPoly(ctx, s, C, rng, artist, title); break;
    case 'gradient':  drawGradient(ctx, s, C, rng, artist, title); break;
    case 'minimal':   drawMinimal(ctx, s, C, rng, artist, title); break;
    case 'glitch':    drawGlitch(ctx, s, C, rng, artist, title); break;
    case 'retrowave': drawRetrowave(ctx, s, C, rng, artist, title); break;
    default:          drawCosmic(ctx, s, C, rng, artist, title);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
interface Props {
  artistName: string;
  releaseTitle: string;
  plan: string;
  credits: number;
  token: string;
  onUse: (dataUrl: string) => void;
  onClose: () => void;
}

export function AlbumArtGenerator({ artistName, releaseTitle, plan, credits: initCredits, token, onUse, onClose }: Props) {
  const [style, setStyle] = useState('cosmic');
  const [palette, setPalette] = useState('mixxea');
  const [showText, setShowText] = useState(true);
  const [artist, setArtist] = useState(artistName);
  const [title, setTitle] = useState(releaseTitle);
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 99999));
  const [generating, setGenerating] = useState(false);
  const [status, setStatus] = useState<any>(null);
  const [credits, setCredits] = useState(initCredits);
  const previewRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    api.getAlbumArtStatus(token).then(setStatus).catch(() => {});
  }, [token]);

  // Redraw whenever anything changes
  useEffect(() => {
    const canvas = previewRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawArt(ctx, canvas.width, style, palette, seed, showText ? artist : '', showText ? title : '');
  }, [style, palette, seed, showText, artist, title]);

  const planCfg = PLAN_CFG[plan] || PLAN_CFG.starter;
  const freeRemaining = status?.freeRemaining ?? planCfg.free;
  const costNext = freeRemaining > 0 ? 0 : planCfg.cost;
  const canGenerate = freeRemaining > 0 || credits >= planCfg.cost;

  const handleGenerateNew = async () => {
    setGenerating(true);
    try {
      const res = await api.generateAlbumArt(token);
      setSeed(Math.floor(Math.random() * 99999));
      setStatus((p: any) => ({ ...p, freeRemaining: res.freeRemaining }));
      setCredits(res.creditsBalance ?? credits);
      if (res.creditsCost > 0) toast.success(`✨ New variation! (${res.creditsCost} credits used)`);
      else toast.success(`✨ New variation! (${res.freeRemaining} free left this month)`);
    } catch (err: any) {
      toast.error(err.message);
    } finally { setGenerating(false); }
  };

  const renderToCanvas = (size: number): HTMLCanvasElement => {
    const c = document.createElement('canvas');
    c.width = size; c.height = size;
    const ctx = c.getContext('2d')!;
    drawArt(ctx, size, style, palette, seed, showText ? artist : '', showText ? title : '');
    return c;
  };

  const handleDownload = () => {
    const c = renderToCanvas(3000);
    c.toBlob(blob => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mixxea-album-art-3000x3000-${style}-${Date.now()}.png`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('📥 Downloaded 3000×3000px PNG — ready for DSP submission!');
    }, 'image/png');
  };

  const handleUse = () => {
    const c = renderToCanvas(600);
    const dataUrl = c.toDataURL('image/jpeg', 0.9);
    onUse(dataUrl);
    toast.success('✅ Album art applied to your release!');
    onClose();
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/92 backdrop-blur-md z-[60] flex items-start justify-center p-3 overflow-y-auto">
      <motion.div initial={{ opacity: 0, y: 24, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
        className="bg-[#0B0B0B] border border-white/[0.09] rounded-2xl w-full max-w-5xl my-4 overflow-hidden shadow-2xl">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]"
          style={{ background: 'linear-gradient(135deg,rgba(123,95,255,0.14),rgba(214,61,246,0.08),rgba(0,0,0,0))' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg,#7B5FFF,#D63DF6)' }}>
              <Sparkles size={16} className="text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Album Art Generator</h2>
              <p className="text-xs text-white/40 mt-0.5">Procedural canvas art · DSP-compliant 3000×3000px PNG</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Credits pill */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.05] border border-white/[0.08] rounded-full">
              <Zap size={11} className="text-[#00C4FF]" />
              <span className="text-xs text-white">{credits} cr</span>
            </div>
            {/* Free remaining pill */}
            {planCfg.free > 0 && (
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full border"
                style={{ background: `${planCfg.color}18`, borderColor: `${planCfg.color}35` }}>
                <Star size={11} style={{ color: planCfg.color }} />
                <span className="text-xs font-semibold" style={{ color: planCfg.color }}>
                  {freeRemaining}/{planCfg.free} free
                </span>
              </div>
            )}
            <button onClick={onClose} className="text-white/40 hover:text-white transition-colors p-1">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex flex-col lg:flex-row">

          {/* LEFT: Controls */}
          <div className="lg:w-[320px] xl:w-[340px] flex-shrink-0 p-5 space-y-5 border-b lg:border-b-0 lg:border-r border-white/[0.06] overflow-y-auto lg:max-h-[76vh]">

            {/* Style selector */}
            <div>
              <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-3">Art Style</label>
              <div className="grid grid-cols-2 gap-2">
                {STYLES.map(st => (
                  <button key={st.id} onClick={() => setStyle(st.id)}
                    className={`relative p-3 rounded-xl border transition-all text-left overflow-hidden ${style === st.id ? 'border-[#7B5FFF] ring-1 ring-[#7B5FFF]/30' : 'border-white/[0.07] hover:border-white/20'}`}>
                    {/* Style preview background */}
                    <div className="absolute inset-0" style={{ background: st.bg, opacity: 0.45 }} />
                    {style === st.id && (
                      <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-[#7B5FFF] flex items-center justify-center z-10">
                        <CheckCircle size={10} className="text-white" />
                      </div>
                    )}
                    <div className="relative z-10">
                      <div className="text-xs font-bold text-white">{st.name}</div>
                      <div className="text-[10px] text-white/50 mt-0.5">{st.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Palette selector */}
            <div>
              <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-3">Colour Palette</label>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(PALETTES).map(([key, pal]) => (
                  <button key={key} onClick={() => setPalette(key)}
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl border transition-all ${palette === key ? 'border-[#7B5FFF] bg-[#7B5FFF]/10' : 'border-white/[0.07] hover:border-white/20 bg-transparent'}`}>
                    {/* 4-swatch preview */}
                    <div className="flex gap-0.5 flex-shrink-0">
                      {pal.swatch.map((c, i) => (
                        <div key={i} className="w-4 h-7 rounded-sm first:rounded-l-md last:rounded-r-md" style={{ background: c }} />
                      ))}
                    </div>
                    <span className="text-xs font-medium text-white/80 truncate">{pal.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Text overlay */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Text Overlay</label>
                <button onClick={() => setShowText(v => !v)}
                  className="relative w-11 h-6 rounded-full transition-all"
                  style={showText ? { background: 'linear-gradient(135deg,#7B5FFF,#D63DF6)' } : { background: 'rgba(255,255,255,0.1)' }}>
                  <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${showText ? 'left-[22px]' : 'left-0.5'}`} />
                </button>
              </div>
              <AnimatePresence>
                {showText && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-2 overflow-hidden">
                    <input value={artist} onChange={e => setArtist(e.target.value)}
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#7B5FFF]/50"
                      placeholder="Artist / Label name" />
                    <input value={title} onChange={e => setTitle(e.target.value)}
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#7B5FFF]/50"
                      placeholder="Release title" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* DSP compliance badge */}
            <div className="p-3.5 bg-[#10B981]/10 border border-[#10B981]/25 rounded-xl">
              <div className="flex items-center gap-2 mb-2.5">
                <CheckCircle size={13} className="text-[#10B981]" />
                <span className="text-xs font-bold text-[#10B981]">DSP Compliant on Export</span>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                {['3000×3000 px', '1:1 square ratio', 'RGB colour space', 'PNG / JPEG export', 'No letterboxing', 'Lossless quality'].map(r => (
                  <div key={r} className="flex items-center gap-1.5 text-[11px] text-white/50">
                    <div className="w-1 h-1 rounded-full bg-[#10B981] flex-shrink-0" />
                    {r}
                  </div>
                ))}
              </div>
            </div>

            {/* Plan info */}
            <div className="p-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-xs text-white/50 space-y-1.5">
              <div className="font-semibold text-white/70 mb-1">Generation Credits</div>
              <div className="flex items-center justify-between">
                <span>Starter</span><span className="text-white/70">5 credits / generation</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1"><span className="text-[#10B981] font-semibold">Growth</span></span>
                <span className="text-white/70">3 free/month, then 3 cr</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1"><span className="text-[#7B5FFF] font-semibold">Pro</span></span>
                <span className="text-white/70">10 free/month, then 2 cr</span>
              </div>
            </div>
          </div>

          {/* RIGHT: Preview + actions */}
          <div className="flex-1 p-5 flex flex-col items-center justify-start gap-4">
            {/* Canvas preview */}
            <div className="relative w-full max-w-[480px] aspect-square rounded-2xl overflow-hidden border border-white/[0.09] shadow-[0_0_60px_rgba(123,95,255,0.12)]">
              <canvas ref={previewRef} width={480} height={480} className="w-full h-full block" style={{ imageRendering: 'auto' }} />
              {/* DSP badge overlay */}
              <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 bg-black/75 backdrop-blur-sm rounded-full border border-white/10">
                <CheckCircle size={10} className="text-[#10B981]" />
                <span className="text-[10px] text-white/80 font-medium">3000×3000 on export</span>
              </div>
              {/* Style badge */}
              <div className="absolute bottom-3 left-3 px-2.5 py-1 bg-black/75 backdrop-blur-sm rounded-full border border-white/10">
                <span className="text-[10px] text-white/60 font-medium capitalize">{STYLES.find(s => s.id === style)?.name} · {PALETTES[palette]?.name}</span>
              </div>
            </div>

            {/* Credit cost info bar */}
            <div className="w-full max-w-[480px]">
              {plan === 'starter' && (
                <div className="flex items-center gap-2.5 p-3 bg-[#F59E0B]/10 border border-[#F59E0B]/25 rounded-xl">
                  <Zap size={13} className="text-[#F59E0B] flex-shrink-0" />
                  <div className="text-xs text-white/70">
                    <span className="text-[#F59E0B] font-semibold">Starter plan:</span> Each new variation costs{' '}
                    <span className="text-white font-bold">5 credits</span>.{' '}
                    <span className="text-white/40">Upgrade to Growth for 3 free/month.</span>
                  </div>
                </div>
              )}
              {plan !== 'starter' && freeRemaining > 0 && (
                <div className="flex items-center gap-2.5 p-3 bg-[#10B981]/10 border border-[#10B981]/25 rounded-xl">
                  <Star size={13} className="text-[#10B981] flex-shrink-0" />
                  <span className="text-xs text-white/70">
                    <span className="text-[#10B981] font-bold">{freeRemaining} free generation{freeRemaining !== 1 ? 's' : ''}</span> remaining this month
                  </span>
                </div>
              )}
              {plan !== 'starter' && freeRemaining <= 0 && (
                <div className="flex items-center gap-2.5 p-3 bg-white/[0.04] border border-white/[0.08] rounded-xl">
                  <Zap size={13} className="text-[#00C4FF] flex-shrink-0" />
                  <span className="text-xs text-white/60">
                    Free generations used · Next variation costs{' '}
                    <span className="text-white font-bold">{planCfg.cost} credits</span>
                  </span>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="w-full max-w-[480px] space-y-3">
              {/* Generate new */}
              <button onClick={handleGenerateNew} disabled={generating || !canGenerate}
                className="w-full py-3.5 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2.5 transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: 'linear-gradient(135deg,#7B5FFF,#D63DF6)' }}>
                {generating ? (
                  <><div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Generating…</>
                ) : (
                  <><Shuffle size={16} /> Generate New Variation{costNext > 0 ? ` (${costNext} cr)` : ' — Free'}</>
                )}
              </button>

              {!canGenerate && (
                <p className="text-center text-xs text-[#FF5252]">
                  Not enough credits.{' '}
                  <a href="/dashboard/credits" className="underline hover:text-white">Buy credits →</a>
                </p>
              )}

              <div className="grid grid-cols-2 gap-3">
                <button onClick={handleDownload}
                  className="py-3 rounded-xl text-sm font-semibold text-white/70 bg-white/[0.05] border border-white/[0.09] hover:text-white hover:border-white/20 transition-all flex items-center justify-center gap-2">
                  <Download size={15} /> Download PNG
                </button>
                <button onClick={handleUse}
                  className="py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all"
                  style={{ background: 'rgba(16,185,129,0.18)', border: '1px solid rgba(16,185,129,0.35)', color: '#10B981' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(16,185,129,0.28)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(16,185,129,0.18)')}>
                  <CheckCircle size={15} /> Use This Cover
                </button>
              </div>

              <div className="flex items-start gap-2 p-3 bg-white/[0.03] rounded-xl border border-white/[0.05]">
                <Info size={12} className="text-white/30 flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-white/30 leading-relaxed">
                  <strong className="text-white/50">Download</strong> exports a <strong className="text-white/50">3000×3000 PNG</strong> meeting Spotify, Apple Music, TIDAL, Amazon Music and all major DSP artwork requirements.
                  The preview shown is 480px — final art is 6× sharper.
                </p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
