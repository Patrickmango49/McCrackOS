import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle, ArrowUp, ChevronDown, Code2, Copy, FileText, Gauge, GraduationCap,
  Lightbulb, Loader2, Menu, Monitor, Pencil, RefreshCw, Search, Sparkles, Square, Trash2, X,
} from "lucide-react";

/* ------------------------------------------------------------------ *
 * VER-AI — free, keyless AI assistant.
 * Providers: tried in order, all OpenAI-compatible SSE (no key, no sign-in):
 *   1. OVHcloud AI Endpoints  (oai.endpoints.kepler.ai.cloud.ovh.net)
 *   2. LLM7.io                (api.llm7.io)
 *   3. Pollinations           (text.pollinations.ai)
 * If one provider is blocked or busy, the next is tried automatically.
 * ------------------------------------------------------------------ */

type Attach = { kind: "text" | "image"; name: string; text?: string; url?: string };
type Msg = {
  id: string;
  role: "user" | "ai";
  text: string;
  atts?: Attach[];
  error?: boolean;
  modelId?: string;
};
type Chat = { id: string; title: string; msgs: Msg[]; ts: number };

const LS_CHATS = "verai_chats";
const LS_ACTIVE = "verai_active";
const LS_USAGE = "verai_usage";
const LS_MODEL = "verai_model";
const DAILY_LIMIT = 100;
const HISTORY_CAP = 40;
const POLL_FIRST_TOKEN = 25_000;

type Route = { provider: string; url: string; model: string };
type ModelDef = { id: string; label: string; provider: string; vision: boolean; routes: Route[] };

const OVH_URL = "https://oai.endpoints.kepler.ai.cloud.ovh.net/v1/chat/completions";
const LLM7_URL = "https://api.llm7.io/v1/chat/completions";
const POLL_URL = "https://text.pollinations.ai/openai";

const MODELS: ModelDef[] = [
  {
    id: "gpt-oss-20b",
    label: "GPT-OSS 20B",
    provider: "Free · no sign-in",
    vision: false,
    routes: [
      { provider: "OVHcloud", url: OVH_URL, model: "gpt-oss-20b" },
      { provider: "LLM7", url: LLM7_URL, model: "gpt-oss:20b" },
      { provider: "Pollinations", url: POLL_URL, model: "openai-fast" },
    ],
  },
  {
    id: "llama-3.3-70b",
    label: "Llama 3.3 70B",
    provider: "Free · no sign-in",
    vision: false,
    routes: [
      { provider: "OVHcloud", url: OVH_URL, model: "Meta-Llama-3_3-70B-Instruct" },
      { provider: "LLM7", url: LLM7_URL, model: "mistral-Nemo-Instruct-2407" },
      { provider: "Pollinations", url: POLL_URL, model: "openai-fast" },
    ],
  },
  {
    id: "mistral-nemo",
    label: "Mistral Nemo",
    provider: "Free · no sign-in",
    vision: false,
    routes: [
      { provider: "OVHcloud", url: OVH_URL, model: "Mistral-Nemo-Instruct-2407" },
      { provider: "LLM7", url: LLM7_URL, model: "mistral-Nemo-Instruct-2407" },
      { provider: "Pollinations", url: POLL_URL, model: "openai-fast" },
    ],
  },
];

const SUGGESTIONS = [
  { icon: Lightbulb, label: "Explain a concept", prompt: "Explain quantum entanglement in simple terms, with one everyday analogy." },
  { icon: Code2, label: "Help me code", prompt: "Write a TypeScript function that debounce-wraps any callback, with types and a short usage example." },
  { icon: FileText, label: "Summarize text", prompt: "Paste a long article and I'll summarize it. Start with: \"Summarize the following in 5 bullet points:\n\n\"" },
  { icon: GraduationCap, label: "Quiz me", prompt: "Give me a 5-question multiple-choice quiz on world capitals. Wait for my answer after each question, then score me at the end." },
];

/* --------------------------------------------------------------- storage */

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function readUsage(): { date: string; count: number } {
  try {
    const raw = localStorage.getItem(LS_USAGE);
    if (raw) {
      const p = JSON.parse(raw);
      if (p && typeof p.date === "string" && typeof p.count === "number") return p;
    }
  } catch { /* ignore */ }
  return { date: todayKey(), count: 0 };
}

function writeUsage(u: { date: string; count: number }) {
  try { localStorage.setItem(LS_USAGE, JSON.stringify(u)); } catch { /* ignore */ }
}

function uid() {
  return `v${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

function readChats(): Chat[] {
  try {
    const raw = localStorage.getItem(LS_CHATS);
    if (raw) {
      const p = JSON.parse(raw);
      if (Array.isArray(p)) {
        return p.filter((c) => c && typeof c.id === "string" && Array.isArray(c.msgs)).map((c) => ({
          id: c.id,
          title: typeof c.title === "string" ? c.title : "Untitled",
          ts: typeof c.ts === "number" ? c.ts : Date.now(),
          msgs: (c.msgs as Msg[]).filter((m) => m && (m.role === "user" || m.role === "ai") && typeof m.text === "string"),
        }));
      }
    }
  } catch { /* ignore */ }
  return [];
}

function writeChats(chats: Chat[]) {
  try { localStorage.setItem(LS_CHATS, JSON.stringify(chats.slice(0, 60))); } catch { /* ignore */ }
}

function newChat(): Chat {
  return { id: uid(), title: "Untitled", msgs: [], ts: Date.now() };
}

function titleFrom(text: string) {
  const t = text.replace(/\s+/g, " ").trim();
  if (!t) return "Untitled";
  return t.length > 34 ? `${t.slice(0, 34).trimEnd()}…` : t;
}

/* ------------------------------------------------------------ markdown */

let mdLoaded: Promise<void> | null = null;

function loadMdLibs(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  const w = window as unknown as Record<string, unknown>;
  if (w.marked && w.DOMPurify && w.hljs) return Promise.resolve();
  if (mdLoaded) return mdLoaded;

  const loadScript = (src: string) =>
    new Promise<void>((res, rej) => {
      const s = document.createElement("script");
      s.src = src;
      s.async = true;
      s.onload = () => res();
      s.onerror = () => rej(new Error(`cdn ${src}`));
      document.head.appendChild(s);
    });

  if (!document.getElementById("verai-hljs-css")) {
    const link = document.createElement("link");
    link.id = "verai-hljs-css";
    link.rel = "stylesheet";
    link.href = "https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.9.0/build/styles/github-dark.min.css";
    document.head.appendChild(link);
  }

  mdLoaded = loadScript("https://cdn.jsdelivr.net/npm/marked@12.0.2/marked.min.js")
    .then(() => loadScript("https://cdn.jsdelivr.net/npm/dompurify@3.1.6/dist/purify.min.js"))
    .then(() => loadScript("https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.9.0/build/highlight.min.js"))
    .catch(() => { /* stay on plain text */ });

  return mdLoaded;
}

function renderMarkdown(text: string): string {
  const w = window as unknown as Record<string, unknown>;
  if (!w.marked || !w.DOMPurify) {
    return text.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c] as string);
  }
  try {
    const raw = (w.marked as { parse: (s: string, o?: unknown) => string }).parse(text, { breaks: true, gfm: true });
    return (w.DOMPurify as { sanitize: (s: string) => string }).sanitize(raw);
  } catch {
    return text;
  }
}

/* --------------------------------------------------------------- poll */

async function* streamChat(url: string, payload: unknown, signal: AbortSignal): AsyncGenerator<string> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal,
  });
  if (!res.ok) throw new Error(`Provider replied ${res.status}.`);
  const type = res.headers.get("content-type") || "";
  if (!res.body || !type.includes("text/event-stream")) {
    const j = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const t = j.choices?.[0]?.message?.content ?? "";
    if (t) yield t;
    return;
  }
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split(/\r?\n/);
    buf = lines.pop() ?? "";
    for (const line of lines) {
      const tr = line.trim();
      if (!tr.startsWith("data:")) continue;
      const body = tr.slice(5).trim();
      if (!body || body === "[DONE]") continue;
      try {
        const j = JSON.parse(body) as { choices?: { delta?: { content?: string } }[] };
        const c = j.choices?.[0]?.delta?.content;
        if (c) yield c;
      } catch { /* skip */ }
    }
  }
  if (buf.trim().startsWith("data:")) {
    const body = buf.trim().slice(5).trim();
    if (body && body !== "[DONE]") {
      try {
        const j = JSON.parse(body) as { choices?: { delta?: { content?: string } }[] };
        const c = j.choices?.[0]?.delta?.content;
        if (c) yield c;
      } catch { /* skip */ }
    }
  }
}

type ChatMsg = { role: "user" | "assistant"; content: unknown };

/* --------------------------------------------------------------- styles */

const CSS = `
#ver-ai-app{position:absolute;inset:0;overflow:hidden;font-family:var(--font-ui,Inter,system-ui,sans-serif);color:#f3f4f6;background:#0b0b0d;}
#ver-ai-app *{box-sizing:border-box;}
#ver-ai-app .va-bg{position:absolute;inset:0;overflow:hidden;pointer-events:none;z-index:0;}
#ver-ai-app .va-bg i{position:absolute;display:block;border-radius:50%;filter:blur(90px);opacity:.5;animation:vaDrift 26s ease-in-out infinite;}
#ver-ai-app .va-bg i:nth-child(1){width:70vw;height:38vh;left:-12vw;top:-6vh;background:linear-gradient(115deg,#3a3a44,#1a1a20 70%);transform:rotate(-18deg);}
#ver-ai-app .va-bg i:nth-child(2){width:62vw;height:30vh;right:-10vw;top:26vh;background:linear-gradient(115deg,#2c2c34,#101014 72%);transform:rotate(14deg);animation-delay:-8s;}
#ver-ai-app .va-bg i:nth-child(3){width:80vw;height:34vh;left:-6vw;bottom:-8vh;background:linear-gradient(115deg,#24242c,#0c0c10 70%);transform:rotate(-9deg);animation-delay:-16s;}
@keyframes vaDrift{0%,100%{transform:translate3d(0,0,0) rotate(var(--va-r,-14deg));}50%{transform:translate3d(3vw,2vh,0) rotate(calc(var(--va-r,-14deg) + 4deg));}}

#ver-ai-app .va-root{position:relative;z-index:1;display:flex;height:100%;width:100%;}

/* ---------------- sidebar ---------------- */
#ver-ai-app .va-side{width:265px;flex:0 0 265px;display:flex;flex-direction:column;height:100%;padding:12px;gap:10px;background:rgba(20,20,24,.62);backdrop-filter:blur(18px) saturate(1.1);-webkit-backdrop-filter:blur(18px) saturate(1.1);border-right:1px solid rgba(255,255,255,.07);}
#ver-ai-app .va-new{display:flex;align-items:center;gap:9px;width:100%;padding:11px 13px;border-radius:11px;border:1px solid rgba(255,255,255,.10);background:rgba(255,255,255,.07);color:#f6f6f8;font:600 14px/1 var(--font-ui,Inter,system-ui,sans-serif);cursor:pointer;transition:background .16s,border-color .16s;}
#ver-ai-app .va-new:hover{background:rgba(255,255,255,.13);border-color:rgba(255,255,255,.18);}
#ver-ai-app .va-search{display:flex;align-items:center;gap:8px;width:100%;padding:10px 12px;border-radius:11px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.045);color:#9ca3af;}
#ver-ai-app .va-search input{flex:1;min-width:0;border:0;outline:0;background:transparent;color:#f3f4f6;font:400 13px/1 var(--font-ui,Inter,system-ui,sans-serif);}
#ver-ai-app .va-search input::placeholder{color:#6b7280;}
#ver-ai-app .va-seclabel{padding:6px 4px 0;color:#6b7280;font:600 10.5px/1 var(--font-ui,Inter,system-ui,sans-serif);letter-spacing:.09em;text-transform:uppercase;}
#ver-ai-app .va-list{flex:1;min-height:0;overflow-y:auto;overflow-x:hidden;display:flex;flex-direction:column;gap:2px;padding-right:2px;}
#ver-ai-app .va-item{display:flex;align-items:center;gap:6px;padding:9px 10px;border-radius:10px;border:1px solid transparent;background:transparent;color:#d1d5db;font:500 13px/1.25 var(--font-ui,Inter,system-ui,sans-serif);cursor:pointer;text-align:left;transition:background .14s;}
#ver-ai-app .va-item span{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
#ver-ai-app .va-item:hover{background:rgba(255,255,255,.06);}
#ver-ai-app .va-item.on{background:rgba(255,255,255,.11);color:#fff;}
#ver-ai-app .va-item .va-acts{display:none;gap:2px;flex:0 0 auto;}
#ver-ai-app .va-item:hover .va-acts,#ver-ai-app .va-item:focus-within .va-acts{display:flex;}
#ver-ai-app .va-mini{display:grid;place-items:center;width:22px;height:22px;border:0;border-radius:6px;background:transparent;color:#9ca3af;cursor:pointer;}
#ver-ai-app .va-mini:hover{background:rgba(255,255,255,.12);color:#fff;}
#ver-ai-app .va-empty-list{padding:14px 8px;color:#6b7280;font:400 12.5px/1.5 var(--font-ui,Inter,system-ui,sans-serif);}
#ver-ai-app .va-quota{flex:0 0 auto;padding:12px 13px;border-radius:12px;border:1px solid rgba(255,255,255,.09);background:rgba(255,255,255,.05);}
#ver-ai-app .va-quota-top{display:flex;align-items:center;gap:8px;}
#ver-ai-app .va-quota-top .va-qi{color:#9ca3af;display:grid;place-items:center;}
#ver-ai-app .va-quota-top b{flex:1;color:#e5e7eb;font:600 12.5px/1 var(--font-ui,Inter,system-ui,sans-serif);}
#ver-ai-app .va-quota-top strong{color:#fff;font:700 13px/1 var(--font-ui,Inter,system-ui,sans-serif);}
#ver-ai-app .va-bar{margin-top:10px;height:4px;border-radius:999px;background:rgba(255,255,255,.10);overflow:hidden;}
#ver-ai-app .va-bar i{display:block;height:100%;border-radius:999px;background:#fff;transition:width .3s ease;}

/* ---------------- main ---------------- */
#ver-ai-app .va-main{flex:1;min-width:0;display:flex;flex-direction:column;height:100%;background:rgba(12,12,15,.35);}
#ver-ai-app .va-top{flex:0 0 auto;display:flex;align-items:center;gap:10px;padding:12px 18px;border-bottom:1px solid rgba(255,255,255,.06);background:rgba(16,16,20,.45);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);}
#ver-ai-app .va-top h2{margin:0;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#fafafa;font:700 15px/1.2 var(--font-ui,Inter,system-ui,sans-serif);}
#ver-ai-app .va-burger{display:none;place-items:center;width:34px;height:34px;border-radius:9px;border:1px solid rgba(255,255,255,.09);background:rgba(255,255,255,.06);color:#e5e7eb;cursor:pointer;}
#ver-ai-app .va-modelwrap{position:relative;flex:0 0 auto;}
#ver-ai-app .va-modelbtn{display:inline-flex;align-items:center;gap:6px;padding:7px 11px;border-radius:9px;border:1px solid rgba(255,255,255,.09);background:rgba(255,255,255,.05);color:#e5e7eb;font:600 12.5px/1 var(--font-ui,Inter,system-ui,sans-serif);cursor:pointer;}
#ver-ai-app .va-modelbtn:hover{background:rgba(255,255,255,.10);}
#ver-ai-app .va-menu{position:absolute;right:0;top:calc(100% + 7px);width:250px;max-height:330px;overflow-y:auto;padding:6px;border-radius:12px;border:1px solid rgba(255,255,255,.10);background:rgba(22,22,27,.96);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);box-shadow:0 20px 48px rgba(0,0,0,.55);z-index:30;}
#ver-ai-app .va-opt{display:flex;align-items:center;gap:9px;width:100%;padding:9px 10px;border:0;border-radius:9px;background:transparent;color:#e5e7eb;font:500 13px/1.2 var(--font-ui,Inter,system-ui,sans-serif);cursor:pointer;text-align:left;}
#ver-ai-app .va-opt:hover{background:rgba(255,255,255,.08);}
#ver-ai-app .va-opt em{margin-left:auto;font-style:normal;font:600 10px/1 var(--font-ui,Inter,system-ui,sans-serif);padding:4px 7px;border-radius:999px;background:rgba(255,255,255,.10);color:#b8bcc6;letter-spacing:.03em;}
#ver-ai-app .va-opt.on{background:rgba(255,255,255,.12);color:#fff;}

#ver-ai-app .va-body{flex:1;min-height:0;overflow-y:auto;display:flex;flex-direction:column;}

/* empty state */
#ver-ai-app .va-empty{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:28px 20px 40px;gap:22px;}
#ver-ai-app .va-empty h1{margin:0;color:#fff;font:800 32px/1.2 var(--font-ui,Inter,system-ui,sans-serif);letter-spacing:-.02em;text-align:center;}
#ver-ai-app .va-card{width:100%;max-width:765px;border-radius:13px;border:1px solid rgba(255,255,255,.09);background:rgba(28,28,33,.60);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);padding:12px;display:flex;flex-direction:column;gap:9px;}
#ver-ai-app .va-card:focus-within{border-color:rgba(255,255,255,.20);}
#ver-ai-app .va-ta{width:100%;resize:none;border:0;outline:0;background:transparent;color:#f3f4f6;font:400 15px/1.55 var(--font-ui,Inter,system-ui,sans-serif);min-height:24px;max-height:168px;overflow-y:auto;}
#ver-ai-app .va-ta::placeholder{color:#6b7280;}
#ver-ai-app .va-cardrow{display:flex;align-items:center;gap:8px;}
#ver-ai-app .va-sq{display:grid;place-items:center;width:34px;height:34px;border-radius:9px;border:1px solid rgba(255,255,255,.09);background:rgba(255,255,255,.05);color:#c7c9d0;cursor:pointer;flex:0 0 auto;}
#ver-ai-app .va-sq:hover{background:rgba(255,255,255,.12);color:#fff;}
#ver-ai-app .va-share{display:inline-flex;align-items:center;gap:7px;padding:0 12px;height:34px;border-radius:9px;border:1px solid rgba(255,255,255,.09);background:rgba(255,255,255,.05);color:#c7c9d0;font:600 12.5px/1 var(--font-ui,Inter,system-ui,sans-serif);cursor:pointer;}
#ver-ai-app .va-share:hover{background:rgba(255,255,255,.12);color:#fff;}
#ver-ai-app .va-spacer{flex:1;}
#ver-ai-app .va-send{display:grid;place-items:center;width:34px;height:34px;border-radius:9px;border:1px solid rgba(255,255,255,.10);background:rgba(255,255,255,.07);color:#6b7280;cursor:pointer;flex:0 0 auto;transition:background .15s,color .15s;}
#ver-ai-app .va-send:not(:disabled){background:#fff;color:#111;border-color:#fff;}
#ver-ai-app .va-send:not(:disabled):hover{background:#e5e5e5;}
#ver-ai-app .va-send:disabled{cursor:not-allowed;}
#ver-ai-app .va-stop{background:rgba(239,68,68,.16);border-color:rgba(239,68,68,.45);color:#fca5a5;}
#ver-ai-app .va-stop:hover{background:rgba(239,68,68,.28);color:#fff;}

#ver-ai-app .va-pills{display:flex;flex-wrap:wrap;gap:9px;justify-content:center;max-width:765px;width:100%;}
#ver-ai-app .va-pill{display:inline-flex;align-items:center;gap:7px;padding:9px 14px;border-radius:999px;border:1px solid rgba(255,255,255,.10);background:rgba(255,255,255,.05);color:#d1d5db;font:600 12.5px/1 var(--font-ui,Inter,system-ui,sans-serif);cursor:pointer;transition:background .15s,color .15s;}
#ver-ai-app .va-pill:hover{background:rgba(255,255,255,.12);color:#fff;}

/* thread */
#ver-ai-app .va-thread{flex:1;display:flex;flex-direction:column;gap:22px;padding:26px 20px 22px;}
#ver-ai-app .va-col{width:100%;max-width:760px;margin:0 auto;display:flex;flex-direction:column;gap:22px;}
#ver-ai-app .va-m{display:flex;flex-direction:column;gap:6px;}
#ver-ai-app .va-m.user{align-items:flex-end;}
#ver-ai-app .va-m.ai{align-items:flex-start;}
#ver-ai-app .va-bub{max-width:78%;padding:11px 15px;border-radius:14px;background:rgba(255,255,255,.10);border:1px solid rgba(255,255,255,.06);color:#f3f4f6;font:400 14.5px/1.6 var(--font-ui,Inter,system-ui,sans-serif);white-space:pre-wrap;word-break:break-word;}
#ver-ai-app .va-md{width:100%;color:#e9eaee;font:400 14.5px/1.72 var(--font-ui,Inter,system-ui,sans-serif);word-break:break-word;}
#ver-ai-app .va-md>*:first-child{margin-top:0;}
#ver-ai-app .va-md>*:last-child{margin-bottom:0;}
#ver-ai-app .va-md p{margin:0 0 12px;}
#ver-ai-app .va-md h1,#ver-ai-app .va-md h2,#ver-ai-app .va-md h3,#ver-ai-app .va-md h4,#ver-ai-app .va-md h5,#ver-ai-app .va-md h6{margin:18px 0 8px;color:#fff;font-weight:700;line-height:1.3;}
#ver-ai-app .va-md h1{font-size:20px;}#ver-ai-app .va-md h2{font-size:18px;}#ver-ai-app .va-md h3{font-size:16px;}
#ver-ai-app .va-md ul,#ver-ai-app .va-md ol{margin:0 0 12px;padding-left:22px;}
#ver-ai-app .va-md li{margin:4px 0;}
#ver-ai-app .va-md a{color:#93c5fd;}
#ver-ai-app .va-md blockquote{margin:0 0 12px;padding:6px 14px;border-left:3px solid rgba(255,255,255,.22);color:#b8bcc6;}
#ver-ai-app .va-md code{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12.8px;background:rgba(255,255,255,.09);padding:1.5px 5px;border-radius:5px;}
#ver-ai-app .va-md pre{position:relative;margin:0 0 14px;padding:34px 14px 14px;border-radius:11px;background:#0d0d10;border:1px solid rgba(255,255,255,.08);overflow-x:auto;}
#ver-ai-app .va-md pre code{background:transparent;padding:0;font-size:12.5px;line-height:1.6;}
#ver-ai-app .va-cp{position:absolute;top:6px;right:6px;display:inline-flex;align-items:center;gap:5px;padding:5px 9px;border-radius:7px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.08);color:#c7c9d0;font:600 11px/1 var(--font-ui,Inter,system-ui,sans-serif);cursor:pointer;}
#ver-ai-app .va-cp:hover{background:rgba(255,255,255,.18);color:#fff;}
#ver-ai-app .va-tablewrap{overflow-x:auto;margin:0 0 12px;}
#ver-ai-app .va-md table{border-collapse:collapse;width:100%;}
#ver-ai-app .va-md th,#ver-ai-app .va-md td{border:1px solid rgba(255,255,255,.12);padding:7px 10px;font-size:13px;text-align:left;}
#ver-ai-app .va-md hr{border:0;border-top:1px solid rgba(255,255,255,.12);margin:16px 0;}

#ver-ai-app .va-atts{display:flex;flex-wrap:wrap;gap:6px;}
#ver-ai-app .va-att{display:inline-flex;align-items:center;gap:6px;padding:5px 9px;border-radius:8px;border:1px solid rgba(255,255,255,.10);background:rgba(255,255,255,.07);color:#c7c9d0;font:600 11.5px/1 var(--font-ui,Inter,system-ui,sans-serif);max-width:230px;}
#ver-ai-app .va-att span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
#ver-ai-app .va-att img{width:26px;height:26px;object-fit:cover;border-radius:5px;}

#ver-ai-app .va-actsrow{display:flex;gap:4px;opacity:0;transition:opacity .14s;}
#ver-ai-app .va-m.ai:hover .va-actsrow,#ver-ai-app .va-m.ai:focus-within .va-actsrow{opacity:1;}
#ver-ai-app .va-act{display:inline-flex;align-items:center;gap:5px;padding:5px 9px;border-radius:7px;border:1px solid rgba(255,255,255,.09);background:rgba(255,255,255,.05);color:#9ca3af;font:600 11px/1 var(--font-ui,Inter,system-ui,sans-serif);cursor:pointer;}
#ver-ai-app .va-act:hover{background:rgba(255,255,255,.12);color:#fff;}

#ver-ai-app .va-err{display:flex;align-items:center;gap:9px;padding:10px 13px;border-radius:10px;border:1px solid rgba(239,68,68,.32);background:rgba(239,68,68,.10);color:#fca5a5;font:500 13px/1.45 var(--font-ui,Inter,system-ui,sans-serif);}
#ver-ai-app .va-err button{margin-left:auto;display:inline-flex;align-items:center;gap:5px;padding:6px 11px;border-radius:8px;border:1px solid rgba(239,68,68,.4);background:rgba(239,68,68,.18);color:#fecaca;font:600 12px/1 var(--font-ui,Inter,system-ui,sans-serif);cursor:pointer;}
#ver-ai-app .va-err button:hover{background:rgba(239,68,68,.32);color:#fff;}
#ver-ai-app .va-think{display:inline-flex;align-items:center;gap:7px;color:#9ca3af;font:500 13px/1 var(--font-ui,Inter,system-ui,sans-serif);}
#ver-ai-app .va-spin{animation:vaSpin 1s linear infinite;}
@keyframes vaSpin{to{transform:rotate(360deg);}}

/* bottom composer */
#ver-ai-app .va-bottom{flex:0 0 auto;padding:14px 20px 18px;border-top:1px solid rgba(255,255,255,.06);background:rgba(14,14,18,.55);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);}
#ver-ai-app .va-bottom .va-card{max-width:760px;margin:0 auto;}
#ver-ai-app .va-limit{text-align:center;color:#9ca3af;font:500 12.5px/1.4 var(--font-ui,Inter,system-ui,sans-serif);margin-bottom:10px;}

/* toast */
#ver-ai-app .va-toast{position:absolute;left:50%;bottom:24px;transform:translateX(-50%) translateY(8px);z-index:60;padding:10px 16px;border-radius:10px;border:1px solid rgba(255,255,255,.12);background:rgba(24,24,28,.96);color:#f3f4f6;font:600 12.5px/1.3 var(--font-ui,Inter,system-ui,sans-serif);box-shadow:0 16px 40px rgba(0,0,0,.5);opacity:0;pointer-events:none;transition:opacity .2s,transform .2s;max-width:80%;text-align:center;}
#ver-ai-app .va-toast.on{opacity:1;transform:translateX(-50%) translateY(0);}

#ver-ai-app .va-scroller{scrollbar-width:thin;scrollbar-color:#4a4a4a transparent;}
#ver-ai-app .va-scroller::-webkit-scrollbar{width:10px;height:10px;}
#ver-ai-app .va-scroller::-webkit-scrollbar-track{background:transparent;}
#ver-ai-app .va-scroller::-webkit-scrollbar-thumb{background:#4a4a4a;border-radius:999px;border:2px solid transparent;background-clip:padding-box;}
#ver-ai-app .va-scroller::-webkit-scrollbar-thumb:hover{background:#6b6b74;background-clip:padding-box;}

#ver-ai-app button:focus-visible,#ver-ai-app input:focus-visible,#ver-ai-app textarea:focus-visible{outline:2px solid rgba(255,255,255,.75);outline-offset:2px;}

#ver-ai-app .va-backdrop{display:none;}

@media (max-width:800px){
  #ver-ai-app .va-side{position:absolute;left:0;top:0;bottom:0;z-index:50;transform:translateX(-102%);transition:transform .22s ease;box-shadow:0 0 40px rgba(0,0,0,.6);}
  #ver-ai-app .va-side.open{transform:translateX(0);}
  #ver-ai-app .va-burger{display:grid;}
  #ver-ai-app .va-backdrop.on{display:block;position:absolute;inset:0;z-index:40;background:rgba(0,0,0,.55);}
  #ver-ai-app .va-empty h1{font-size:24px;}
  #ver-ai-app .va-pills{justify-content:flex-start;}
}
`;

/* -------------------------------------------------------------- helpers */

/* ------------------------------------------------------------- component */

export function VerAiSurface() {
  const [chats, setChats] = useState<Chat[]>(() => {
    const c = readChats();
    return c.length ? c : [newChat()];
  });
  const [activeId, setActiveId] = useState<string>(() => {
    const saved = localStorage.getItem(LS_ACTIVE);
    const c = readChats();
    if (saved && c.some((x) => x.id === saved)) return saved;
    return c[0]?.id ?? "";
  });
  const [usage, setUsage] = useState(() => {
    const u = readUsage();
    if (u.date !== todayKey()) { writeUsage({ date: todayKey(), count: 0 }); return { date: todayKey(), count: 0 }; }
    return u;
  });
  const [modelId, setModelId] = useState<string>(() => localStorage.getItem(LS_MODEL) || MODELS[0].id);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const taRef = useRef<HTMLTextAreaElement | null>(null);
  const stickRef = useRef(true);
  const toastTimer = useRef<number | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const userStopRef = useRef(false);
  const [pendingAtts, setPendingAtts] = useState<Attach[]>([]);

  const model = MODELS.find((m) => m.id === modelId) ?? MODELS[0];
  const chat = useMemo(() => chats.find((c) => c.id === activeId) ?? chats[0] ?? null, [chats, activeId]);
  const usageNow = usage.date === todayKey() ? usage : { date: todayKey(), count: 0 };
  const used = usageNow.count;
  const left = Math.max(0, DAILY_LIMIT - used);
  const exhausted = left <= 0;

  const showToast = useCallback((m: string) => {
    setToast(m);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 3400);
  }, []);

  useEffect(() => { writeChats(chats); }, [chats]);
  useEffect(() => { localStorage.setItem(LS_ACTIVE, activeId); }, [activeId]);
  useEffect(() => { localStorage.setItem(LS_MODEL, modelId); }, [modelId]);
  useEffect(() => { void loadMdLibs().then(() => decorateCode()); }, []);
  useEffect(() => () => { abortRef.current?.abort(); }, []);

  useEffect(() => {
    const el = bodyRef.current;
    if (el && stickRef.current) el.scrollTop = el.scrollHeight;
  });

  useEffect(() => { decorateCode(); });

  const onScroll = () => {
    const el = bodyRef.current;
    if (!el) return;
    stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  };

  const decorateCode = useCallback(() => {
    const host = bodyRef.current;
    if (!host) return;
    const w = window as unknown as { hljs?: { highlightElement?: (el: Element) => void } };
    const hljs = w.hljs;
    host.querySelectorAll(".va-md pre").forEach((pre) => {
      const code = pre.querySelector("code");
      if (hljs && code && typeof hljs.highlightElement === "function" && !(code as HTMLElement).dataset.hljsDone) {
        try { hljs.highlightElement(code); (code as HTMLElement).dataset.hljsDone = "1"; } catch { /* ignore */ }
      }
      if (pre.querySelector(".va-cp") || !code) return;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "va-cp";
      btn.textContent = "Copy";
      btn.setAttribute("aria-label", "Copy code");
      btn.addEventListener("click", () => {
        navigator.clipboard?.writeText(code.textContent ?? "").then(() => {
          btn.textContent = "Copied";
          window.setTimeout(() => { btn.textContent = "Copy"; }, 1400);
        }).catch(() => { /* ignore */ });
      });
      pre.appendChild(btn);
    });
  }, []);

  const patch = useCallback((id: string, fn: (c: Chat) => Chat) => {
    setChats((prev) => prev.map((c) => (c.id === id ? { ...fn(c), ts: Date.now() } : c)));
  }, []);

  const ensure = useCallback((): Chat => {
    if (chat) return chat;
    const c = newChat();
    setChats((p) => [c, ...p]);
    setActiveId(c.id);
    return c;
  }, [chat]);

  const startNew = () => {
    userStopRef.current = true;
    abortRef.current?.abort();
    abortRef.current = null;
    setBusy(false);
    const c = newChat();
    setChats((p) => [c, ...p]);
    setActiveId(c.id);
    setDrawer(false);
    setPendingAtts([]);
    window.setTimeout(() => taRef.current?.focus(), 60);
  };

  const renameChat = (id: string, title: string) => {
    setChats((p) => p.map((c) => (c.id === id ? { ...c, title: title.trim() || "Untitled", ts: Date.now() } : c)));
  };

  const deleteChat = (id: string) => {
    userStopRef.current = true;
    abortRef.current?.abort();
    abortRef.current = null;
    setBusy(false);
    setChats((p) => {
      const next = p.filter((c) => c.id !== id);
      const list = next.length ? next : [newChat()];
      if (!list.some((c) => c.id === activeId)) setActiveId(list[0].id);
      return list;
    });
    setDrawer(false);
  };

  /* --------------------------------------------------------- streaming */

  const runStream = useCallback(
    async (target: Chat, history: Msg[], atts: Attach[]) => {
      const aiId = uid();
      const aiMsg: Msg = { id: aiId, role: "ai", text: "", modelId };
      setChats((prev) => prev.map((c) => (c.id === target.id ? { ...c, msgs: [...history, aiMsg], ts: Date.now() } : c)));
      setBusy(true);
      stickRef.current = true;

      const historyPayload: ChatMsg[] = history
        .slice(-HISTORY_CAP)
        .map((m) => ({
          role: m.role === "user" ? "user" : "assistant",
          content: m.text,
        }));

      const lastUserAtt = atts;
      const hasImage = lastUserAtt.some((a) => a.kind === "image" && a.url);
      const textOnly = historyPayload.map((m) => ({ ...m, content: typeof m.content === "string" ? m.content : String(m.content) }));

      if (hasImage && model.vision) {
        const imgs = lastUserAtt.filter((a) => a.kind === "image" && a.url);
        const parts: unknown[] = [{ type: "text", text: textOnly[textOnly.length - 1]?.content ?? "" }];
        for (const im of imgs) parts.push({ type: "image_url", image_url: { url: im.url } });
        const last = textOnly[textOnly.length - 1];
        if (last) last.content = parts as never;
      }

      let got = "";
      let failure: Error | null = null;
      let stopped = false;
      let attemptSeq = 0;
      userStopRef.current = false;

      const paint = () => {
        setChats((prev) => prev.map((c) => (c.id === target.id ? { ...c, msgs: c.msgs.map((m) => (m.id === aiId ? { ...m, text: got } : m)) } : c)));
      };

      const plainMsgs = textOnly.map((m) => {
        const c: unknown = m.content;
        if (typeof c === "string") return { ...m, content: c };
        if (Array.isArray(c)) {
          const txt = c
            .filter((p: unknown) => p && typeof p === "object" && (p as { type?: string }).type === "text")
            .map((p: unknown) => (p as { text?: string }).text ?? "")
            .join("\n");
          return { ...m, content: txt };
        }
        return { ...m, content: String(c) };
      });

      const attempt = async (route: Route): Promise<boolean> => {
        const myId = ++attemptSeq;
        const active = () => myId === attemptSeq && !userStopRef.current;
        const ac = new AbortController();
        abortRef.current = ac;
        let sawToken = false;
        let timedOut = false;
        let gotLocal = "";

        const gen: AsyncGenerator<string> =
          streamChat(route.url, { model: route.model, messages: plainMsgs, stream: true }, ac.signal);

        const consume = async () => {
          for await (const t of gen) {
            sawToken = true;
            gotLocal += t;
            if (active()) { got = gotLocal; paint(); }
          }
        };
        const consumePromise = consume();
        consumePromise.catch(() => { /* abandoned on timeout */ });

        let wdTimer = 0;
        const timeoutPromise = new Promise<never>((_, rej) => {
          wdTimer = window.setTimeout(() => {
            timedOut = true;
            ac.abort();
            rej(new Error("The model took too long to respond."));
          }, POLL_FIRST_TOKEN);
        });

        try {
          await Promise.race([consumePromise, timeoutPromise]);
          window.clearTimeout(wdTimer);
          if (userStopRef.current) return false;
          if (!gotLocal) throw new Error("The model closed the connection without answering.");
          got = gotLocal; paint();
          return true;
        } catch (err) {
          window.clearTimeout(wdTimer);
          if (userStopRef.current) return false;
          if (timedOut) throw err instanceof Error ? err : new Error("The model timed out.");
          throw err;
        }
      };

      try {
        for (let i = 0; i < model.routes.length; i++) {
          const route = model.routes[i];
          try {
            const ok = await attempt(route);
            if (!ok) { stopped = true; break; }
            break;
          } catch (e) {
            if (userStopRef.current) { stopped = true; break; }
            const more = i < model.routes.length - 1;
            if (!more) {
              failure = e instanceof Error ? e : new Error("Something went wrong.");
              break;
            }
            showToast(`Provider busy — trying ${model.routes[i + 1].provider}…`);
            got = ""; paint();
          }
        }
        if (!got && !stopped && !userStopRef.current && !failure) {
          failure = new Error("The model closed the connection without answering.");
        }
      } finally {
        abortRef.current = null;
      }

      if (failure) {
        const msg = failure.message || "Something went wrong.";
        setChats((prev) => prev.map((c) => (c.id === target.id ? { ...c, msgs: c.msgs.map((m) => (m.id === aiId ? { ...m, text: msg, error: true } : m)) } : c)));
      } else if (!got && !stopped) {
        setChats((prev) => prev.map((c) => (c.id === target.id ? { ...c, msgs: c.msgs.map((m) => (m.id === aiId ? { ...m, text: "No answer returned. Try again.", error: true } : m)) } : c)));
      } else if (!got && stopped) {
        setChats((prev) => prev.map((c) => (c.id === target.id ? { ...c, msgs: c.msgs.map((m) => (m.id === aiId ? { ...m, text: "*Generation stopped.*" } : m)) } : c)));
      }

      if (!failure && !stopped && got) {
        const u = readUsage();
        const nu = { date: todayKey(), count: u.date === todayKey() ? u.count + 1 : 1 };
        writeUsage(nu);
        setUsage(nu);
      }

      setBusy(false);
      abortRef.current = null;
    },
    [model, showToast],
  );

  const send = useCallback(
    async (rawText?: string) => {
      const text = (rawText ?? input).trim();
      if (busy) return;
      if (exhausted) { showToast(`Daily limit reached — ${DAILY_LIMIT} messages a day. Resets at midnight.`); return; }
      if (!text && pendingAtts.length === 0) return;

      const target = ensure();
      const atts = pendingAtts;
      const userMsg: Msg = { id: uid(), role: "user", text: text || "(attached)", atts: atts.length ? atts : undefined };
      const history: Msg[] = [...target.msgs.filter((m) => !m.error), userMsg];

      setChats((prev) =>
        prev.map((c) => (c.id === target.id ? { ...c, msgs: [...target.msgs, userMsg], title: c.title === "Untitled" && text ? titleFrom(text) : c.title, ts: Date.now() } : c)),
      );
      setInput("");
      setPendingAtts([]);
      stickRef.current = true;

      // rebuild history for the model (text + attachment contents)
      const modelHist: Msg[] = history.map((m, i) => {
        if (i !== history.length - 1 || m.role !== "user") return m;
        let t = m.text;
        for (const a of atts) {
          if (a.kind === "text" && a.text) t += `\n\n---\nFile: ${a.name}\n\`\`\`\n${a.text.slice(0, 24000)}\n\`\`\``;
        }
        return { ...m, text: t };
      });

      await runStream(target, modelHist, atts);
    },
    [busy, exhausted, ensure, input, pendingAtts, runStream, showToast],
  );

  const stop = () => {
    userStopRef.current = true;
    abortRef.current?.abort();
    abortRef.current = null;
    setBusy(false);
  };

  const regenerate = () => {
    const target = chat;
    if (!target || busy) return;
    const msgs = target.msgs;
    let cut = msgs.length;
    for (let i = msgs.length - 1; i >= 0; i -= 1) {
      if (msgs[i].role === "user") { cut = i; break; }
    }
    const history = msgs.slice(0, cut);
    if (!history.length) return;
    setChats((p) => p.map((c) => (c.id === target.id ? { ...c, msgs: history } : c)));
    void runStream(target, history, []);
  };

  const retryLast = () => {
    const target = chat;
    if (!target || busy) return;
    const msgs = [...target.msgs];
    while (msgs.length && msgs[msgs.length - 1].role === "ai") msgs.pop();
    if (!msgs.length) return;
    setChats((p) => p.map((c) => (c.id === target.id ? { ...c, msgs } : c)));
    void runStream(target, msgs, []);
  };

  /* ------------------------------------------------------------- attach */

  const onFiles = (files: FileList | null) => {
    if (!files || !files.length) return;
    const next: Attach[] = [];
    for (const f of Array.from(files)) {
      if (f.type.startsWith("image/")) {
        if (!model.vision) { showToast(`${model.label} does not support images — text attachments only.`); continue; }
        const url = URL.createObjectURL(f);
        next.push({ kind: "image", name: f.name, url });
      } else if (f.size <= 900_000) {
        f.text().then((t) => setPendingAtts((p) => [...p, { kind: "text", name: f.name, text: t }]));
        continue;
      } else {
        showToast(`${f.name} is too large to attach.`);
      }
    }
    if (next.length) setPendingAtts((p) => [...p, ...next]);
  };

  const shareScreen = async () => {
    if (!model.vision) { showToast("This model does not support images."); return; }
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const track = stream.getVideoTracks()[0];
      const video = document.createElement("video");
      video.srcObject = stream;
      video.muted = true;
      await video.play();
      await new Promise((r) => window.setTimeout(r, 420));
      const cv = document.createElement("canvas");
      cv.width = video.videoWidth || 1280;
      cv.height = video.videoHeight || 720;
      cv.getContext("2d")?.drawImage(video, 0, 0, cv.width, cv.height);
      track.stop();
      stream.getTracks().forEach((t) => t.stop());
      const url = cv.toDataURL("image/jpeg", 0.82);
      setPendingAtts((p) => [...p, { kind: "image", name: "screenshot.jpg", url }]);
      showToast("Screenshot attached.");
    } catch {
      showToast("Could not capture the screen.");
    }
  };

  const grow = (el: HTMLTextAreaElement) => {
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 168)}px`;
  };

  /* ---------------------------------------------------------- rendering */

  const visibleChats = useMemo(() => {
    const cutoff = Date.now() - 7 * 86400_000;
    const list = chats.filter((c) => c.ts >= cutoff || c.id === activeId);
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((c) => c.title.toLowerCase().includes(q) || c.msgs.some((m) => m.text.toLowerCase().includes(q)));
  }, [chats, search, activeId]);

  const msgs = chat?.msgs ?? [];
  const showWelcome = msgs.length === 0;

  return (
    <div id="ver-ai-app">
      <style>{CSS}</style>

      <div className="va-bg" aria-hidden="true"><i style={{ ["--va-r" as string]: "-16deg" }} /><i style={{ ["--va-r" as string]: "12deg" }} /><i style={{ ["--va-r" as string]: "-8deg" }} /></div>

      <div className="va-root">
        <div className={`va-backdrop${drawer ? " on" : ""}`} onClick={() => setDrawer(false)} aria-hidden="true" />

        {/* ---------------- sidebar ---------------- */}
        <aside className={`va-side${drawer ? " open" : ""} va-scroller`}>
          <button type="button" className="va-new" onClick={startNew}>
            <Pencil size={15} /> New chat
          </button>

          <div className="va-search">
            <Search size={14} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search chats"
              aria-label="Search chats"
            />
            {search ? (
              <button type="button" className="va-mini" onClick={() => setSearch("")} aria-label="Clear search"><X size={13} /></button>
            ) : null}
          </div>

          <div className="va-seclabel">Last 7 days</div>

          <div className="va-list va-scroller">
            {visibleChats.length === 0 ? (
              <div className="va-empty-list">No chats match “{search}”.</div>
            ) : (
              visibleChats.map((c) => (
                <div key={c.id} className={`va-item${c.id === activeId ? " on" : ""}`}>
                  {editing === c.id ? (
                    <input
                      autoFocus
                      defaultValue={c.title === "Untitled" ? "" : c.title}
                      placeholder="Untitled"
                      aria-label="Chat title"
                      style={{ flex: 1, minWidth: 0, border: 0, outline: 0, background: "transparent", color: "#fff", font: "600 13px var(--font-ui,Inter,system-ui,sans-serif)" }}
                      onBlur={(e) => { renameChat(c.id, e.target.value); setEditing(null); }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") { renameChat(c.id, (e.target as HTMLInputElement).value); setEditing(null); }
                        if (e.key === "Escape") setEditing(null);
                      }}
                    />
                  ) : (
                    <button
                      type="button"
                      style={{ all: "unset", flex: 1, minWidth: 0, cursor: "pointer" }}
                      onClick={() => { setActiveId(c.id); setDrawer(false); setEditing(null); }}
                    >
                      <span>{c.title || "Untitled"}</span>
                    </button>
                  )}
                  <div className="va-acts">
                    <button type="button" className="va-mini" aria-label="Rename chat" onClick={() => setEditing(c.id)}><Pencil size={12} /></button>
                    <button type="button" className="va-mini" aria-label="Delete chat" onClick={() => deleteChat(c.id)}><Trash2 size={12} /></button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="va-quota">
            <div className="va-quota-top">
              <span className="va-qi"><Gauge size={15} /></span>
              <b>Messages today</b>
              <strong>{used} / {DAILY_LIMIT}</strong>
            </div>
            <div className="va-bar"><i style={{ width: `${Math.min(100, (used / DAILY_LIMIT) * 100)}%` }} /></div>
          </div>
        </aside>

        {/* ---------------- main ---------------- */}
        <main className="va-main">
          <div className="va-top">
            <button type="button" className="va-burger" onClick={() => setDrawer(true)} aria-label="Open chats"><Menu size={17} /></button>
            <h2>{chat?.title || "Untitled"}</h2>
            <div className="va-modelwrap">
              <button type="button" className="va-modelbtn" onClick={() => setMenuOpen((v) => !v)} aria-haspopup="listbox" aria-expanded={menuOpen}>
                <Sparkles size={13} /> {model.label} <ChevronDown size={13} />
              </button>
              {menuOpen ? (
                <div className="va-menu" role="listbox">
                  {MODELS.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      role="option"
                      aria-selected={m.id === modelId}
                      className={`va-opt${m.id === modelId ? " on" : ""}`}
                      onClick={() => { setModelId(m.id); setMenuOpen(false); }}
                    >
                      <span>{m.label}</span>
                      <em>{m.provider}</em>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          <div className="va-body va-scroller" ref={bodyRef} onScroll={onScroll}>
            {showWelcome ? (
              <div className="va-empty">
                <h1>How can I help you today?</h1>
                <div className="va-card">
                  <textarea
                    ref={taRef}
                    className="va-ta"
                    rows={1}
                    value={input}
                    disabled={exhausted}
                    placeholder={exhausted ? "Daily limit reached" : "Message McCrack AI"}
                    aria-label="Message VER-AI"
                    onChange={(e) => { setInput(e.target.value); grow(e.target); }}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }}
                  />
                  {pendingAtts.length ? (
                    <div className="va-atts">
                      {pendingAtts.map((a, i) => (
                        <div key={`${a.name}-${i}`} className="va-att">
                          {a.kind === "image" && a.url ? <img src={a.url} alt="" /> : <FileText size={12} />}
                          <span>{a.name}</span>
                          <button type="button" className="va-mini" aria-label="Remove attachment" onClick={() => setPendingAtts((p) => p.filter((_, n) => n !== i))}><X size={11} /></button>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  <div className="va-cardrow">
                    <button type="button" className="va-sq" onClick={() => fileRef.current?.click()} aria-label="Attach file"><FileText size={15} /></button>
                    {model.vision ? (
                      <button type="button" className="va-share" onClick={() => void shareScreen()}><Monitor size={14} /> Share screen</button>
                    ) : null}
                    <span className="va-spacer" />
                    {busy ? (
                      <button type="button" className="va-send va-stop" onClick={stop} aria-label="Stop generating"><Square size={13} fill="currentColor" /></button>
                    ) : (
                      <button type="button" className="va-send" disabled={!input.trim() || exhausted} onClick={() => void send()} aria-label="Send message"><ArrowUp size={16} /></button>
                    )}
                  </div>
                </div>
                <div className="va-pills">
                  {SUGGESTIONS.map((s) => (
                    <button key={s.label} type="button" className="va-pill" onClick={() => { setInput(s.prompt); window.setTimeout(() => { taRef.current?.focus(); grow(taRef.current as HTMLTextAreaElement); }, 30); }}>
                      <s.icon size={13} /> {s.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                <div className="va-thread">
                  <div className="va-col">
                    {msgs.map((m) => (
                      <div key={m.id} className={`va-m ${m.role}`}>
                        {m.role === "user" ? (
                          <>
                            {m.atts?.length ? (
                              <div className="va-atts" style={{ justifyContent: "flex-end" }}>
                                {m.atts.map((a, i) => (
                                  <div key={`${a.name}-${i}`} className="va-att">
                                    {a.kind === "image" && a.url ? <img src={a.url} alt="" /> : <FileText size={12} />}
                                    <span>{a.name}</span>
                                  </div>
                                ))}
                              </div>
                            ) : null}
                            <div className="va-bub">{m.text}</div>
                          </>
                        ) : m.error ? (
                          <div className="va-err">
                            <AlertCircle size={15} />
                            <span>{m.text}</span>
                            <button type="button" onClick={retryLast}><RefreshCw size={12} /> Retry</button>
                          </div>
                        ) : (
                          <>
                            {m.text ? (
                              <div className="va-md" dangerouslySetInnerHTML={{ __html: renderMarkdown(m.text) }} />
                            ) : (
                              <span className="va-think"><Loader2 size={14} className="va-spin" /> Thinking…</span>
                            )}
                            {m.text ? (
                              <div className="va-actsrow">
                                <button type="button" className="va-act" onClick={() => navigator.clipboard?.writeText(m.text).then(() => showToast("Copied.")).catch(() => { /* ignore */ })}><Copy size={11} /> Copy</button>
                                <button type="button" className="va-act" onClick={regenerate} disabled={busy}><RefreshCw size={11} /> Regenerate</button>
                              </div>
                            ) : null}
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="va-bottom">
                  {exhausted ? <div className="va-limit">You've used all {DAILY_LIMIT} free messages for today — the limit resets at midnight.</div> : null}
                  <div className="va-card">
                    <textarea
                      ref={taRef}
                      className="va-ta"
                      rows={1}
                      value={input}
                      disabled={exhausted}
                      placeholder={exhausted ? "Daily limit reached" : "Message VER-AI"}
                      aria-label="Message VER-AI"
                      onChange={(e) => { setInput(e.target.value); grow(e.target); }}
                      onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }}
                    />
                    {pendingAtts.length ? (
                      <div className="va-atts">
                        {pendingAtts.map((a, i) => (
                          <div key={`${a.name}-${i}`} className="va-att">
                            {a.kind === "image" && a.url ? <img src={a.url} alt="" /> : <FileText size={12} />}
                            <span>{a.name}</span>
                            <button type="button" className="va-mini" aria-label="Remove attachment" onClick={() => setPendingAtts((p) => p.filter((_, n) => n !== i))}><X size={11} /></button>
                          </div>
                        ))}
                      </div>
                    ) : null}
                    <div className="va-cardrow">
                      <button type="button" className="va-sq" onClick={() => fileRef.current?.click()} aria-label="Attach file"><FileText size={15} /></button>
                      {model.vision ? (
                        <button type="button" className="va-share" onClick={() => void shareScreen()}><Monitor size={14} /> Share screen</button>
                      ) : null}
                      <span className="va-spacer" />
                      {busy ? (
                        <button type="button" className="va-send va-stop" onClick={stop} aria-label="Stop generating"><Square size={13} fill="currentColor" /></button>
                      ) : (
                        <button type="button" className="va-send" disabled={!input.trim() || exhausted} onClick={() => void send()} aria-label="Send message"><ArrowUp size={16} /></button>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </main>
      </div>

      <input
        ref={fileRef}
        type="file"
        multiple
        style={{ display: "none" }}
        accept=".txt,.md,.js,.ts,.tsx,.jsx,.py,.json,.csv,.html,.css,.xml,.yaml,.yml,.sh,.sql,.log,.rtf,image/*,text/*"
        onChange={(e) => { onFiles(e.target.files); e.target.value = ""; }}
      />

      <div className={`va-toast${toast ? " on" : ""}`} role="status" aria-live="polite">{toast}</div>
    </div>
  );
}

export default VerAiSurface;
