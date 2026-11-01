import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import {
  AlertTriangle, ArrowLeft, BadgeCheck, Check, ChevronRight, Code2, Download, ExternalLink, Flag,
  Gamepad2, Globe2, Heart, LayoutGrid, Library, Package, Play, Plus, Rocket,
  Search, Send, ShieldCheck, Sparkles, Star, Trash2, Upload, Wand2, X, Zap,
  Terminal, FolderPlus, FilePlus, RotateCcw, MousePointer2, Folder, File, Edit3, Copy,
} from "lucide-react";
import "./v-market.css";
import {
  marketCloudAvailable, marketCloudDelete, marketCloudGet, marketCloudInstall,
  marketCloudList, marketCloudPublish, marketCloudSubscribe, marketCloudTableMissing,
} from "./v-market-cloud";

/* ------------------------------------------------------------------ */
/* Types + storage                                                     */
/* ------------------------------------------------------------------ */

export type VMarketReview = {
  id: string;
  author: string;
  stars: number;
  text: string;
  date: number;
  helpful: number;
};

export type VMarketComment = {
  id: string;
  author: string;
  text: string;
  date: number;
};

export type VMarketEntry = {
  id: string;
  name: string;
  company: string;
  tagline: string;
  description: string;
  logo: string;
  category: string;
  type: "game" | "app" | "website";
  age: number;
  downloads: number;
  rating: number;
  ratingCount: number;
  version: string;
  size: string;
  url?: string;
  html?: string;
  features: string[];
  screenshots: string[];
  reviews: VMarketReview[];
  comments: VMarketComment[];
  createdAt: number;
  verified?: boolean;
  publishedByUser?: boolean;
  /** Present only on listings pulled from the shared catalogue. */
  cloudOnly?: boolean;
};

export const VM_ENTRIES_KEY = "vertex-vmarket-entries-v1";
export const VM_INSTALLED_KEY = "vertex-vmarket-installed-v1";
export const VM_REPORTS_KEY = "vertex-vmarket-reports-v1";
const VM_CACHE_KEY = "vertex-vmarket-cache-v1";
const VM_GLOBAL_KEY = "vertex-vmarket-global-v1";

const VM_BASE = import.meta.env.BASE_URL.endsWith("/") ? import.meta.env.BASE_URL : `${import.meta.env.BASE_URL}/`;
const vmAsset = (path: string) => `${VM_BASE}${path}`;

const DEFAULT_INSTALLED: string[] = [];

const uid = (prefix: string) => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

const esc = (value: string) =>
  value.replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch] ?? ch));

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export function formatDownloads(value: number): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1).replace(/\.0$/, "")}B+`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}M+`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1).replace(/\.0$/, "")}K+`;
  return `${value}`;
}

export function formatAge(age: number): string {
  return age >= 18 ? "18+" : `${age}+`;
}

const timeAgo = (date: number) => {
  const seconds = Math.max(1, Math.floor((Date.now() - date) / 1000));
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return new Date(date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
};

const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 32) || "app";

// Squircle icon generated entirely from SVG, so the demo catalog works offline.
function makeLogo(label: string, emoji: string, from: string, to: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs>
    <rect width="128" height="128" rx="30" fill="url(#g)"/>
    <circle cx="104" cy="20" r="34" fill="#fff" fill-opacity=".12"/>
    <circle cx="18" cy="112" r="40" fill="#000" fill-opacity=".14"/>
    <text x="64" y="88" text-anchor="middle" font-size="62">${emoji}</text>
    <text x="64" y="111" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" font-weight="700" letter-spacing="2" fill="#fff" fill-opacity=".72">${esc(label.toUpperCase().slice(0, 8))}</text>
  </svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/* ------------------------------------------------------------------ */
/* Mini game + fake website templates                                  */
/* ------------------------------------------------------------------ */

const sharedGameCss = (accent: string, accent2: string) => `
  * { box-sizing: border-box; }
  html, body { margin: 0; min-height: 100%; font-family: ui-sans-serif, system-ui, "Segoe UI", sans-serif; }
  body { color: #eff7ff; background: radial-gradient(120% 120% at 50% -10%, ${accent}33, transparent 52%), #070b14; display: grid; place-items: center; min-height: 100vh; padding: 24px; overflow: hidden; }
  .game { width: min(620px, 100%); padding: 26px; border: 1px solid #ffffff20; border-radius: 24px; background: linear-gradient(160deg, #111b2d, #080d17); box-shadow: 0 30px 90px #0008; }
  .game h1 { margin: 0 0 6px; font-size: clamp(24px, 5vw, 38px); letter-spacing: -.04em; }
  .game p { margin: 0 0 20px; color: #9fb0c7; font-size: 13px; }
  .accent { color: ${accent}; }
  .btn { border: 0; cursor: pointer; padding: 12px 20px; border-radius: 12px; color: #04110c; background: linear-gradient(135deg, ${accent}, ${accent2}); font-weight: 800; font-size: 14px; }
  .btn:active { transform: translateY(1px) scale(.99); }
  .muted { color: #91a3ba; }
`;

function clickerHtml(name: string, accent: string, accent2: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(name)}</title>
  <style>${sharedGameCss(accent, accent2)}
  .scorebar { display: flex; justify-content: space-between; gap: 12px; margin-bottom: 18px; }
  .stat { flex: 1; padding: 12px 14px; border: 1px solid #ffffff17; border-radius: 14px; background: #ffffff08; }
  .stat span { display: block; color: #8ea2ba; font-size: 10px; letter-spacing: .18em; text-transform: uppercase; margin-bottom: 3px; }
  .stat strong { font-size: 24px; font-variant-numeric: tabular-nums; }
  .arena { position: relative; height: 300px; border-radius: 18px; border: 1px dashed #ffffff24; background: radial-gradient(circle at 50% 50%, ${accent}18, transparent 65%); overflow: hidden; }
  .orb { position: absolute; width: 74px; height: 74px; border: 0; border-radius: 50%; cursor: pointer; background: radial-gradient(circle at 34% 26%, #fff9, ${accent} 34%, ${accent2}); box-shadow: 0 0 34px ${accent}88, inset 0 -8px 18px #0004; transition: transform .08s ease; }
  .orb:active { transform: scale(.9); }
  .float { position: absolute; pointer-events: none; font-weight: 900; color: #fff; text-shadow: 0 0 14px ${accent}; animation: rise .7s ease forwards; }
  @keyframes rise { to { transform: translateY(-46px); opacity: 0; } }
  .foot { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 16px; }
  </style></head><body>
  <main class="game">
    <h1>${esc(name)} <span class="accent">.</span></h1>
    <p>Pop the glowing orbs. You have 30 seconds — chase the high score.</p>
    <div class="scorebar"><div class="stat"><span>Score</span><strong id="score">0</strong></div><div class="stat"><span>Timer</span><strong id="time">30</strong></div><div class="stat"><span>Best</span><strong id="best">0</strong></div></div>
    <div class="arena" id="arena"><button class="orb" id="orb" aria-label="Pop the orb"></button></div>
    <div class="foot"><span class="muted" id="status">Tap the orb to begin.</span><button class="btn" id="reset">Play again</button></div>
  </main>
  <script>
    const arena = document.getElementById('arena'), orb = document.getElementById('orb');
    let score = 0, left = 30, running = false, timer = null;
    let best = Number(localStorage.getItem('${slug(name)}-best') || 0);
    document.getElementById('best').textContent = best;
    function place() { const r = 34; orb.style.left = (r + Math.random() * Math.max(1, arena.clientWidth - r * 2)) + 'px'; orb.style.top = (r + Math.random() * Math.max(1, arena.clientHeight - r * 2)) + 'px'; }
    function pop(e) {
      if (!running) return;
      score++; document.getElementById('score').textContent = score;
      const f = document.createElement('span'); f.className = 'float'; f.textContent = '+1'; f.style.left = (e.clientX - arena.getBoundingClientRect().left) + 'px'; f.style.top = (e.clientY - arena.getBoundingClientRect().top) + 'px'; arena.appendChild(f); setTimeout(() => f.remove(), 720);
      place();
    }
    orb.addEventListener('click', pop);
    function start() {
      clearInterval(timer); score = 0; left = 30; running = true;
      document.getElementById('score').textContent = '0'; document.getElementById('time').textContent = '30'; document.getElementById('status').textContent = 'Go!';
      place();
      timer = setInterval(() => { left--; document.getElementById('time').textContent = left; if (!left) { clearInterval(timer); running = false; document.getElementById('status').textContent = 'Run over — score ' + score; if (score > best) { best = score; localStorage.setItem('${slug(name)}-best', best); document.getElementById('best').textContent = best; } } }, 1000);
    }
    document.getElementById('reset').addEventListener('click', start);
  </script></body></html>`;
}

function memoryHtml(name: string, accent: string, accent2: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(name)}</title>
  <style>${sharedGameCss(accent, accent2)}
  .bar { display: flex; justify-content: space-between; margin-bottom: 16px; color: #9fb0c7; font-size: 13px; }
  .bar strong { color: #fff; }
  .board { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; max-width: 420px; margin: auto; }
  .tile { aspect-ratio: 1; border: 1px solid #ffffff1d; border-radius: 14px; background: #ffffff08; color: transparent; font-size: 32px; cursor: pointer; display: grid; place-items: center; transition: transform .14s ease, background .14s ease; }
  .tile.open { background: linear-gradient(145deg, ${accent}33, ${accent2}22); color: #fff; }
  .tile.done { opacity: .4; cursor: default; }
  .tile:active { transform: scale(.96); }
  </style></head><body>
  <main class="game">
    <h1>${esc(name)} <span class="accent">.</span></h1>
    <p>Flip the cards and match every pair. Fewer moves, higher rank.</p>
    <div class="bar"><span>Moves <strong id="moves">0</strong></span><span>Pairs <strong id="pairs">0</strong>/8</span><button class="btn" id="reset">New game</button></div>
    <div class="board" id="board"></div>
  </main>
  <script>
    const icons = ['🚀','🌙','⚡','🔥','🎧','🪐','🍕','💎'];
    let deck = [], first = null, lock = false, moves = 0, pairs = 0;
    const board = document.getElementById('board');
    function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
    function deal() {
      deck = shuffle([...icons, ...icons]); first = null; moves = 0; pairs = 0; lock = false;
      board.innerHTML = ''; document.getElementById('moves').textContent = 0; document.getElementById('pairs').textContent = 0;
      deck.forEach((icon) => { const b = document.createElement('button'); b.className = 'tile'; b.textContent = icon; b.onclick = () => flip(b, icon); board.appendChild(b); });
    }
    function flip(button, icon) {
      if (lock || button.classList.contains('open') || button.classList.contains('done')) return;
      button.classList.add('open');
      if (!first) { first = { button, icon }; return; }
      moves++; document.getElementById('moves').textContent = moves;
      if (first.icon === icon) {
        first.button.classList.add('done'); button.classList.add('done'); first = null; pairs++; document.getElementById('pairs').textContent = pairs;
        if (pairs === 8) setTimeout(() => alert('Cleared in ' + moves + ' moves!'), 220);
      } else {
        lock = true; const previous = first; first = null;
        setTimeout(() => { previous.button.classList.remove('open'); button.classList.remove('open'); lock = false; }, 650);
      }
    }
    document.getElementById('reset').addEventListener('click', deal); deal();
  </script></body></html>`;
}

function runnerHtml(name: string, accent: string, accent2: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(name)}</title>
  <style>${sharedGameCss(accent, accent2)}
  .wrap { position: relative; width: min(720px, 100%); }
  canvas { width: 100%; border-radius: 20px; border: 1px solid #ffffff1f; background: #05080f; display: block; box-shadow: 0 20px 70px #0008; }
  .hud { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
  .hud strong { font-size: 26px; }
  .hint { margin-top: 10px; color: #91a3ba; font-size: 12px; text-align: center; }
  </style></head><body>
  <main class="wrap">
    <div class="hud"><div><div class="muted" style="font-size:10px;letter-spacing:.2em">SCORE</div><strong id="score">0</strong></div><h1 style="margin:0;font-size:22px">${esc(name)}</h1><button class="btn" id="reset">Restart</button></div>
    <canvas id="game" width="900" height="420"></canvas>
    <div class="hint">Space / ↑ / tap to jump. Dodge the gates.</div>
  </main>
  <script>
    const canvas = document.getElementById('game'), ctx = canvas.getContext('2d');
    let y = 300, vy = 0, score = 0, alive = true, speed = 7, obstacles = [], last = 0, spawn = 0, best = 0;
    const ground = 360;
    function reset() { y = 300; vy = 0; score = 0; alive = true; speed = 7; obstacles = []; spawn = 0; document.getElementById('score').textContent = 0; }
    function jump() { if (!alive) { reset(); return; } if (y >= 300) vy = -12; }
    addEventListener('keydown', (e) => { if (e.code === 'Space' || e.code === 'ArrowUp') { e.preventDefault(); jump(); } });
    canvas.addEventListener('pointerdown', jump);
    document.getElementById('reset').addEventListener('click', reset);
    function loop(t) {
      const dt = Math.min(32, t - last || 16); last = t;
      ctx.clearRect(0, 0, 900, 420);
      const grad = ctx.createLinearGradient(0, 0, 900, 420); grad.addColorStop(0, '${accent}1f'); grad.addColorStop(.55, 'transparent'); grad.addColorStop(1, '${accent2}1a'); ctx.fillStyle = grad; ctx.fillRect(0, 0, 900, 420);
      ctx.strokeStyle = '#ffffff14'; ctx.lineWidth = 1; for (let x = (t / 30) % 60; x < 900; x += 60) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 420); ctx.stroke(); }
      ctx.fillStyle = '#ffffff12'; ctx.fillRect(0, ground + 16, 900, 60);
      if (alive) { vy += .55; y += vy; if (y > 300) { y = 300; vy = 0; } score += dt * .02; document.getElementById('score').textContent = Math.floor(score); speed += dt * .0005; spawn += dt; if (spawn > 1050) { spawn = 0; const gap = 104 + Math.random() * 36; const top = 118 + Math.random() * 140; obstacles.push({ x: 930, top, gap, w: 54 }); } }
      obstacles.forEach((o) => { o.x -= speed * dt / 16; const h = o.top; ctx.fillStyle = '${accent}'; ctx.shadowColor = '${accent}'; ctx.shadowBlur = 22; ctx.fillRect(o.x, 0, o.w, h); ctx.fillRect(o.x, h + o.gap, o.w, 420); ctx.shadowBlur = 0; if (o.x < 128 && o.x + o.w > 92 && (y < h || y + 36 > h + o.gap)) { alive = false; best = Math.max(best, Math.floor(score)); } });
      obstacles = obstacles.filter((o) => o.x > -80);
      ctx.fillStyle = '${accent2}'; ctx.shadowColor = '${accent2}'; ctx.shadowBlur = 26; ctx.roundRect ? (ctx.beginPath(), ctx.roundRect(92, y, 36, 36, 9), ctx.fill()) : ctx.fillRect(92, y, 36, 36); ctx.shadowBlur = 0;
      if (!alive) { ctx.fillStyle = '#05080fcc'; ctx.fillRect(0, 0, 900, 420); ctx.fillStyle = '#fff'; ctx.font = '800 34px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('Run over', 450, 190); ctx.font = '16px sans-serif'; ctx.fillStyle = '#9fb0c7'; ctx.fillText('Score ' + Math.floor(score) + ' · tap to retry', 450, 224); }
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  </script></body></html>`;
}

function snakeHtml(name: string, accent: string, accent2: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(name)}</title>
  <style>${sharedGameCss(accent, accent2)}
  .row { display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; }
  canvas { width:100%; max-width:560px; aspect-ratio:1; display:block; margin:auto; border-radius:20px; border:1px solid #ffffff1d; background:#05080f; }
  .hint { text-align:center; color:#91a3ba; font-size:12px; margin-top:10px; }
  </style></head><body>
  <main class="game" style="width:min(640px,100%)">
    <div class="row"><h1 style="margin:0;font-size:26px">${esc(name)}</h1><strong id="score" style="font-size:24px">0</strong></div>
    <p>Arrow keys or WASD. Eat the neon fruit, avoid your tail.</p>
    <canvas id="c" width="560" height="560"></canvas><div class="hint" id="hint">Press an arrow key to start</div>
  </main>
  <script>
    const c = document.getElementById('c'), x = c.getContext('2d'), cell = 28, n = 20;
    let snake, dir, nextDir, food, score, dead, timer;
    function reset() { snake = [{x:10,y:10},{x:9,y:10},{x:8,y:10}]; dir = {x:1,y:0}; nextDir = dir; food = {x:15,y:10}; score = 0; dead = false; document.getElementById('score').textContent = 0; document.getElementById('hint').textContent = 'Go!'; clearInterval(timer); timer = setInterval(step, 95); }
    function step() {
      if (dead) return; dir = nextDir; const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
      if (head.x < 0 || head.y < 0 || head.x >= n || head.y >= n || snake.some((s) => s.x === head.x && s.y === head.y)) { dead = true; clearInterval(timer); document.getElementById('hint').textContent = 'Crashed — score ' + score + '. Press an arrow key.'; draw(); return; }
      snake.unshift(head); if (head.x === food.x && head.y === food.y) { score++; document.getElementById('score').textContent = score; do { food = { x: Math.floor(Math.random()*n), y: Math.floor(Math.random()*n) }; } while (snake.some((s) => s.x === food.x && s.y === food.y)); } else snake.pop();
      draw();
    }
    function draw() {
      x.fillStyle = '#05080f'; x.fillRect(0,0,560,560);
      x.strokeStyle = '#ffffff0d'; for (let i=1;i<n;i++){ x.beginPath(); x.moveTo(i*cell,0); x.lineTo(i*cell,560); x.stroke(); x.beginPath(); x.moveTo(0,i*cell); x.lineTo(560,i*cell); x.stroke(); }
      x.fillStyle = '${accent2}'; x.shadowColor = '${accent2}'; x.shadowBlur = 18; x.beginPath(); x.arc(food.x*cell+14, food.y*cell+14, 9, 0, 7); x.fill();
      snake.forEach((s,i) => { x.fillStyle = i === 0 ? '#fff' : '${accent}'; x.shadowColor = '${accent}'; x.shadowBlur = i === 0 ? 20 : 8; x.beginPath(); x.roundRect ? x.roundRect(s.x*cell+2, s.y*cell+2, cell-4, cell-4, 7) : x.fillRect(s.x*cell+2,s.y*cell+2,cell-4,cell-4); x.fill(); });
      x.shadowBlur = 0;
    }
    addEventListener('keydown', (e) => { const map = {ArrowUp:[0,-1],ArrowDown:[0,1],ArrowLeft:[-1,0],ArrowRight:[1,0],w:[0,-1],s:[0,1],a:[-1,0],d:[1,0]}; const m = map[e.key]; if (!m) return; e.preventDefault(); if (dead) { reset(); return; } const [mx,my] = m; if (mx === -dir.x && my === -dir.y) return; nextDir = {x:mx,y:my}; });
    reset(); clearInterval(timer);
  </script></body></html>`;
}

type SiteOptions = {
  name: string;
  company: string;
  tagline: string;
  description: string;
  accent: string;
  accent2: string;
  features: string[];
  layout?: "landing" | "portfolio" | "arcade";
};

function siteHtml(options: SiteOptions): string {
  const { name, company, tagline, description, accent, accent2, features } = options;
  const layout = options.layout ?? "landing";
  const featureCards = (features.length ? features : ["Fast", "Private", "Free"]).map((feature, i) => `
    <article class="card"><span class="num">0${i + 1}</span><h3>${esc(feature)}</h3><p>${esc(description.slice(0, 96))}</p></article>`).join("");
  const cards = layout === "portfolio"
    ? `<div class="work">${["Brand system", "Product design", "Motion", "Web build"].map((item, i) => `<div class="tile t${i}"><span>${esc(item)}</span></div>`).join("")}</div>`
    : layout === "arcade"
      ? `<div class="arcade">${["NEON POP", "REFLEX", "MEMORY"].map((item, i) => `<div class="cab c${i}"><span>PLAY</span><strong>${item}</strong></div>`).join("")}</div>`
      : `<section class="features">${featureCards}</section>`;
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(name)} — ${esc(company)}</title>
  <style>
    *{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:#060910;color:#f1f7ff;font-family:ui-sans-serif,system-ui,"Segoe UI",sans-serif;overflow-x:hidden}
    .glow{position:fixed;inset:auto;width:60vw;height:60vw;border-radius:50%;filter:blur(110px);opacity:.24;pointer-events:none}
    .g1{background:${accent};top:-30vw;right:-14vw}.g2{background:${accent2};bottom:-34vw;left:-14vw}
    nav{position:sticky;top:0;z-index:3;display:flex;align-items:center;justify-content:space-between;gap:18px;padding:18px 6vw;background:#060910cc;backdrop-filter:blur(18px);border-bottom:1px solid #ffffff14}
    .brand{display:flex;align-items:center;gap:10px;font-weight:800;letter-spacing:-.03em}.mark{width:30px;height:30px;border-radius:10px;background:linear-gradient(135deg,${accent},${accent2});box-shadow:0 0 24px ${accent}66}
    nav a{color:#a9b8cc;text-decoration:none;font-size:13px;margin-left:20px}nav a:hover{color:#fff}
    header{position:relative;display:grid;place-items:center;text-align:center;padding:max(76px,12vh) 6vw 70px}
    .kicker{display:inline-flex;align-items:center;gap:8px;padding:7px 12px;border:1px solid ${accent}55;border-radius:999px;background:${accent}12;color:${accent};font-size:11px;letter-spacing:.16em;text-transform:uppercase}
    h1{font-size:clamp(45px,9vw,112px);line-height:.9;letter-spacing:-.065em;margin:22px 0 18px;max-width:1000px}.grad{background:linear-gradient(100deg,#fff,${accent} 55%,${accent2});-webkit-background-clip:text;background-clip:text;color:transparent}
    header p{max-width:620px;margin:0 auto 28px;color:#aebdd2;line-height:1.7;font-size:16px}
    .cta{display:inline-flex;gap:10px;flex-wrap:wrap;justify-content:center}.btn{display:inline-flex;align-items:center;gap:8px;padding:13px 21px;border-radius:12px;border:1px solid ${accent}66;color:#04110d;background:linear-gradient(135deg,${accent},${accent2});text-decoration:none;font-weight:800;font-size:13px;box-shadow:0 16px 40px ${accent}33}.btn.ghost{background:#ffffff08;color:#eaf5ff;border-color:#ffffff22;box-shadow:none}
    section{position:relative;padding:18px 6vw 76px;max-width:1180px;margin:auto}.features{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px}
    .card{padding:24px;border:1px solid #ffffff14;border-radius:20px;background:linear-gradient(160deg,#ffffff09,#ffffff02)}
    .card .num{font:800 11px ui-monospace,monospace;color:${accent};letter-spacing:.14em}.card h3{margin:24px 0 8px;font-size:20px;letter-spacing:-.03em}.card p{margin:0;color:#93a5bc;font-size:13px;line-height:1.65}
    .work{display:grid;grid-template-columns:1.3fr 1fr;gap:14px;grid-auto-rows:180px}.tile{border-radius:22px;padding:22px;display:flex;align-items:flex-end;font-weight:800;font-size:20px;border:1px solid #ffffff1a;background:linear-gradient(135deg,${accent}44,${accent2}22)}.t1{grid-row:span 2;background:linear-gradient(160deg,${accent2}44,#0b1020)}.t2{background:linear-gradient(140deg,${accent}55,#0c1220)}
    .arcade{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:16px}.cab{aspect-ratio:3/4;border-radius:22px;border:1px solid #ffffff1f;background:linear-gradient(165deg,${accent}33,#080c15 58%);display:flex;flex-direction:column;justify-content:flex-end;padding:20px;box-shadow:inset 0 0 60px ${accent}12}.cab span{font-size:10px;letter-spacing:.2em;color:${accent}}.cab strong{font-size:24px;letter-spacing:-.04em}.c1{background:linear-gradient(165deg,${accent2}44,#080c15 58%)}.c2{background:linear-gradient(165deg,#ffffff22,#080c15 58%)}
    footer{padding:36px 6vw;border-top:1px solid #ffffff12;color:#7f91a7;font-size:12px;display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap}
    @media(max-width:700px){nav .links{display:none}.work{grid-template-columns:1fr}.work .t1{grid-row:auto}}
  </style></head><body>
  <div class="glow g1"></div><div class="glow g2"></div>
  <nav><div class="brand"><span class="mark"></span>${esc(name)}</div><div class="links"><a href="#features">Features</a><a href="#about">About</a><a href="#contact">Contact</a></div></div>
  <header><div><span class="kicker"><span style="width:6px;height:6px;border-radius:50%;background:${accent}"></span>Made by ${esc(company)}</span><h1>${esc(tagline || name).replace(/\s+/g, " ").split(" ").slice(0, 4).join(" ")} <span class="grad">${esc((tagline || name).split(" ").slice(4).join(" ") || ".")}</span></h1><p>${esc(description)}</p><div class="cta"><a class="btn" href="#features">Get started →</a><a class="btn ghost" href="#about">Learn more</a></div></div></header>
  <section id="features">${cards}</section>
  <section id="about"><div class="card" style="padding:38px"><span class="num">ABOUT ${esc(company.toUpperCase())}</span><h2 style="font-size:clamp(28px,4vw,48px);letter-spacing:-.05em;margin:18px 0 12px">Built for the next version of the web.</h2><p style="max-width:620px;color:#93a5bc;line-height:1.75;margin:0">${esc(description)}</p></div></section>
  <footer id="contact"><span>© ${new Date().getFullYear()} ${esc(company)}. A fictional V-MARKET listing.</span><span>Made with V-STUDIOS</span></footer>
  </body></html>`;
}

/* ------------------------------------------------------------------ */
/* Seed catalog                                                        */
/* ------------------------------------------------------------------ */

const review = (author: string, stars: number, text: string, days = 3): VMarketReview => ({
  id: uid("rev"), author, stars, text, date: Date.now() - days * 86_400_000, helpful: Math.floor(Math.random() * 40) + 2,
});

const comment = (author: string, text: string, hours = 2): VMarketComment => ({
  id: uid("cmt"), author, text, date: Date.now() - hours * 3_600_000,
});

function seedEntries(): VMarketEntry[] {
  return [];
}

/** Listings published on this device, plus listings cached from the shared catalogue. */
export function readVMarketEntries(): VMarketEntry[] {
  let entries: VMarketEntry[] = [];
  try {
    const raw = localStorage.getItem(VM_ENTRIES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) entries = entries.concat(parsed);
    }
  } catch { /* ignore */ }
  try {
    const globalRaw = localStorage.getItem(VM_GLOBAL_KEY);
    if (globalRaw) {
      const parsed = JSON.parse(globalRaw);
      if (Array.isArray(parsed)) {
        const ids = new Set(entries.map(e => e.id));
        for (const e of parsed) {
          if (e && !ids.has(e.id)) entries.push(e);
        }
      }
    }
  } catch { /* ignore */ }
  try {
    const cacheRaw = localStorage.getItem(VM_CACHE_KEY);
    if (cacheRaw) {
      const parsed = JSON.parse(cacheRaw);
      if (Array.isArray(parsed)) {
        const ids = new Set(entries.map(e => e.id));
        for (const e of parsed) {
          if (e && e.id && !ids.has(e.id)) entries.push({ ...e, publishedByUser: false, cloudOnly: true });
        }
      }
    }
  } catch { /* ignore */ }
  return entries;
}

/** Keep a downloaded shared listing around so it opens offline and after a reload. */
export function cacheVMarketEntry(entry: VMarketEntry): void {
  try {
    const raw = localStorage.getItem(VM_CACHE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    const list: VMarketEntry[] = Array.isArray(parsed) ? parsed.filter((e) => e && e.id !== entry.id) : [];
    list.unshift({ ...entry, publishedByUser: false, cloudOnly: true });
    localStorage.setItem(VM_CACHE_KEY, JSON.stringify(list.slice(0, 60)));
  } catch { /* noop */ }
}

/** Drop a cached/installed listing entirely. */
export function forgetVMarketEntry(id: string): void {
  try {
    const raw = localStorage.getItem(VM_CACHE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (Array.isArray(parsed)) localStorage.setItem(VM_CACHE_KEY, JSON.stringify(parsed.filter((e) => e && e.id !== id)));
  } catch { /* noop */ }
  try {
    const installed = readVMarketInstalled().filter((item) => item !== id);
    writeVMarketInstalled(installed);
  } catch { /* noop */ }
}

export function writeVMarketEntries(entries: VMarketEntry[]): void {
  // Shared listings stay in the cloud; only your own publishes live here.
  const local = entries.filter((entry) => !entry.cloudOnly);
  try {
    localStorage.setItem(VM_ENTRIES_KEY, JSON.stringify(local));
    localStorage.setItem(VM_GLOBAL_KEY, JSON.stringify(local));
  } catch { /* keep memory copy */ }
  try {
    window.dispatchEvent(new Event("vertex-vmarket-changed"));
  } catch { /* noop */ }
}

export function readVMarketInstalled(): string[] {
  try {
    const raw = localStorage.getItem(VM_INSTALLED_KEY);
    if (raw === null) return [...DEFAULT_INSTALLED];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch { return [...DEFAULT_INSTALLED]; }
}

export function writeVMarketInstalled(ids: string[]): void {
  try { localStorage.setItem(VM_INSTALLED_KEY, JSON.stringify(ids)); } catch { /* noop */ }
}

function notifyMarketChanged(): void {
  try { window.dispatchEvent(new CustomEvent("vertex-vmarket-changed")); } catch { /* noop */ }
}

const requestEntryOpen = (id: string) => {
  try { window.dispatchEvent(new CustomEvent("vertex-open-app", { detail: id })); } catch { /* noop */ }
};

/* ------------------------------------------------------------------ */
/* Small shared bits                                                   */
/* ------------------------------------------------------------------ */

function StarRow({ value, size = 13 }: { value: number; size?: number }) {
  return (
    <span className="vm-stars" style={{ fontSize: size }} aria-label={`${value.toFixed(1)} out of 5`}>
      {[0, 1, 2, 3, 4].map((i) => (
        <span key={i} className={i < Math.round(value) ? "on" : ""}>★</span>
      ))}
    </span>
  );
}

function InstallButton({ entry, installed, installing, onInstall, onOpen, compact }: {
  entry: VMarketEntry;
  installed: boolean;
  installing?: boolean;
  onInstall: () => void;
  onOpen: () => void;
  compact?: boolean;
}) {
  const className = `vm-install${installed ? " is-installed" : ""}${compact ? " compact" : ""}`;
  if (installed) {
    return (
      <button className={className} onClick={(event) => { event.stopPropagation(); onOpen(); }}>
        <Play size={compact ? 11 : 14} fill="currentColor" /> Open
      </button>
    );
  }
  return (
    <button className={className} disabled={installing} onClick={(event) => { event.stopPropagation(); onInstall(); }}>
      {installing ? <span className="vm-spinner" /> : <Download size={compact ? 11 : 14} />}
      {installing ? "Installing" : "Install"}
    </button>
  );
}

function AppLogo({ entry, size = 56 }: { entry: VMarketEntry; size?: number }) {
  return (
    <span className="vm-app-logo" style={{ width: size, height: size, borderRadius: Math.round(size * 0.24) }}>
      <img src={entry.logo} alt="" loading="lazy" />
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* V-MARKET                                                            */
/* ------------------------------------------------------------------ */

type MarketTab = "home" | "games" | "apps" | "library";
const CATEGORIES = ["All", "Action", "Arcade", "Puzzle", "Gaming", "Entertainment", "Social", "Tools", "News"];

export function VMarketSurface() {
  const [entries, setEntries] = useState<VMarketEntry[]>(() => readVMarketEntries());
  const [installed, setInstalled] = useState<string[]>(() => readVMarketInstalled());
  const [tab, setTab] = useState<MarketTab>("home");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [installingId, setInstallingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [reportFor, setReportFor] = useState<VMarketEntry | null>(null);
  const [reportReason, setReportReason] = useState("Broken or not working");
  const [reportDetail, setReportDetail] = useState("");
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewStars, setReviewStars] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [reviewName, setReviewName] = useState("");
  const [commentText, setCommentText] = useState("");
  const [cloudState, setCloudState] = useState<"idle" | "loading" | "off" | "missing">(
    marketCloudAvailable ? "loading" : "off",
  );
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const refresh = () => { setEntries(readVMarketEntries()); setInstalled(readVMarketInstalled()); };
    window.addEventListener("vertex-vmarket-changed", refresh);
    return () => window.removeEventListener("vertex-vmarket-changed", refresh);
  }, []);

  /** Pull the shared catalogue and merge it with what is stored on this device. */
  const refreshCloud = useCallback(async () => {
    if (!marketCloudAvailable) { setCloudState("off"); return; }
    const cloud = await marketCloudList();
    if (!cloud) {
      setCloudState(marketCloudTableMissing() ? "missing" : "off");
      return;
    }
    setCloudState("idle");
    setEntries(() => {
      const local = readVMarketEntries();
      const ids = new Set(local.map((entry) => entry.id));
      return [...local, ...cloud.filter((entry) => !ids.has(entry.id))];
    });
  }, []);

  useEffect(() => {
    void refreshCloud();
    const off = marketCloudSubscribe(() => void refreshCloud());
    const onFocus = () => void refreshCloud();
    window.addEventListener("focus", onFocus);
    const timer = window.setInterval(() => void refreshCloud(), 90_000);
    return () => {
      off();
      window.removeEventListener("focus", onFocus);
      window.clearInterval(timer);
    };
  }, [refreshCloud]);

  useEffect(() => {
    if (!marketCloudAvailable) return;
    let cancelled = false;
    void (async () => {
      const cloud = await marketCloudList();
      if (!cloud || cancelled) return;
      const cloudIds = new Set(cloud.map((entry) => entry.id));
      const pending = readVMarketEntries()
        .filter((entry) => entry.publishedByUser && !entry.cloudOnly && !cloudIds.has(entry.id))
        .slice(0, 25);
      if (!pending.length) return;
      let pushed = false;
      for (const entry of pending) {
        const result = await marketCloudPublish(entry);
        if (result.ok) pushed = true;
      }
      if (pushed && !cancelled) await refreshCloud();
    })();
    return () => { cancelled = true; };
  }, [refreshCloud]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => { contentRef.current?.scrollTo({ top: 0 }); }, [selectedId, tab]);

  const selected = selectedId ? entries.find((entry) => entry.id === selectedId) ?? null : null;
  const installedEntries = useMemo(() => entries.filter((entry) => installed.includes(entry.id)), [entries, installed]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return entries.filter((entry) => {
      if (tab === "games" && entry.type !== "game") return false;
      if (tab === "apps" && entry.type === "game") return false;
      if (tab === "library" && !installed.includes(entry.id)) return false;
      if (category !== "All" && entry.category !== category) return false;
      if (!needle) return true;
      return [entry.name, entry.company, entry.category, entry.tagline, entry.description].join(" ").toLowerCase().includes(needle);
    });
  }, [entries, tab, category, query, installed]);

  const featured = useMemo(() => entries.length ? entries.slice().sort((a, b) => ((b.rating||0) * Math.log10((b.downloads||0) + 10)) - ((a.rating||0) * Math.log10((a.downloads||0) + 10)))[0] : null, [entries]);
  const recommended = useMemo(() => (featured ? visible.filter((entry) => entry.id !== featured.id).slice(0, 6) : visible.slice(0, 6)), [visible, featured]);
  const topCharts = useMemo(() => (entries.length ? entries.slice().sort((a, b) => ((b.downloads||0) - (a.downloads||0))).slice(0, 5) : []), [entries]);

  const mutateEntry = (id: string, update: (entry: VMarketEntry) => VMarketEntry) => {
    setEntries((previous) => {
      const next = previous.map((entry) => entry.id === id ? update(entry) : entry);
      // Shared listings are read-only copies; never copy them into local storage.
      writeVMarketEntries(next.filter((entry) => !entry.cloudOnly));
      return next;
    });
  };

  const install = (entry: VMarketEntry) => {
    if (installed.includes(entry.id) || installingId) return;
    setInstallingId(entry.id);
    window.setTimeout(() => {
      const next = installed.includes(entry.id) ? installed : [...installed, entry.id];
      writeVMarketInstalled(next);
      setInstalled(next);
      cacheVMarketEntry(entry);
      void marketCloudInstall(entry.id);
      mutateEntry(entry.id, (item) => ({ ...item, downloads: item.downloads + 1 }));
      setInstallingId(null);
      setToast(`${entry.name} installed — find it on your desktop.`);
      notifyMarketChanged();
      try { window.dispatchEvent(new CustomEvent("vertex-vmarket-install", { detail: entry.id })); } catch { /* noop */ }
    }, 900);
  };

  const uninstall = (entry: VMarketEntry) => {
    const next = installed.filter((id) => id !== entry.id);
    writeVMarketInstalled(next);
    setInstalled(next);
    setToast(`${entry.name} uninstalled.`);
    notifyMarketChanged();
  };

  /** Remove one of your own listings everywhere: cloud row, local copy, cache, install. */
  const unpublish = async (entry: VMarketEntry) => {
    if (!window.confirm(`Unpublish “${entry.name}”? It disappears from V-MARKET for everyone.`)) return;
    const removed = await marketCloudDelete(entry.id);
    writeVMarketEntries(readVMarketEntries().filter((item) => item.id !== entry.id && !item.cloudOnly));
    forgetVMarketEntry(entry.id);
    const nextInstalled = readVMarketInstalled().filter((id) => id !== entry.id);
    writeVMarketInstalled(nextInstalled);
    setInstalled(nextInstalled);
    setEntries((previous) => previous.filter((item) => item.id !== entry.id));
    if (selectedId === entry.id) setSelectedId(null);
    notifyMarketChanged();
    setToast(
      !marketCloudAvailable
        ? `${entry.name} removed from this device. Cloud sync is offline.`
        : removed
          ? `${entry.name} unpublished from V-MARKET.`
          : `${entry.name} removed here, but the cloud listing could not be deleted.`,
    );
  };

  const submitReport = () => {
    if (!reportFor) return;
    try {
      const raw = localStorage.getItem(VM_REPORTS_KEY);
      const reports = raw ? JSON.parse(raw) : [];
      const next = Array.isArray(reports) ? reports : [];
      next.unshift({ id: uid("report"), entryId: reportFor.id, entryName: reportFor.name, reason: reportReason, detail: reportDetail.trim(), date: Date.now() });
      localStorage.setItem(VM_REPORTS_KEY, JSON.stringify(next.slice(0, 200)));
    } catch { /* noop */ }
    setToast("Report sent to V-MARKET trust & safety.");
    setReportFor(null);
    setReportDetail("");
    setReportReason("Broken or not working");
  };

  const submitReview = (entry: VMarketEntry) => {
    if (!reviewText.trim()) return;
    mutateEntry(entry.id, (item) => {
      const nextCount = item.ratingCount + 1;
      const nextRating = (item.rating * item.ratingCount + reviewStars) / nextCount;
      return {
        ...item,
        ratingCount: nextCount,
        rating: Math.round(nextRating * 10) / 10,
        reviews: [{ id: uid("rev"), author: reviewName.trim() || "you", stars: reviewStars, text: reviewText.trim(), date: Date.now(), helpful: 0 }, ...item.reviews],
      };
    });
    setReviewText("");
    setReviewName("");
    setReviewStars(5);
    setReviewOpen(false);
    setToast("Review posted. Thanks for the signal!");
  };

  const submitComment = (entry: VMarketEntry) => {
    if (!commentText.trim()) return;
    mutateEntry(entry.id, (item) => ({
      ...item,
      comments: [...item.comments, { id: uid("cmt"), author: "you", text: commentText.trim(), date: Date.now() }],
    }));
    setCommentText("");
    setToast("Comment posted.");
  };

  const openStudio = () => {
    try { window.dispatchEvent(new CustomEvent("vertex-open-app", { detail: "appmaker" })); } catch { /* noop */ }
  };

  const resetCatalog = () => {
    try {
      localStorage.removeItem(VM_ENTRIES_KEY);
      localStorage.removeItem(VM_INSTALLED_KEY);
    } catch { /* noop */ }
    setEntries(readVMarketEntries());
    setInstalled(readVMarketInstalled());
    setSelectedId(null);
    setToast("Local catalog restored.");
    notifyMarketChanged();
    void refreshCloud();
  };

  const allReviews = selected?.reviews ?? [];
  const reviewBuckets = [5, 4, 3, 2, 1].map((stars) => ({
    stars,
    count: allReviews.filter((item) => item.stars === stars).length,
  }));
  const maxBucket = Math.max(1, ...reviewBuckets.map((bucket) => bucket.count));

  return (
    <div className="vm-app">
      <header className="vm-top">
        <button className="vm-brand" onClick={() => { setSelectedId(null); setTab("home"); }} title="V-MARKET home">
          <img className="vm-brand-logo" src={vmAsset("images/v-market-logo.jpg")} alt="V-MARKET logo" />
          <span><strong>V-MARKET</strong><em>apps · games · websites</em></span>
        </button>
        <label className="vm-search">
          <Search size={16} />
          <input value={query} onChange={(event) => { setQuery(event.target.value); setSelectedId(null); }} placeholder="Search V-MARKET" />
          {query ? <button onClick={() => setQuery("")} aria-label="Clear search"><X size={14} /></button> : null}
        </label>
        <button className="vm-studio-cta" onClick={openStudio}><Wand2 size={15} /> <span>V-STUDIOS</span></button>
      </header>

      <nav className="vm-tabs" aria-label="Store sections">
        {([
          ["home", "Home", Sparkles],
          ["games", "Games", Gamepad2],
          ["apps", "Apps", LayoutGrid],
          ["library", "My apps", Library],
        ] as const).map(([id, label, Icon]) => (
          <button key={id} className={tab === id && !selected ? "active" : ""} onClick={() => { setTab(id); setSelectedId(null); }}>
            <Icon size={14} /> {label}
          </button>
        ))}
        <span className="vm-tabs-spacer" />
        <span className="vm-installed-count"><Check size={12} /> {installed.length} installed</span>
      </nav>

      <div className="vm-content" ref={contentRef}>
        {selected ? (
          <Detail
            entry={selected}
            installed={installed.includes(selected.id)}
            installing={installingId === selected.id}
            onBack={() => setSelectedId(null)}
            onInstall={() => install(selected)}
            onOpen={() => requestEntryOpen(selected.id)}
            onUninstall={() => uninstall(selected)}
            onReport={() => setReportFor(selected)}
            onUnpublish={() => void unpublish(selected)}
            canUnpublish={Boolean(selected.publishedByUser)}
            reviewOpen={reviewOpen}
            setReviewOpen={setReviewOpen}
            reviewStars={reviewStars}
            setReviewStars={setReviewStars}
            reviewText={reviewText}
            setReviewText={setReviewText}
            reviewName={reviewName}
            setReviewName={setReviewName}
            onSubmitReview={() => submitReview(selected)}
            commentText={commentText}
            setCommentText={setCommentText}
            onSubmitComment={() => submitComment(selected)}
            reviewBuckets={reviewBuckets}
            maxBucket={maxBucket}
          />
        ) : tab === "library" ? (
          <section className="vm-page">
            <div className="vm-page-head">
              <div><span className="vm-kicker">YOUR LIBRARY</span><h1>My apps</h1><p>Everything installed on this VERTEX-PC. Open apps right here or uninstall to free the shelf.</p></div>
              <span className="vm-big-badge">{installedEntries.length} installed</span>
            </div>
            {installedEntries.length === 0 ? (
              <div className="vm-empty"><Package size={38} /><h2>Nothing installed yet</h2><p>Browse the store and publish apps with V-STUDIOS.</p><button className="vm-primary" onClick={openStudio}>Open V-STUDIOS</button></div>
            ) : (
              <div className="vm-library-grid">
                {installedEntries.map((entry) => (
                  <article className="vm-library-card" key={entry.id}>
                    <AppLogo entry={entry} size={56} />
                    <div className="vm-library-copy"><strong>{entry.name}</strong><span>{entry.company} · {entry.type}</span><em>{formatDownloads(entry.downloads||0)} downloads</em></div>
                    <div className="vm-library-actions">
                      <button className="vm-primary small" onClick={() => requestEntryOpen(entry.id)}><Play size={12} fill="currentColor" /> Open</button>
                      <button className="vm-ghost small" onClick={() => setSelectedId(entry.id)}>Details</button>
                      <button className="vm-danger small" onClick={() => uninstall(entry)}><Trash2 size={12} /></button>
                    </div>
                  </article>
                ))}
              </div>
            )}
            <div className="vm-reset-row"><span>V-MARKET is empty - publish your own apps.</span></div>
          </section>
        ) : (
          <section className="vm-page">
            {!query && featured ? (
              <div className="vm-hero" style={{ "--vm-accent": "#8de6ff", "--vm-accent2": "#7c5cff" } as CSSProperties}>
                <div className="vm-hero-art"><AppLogo entry={featured} size={116} /></div>
                <div className="vm-hero-copy">
                  <span className="vm-kicker"><Sparkles size={12} /> FEATURED · {(featured.type||'app').toUpperCase()}</span>
                  <h1>{featured.name}</h1>
                  <p className="vm-hero-company"><BadgeCheck size={13} /> {featured.company} <span>·</span> {featured.category}</p>
                  <p className="vm-hero-desc">{featured.tagline}</p>
                  <div className="vm-hero-meta"><StarRow value={featured.rating||0} /><span>{(featured.rating||0).toFixed(1)}</span><span>·</span><span>{formatDownloads(featured.downloads||0)} downloads</span><span className="vm-age">{formatAge(featured.age||0)}</span></div>
                </div>
                <div className="vm-hero-actions">
                  <InstallButton entry={featured} installed={installed.includes(featured.id)} installing={installingId === featured.id} onInstall={() => install(featured)} onOpen={() => requestEntryOpen(featured.id)} />
                  <button className="vm-ghost" onClick={() => setSelectedId(featured.id)}>Details <ChevronRight size={14} /></button>
                </div>
              </div>
            ) : !query ? (
              <div className="vm-empty"><Package size={38} /><h2>V-MARKET is empty</h2><p>Use V-STUDIOS to build and publish your own website or app.</p><button className="vm-primary" onClick={openStudio}>Open V-STUDIOS</button></div>
            ) : null}

            {cloudState === "missing" ? (
              <div className="vm-cloud-note">
                <AlertTriangle size={14} />
                <span>
                  Global publishing is not set up yet, so listings only exist on this device. Paste{" "}
                  <code>V_MARKET_SETUP.sql</code> into the Supabase SQL editor once and every published app
                  becomes visible to everyone.
                </span>
              </div>
            ) : null}

            <div className="vm-chips">
              {CATEGORIES.map((item) => <button key={item} className={category === item ? "active" : ""} onClick={() => setCategory(item)}>{item}</button>)}
            </div>

            {(tab === "home" && !query) ? (
              <>
                <SectionTitle title="Recommended for you" subtitle="Picked by the V-MARKET algorithm (it mostly likes neon)." />
                <div className="vm-grid">{recommended.map((entry) => <AppCard key={entry.id} entry={entry} installed={installed.includes(entry.id)} installing={installingId === entry.id} onOpenDetail={() => setSelectedId(entry.id)} onInstall={() => install(entry)} onOpen={() => requestEntryOpen(entry.id)} />)}</div>

                <SectionTitle title="Top charts" subtitle="The most-installed things in the Vertex universe this week." />
                <div className="vm-chart">{topCharts.map((entry, index) => (
                  <button className="vm-chart-row" key={entry.id} onClick={() => setSelectedId(entry.id)}>
                    <span className="vm-rank">{String(index + 1).padStart(2, "0")}</span>
                    <AppLogo entry={entry} size={48} />
                    <span className="vm-chart-copy"><strong>{entry.name}</strong><span>{entry.company}</span><span className="vm-chart-meta"><StarRow value={entry.rating} size={11} /> {entry.rating.toFixed(1)} · {formatDownloads(entry.downloads)} · <em>{formatAge(entry.age)}</em></span></span>
                    <InstallButton entry={entry} installed={installed.includes(entry.id)} installing={installingId === entry.id} onInstall={() => install(entry)} onOpen={() => requestEntryOpen(entry.id)} compact />
                  </button>
                ))}</div>
              </>
            ) : (
              <>
                <SectionTitle title={tab === "games" ? "Games to get lost in" : tab === "apps" ? "Apps, sites & experiments" : `Results${query ? ` for “${query}”` : ""}`} subtitle={`${visible.length} listing${visible.length === 1 ? "" : "s"} in the V-MARKET catalog.`} />
                <div className="vm-grid">{visible.map((entry) => <AppCard key={entry.id} entry={entry} installed={installed.includes(entry.id)} installing={installingId === entry.id} onOpenDetail={() => setSelectedId(entry.id)} onInstall={() => install(entry)} onOpen={() => requestEntryOpen(entry.id)} />)}</div>
                {visible.length === 0 ? <div className="vm-empty"><Search size={34} /><h2>No results</h2><p>Try another search or category — or build it yourself in V-STUDIOS.</p><button className="vm-primary" onClick={openStudio}>Open V-STUDIOS</button></div> : null}
              </>
            )}

            <footer className="vm-footer"><span><ShieldCheck size={13} /> Every listing is a demo. Apps and companies are fictional or community-made.</span><button onClick={openStudio}><Wand2 size={13} /> Publish your own</button></footer>
          </section>
        )}
      </div>

      {toast ? <div className="vm-toast"><Check size={14} /> {toast}</div> : null}

      {reportFor ? (
        <div className="vm-modal" onClick={(event) => { if (event.target === event.currentTarget) setReportFor(null); }}>
          <div className="vm-modal-card">
            <header><div><span className="vm-kicker">TRUST &amp; SAFETY</span><h2>Report {reportFor.name}</h2></div><button className="vm-icon-btn" onClick={() => setReportFor(null)}><X size={16} /></button></header>
            <p>Reports are stored locally in this demo. Pick the best reason and add anything that helps.</p>
            <label className="vm-field"><span>Reason</span><select value={reportReason} onChange={(event) => setReportReason(event.target.value)}>{["Broken or not working", "Inappropriate content", "Copyright or impersonation", "Spam or misleading", "Something else"].map((reason) => <option key={reason}>{reason}</option>)}</select></label>
            <label className="vm-field"><span>Details (optional)</span><textarea value={reportDetail} onChange={(event) => setReportDetail(event.target.value)} placeholder="What happened?" rows={4} /></label>
            <div className="vm-modal-actions"><button className="vm-ghost" onClick={() => setReportFor(null)}>Cancel</button><button className="vm-danger" onClick={submitReport}><Flag size={13} /> Send report</button></div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return <div className="vm-section-title"><div><h2>{title}</h2><p>{subtitle}</p></div><button onClick={() => { /* categories above do the filtering */ }}>See all <ChevronRight size={13} /></button></div>;
}

function AppCard({ entry, installed, installing, onOpenDetail, onInstall, onOpen }: {
  entry: VMarketEntry;
  installed: boolean;
  installing: boolean;
  onOpenDetail: () => void;
  onInstall: () => void;
  onOpen: () => void;
}) {
  return (
    <article className="vm-card" onClick={onOpenDetail} role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === "Enter") onOpenDetail(); }}>
      <AppLogo entry={entry} size={58} />
      <div className="vm-card-copy">
        <strong>{entry.name}</strong>
        <span>{entry.company}</span>
        <span className="vm-card-meta"><StarRow value={entry.rating} size={10} /> {entry.rating.toFixed(1)} <em>·</em> {formatDownloads(entry.downloads)} <em>·</em> {formatAge(entry.age)}</span>
        <span className="vm-card-tagline">{entry.tagline}</span>
      </div>
      <div className="vm-card-side">
        {installed ? <span className="vm-installed-dot"><Check size={10} /> Installed</span> : null}
        <InstallButton entry={entry} installed={installed} installing={installing} onInstall={onInstall} onOpen={onOpen} compact />
      </div>
    </article>
  );
}

function Detail({ entry, installed, installing, onBack, onInstall, onOpen, onUninstall, onReport, onUnpublish, canUnpublish, reviewOpen, setReviewOpen, reviewStars, setReviewStars, reviewText, setReviewText, reviewName, setReviewName, onSubmitReview, commentText, setCommentText, onSubmitComment, reviewBuckets, maxBucket }: {
  entry: VMarketEntry;
  installed: boolean;
  installing: boolean;
  onBack: () => void;
  onInstall: () => void;
  onOpen: () => void;
  onUninstall: () => void;
  onReport: () => void;
  onUnpublish: () => void;
  canUnpublish: boolean;
  reviewOpen: boolean;
  setReviewOpen: (open: boolean) => void;
  reviewStars: number;
  setReviewStars: (stars: number) => void;
  reviewText: string;
  setReviewText: (text: string) => void;
  reviewName: string;
  setReviewName: (name: string) => void;
  onSubmitReview: () => void;
  commentText: string;
  setCommentText: (text: string) => void;
  onSubmitComment: () => void;
  reviewBuckets: { stars: number; count: number }[];
  maxBucket: number;
}) {
  const shots = entry.screenshots.length ? entry.screenshots : [];
  return (
    <article className="vm-detail">
      <button className="vm-back" onClick={onBack}><ArrowLeft size={14} /> Back to V-MARKET</button>
      <div className="vm-detail-hero" style={{ "--vm-accent": "#8de6ff", "--vm-accent2": "#7c5cff" } as CSSProperties}>
        <div className="vm-detail-glow" />
        <AppLogo entry={entry} size={112} />
        <div className="vm-detail-title">
          <span className="vm-kicker">{entry.type === "game" ? "GAME" : entry.type === "website" ? "WEBSITE" : "APP"} · {entry.category}</span>
          <h1>{entry.name}</h1>
          <p className="vm-detail-company"><BadgeCheck size={14} /> {entry.company} {entry.verified ? <span className="vm-verified">VERIFIED</span> : null}</p>
          <p className="vm-detail-tagline">{entry.tagline}</p>
          <div className="vm-detail-stats">
            <span><StarRow value={entry.rating} size={12} /> <b>{entry.rating.toFixed(1)}</b> <em>({formatDownloads(entry.ratingCount)})</em></span>
            <span><Download size={12} /> <b>{formatDownloads(entry.downloads)}</b></span>
            <span className="vm-age">{formatAge(entry.age)}</span>
            <span><ShieldCheck size={12} /> Demo verified</span>
          </div>
        </div>
        <div className="vm-detail-actions">
          <InstallButton entry={entry} installed={installed} installing={installing} onInstall={onInstall} onOpen={onOpen} />
          {installed ? <button className="vm-ghost small" onClick={onUninstall}>Uninstall</button> : null}
          <button className="vm-ghost small" onClick={onReport}><Flag size={12} /> Report</button>
        </div>
      </div>

      <div className="vm-detail-body">
        <main>
          <section className="vm-detail-section">
            <div className="vm-screenshots">
              {shots.length ? shots.map((shot, index) => <div className="vm-shot" key={index}><img src={shot} alt="" /></div>) : [0, 1, 2].map((index) => (
                <div className={`vm-shot generated g${index}`} key={index}>
                  <AppLogo entry={entry} size={46} />
                  <strong>{index === 0 ? entry.name : index === 1 ? entry.tagline : "Made with V-STUDIOS"}</strong>
                  <span>{index === 0 ? `${entry.company} · ${entry.category}` : index === 1 ? "Screenshot preview" : "Publish your own in seconds"}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="vm-detail-section">
            <h2>About this {entry.type}</h2>
            <p className="vm-about-text">{entry.description}</p>
            <div className="vm-feature-chips">{entry.features.map((feature) => <span key={feature}><Zap size={11} /> {feature}</span>)}</div>
            <div className="vm-meta-grid">
              <div><span>Version</span><strong>{entry.version}</strong></div>
              <div><span>Size</span><strong>{entry.size}</strong></div>
              <div><span>Updated</span><strong>{timeAgo(entry.createdAt)}</strong></div>
              <div><span>Age rating</span><strong>{formatAge(entry.age)}</strong></div>
              <div><span>Category</span><strong>{entry.category}</strong></div>
              <div><span>Publisher</span><strong>{entry.company}</strong></div>
            </div>
          </section>

          <section className="vm-detail-section vm-reviews">
            <div className="vm-reviews-head"><div><h2>Ratings and reviews</h2><p>Reviews are stored on this device for the demo.</p></div><button className="vm-primary small" onClick={() => setReviewOpen(!reviewOpen)}><Plus size={13} /> Write a review</button></div>
            <div className="vm-review-summary">
              <div className="vm-review-score"><strong>{entry.rating.toFixed(1)}</strong><StarRow value={entry.rating} size={15} /><span>{formatDownloads(entry.ratingCount)} ratings</span></div>
              <div className="vm-review-bars">{reviewBuckets.map((bucket) => <div className="vm-review-bar" key={bucket.stars}><span>{bucket.stars}</span><div><i style={{ width: `${Math.max(4, (bucket.count / maxBucket) * 100)}%` }} /></div><em>{bucket.count}</em></div>)}</div>
            </div>
            {reviewOpen ? (
              <div className="vm-review-form">
                <div className="vm-review-form-top"><strong>Your review</strong><div className="vm-star-picker">{[1, 2, 3, 4, 5].map((star) => <button key={star} className={star <= reviewStars ? "on" : ""} onClick={() => setReviewStars(star)}>★</button>)}</div></div>
                <input value={reviewName} onChange={(event) => setReviewName(event.target.value)} placeholder="Display name (optional)" />
                <textarea value={reviewText} onChange={(event) => setReviewText(event.target.value)} rows={4} placeholder={`What do you think of ${entry.name}?`} />
                <div className="vm-form-actions"><button className="vm-ghost small" onClick={() => setReviewOpen(false)}>Cancel</button><button className="vm-primary small" onClick={onSubmitReview} disabled={!reviewText.trim()}>Post review</button></div>
              </div>
            ) : null}
            <div className="vm-review-list">
              {entry.reviews.length ? entry.reviews.map((item) => (
                <div className="vm-review" key={item.id}>
                  <div className="vm-avatar">{item.author.slice(0, 1).toUpperCase()}</div>
                  <div><div className="vm-review-meta"><strong>{item.author}</strong><StarRow value={item.stars} size={10} /><span>{timeAgo(item.date)}</span></div><p>{item.text}</p><button className="vm-helpful"><Heart size={10} /> Helpful · {item.helpful}</button></div>
                </div>
              )) : <div className="vm-empty small"><Star size={22} /><p>No reviews yet. Be the first.</p></div>}
            </div>
          </section>

          <section className="vm-detail-section">
            <h2>Discussion</h2>
            <p className="vm-section-copy">Talk about {entry.name} with other people in the Vertex universe.</p>
            <div className="vm-comments">
              {entry.comments.map((item) => <div className="vm-comment" key={item.id}><div className="vm-avatar tiny">{item.author.slice(0, 1).toUpperCase()}</div><div><div className="vm-comment-meta"><strong>{item.author}</strong><span>{timeAgo(item.date)}</span></div><p>{item.text}</p></div></div>)}
              {entry.comments.length === 0 ? <p className="vm-muted">No comments yet — start the thread.</p> : null}
            </div>
            <div className="vm-comment-form"><input value={commentText} onChange={(event) => setCommentText(event.target.value)} placeholder="Add a comment…" onKeyDown={(event) => { if (event.key === "Enter") onSubmitComment(); }} /><button className="vm-primary small" onClick={onSubmitComment} disabled={!commentText.trim()}><Send size={12} /> Post</button></div>
          </section>
        </main>
        <aside className="vm-detail-side">
          <div className="vm-side-card"><span className="vm-kicker">AT A GLANCE</span><div className="vm-side-row"><span>Downloads</span><strong>{formatDownloads(entry.downloads)}</strong></div><div className="vm-side-row"><span>Rating</span><strong>{entry.rating.toFixed(1)} / 5</strong></div><div className="vm-side-row"><span>Age</span><strong>{formatAge(entry.age)}</strong></div><div className="vm-side-row"><span>Type</span><strong>{entry.type}</strong></div><div className="vm-side-row"><span>Publisher</span><strong>{entry.company}</strong></div></div>
          <div className="vm-side-card"><span className="vm-kicker">DATA SAFETY</span><p><ShieldCheck size={13} /> This demo listing runs locally and does not collect personal data.</p><div className="vm-side-row"><span>Data shared</span><strong>None</strong></div><div className="vm-side-row"><span>Data collected</span><strong>None</strong></div></div>
          <button className="vm-side-report" onClick={onReport}><Flag size={13} /> Report this listing</button>
          {canUnpublish ? (
            <button className="vm-side-report vm-side-unpublish" onClick={onUnpublish}>
              <Trash2 size={13} /> Unpublish from V-MARKET
            </button>
          ) : null}
          <p className="vm-side-note">Listing ID<br /><code>{entry.id}</code></p>
        </aside>
      </div>
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* Runner used when an installed market app is opened in Vertex-OS      */
/* ------------------------------------------------------------------ */

export function VMarketAppRunner({ entryId }: { entryId: string }) {
  const entry = useMemo(() => readVMarketEntries().find((item) => item.id === entryId) ?? null, [entryId]);
  if (!entry) {
    return <div className="vm-runner-missing"><Package size={40} /><h2>App not found</h2><p>This V-MARKET listing may have been removed.</p></div>;
  }
  if (entry.url) {
    return <iframe className="browser-frame" src={entry.url} title={entry.name} allow="autoplay; clipboard-write; camera; microphone; fullscreen; gamepad" allowFullScreen />;
  }
  return <iframe className="browser-frame" srcDoc={entry.html || fallbackPage(entry)} title={entry.name} allow="autoplay; clipboard-write; camera; microphone; fullscreen; gamepad" allowFullScreen />;
}

function fallbackPage(entry: VMarketEntry): string {
  return siteHtml({ name: entry.name, company: entry.company, tagline: entry.tagline, description: entry.description, accent: "#8de6ff", accent2: "#7c5cff", features: entry.features });
}

/* ------------------------------------------------------------------ */
/* V-STUDIOS - Roblox Studio style builder                             */
/* ------------------------------------------------------------------ */

type VsFile = {
  id: string;
  name: string;
  type: "html" | "css" | "js";
  content: string;
};

type VsTab = { id: string; fileId: string };

type BuildMode = "studio" | "url" | "template";
type TemplateId = "landing" | "portfolio" | "arcade" | "clicker" | "memory" | "runner" | "snake";

const TEMPLATES: { id: TemplateId; name: string; description: string; icon: string; type: "game" | "website" }[] = [
  { id: "landing", name: "Landing page", description: "Hero, features, CTA", icon: "🌐", type: "website" },
  { id: "portfolio", name: "Portfolio", description: "Project grid", icon: "🎨", type: "website" },
  { id: "arcade", name: "Arcade portal", description: "Game hub layout", icon: "🕹️", type: "website" },
  { id: "clicker", name: "Clicker game", description: "Orb clicker", icon: "⚡", type: "game" },
  { id: "memory", name: "Memory match", description: "Card pairs", icon: "🧠", type: "game" },
  { id: "runner", name: "Endless runner", description: "Jump & dodge", icon: "🚀", type: "game" },
  { id: "snake", name: "Pixel snake", description: "Classic snake", icon: "🐍", type: "game" },
];

const TOOLBOX = [
  { name: "Frame", desc: "Container for UI elements" },
  { name: "TextLabel", desc: "Display text" },
  { name: "TextButton", desc: "Clickable button" },
  { name: "TextBox", desc: "Input field" },
  { name: "ImageLabel", desc: "Image display" },
  { name: "ImageButton", desc: "Clickable image" },
  { name: "ScrollingFrame", desc: "Scrollable container" },
  { name: "UIListLayout", desc: "Vertical/horizontal layout" },
  { name: "UIGridLayout", desc: "Grid layout" },
  { name: "UIPadding", desc: "Add padding" },
  { name: "UICorner", desc: "Round corners" },
  { name: "UIStroke", desc: "Border outline" },
  { name: "UIGradient", desc: "Gradient fill" },
  { name: "UIScale", desc: "Scale object" },
  { name: "Script", desc: "Client-side script" },
  { name: "LocalScript", desc: "Local script" },
  { name: "ModuleScript", desc: "Shared module" },
];

const buildCodeHtml = (html: string, css: string, js: string) => `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head><body>${html}<script>${js}<\/script></body></html>`;

function buildMarketHtml(draft: {
  name: string; company: string; tagline: string; description: string; accent: string; accent2: string;
  features: string[]; template: TemplateId; mode: BuildMode; url: string; customHtml: string; customCss: string; customJs: string;
}): string {
  if (draft.mode === "url") return "";
  if (draft.mode === "studio") {
    return buildCodeHtml(draft.customHtml, draft.customCss, draft.customJs);
  }
  switch (draft.template) {
    case "clicker": return clickerHtml(draft.name || "Neon Clicker", draft.accent, draft.accent2);
    case "memory": return memoryHtml(draft.name || "Echo Memory", draft.accent, draft.accent2);
    case "runner": return runnerHtml(draft.name || "Void Runner", draft.accent, draft.accent2);
    case "snake": return snakeHtml(draft.name || "Pixel Serpent", draft.accent, draft.accent2);
    default: return siteHtml({ name: draft.name || "Untitled", company: draft.company || "Independent", tagline: draft.tagline, description: draft.description, accent: draft.accent, accent2: draft.accent2, features: draft.features, layout: draft.template });
  }
}

async function logoFileToDataUrl(file: File): Promise<string> {
  const data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Could not read image"));
    reader.readAsDataURL(file);
  });
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load image"));
    img.src = data;
  });
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return data;
  const scale = Math.min(size / image.width, size / image.height);
  const w = Math.round(image.width * scale);
  const h = Math.round(image.height * scale);
  ctx.drawImage(image, Math.round((size - w) / 2), Math.round((size - h) / 2), w, h);
  return canvas.toDataURL("image/jpeg", 0.84);
}

export function VStudiosSurface() {
  const [mode, setMode] = useState<BuildMode>("studio");
  const [template, setTemplate] = useState<TemplateId>("landing");
  const [name, setName] = useState("My Project");
  const [company, setCompany] = useState("My Studio");
  const [tagline, setTagline] = useState("Built with V-STUDIOS");
  const [description, setDescription] = useState("A custom creation built inside Vertex-OS.");
  const [category, setCategory] = useState("Gaming");
  const [type, setType] = useState<"game" | "app" | "website">("website");
  const [age, setAge] = useState(7);
  const [logo, setLogo] = useState("");
  const [accent, setAccent] = useState("#8de6ff");
  const [accent2, setAccent2] = useState("#7c5cff");
  const [features, setFeatures] = useState(["Fast", "Responsive", "Playable in Vertex-OS"]);
  const [url, setUrl] = useState("");
  const [files, setFiles] = useState<VsFile[]>([
    { id: "html", name: "index.html", type: "html", content: `<div class="game">\n  <header class="topbar">\n    <div class="brand">V-STUDIO</div>\n    <nav>\n      <button>Home</button>\n      <button>Play</button>\n      <button>About</button>\n    </nav>\n  </header>\n  <main class="hero">\n    <h1>Build inside <span>V-STUDIOS</span></h1>\n    <p>Design UI, write scripts, and publish straight to V-MARKET.</p>\n    <button class="cta" onclick="start()">Get Started</button>\n  </main>\n</div>` },
    { id: "css", name: "style.css", type: "css", content: `* { box-sizing: border-box; }\nbody { margin: 0; background: radial-gradient(120% 120% at 50% -10%, #8de6ff22, transparent), #070b14; color: #f1f7ff; font-family: Inter, system-ui, sans-serif; }\n.game { min-height: 100vh; }\n.topbar { display: flex; align-items: center; justify-content: space-between; padding: 16px 10vw; border-bottom: 1px solid #ffffff14; backdrop-filter: blur(12px); }\n.brand { font-weight: 800; letter-spacing: .2em; }\nnav button { margin-left: 10px; background: transparent; border: 1px solid #ffffff22; color: #c7d7e9; padding: 8px 14px; border-radius: 999px; }\n.hero { text-align: center; padding: 12vh 6vw; }\nh1 { font-size: clamp(42px, 9vw, 110px); letter-spacing: -.08em; margin: 0; }\nh1 span { color: #8de6ff; }\np { color: #9fb0c7; font-size: 18px; }\n.cta { margin-top: 18px; padding: 14px 26px; border-radius: 12px; border: 0; background: linear-gradient(135deg, #8de6ff, #7c5cff); font-weight: 800; }` },
    { id: "js", name: "main.js", type: "js", content: `function start(){\n  alert("Published from V-STUDIOS!");\n}\nconsole.log("V-STUDIOS runtime ready");` },
  ]);
  const [tabs, setTabs] = useState<VsTab[]>([{ id: "t-html", fileId: "html" }, { id: "t-css", fileId: "css" }, { id: "t-js", fileId: "js" }]);
  const [activeTab, setActiveTab] = useState("t-html");
  const [explorerOpen, setExplorerOpen] = useState(true);
  const [toolboxOpen, setToolboxOpen] = useState(true);
  const [propsOpen, setPropsOpen] = useState(true);
  const [installAfter, setInstallAfter] = useState(true);
  const [published, setPublished] = useState<VMarketEntry[]>(() => readVMarketEntries().filter((entry) => entry.publishedByUser));
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const refresh = () => setPublished(readVMarketEntries().filter((entry) => entry.publishedByUser));
    window.addEventListener("vertex-vmarket-changed", refresh);
    return () => window.removeEventListener("vertex-vmarket-changed", refresh);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const activeFile = useMemo(() => {
    const tab = tabs.find((t) => t.id === activeTab);
    return files.find((f) => f.id === tab?.fileId) ?? files[0];
  }, [tabs, activeTab, files]);

  const previewHtml = useMemo(() => {
    if (mode === "url") return "";
    if (mode === "template") {
      const draft = { name, company, tagline, description, accent, accent2, features, template, mode, url: "", customHtml: "", customCss: "", customJs: "" };
      return buildMarketHtml(draft);
    }
    const html = files.find((f) => f.type === "html")?.content ?? "<body></body>";
    const css = files.find((f) => f.type === "css")?.content ?? "";
    const js = files.find((f) => f.type === "js")?.content ?? "";
    return buildCodeHtml(html, css, js);
  }, [mode, template, name, company, tagline, description, accent, accent2, features, files]);

  const openFile = (fileId: string) => {
    const existing = tabs.find((t) => t.fileId === fileId);
    if (existing) { setActiveTab(existing.id); return; }
    const id = `t-${fileId}-${Date.now().toString(36)}`;
    setTabs((prev) => [...prev, { id, fileId }]);
    setActiveTab(id);
  };

  const closeTab = (tabId: string) => {
    setTabs((prev) => {
      const next = prev.filter((t) => t.id !== tabId);
      if (next.length === 0) {
        const id = `t-${files[0].id}-${Date.now().toString(36)}`;
        setActiveTab(id);
        return [{ id, fileId: files[0].id }];
      }
      if (activeTab === tabId) setActiveTab(next[next.length - 1].id);
      return next;
    });
  };

  const updateFile = (fileId: string, content: string) => {
    setFiles((prev) => prev.map((f) => f.id === fileId ? { ...f, content } : f));
  };

  const addFile = (type: "html" | "css" | "js") => {
    const id = `${type}-${Date.now().toString(36)}`;
    const name = type === "html" ? "page.html" : type === "css" ? "styles.css" : "script.js";
    setFiles((prev) => [...prev, { id, name, type, content: "" }]);
    openFile(id);
    setError("");
  };

  const pickLogo = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) { setError("Pick an image file for the logo."); return; }
    try {
      const data = await logoFileToDataUrl(file);
      setLogo(data);
      setError("");
    } catch { setError("That image could not be read."); }
  };

  const publish = async () => {
    if (isPublishing) return;
    if (!name.trim()) { setError("Give your project a name first."); return; }
    if (!company.trim()) { setError("Add a creator/studio name."); return; }
    if (mode === "url" && !/^https?:\/\//i.test(url.trim())) { setError("Embed URL must start with http:// or https://"); return; }
    if (!description.trim()) { setError("Write a short description for your listing."); return; }
    const id = `vmarket_${slug(name)}_${Date.now().toString(36)}`;
    const entry: VMarketEntry = {
      id,
      name: name.trim(),
      company: company.trim(),
      tagline: tagline.trim() || "Built with V-STUDIOS",
      description: description.trim(),
      logo: logo.trim() || makeLogo(name.trim(), type === "game" ? "🎮" : "⚙", accent, accent2),
      category: category.trim() || "Tools",
      type,
      age,
      downloads: 0,
      rating: 5,
      ratingCount: 1,
      version: "1.0",
      size: `${(Math.random() * 3 + 0.8).toFixed(1)} MB`,
      url: mode === "url" ? url.trim() : undefined,
      html: mode === "url" ? undefined : (previewHtml || buildCodeHtml(files.find(f=>f.type==='html')?.content||'', files.find(f=>f.type==='css')?.content||'', files.find(f=>f.type==='js')?.content||'')),
      features: features.map((item) => item.trim()).filter(Boolean).slice(0, 6),
      screenshots: [],
      reviews: [{ id: uid("rev"), author: "you", stars: 5, text: "Published from V-STUDIOS.", date: Date.now(), helpful: 0 }],
      comments: [],
      createdAt: Date.now(),
      verified: false,
      publishedByUser: true,
    };
    setIsPublishing(true);
    setError("");
    try {
      const entries = readVMarketEntries();
      writeVMarketEntries([entry, ...entries]);
      if (installAfter) {
        const installed = readVMarketInstalled();
        writeVMarketInstalled([entry.id, ...installed.filter((item) => item !== entry.id)]);
      }
      setPublished(readVMarketEntries().filter((item) => item.publishedByUser));
      notifyMarketChanged();
      if (installAfter) {
        try { window.dispatchEvent(new CustomEvent("vertex-vmarket-install", { detail: entry.id })); } catch { /* noop */ }
      }
      const cloud = await marketCloudPublish(entry);
      if (cloud.ok) {
        setToast(`${entry.name} published to V-MARKET for everyone.`);
      } else {
        setToast(`${entry.name} is only on this device - cloud sync failed.`);
        setError(`Saved locally, but the shared V-MARKET could not be updated: ${cloud.error ?? "unknown error"}`);
      }
      try { window.dispatchEvent(new CustomEvent("vertex-open-app", { detail: "hub" })); } catch { /* noop */ }
    } finally {
      setIsPublishing(false);
    }
  };

  const removePublished = async (entry: VMarketEntry) => {
    writeVMarketEntries(readVMarketEntries().filter((item) => item.id !== entry.id));
    writeVMarketInstalled(readVMarketInstalled().filter((id) => id !== entry.id));
    setPublished(readVMarketEntries().filter((item) => item.publishedByUser));
    notifyMarketChanged();
    const removed = await marketCloudDelete(entry.id);
    setToast(removed
      ? `${entry.name} removed from V-MARKET.`
      : `${entry.name} removed here, but the shared listing could not be deleted.`);
  };

  const openMarket = () => { try { window.dispatchEvent(new CustomEvent("vertex-open-app", { detail: "hub" })); } catch { /* noop */ } };

  return (
    <div className="vs-app vs-studio">
      <header className="vs-studio-bar">
        <div className="vs-studio-brand"><img src={vmAsset("images/v-studios-logo.svg")} alt="" /><span><strong>V-STUDIOS</strong><em>Roblox-style builder</em></span></div>
        <div className="vs-studio-modes">
          <button className={mode === "studio" ? "active" : ""} onClick={() => setMode("studio")}>Code</button>
          <button className={mode === "template" ? "active" : ""} onClick={() => setMode("template")}>Templates</button>
          <button className={mode === "url" ? "active" : ""} onClick={() => setMode("url")}>Embed URL</button>
        </div>
        <div className="vs-studio-actions">
          <input className="vs-project-name" value={name} onChange={(e) => setName(e.target.value)} />
          <button className="vm-ghost small" onClick={openMarket}><LayoutGrid size={12} /> Market</button>
          <button className="vm-primary small" onClick={() => void publish()} disabled={isPublishing}><Rocket size={12} /> {isPublishing ? "Publishing..." : "Publish"}</button>
        </div>
      </header>

      {mode === "template" ? (
        <div className="vs-template-picker">
          <div className="vs-tp-head"><span className="vm-kicker">TEMPLATES</span><button onClick={() => setMode("studio")}>Back to Studio</button></div>
          <div className="vs-tp-grid">
            {TEMPLATES.map((item) => (
              <button key={item.id} className="vs-tp-card" onClick={() => { setTemplate(item.id); setType(item.type); setMode("studio"); if (item.type === "game") setCategory("Arcade"); }}>
                <span className="vs-tp-icon">{item.icon}</span>
                <strong>{item.name}</strong>
                <p>{item.description}</p>
                <em>{item.type}</em>
              </button>
            ))}
          </div>
        </div>
      ) : mode === "url" ? (
        <div className="vs-url-panel">
          <div className="vs-url-card">
            <span className="vm-kicker">EMBED WEBSITE</span>
            <h2>Publish an external site to V-MARKET</h2>
            <label className="vm-field"><span>Website URL</span><input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com" /></label>
            <label className="vm-field"><span>Listing Name</span><input value={name} onChange={(e) => setName(e.target.value)} /></label>
            <label className="vm-field"><span>Publisher</span><input value={company} onChange={(e) => setCompany(e.target.value)} /></label>
            <label className="vm-field"><span>Description</span><textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} /></label>
            <div className="vs-logo-row">
              <span className="vm-app-logo" style={{ width: 56, height: 56, borderRadius: 14 }}>{logo ? <img src={logo} alt="" /> : <span className="vs-logo-empty">LOGO</span>}</span>
              <div><button className="vm-ghost small" onClick={() => fileRef.current?.click()}><Upload size={12} /> Upload logo</button><button className="vm-ghost small" onClick={() => setLogo("")}>Use auto</button><input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => void pickLogo(e.target.files?.[0])} /><small>Square images look best</small></div>
            </div>
            <div className="vs-two"><label className="vm-field"><span>Type</span><select value={type} onChange={(e) => setType(e.target.value as any)}><option value="website">Website</option><option value="game">Game</option><option value="app">App</option></select></label><label className="vm-field"><span>Category</span><input value={category} onChange={(e) => setCategory(e.target.value)} /></label></div>
            <label className="vm-field"><span>Preview</span></label>
            {url && /^https?:\/\//i.test(url.trim()) ? <iframe src={url.trim()} title="Embed preview" style={{ width: '100%', height: 200, border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, background: '#000' }} /> : <div style={{ padding: 20, textAlign: 'center', color: '#6b7a8f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}>Enter a URL to preview</div>}
            <div className="vs-url-row"><button className="vm-ghost" onClick={() => setMode("studio")}>Cancel</button><button className="vm-primary" onClick={publish}><Rocket size={13} /> Publish embedded site</button></div>
            {error ? <p className="vs-error">{error}</p> : null}
          </div>
        </div>
      ) : (
        <div className="vs-studio-layout">
          <aside className={`vs-panel-left ${explorerOpen ? "" : "collapsed"}`}>
            <div className="vs-panel-head"><span><Folder size={12} /> Explorer</span><button onClick={() => setExplorerOpen(!explorerOpen)}>{explorerOpen ? "−" : "+"}</button></div>
            {explorerOpen ? (
              <div className="vs-explorer">
                <div className="vs-explorer-section"><span>ReplicatedFirst</span><button title="Add file" onClick={() => addFile("html")}><FilePlus size={11} /></button></div>
                <div className="vs-explorer-section"><span>ServerScriptService</span></div>
                <div className="vs-explorer-section"><span>StarterGui</span></div>
                <div className="vs-explorer-section"><span>Workspace</span><button title="Add file"><FolderPlus size={11} /></button></div>
                {files.map((f) => (
                  <button key={f.id} className={`vs-explorer-item ${activeFile?.id === f.id ? "active" : ""}`} onClick={() => openFile(f.id)}>
                    <span className={`dot ${f.type}`}></span>{f.name}
                  </button>
                ))}
                <div className="vs-explorer-section"><span>ReplicatedStorage</span></div>
              </div>
            ) : null}
          </aside>
          <main className="vs-main">
            <div className="vs-tabs-row">
              {tabs.map((t) => {
                const f = files.find((x) => x.id === t.fileId);
                if (!f) return null;
                return (
                  <button key={t.id} className={`vs-tab ${t.id === activeTab ? "active" : ""}`} onClick={() => setActiveTab(t.id)}>
                    <span className={`dot ${f.type}`}></span>{f.name}<span className="vs-tab-close" onClick={(e) => { e.stopPropagation(); closeTab(t.id); }}>×</span>
                  </button>
                );
              })}
              <button className="vs-tab-add" onClick={() => addFile("html")} title="New script"><FilePlus size={12} /></button>
              <button className="vs-tab-add" onClick={() => addFile("css")} title="New style"><FilePlus size={12} /></button>
              <button className="vs-tab-add" onClick={() => addFile("js")} title="New script"><FilePlus size={12} /></button>
            </div>
            <div className="vs-editor-wrap">
              <div className="vs-editor-status">
                <span><Terminal size={11} /> {activeFile?.name}</span>
                <span>Lines: {activeFile?.content.split('\n').length || 0}</span>
              </div>
              <textarea className="vs-editor" value={activeFile?.content ?? ""} onChange={(e) => activeFile && updateFile(activeFile.id, e.target.value)} spellCheck={false} placeholder="Write your code here..." />
            </div>
          </main>
          <aside className={`vs-panel-right ${toolboxOpen || propsOpen ? "" : "collapsed"}`}>
            <div className="vs-panel-head"><span><MousePointer2 size={12} /> Toolbox</span><button onClick={() => setToolboxOpen(!toolboxOpen)}>{toolboxOpen ? "−" : "+"}</button></div>
            {toolboxOpen ? (
              <div className="vs-toolbox">
                {TOOLBOX.map((item) => (
                  <button key={item.name} className="vs-toolbox-item" title={item.desc}><div><strong>{item.name}</strong><span>{item.desc}</span></div></button>
                ))}
              </div>
            ) : null}
            <div className="vs-panel-head" style={{ marginTop: 6 }}><span><Edit3 size={12} /> Properties</span><button onClick={() => setPropsOpen(!propsOpen)}>{propsOpen ? "−" : "+"}</button></div>
            {propsOpen ? (
              <div className="vs-props">
                <div className="vs-props-section"><span>Object</span></div>
                <label><span>ClassName</span><input value="Frame" readOnly /></label>
                <label><span>Name</span><input value="MainFrame" readOnly /></label>
                <div className="vs-props-section"><span>Transform</span></div>
                <div className="vs-props-row"><label><span>Position</span><input value="{0.5, 0},{0.5, 0}" readOnly /></label><label><span>Size</span><input value="{0, 400},{0, 300}" readOnly /></label></div>
                <div className="vs-props-section"><span>Appearance</span></div>
                <label><span>BackgroundColor3</span><input type="color" value="#1a1f2e" readOnly /></label>
                <label><span>BackgroundTransparency</span><input value="0" readOnly /></label>
                <div className="vs-props-section"><span>Listing Settings</span></div>
                <label><span>Project Name</span><input value={name} onChange={(e) => setName(e.target.value)} /></label>
                <label><span>Publisher</span><input value={company} onChange={(e) => setCompany(e.target.value)} /></label>
                <label><span>Tagline</span><input value={tagline} onChange={(e) => setTagline(e.target.value)} /></label>
                <label><span>Description</span><textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} /></label>
                <label><span>Type</span><select value={type} onChange={(e) => setType(e.target.value as any)}><option value="website">Website</option><option value="game">Game</option><option value="app">App</option></select></label>
                <label><span>Category</span><input value={category} onChange={(e) => setCategory(e.target.value)} /></label>
                <label><span>Accent</span><input type="color" value={accent} onChange={(e) => setAccent(e.target.value)} /></label>
                <label><span>Accent 2</span><input type="color" value={accent2} onChange={(e) => setAccent2(e.target.value)} /></label>
                <label><span>Logo</span><div className="vs-props-logo"><button className="vm-ghost small" onClick={() => fileRef.current?.click()}>Upload</button>{logo ? <img src={logo} alt="" /> : null}</div></label>
                <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => void pickLogo(e.target.files?.[0])} />
                <label className="vs-check"><input type="checkbox" checked={installAfter} onChange={(e) => setInstallAfter(e.target.checked)} /><span>Auto-install on publish</span></label>
                {error ? <p className="vs-error">{error}</p> : null}
                <button className="vm-primary wide" onClick={() => void publish()} disabled={isPublishing}><Rocket size={13} /> {isPublishing ? "Publishing..." : "Publish to V-MARKET"}</button>
              </div>
            ) : null}
          </aside>
        </div>
      )}

      {mode === "studio" ? (
        <div className="vs-preview-bar">
          <div className="vs-preview-tabs"><button className="active">Live Preview</button><button>Output</button><button>Console</button></div>
          <div className="vs-preview-actions">
            <span className="vs-pub-count">{published.length} published</span>
            <button className="vm-ghost small" onClick={() => setToast("Preview updated")}><RotateCcw size={11} /> Refresh</button>
            <button className="vm-primary small" onClick={() => void publish()} disabled={isPublishing}><Rocket size={11} /> {isPublishing ? "Publishing..." : "Publish"}</button>
          </div>
        </div>
      ) : null}
      {mode === "studio" ? (
        <div className="vs-viewport">
          <div className="vs-viewport-frame">
            <iframe srcDoc={previewHtml} title="V-STUDIOS Live Preview" allow="autoplay; clipboard-write; fullscreen; gamepad" />
          </div>
          <div className="vs-output-panel">
            <div className="vs-output-head"><span><Terminal size={11} /> Output</span></div>
            <div className="vs-output-content">
              <div>[V-STUDIOS] Workspace loaded - {files.length} file(s)</div>
              <div>[V-STUDIOS] Live preview active</div>
              <div>[V-STUDIOS] Ready to build and publish</div>
            </div>
          </div>
        </div>
      ) : null}

      {toast ? <div className="vm-toast"><Check size={14} /> {toast}</div> : null}
    </div>
  );
}
