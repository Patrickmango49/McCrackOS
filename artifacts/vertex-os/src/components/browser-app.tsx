import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { ArrowLeft, ArrowRight, Globe, House, Lock, RotateCcw, Search, X, Zap } from "lucide-react";
import type { Lang } from "../i18n";

const BASE = import.meta.env.BASE_URL;

/** Browser brand logo (Brave favicon, per request). */
const BROWSER_LOGO = "https://brave.com/favicon.ico";

/** Scramjet's default config paths are root-absolute ("/~/sj/", "/scramjet/...").
 *  When the app is served from a subpath (e.g. GitHub Pages
 *  /VertexOS/) those resolve to the domain root, landing OUTSIDE
 *  the service worker's scope — so the worker never sees them and the host
 *  returns its own 404 page. Prefixing everything with BASE keeps every
 *  proxied request inside the scope. */
const SCRAMJET_CONFIG = {
  prefix: `${BASE}~/sj/`,
  scramjetPath: `${BASE}scramjet/scramjet.js`,
  injectPath: `${BASE}controller/controller.inject.js`,
  wasmPath: `${BASE}scramjet/scramjet.wasm`,
};

/** Resolve the WISP websocket used by the proxy transport.
 *  In local dev the Vite dev server hosts one at `/api/wisp/`; on static
 *  hosting (GitHub Pages / Vercel) there is no such server, so fall back to
 *  a public WISP relay. Override with VITE_WISP_URL when needed. */
function resolveWispUrl(): string {
  const override = (import.meta.env.VITE_WISP_URL as string | undefined)?.trim();
  if (override) return override;
  const host = location.hostname;
  const isLocal = host === "localhost" || host === "127.0.0.1" || host === "[::1]" || host === "";
  if (isLocal) return `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}${BASE}api/wisp/`;
  return "wss://wisp.mercurywork.shop/";
}

/* ===== Browser preferences (search engine + proxy transport) ===== */

type BrowserEngineId = "duckduckgo" | "brave" | "google" | "bing";
type BrowserTransportId = "libcurl" | "epoxy";
type BrowserSettings = { engine: BrowserEngineId; transport: BrowserTransportId; v?: number };

const BROWSER_SETTINGS_KEY = "vertex-browser-settings";
const BROWSER_SETTINGS_VERSION = 2;

const BROWSER_ENGINES: { id: BrowserEngineId; label: string; url: (q: string) => string }[] = [
  { id: "duckduckgo", label: "DuckDuckGo", url: (q) => `https://duckduckgo.com/?q=${encodeURIComponent(q)}&ia=web` },
  { id: "brave", label: "Brave", url: (q) => `https://search.brave.com/search?q=${encodeURIComponent(q)}` },
  { id: "google", label: "Google", url: (q) => `https://www.google.com/search?q=${encodeURIComponent(q)}` },
  { id: "bing", label: "Bing", url: (q) => `https://www.bing.com/search?q=${encodeURIComponent(q)}` },
];

const BROWSER_TRANSPORTS: { id: BrowserTransportId; label: string; note: string }[] = [
  { id: "libcurl", label: "libcurl", note: "Stable transport (recommended)" },
  { id: "epoxy", label: "Epoxy", note: "Experimental TLS transport" },
];

const BROWSER_DEFAULTS: BrowserSettings = { engine: "brave", transport: "libcurl", v: BROWSER_SETTINGS_VERSION };

function getBrowserSettings(): BrowserSettings {
  try {
    const raw = localStorage.getItem(BROWSER_SETTINGS_KEY);
    const parsed = raw ? (JSON.parse(raw) as Partial<BrowserSettings>) : {};
    const merged = { ...BROWSER_DEFAULTS, ...parsed };
    if ((parsed.v ?? 0) < BROWSER_SETTINGS_VERSION && parsed.transport === "epoxy") merged.transport = "libcurl";
    return merged;
  } catch {
    return { ...BROWSER_DEFAULTS };
  }
}

function saveBrowserSettings(next: BrowserSettings) {
  try {
    localStorage.setItem(BROWSER_SETTINGS_KEY, JSON.stringify(next));
  } catch {
    /* storage disabled — ignore */
  }
}

function browserSearchUrl(query: string): string {
  const engine = BROWSER_ENGINES.find((item) => item.id === getBrowserSettings().engine) ?? BROWSER_ENGINES[1];
  return engine.url(query);
}

type RawHeaderPair = [string, string];
type TransportResponse = { headers: unknown; [key: string]: unknown };
type ProxyTransportLike = {
  init?: () => Promise<void>;
  request: (remote: URL, method: string, body: unknown, headers: RawHeaderPair[], signal?: AbortSignal) => Promise<TransportResponse>;
  connect?: (...args: unknown[]) => unknown;
};

/** Scramjet consumes transport response headers as an iterable of [name, value]
 *  pairs (ScramjetHeaders.fromRawHeaders). Some transports (Epoxy) hand back a
 *  plain object or nothing at all, which makes scramjet throw
 *  "TypeError: … is not iterable". Normalise everything to the pair array. */
function normalizeHeaders(raw: unknown): RawHeaderPair[] {
  if (!raw) return [];
  if (raw instanceof Headers) return [...raw.entries()].map(([key, value]) => [key, value]);
  if (raw instanceof Map) return [...raw.entries()].map(([key, value]) => [String(key), String(value)]);
  if (Array.isArray(raw)) {
    const out: RawHeaderPair[] = [];
    for (const entry of raw) {
      if (Array.isArray(entry) && entry.length >= 2) {
        const value = entry[1];
        out.push([String(entry[0]), Array.isArray(value) ? value.join(", ") : String(value)]);
      }
    }
    return out;
  }
  if (typeof raw === "object") {
    const out: RawHeaderPair[] = [];
    for (const key of Object.keys(raw as Record<string, unknown>)) {
      const value = (raw as Record<string, unknown>)[key];
      if (Array.isArray(value)) for (const item of value) out.push([key, String(item)]);
      else out.push([key, String(value)]);
    }
    return out;
  }
  return [];
}

/** Build a proxy transport for the chosen backend. Falls back to libcurl if
 *  the Epoxy runtime cannot be loaded for any reason. The returned transport is
 *  initialised and has its response headers normalised for scramjet. */
async function instantiateTransport(kind: BrowserTransportId, wispUrl: string): Promise<ProxyTransportLike> {
  let transport: ProxyTransportLike;
  if (kind === "epoxy") {
    const mod = (await import("@mercuryworkshop/epoxy-transport")) as unknown as {
      default?: new (opts: { wisp: string }) => ProxyTransportLike;
    };
    if (!mod.default) throw new Error("epoxy-transport missing default export");
    transport = new mod.default({ wisp: wispUrl });
  } else {
    const { default: LibcurlClient } = await import("@mercuryworkshop/libcurl-transport");
    transport = new LibcurlClient({ wisp: wispUrl }) as unknown as ProxyTransportLike;
  }
  try {
    if (typeof transport.init === "function") await transport.init();
  } catch {
    /* some transports initialise lazily */
  }
  return transport;
}

async function runTransportRequest(
  transport: ProxyTransportLike,
  remote: URL,
  method: string,
  body: unknown,
  headers: RawHeaderPair[],
  signal?: AbortSignal,
): Promise<TransportResponse> {
  const response = await transport.request(remote, method, body, headers, signal);
  try {
    response.headers = normalizeHeaders(response.headers);
  } catch {
    /* headers not writable — leave as-is */
  }
  return response;
}

async function createTransport(kind: BrowserTransportId, wispUrl: string): Promise<ProxyTransportLike> {
  let primary: ProxyTransportLike;
  try {
    primary = await instantiateTransport(kind, wispUrl);
  } catch {
    primary = await instantiateTransport("libcurl", wispUrl);
  }

  const fallbackKind: BrowserTransportId = kind === "epoxy" ? "libcurl" : "epoxy";
  let fallbackPromise: Promise<ProxyTransportLike | null> | null = null;
  const getFallback = () => {
    if (!fallbackPromise) {
      fallbackPromise = instantiateTransport(fallbackKind, wispUrl).catch(() => null);
    }
    return fallbackPromise;
  };

  const wrapped = Object.create(primary) as ProxyTransportLike;
  wrapped.request = async (remote, method, body, headers, signal) => {
    try {
      return await runTransportRequest(primary, remote, method, body, headers, signal);
    } catch (error) {
      const fallback = await getFallback();
      if (!fallback) throw error;
      return runTransportRequest(fallback, remote, method, body, headers, signal);
    }
  };
  return wrapped;
}

type ScramjetFrame = {
  go: (url: string) => void;
  back: () => void;
  forward: () => void;
  reload: () => void;
};
type ScramjetController = {
  createFrame: (el: HTMLIFrameElement, opts?: { plugins?: unknown[] }) => ScramjetFrame;
  wait: () => Promise<void>;
};
type ScramjetControllerCtor = new (opts: {
  serviceworker: ServiceWorker | null;
  transport: unknown;
  config?: Record<string, unknown>;
}) => ScramjetController;

let runtimePromise: Promise<{ Controller: ScramjetControllerCtor }> | null = null;

function loadScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    const prior = document.querySelector<HTMLScriptElement>(`script[data-sj="${src}"]`);
    if (prior) {
      if (prior.dataset.loaded === "1") {
        resolve();
        return;
      }
      prior.addEventListener("load", () => resolve());
      prior.addEventListener("error", () => reject(new Error(`Failed to load ${src}`)));
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = false;
    script.dataset.sj = src;
    script.addEventListener("load", () => {
      script.dataset.loaded = "1";
      resolve();
    });
    script.addEventListener("error", () => reject(new Error(`Failed to load ${src}`)));
    document.head.appendChild(script);
  });
}

function loadRuntime() {
  if (!runtimePromise) {
    runtimePromise = (async () => {
      await loadScript(`${BASE}scramjet/scramjet.js`);
      await loadScript(`${BASE}controller/controller.api.js`);
      try {
        await loadScript(`${BASE}utils/scramjet-utils.js`);
      } catch {
        /* url watching is optional */
      }
      const controller = (window as unknown as { $scramjetController?: { Controller: ScramjetControllerCtor } }).$scramjetController;
      if (!controller?.Controller) throw new Error("Scramjet controller failed to load.");
      return controller;
    })();
  }
  return runtimePromise;
}

let swPromise: Promise<ServiceWorkerRegistration> | null = null;
function ensureServiceWorker() {
  if (!swPromise) swPromise = navigator.serviceWorker.register(`${BASE}sw.js`, { scope: BASE });
  return swPromise;
}

function buildPlugins(onUrl: (url: string) => void): unknown[] {
  const utils = (window as unknown as { $scramjetUtils?: { UrlWatcherPlugin?: new (cb: (url: string) => void) => unknown } }).$scramjetUtils;
  if (!utils?.UrlWatcherPlugin) return [];
  try {
    return [new utils.UrlWatcherPlugin(onUrl)];
  } catch {
    return [];
  }
}

function normalizeAddress(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  if (/^[a-z0-9-]+(\.[a-z0-9-]+)+([/?#]\S*)?$/i.test(value)) return `https://${value}`;
  return browserSearchUrl(value);
}

/** Animated new-tab backdrop: slow drifting fog glow (CSS) with falling
 *  rain streaks drawn on a canvas. Dependency-free and on-brand. */
function BrowserBackdrop() {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    let w = 0;
    let h = 0;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    type Drop = { x: number; y: number; len: number; sp: number; o: number };
    let drops: Drop[] = [];

    const resize = () => {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.max(1, Math.floor(w * dpr));
      canvas.height = Math.max(1, Math.floor(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.min(260, Math.max(50, Math.round((w * h) / 15000)));
      drops = Array.from({ length: count }, () => ({
        x: Math.random() * (w + 120),
        y: Math.random() * h,
        len: 12 + Math.random() * 26,
        sp: 2.5 + Math.random() * 5,
        o: 0.05 + Math.random() * 0.16,
      }));
    };

    resize();
    const rain: [number, number, number] = [120, 220, 255];

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      for (const d of drops) {
        d.y += d.sp;
        d.x -= d.sp * 0.22;
        if (d.y > h + 30) {
          d.y = -30;
          d.x = Math.random() * (w + 120);
        }
        ctx.beginPath();
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x + d.len * 0.22, d.y - d.len);
        ctx.strokeStyle = `rgba(${rain[0]}, ${rain[1]}, ${rain[2]}, ${d.o})`;
        ctx.stroke();
      }
      raf = requestAnimationFrame(draw);
    };

    draw();
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={ref} className="browser-bg-rain" aria-hidden="true" />;
}

function ProxyBrowser(_props: { home?: boolean }) {
  const [input, setInput] = useState("");
  const [settings, setSettings] = useState<BrowserSettings>(() => getBrowserSettings());
  const [started, setStarted] = useState(false);
  const [currentUrl, setCurrentUrl] = useState("");
  const [status, setStatus] = useState<"idle" | "booting" | "ready">("idle");
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const frameRef = useRef<ScramjetFrame | null>(null);
  const pendingUrlRef = useRef("");

  const updateSetting = useCallback((patch: Partial<BrowserSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveBrowserSettings(next);
      return next;
    });
  }, []);

  useEffect(() => {
    if (!started) return;
    const el = iframeRef.current;
    if (!el) return;
    let cancelled = false;

    (async () => {
      try {
        setStatus("booting");
        setError(null);
        if (!("serviceWorker" in navigator)) {
          throw new Error("This browser does not support service workers, so the proxy cannot run.");
        }
        const runtime = await loadRuntime();
        await ensureServiceWorker();
        const ready = await navigator.serviceWorker.ready;
        if (cancelled) return;
        const wispUrl = resolveWispUrl();
        const transport = await createTransport(getBrowserSettings().transport, wispUrl);
        const controller = new runtime.Controller({ serviceworker: ready.active, transport, config: SCRAMJET_CONFIG });
        await controller.wait();
        if (cancelled) return;
        const frame = controller.createFrame(el, {
          plugins: buildPlugins((url) => {
            setCurrentUrl(url);
            setInput(url);
          }),
        });
        frameRef.current = frame;
        if (pendingUrlRef.current) frame.go(pendingUrlRef.current);
        setStatus("ready");
      } catch (cause) {
        if (cancelled) return;
        setError(cause instanceof Error ? cause.message : String(cause));
        setStatus("ready");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [started, attempt]);

  const go = useCallback((raw: string) => {
    const url = normalizeAddress(raw);
    if (!url) return;
    pendingUrlRef.current = url;
    setInput(url);
    setCurrentUrl(url);
    setError(null);
    if (!started) {
      setStarted(true);
      return;
    }
    frameRef.current?.go(url);
  }, [started]);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    go(input);
  };

  return (
    <div className="browser-root">
      <div className="browser-bar">
        <div className="browser-nav">
          <button type="button" className="browser-nav-btn" title="Back" onClick={() => frameRef.current?.back()}><ArrowLeft size={15} /></button>
          <button type="button" className="browser-nav-btn" title="Forward" onClick={() => frameRef.current?.forward()}><ArrowRight size={15} /></button>
          <button type="button" className="browser-nav-btn" title="Reload" onClick={() => frameRef.current?.reload()}><RotateCcw size={15} /></button>
          <button type="button" className="browser-nav-btn" title="Home" onClick={() => { setStarted(false); frameRef.current = null; setCurrentUrl(""); setInput(""); setError(null); }}><House size={15} /></button>
          <form className="browser-addr" onSubmit={onSubmit}>
            <Lock className="browser-addr-icon" size={14} />
            <input
              className="browser-addr-input"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Search the web or type a URL"
              spellCheck={false}
              autoComplete="off"
            />
            {input ? <button type="button" className="browser-open" title="Clear" onClick={() => setInput("")}><X size={15} /></button> : null}
          </form>
        </div>
      </div>
      <div className="browser-content">
        {started ? (
          <iframe
            ref={iframeRef}
            className="browser-frame"
            title="Proxied page"
            allow="autoplay; clipboard-read; clipboard-write; camera; microphone; fullscreen; gamepad; cross-origin-isolated"
            allowFullScreen
          />
        ) : (
          <div className="browser-home">
            <BrowserBackdrop />
            <div className="browser-home-inner">
              <div className="browser-brand-mark">
                <img className="browser-brand-img" src={BROWSER_LOGO} alt="Vertex Browser" />
              </div>
              <h1 className="browser-brand-name">VERTEX</h1>
              <p className="browser-brand-sub">proxy browser</p>
              <form className="browser-search" onSubmit={onSubmit}>
                <Search className="browser-search-icon" size={18} />
                <input
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder="Search the web or type a URL"
                  spellCheck={false}
                  autoComplete="off"
                  autoFocus
                />
              </form>
              <div className="browser-home-controls">
                <div className="browser-ctl">
                  <span className="browser-ctl-label"><Globe size={12} /> Search engine</span>
                  <div className="browser-ctl-pills">
                    {BROWSER_ENGINES.map((engine) => (
                      <button
                        key={engine.id}
                        type="button"
                        className={`browser-pill ${settings.engine === engine.id ? "on" : ""}`}
                        onClick={() => updateSetting({ engine: engine.id })}
                      >
                        {engine.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="browser-ctl">
                  <span className="browser-ctl-label"><Zap size={12} /> Transport</span>
                  <div className="browser-ctl-pills">
                    {BROWSER_TRANSPORTS.map((transport) => (
                      <button
                        key={transport.id}
                        type="button"
                        title={transport.note}
                        className={`browser-pill ${settings.transport === transport.id ? "on" : ""}`}
                        onClick={() => updateSetting({ transport: transport.id })}
                      >
                        {transport.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <p className="browser-hint">Bypass network filters and browse the open web from inside Vertex OS.</p>
            </div>
          </div>
        )}
          {status === "booting" ? <div className="browser-loading">Starting proxy…</div> : null}
          {error ? (
            <div className="browser-proxy-error">
              <p>{error}</p>
              <div className="browser-error-actions">
                <button type="button" className="browser-retry" onClick={() => { setError(null); setAttempt((n) => n + 1); }}>Retry</button>
                <button type="button" className="browser-retry ghost" onClick={() => { updateSetting({ transport: settings.transport === "epoxy" ? "libcurl" : "epoxy" }); setError(null); setAttempt((n) => n + 1); }}>Switch transport</button>
              </div>
            </div>
          ) : null}
      </div>
    </div>
  );
}

export function BrowserSurface(_props: { lang?: Lang }) {
  return <ProxyBrowser home />;
}

/** Best-effort ad removal for same-origin (scramjet-proxied) frames. */
function adBlockPurge(doc: Document): void {
  try {
    doc
      .querySelectorAll(
        'ins.adsbygoogle, .adsbygoogle, [id^="google_ads"], [id^="aswift"], [id^="ad_"], ' +
          '[id*="banner-ad"], [class*="adsbygoogle"], [class*="advert"], [data-ad-slot], ' +
          'iframe[src*="doubleclick.net"], iframe[src*="googlesyndication.com"], ' +
          'iframe[src*="adservice"], iframe[src*="googleadservices"], iframe[src*="/ads/"]',
      )
      .forEach((node) => node.remove());
  } catch {
    /* ignore */
  }
}

/** Full-bleed proxied site with no chrome. Used when a page refuses to be
 *  framed (X-Frame-Options / CSP) — the scramjet proxy loads it anyway.
 *  Set `blockAds` to strip common ad slots from the (same-origin) proxied page. */
export function ProxyUrlFrame({ url, title = "Proxied page", blockAds = false }: { url: string; title?: string; blockAds?: boolean }) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [status, setStatus] = useState<"booting" | "ready">("booting");
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const urlRef = useRef(url);

  useEffect(() => {
    const el = iframeRef.current;
    if (!el) return;
    let cancelled = false;
    let adTimer: number | undefined;

    (async () => {
      try {
        if (!("serviceWorker" in navigator)) {
          throw new Error("This browser does not support service workers, so the proxy cannot run.");
        }
        const runtime = await loadRuntime();
        await ensureServiceWorker();
        const ready = await navigator.serviceWorker.ready;
        if (cancelled) return;
        const wispUrl = resolveWispUrl();
        const transport = await createTransport(getBrowserSettings().transport, wispUrl);
        const controller = new runtime.Controller({ serviceworker: ready.active, transport, config: SCRAMJET_CONFIG });
        await controller.wait();
        if (cancelled) return;
        const frame = controller.createFrame(el, { plugins: [] });
        frame.go(urlRef.current);
        setStatus("ready");
        if (blockAds) {
          adTimer = window.setInterval(() => {
            try {
              const doc = el.contentDocument;
              if (doc) adBlockPurge(doc);
            } catch {
              /* cross-origin or torn down */
            }
          }, 700);
        }
      } catch (cause) {
        if (cancelled) return;
        setError(cause instanceof Error ? cause.message : String(cause));
        setStatus("ready");
      }
    })();

    return () => {
      cancelled = true;
      if (adTimer) window.clearInterval(adTimer);
    };
  }, [attempt, blockAds]);

  return (
    <div className="proxy-url-frame">
      <iframe
        ref={iframeRef}
        className="browser-frame"
        title={title}
        allow="autoplay; clipboard-read; clipboard-write; camera; microphone; fullscreen; gamepad; cross-origin-isolated"
        allowFullScreen
      />
      {status === "booting" ? <div className="browser-loading">Starting proxy…</div> : null}
      {error ? (
        <div className="browser-proxy-error">
          <p>{error}</p>
          <div className="browser-error-actions">
            <button type="button" className="browser-retry" onClick={() => { setError(null); setStatus("booting"); setAttempt((n) => n + 1); }}>Retry</button>
            <button type="button" className="browser-retry ghost" onClick={() => { const cur = getBrowserSettings().transport; saveBrowserSettings({ ...getBrowserSettings(), transport: cur === "epoxy" ? "libcurl" : "epoxy" }); setError(null); setStatus("booting"); setAttempt((n) => n + 1); }}>Switch transport</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
