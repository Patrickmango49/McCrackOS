import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent, ReactNode } from "react";
import { AlertTriangle, ArrowUpRight, ChevronLeft, ChevronRight, Code2, Copy, ExternalLink, FileCode, Handshake, Link2, Search, Sparkles, Square, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { assetUrl } from "../asset-map";

const BASE = import.meta.env.BASE_URL.endsWith("/") ? import.meta.env.BASE_URL : `${import.meta.env.BASE_URL}/`;
const asset = (path: string) => assetUrl(BASE, path);

type DomainItem = { name: string; url: string; icon: string; shot: string; note: string; tint?: boolean };
type ProxyItem = { id: string; name: string; url: string; icon: string; shot: string };

const PROXIES: ProxyItem[] = [
  { id: "hyperzhub", name: "HyperZHub", url: "https://hyperzhub.pages.dev/", icon: asset("images/hyperzhub-icon.png"), shot: asset("images/hyperzteam-preview.png") },
  { id: "desync", name: "Desync", url: "https://help-3753.colloky.com.pe/main.html", icon: asset("images/desync-icon.png"), shot: asset("images/desync-preview.webp") },
  { id: "bunnies", name: "Bunnies", url: "https://bunnies.lat", icon: asset("images/lazyico-bunnies.webp"), shot: asset("images/lazy-bunnies.webp") },
  { id: "tung-tung", name: "Tung Tung", url: "https://ttbest.s3.amazonaws.com/index.html", icon: "", shot: asset("images/lazy-tung-tung.webp") },
  { id: "lucide", name: "Lucide", url: "https://s3.amazonaws.com/mathassets/index.html", icon: "", shot: asset("images/lazy-lucide.webp") },
  { id: "frogie-s-arcade", name: "Frogie's Arcade", url: "https://frogiesarcade.net/", icon: asset("images/lazyico-frogie-s-arcade.webp"), shot: asset("images/lazy-frogie-s-arcade.webp") },
  { id: "voya", name: "Voya", url: "https://voya.adfos.com/", icon: "", shot: asset("images/lazy-voya.webp") },
  { id: "nebulo", name: "Nebulo", url: "https://tool.doriswel.com/", icon: "", shot: asset("images/lazy-nebulo.webp") },
  { id: "void-network", name: "Void Network", url: "https://oda-loves-vng.renaca.com/study/chemistry/unit-6-YTBhMjllZDJiLlBxa2U4dG04STJ6cQ", icon: "", shot: asset("images/lazy-void-network.webp") },
  { id: "truffled", name: "Truffled", url: "https://goguardian.com.ophirschooldistrict.org/", icon: asset("images/lazyico-truffled.webp"), shot: asset("images/lazy-truffled.webp") },
  { id: "opium", name: "Opium", url: "https://cleverlearning.s3.amazonaws.com/index.html", icon: "", shot: asset("images/lazy-opium.webp") },
  { id: "beez-unb", name: "beez unb", url: "https://beez-4d4.pages.dev/", icon: "", shot: asset("images/lazy-beez-unb.webp") },
  { id: "bull-33", name: "Bull-33", url: "https://s3.amazonaws.com/oiop/index.html", icon: "", shot: asset("images/lazy-bull-33.webp") },
  { id: "chalkle", name: "Chalkle", url: "https://chalkle.lootline.xyz/", icon: asset("images/lazyico-chalkle.webp"), shot: asset("images/lazy-chalkle.webp") },
  { id: "flare", name: "Flare", url: "https://gifts.giftofappetite.com/", icon: asset("images/lazyico-flare.webp"), shot: asset("images/lazy-flare.webp") },
  { id: "peak-ubg", name: "Peak UBG", url: "https://racialequityleadership.com/", icon: asset("images/lazyico-peak-ubg.webp"), shot: asset("images/lazy-peak-ubg.webp") },
  { id: "uranium", name: "Uranium", url: "https://portal.apertura.com/", icon: "", shot: asset("images/lazy-uranium.webp") },
  { id: "space", name: "Space", url: "https://space.kkmsilvia.com/", icon: asset("images/lazyico-space.webp"), shot: asset("images/lazy-space.webp") },
  { id: "overcloaked", name: "OverCloaked", url: "https://over.veranda.co.id/", icon: asset("images/lazyico-overcloaked.webp"), shot: asset("images/lazy-overcloaked.webp") },
  { id: "daydream", name: "Daydream", url: "https://zkvp.s3.us-east-1.amazonaws.com/index.html", icon: "", shot: asset("images/lazy-daydream.webp") },
  { id: "gust-browser", name: "GUST Browser", url: "https://html.cafe/x7aad49cc", icon: asset("images/lazyico-gust-browser.webp"), shot: asset("images/lazy-gust-browser.webp") },
  { id: "study-hub", name: "Study Hub", url: "https://studyhub.adfos.com/", icon: "", shot: asset("images/lazy-study-hub.webp") },
  { id: "korona", name: "Korona", url: "https://math-test.akanesucks.cfd/browser", icon: asset("images/lazyico-korona.webp"), shot: asset("images/lazy-korona.webp") },
  { id: "velcro", name: "Velcro", url: "https://script.google.com/macros/s/AKfycbzu71H712BtDwHAGHoJU23_l4mooXxk-cFLFf-D1L5QPeGj014zQShmAgf3dVqCA7L9/exec?id=1", icon: asset("images/lazyico-velcro.webp"), shot: asset("images/lazy-velcro.webp") },
  { id: "axiom", name: "Axiom", url: "https://axiom-2.b-cdn.net/", icon: "", shot: asset("images/lazy-axiom.webp") },
  { id: "rosin", name: "Rosin", url: "https://pretezels.drbijaytamang.com.np/", icon: asset("images/lazyico-rosin.webp"), shot: asset("images/lazy-rosin.webp") },
  { id: "glim", name: "Glim", url: "https://axk4.s3.amazonaws.com/index.html", icon: "", shot: asset("images/lazy-glim.webp") },
  { id: "equinox", name: "Equinox", url: "https://equal.bulls.ferrosider.com.ar/", icon: asset("images/lazyico-equinox.webp"), shot: asset("images/lazy-equinox.webp") },
  { id: "monoxide", name: "Monoxide", url: "https://monoxide.dev/", icon: asset("images/lazyico-monoxide.webp"), shot: asset("images/lazy-monoxide.webp") },
  { id: "imp-v2", name: "IMP v2", url: "https://imp-v2.b-cdn.net/", icon: "", shot: asset("images/lazy-imp-v2.webp") },
  { id: "seamless-os", name: "Seamless OS", url: "https://seamless.free.nf/?i=1", icon: "", shot: asset("images/lazy-seamless-os.webp") },
  { id: "boredom", name: "Boredom", url: "https://vps-ac2179fd.vps.ovh.ca/", icon: "", shot: asset("images/lazy-boredom.webp") },
  { id: "cherri", name: "Cherri", url: "https://kicks-shop.com/", icon: "", shot: asset("images/lazy-cherri.webp") },
  { id: "strawberri", name: "Strawberri", url: "https://streeii.adfos.com/", icon: asset("images/lazyico-strawberri.webp"), shot: asset("images/lazy-strawberri.webp") },
  { id: "serumos", name: "SerumOS", url: "https://s3.amazonaws.com/scholarnook/index.html", icon: "", shot: asset("images/lazy-serumos.webp") },
];

/* ------------------------------------------------------------------ *
 * How a site gets opened. Every method opens a NEW tab and leaves the
 * Links window exactly where it is — nothing here is ever allowed to
 * navigate the page you are reading. The user picks the method per
 * click and it sticks between visits.
 * ------------------------------------------------------------------ */

type OpenMethod = "link" | "blank" | "html5" | "blob";

const METHODS: { id: OpenMethod; label: string; hint: string; icon: LucideIcon }[] = [
  { id: "link", label: "Link", hint: "plain new tab — goes straight to the address", icon: Link2 },
  { id: "blank", label: "about:blank", hint: "empty tab first, then that tab travels to the site", icon: Square },
  { id: "html5", label: "HTML5", hint: "new tab stays ours and renders the site inside a frame", icon: Code2 },
  { id: "blob", label: "Blob", hint: "builds the page in memory as a blob: document and shows it in a new tab", icon: FileCode },
];

const METHOD_KEY = "vertex-links-method";

function esc(value: string) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const SHELL_CSS = [
  "*{box-sizing:border-box}",
  "html,body{margin:0;height:100%;background:#070d18;color:#93aac4;font:13px/1.5 system-ui,-apple-system,'Segoe UI',sans-serif}",
  ".bar{position:fixed;inset:0 0 auto 0;height:30px;display:flex;align-items:center;gap:10px;padding:0 12px;background:rgba(9,15,26,.94);border-bottom:1px solid rgba(160,200,235,.14);z-index:2}",
  ".bar b{color:#dce9f8;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
  ".bar a{margin-left:auto;color:#37c6ed;text-decoration:none;white-space:nowrap}",
  "iframe{position:fixed;inset:30px 0 0 0;width:100%;height:calc(100% - 30px);border:0;background:#070d18}",
].join("");

/** A whole page that embeds the site. Written in one shot so there is no
 *  DOM poking after the document is live (that used to leave blank tabs). */
function embedDoc(url: string) {
  const host = esc(hostLabel(url));
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${host}</title><style>${SHELL_CSS}</style></head><body><div class="bar"><b>${host}</b><a href="${esc(url)}" target="_blank" rel="noopener noreferrer">open directly</a></div><iframe src="${esc(url)}" allow="autoplay; clipboard-write; camera; microphone; fullscreen; gamepad; encrypted-media" referrerpolicy="no-referrer" title="${host}"></iframe></body></html>`;
}

/** An empty tab we still hold a handle on. Null if a pop-up blocker ate it. */
function newTab() {
  return window.open("about:blank", "_blank");
}

/** Last resort when the browser refuses window.open: a synthetic link click.
 *  Still a new tab, and still never the current page. */
function anchorTab(href: string, revoke?: string) {
  try {
    const a = document.createElement("a");
    a.href = href;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    a.remove();
  } catch {
    /* nothing left to try — the card's own address is on screen */
  }
  if (revoke) window.setTimeout(() => URL.revokeObjectURL(revoke), 60000);
}

function sendTab(win: Window, url: string) {
  try {
    win.location.replace(url);
  } catch {
    try { win.location.href = url; } catch { /* cross-origin and locked down */ }
  }
}

export type OpenResult = { ok: boolean; how: string };

export function openSite(url: string, method: OpenMethod): OpenResult {
  try {
    if (method === "link") {
      // No "noopener" in the feature string on purpose: Chrome hands back a
      // null window whenever noopener is set, which is what used to send us
      // into the "navigate the current tab" fallback.
      const win = window.open(url, "_blank");
      if (win) { try { win.opener = null; } catch { /* read-only, fine */ } return { ok: true, how: "opened in a new tab" }; }
      anchorTab(url);
      return { ok: true, how: "opened in a new tab (via link click)" };
    }

    const win = newTab();
    if (!win) { anchorTab(url); return { ok: false, how: "pop-ups are blocked — used a link click instead" }; }

    if (method === "blank") { sendTab(win, url); return { ok: true, how: "blank tab, then straight to the site" }; }

    if (method === "html5") {
      win.document.open();
      win.document.write(embedDoc(url));
      win.document.close();
      return { ok: true, how: "new tab framing the site" };
    }

    const href = URL.createObjectURL(new Blob([embedDoc(url)], { type: "text/html" }));
    sendTab(win, href);
    window.setTimeout(() => URL.revokeObjectURL(href), 60000);
    return { ok: true, how: "new tab showing a blob: document" };
  } catch {
    anchorTab(url);
    return { ok: false, how: "pop-ups are blocked — used a link click instead" };
  }
}

function readMethod(): OpenMethod {
  try {
    const saved = localStorage.getItem(METHOD_KEY);
    return METHODS.some((m) => m.id === saved) ? (saved as OpenMethod) : "link";
  } catch {
    return "link";
  }
}

function writeMethod(method: OpenMethod) {
  try { localStorage.setItem(METHOD_KEY, method); } catch { /* preference just won't stick */ }
}

type OpenCtx = { status: string; open: (url: string) => void };
const MethodContext = createContext<OpenCtx>({
  status: "",
  open: (url) => { const w = window.open(url, "_blank"); if (w) { try { w.opener = null; } catch { /* fine */ } } else anchorTab(url); },
});

function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  }
}

/** Like hostOf, but keeps the path, so github.io/our-repo.github.io reads correctly. */
function hostLabel(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, "") + parsed.pathname.replace(/\/+$/, "");
  } catch {
    return hostOf(url);
  }
}

/** Turns "poki.com" into "https://poki.com", leaves "cool games" alone. */
function directUrl(raw: string) {
  const value = raw.trim();
  if (!value || /\s/.test(value)) return null;
  if (/^https?:\/\//i.test(value)) return value;
  if (/^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(value)) return `https://${value}`;
  return null;
}

function SectionHead({ kicker, title, blurb, right }: { kicker?: string; title: string; blurb: string; right?: ReactNode }) {
  return (
    <div className="lnk-sect-head">
      <div className="lnk-sect-heading">
        {kicker && <span className="lnk-sect-kicker"><span className="lnk-sect-dot" aria-hidden="true" />{kicker}</span>}
        <h2 className="lnk-sect-title">{title}</h2>
        <p className="lnk-sect-blurb">{blurb}</p>
      </div>
      {right}
    </div>
  );
}

/** Falls back to a gradient letter tile so a missing icon never shows as a broken image. */
function CardIcon({ src, name, tint }: { src?: string; name: string; tint?: boolean }) {
  const [broken, setBroken] = useState(false);
  if (!src || broken) {
    let hue = 0;
    for (let i = 0; i < name.length; i += 1) hue = (hue * 31 + name.charCodeAt(i)) % 360;
    return <span className="lnk-card-fallback" style={{ backgroundImage: `linear-gradient(140deg, hsl(${hue} 78% 54%), hsl(${(hue + 48) % 360} 76% 44%))` }} aria-hidden="true">{name.trim().charAt(0).toUpperCase()}</span>;
  }
  return <img src={src} alt="" className={tint ? "is-tint" : undefined} onError={() => setBroken(true)} draggable={false} />;
}

function Preview({ shot, fit, alt }: { shot: string; fit: "cover" | "contain"; alt: string }) {
  return (
    <span className={`lnk-shot${fit === "contain" ? " is-contain" : ""}`} style={fit === "contain" ? { backgroundImage: `url("${shot}")` } : undefined}>
      <span className="lnk-shot-blur" aria-hidden="true" style={fit === "contain" ? { backgroundImage: `url("${shot}")` } : undefined} />
      <img src={shot} alt={alt} draggable={false} />
    </span>
  );
}

function ProxyCard({ item }: { item: ProxyItem }) {
  const { open } = useContext(MethodContext);
  return (
    <button className="lnk-pcard" onClick={() => open(item.url)} title={item.url}>
      <Preview shot={item.shot} fit="cover" alt={`${item.name} preview`} />
      <span className="lnk-card-foot">
        <span className="lnk-card-icon">
          <CardIcon src={item.icon} name={item.name} />
        </span>
        <span className="lnk-card-text">
          <span className="lnk-card-name">{item.name}</span>
          <span className="lnk-card-host">{hostOf(item.url)}</span>
        </span>
        <ArrowUpRight className="lnk-card-go" size={16} />
      </span>
    </button>
  );
}

/** All proxies as one library grid — every card opens with the open method picked above. */
function ProxyRow({ items }: { items: ProxyItem[] }) {
  return (
    <section className="lnk-sect" aria-label="Proxy library">
      <SectionHead
        kicker="LazyList library"
        title="Proxy library"
        blurb={`${items.length} proxies from the LazyList page — pick an open method up top, then tap any card`}
      />
      <div className="lnk-pgrid">
        {items.map((item) => <ProxyCard key={item.id} item={item} />)}
      </div>
    </section>
  );
}

/** Readable label for one of HyperZTeam's links: host + last path piece. */
export function LinksApp() {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [method, setMethod] = useState<OpenMethod>(readMethod);
  const [status, setStatus] = useState("");
  const field = useRef<HTMLInputElement | null>(null);
  const statusTimer = useRef<number | null>(null);

  const q = query.trim().toLowerCase();
  const direct = useMemo(() => directUrl(q), [q]);

  const proxies = useMemo(
    () => (q ? PROXIES.filter((p) => p.name.toLowerCase().includes(q) || p.url.toLowerCase().includes(q)) : PROXIES),
    [q],
  );

  const ctx = useMemo<OpenCtx>(() => ({
    status,
    open: (url) => {
      const result = openSite(url, method);
      setStatus(`${hostLabel(url)} — ${result.how}`);
      if (statusTimer.current) window.clearTimeout(statusTimer.current);
      statusTimer.current = window.setTimeout(() => setStatus(""), 7000);
    },
  }), [method, status]);

  useEffect(() => () => { if (statusTimer.current) window.clearTimeout(statusTimer.current); }, []);

  const pick = (next: OpenMethod) => { setMethod(next); writeMethod(next); };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") { setQuery(""); return; }
    if (event.key !== "Enter") return;
    if (direct) { ctx.open(direct); return; }
    if (proxies.length === 1) ctx.open(proxies[0].url);
  };

  const active = METHODS.find((m) => m.id === method) ?? METHODS[0];

  return (
    <MethodContext.Provider value={ctx}>
    <div className="links-app">
      <header className="lnk-top">
        <span className="lnk-brand">
          <img className="lnk-brand-mark" src={asset("images/links.svg")} alt="" />
          <span className="lnk-brand-text">
            <strong>LazyList</strong>
            <small>{q ? (direct ? "press enter to open" : `${proxies.length} match${proxies.length === 1 ? "" : "es"}`) : `${PROXIES.length} proxies`}</small>
          </span>
        </span>
        <div className={`lnk-search${focused ? " is-focus" : ""}`}>
          <Search size={16} />
          <input
            ref={field}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onKeyDown={onKeyDown}
            placeholder="Search the list, or type any address"
            aria-label="Search the list"
            spellCheck={false}
            autoComplete="off"
          />
          {query && <button className="lnk-clear" onMouseDown={(event) => event.preventDefault()} onClick={() => { setQuery(""); field.current?.focus(); }} aria-label="Clear search"><X size={14} /></button>}
        </div>
      </header>

      <div className="lnk-methods">
        <span className="lnk-methods-label">Open with</span>
        <div className="lnk-seg" role="radiogroup" aria-label="Open method">
          {METHODS.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                role="radio"
                aria-checked={method === item.id}
                className={`lnk-seg-btn${method === item.id ? " is-on" : ""}`}
                onClick={() => pick(item.id)}
                title={item.hint}
              >
                <Icon size={13} />
                {item.label}
              </button>
            );
          })}
        </div>
        <span className={`lnk-methods-hint${status ? " is-status" : ""}`}>{status || active.hint}</span>
      </div>

      <div className="lnk-body">
 
        {direct && (
          <button className="lnk-direct" onClick={() => ctx.open(direct)}>
            <span className="lnk-direct-icon"><ArrowUpRight size={16} /></span>
            <span className="lnk-direct-text">
            <strong>{q}</strong>
            <small>open {direct}</small>
            </span>
          </button>
        )}

        {proxies.length > 0 && <ProxyRow items={proxies} />}

        {proxies.length === 0 && !direct && (
          <div className="lnk-empty">
            <Search size={22} />
            <p>Nothing matches <strong>{query}</strong>.</p>
            <small>Try a name, or just type the address and press Enter.</small>
          </div>
        )}
      </div>
    </div>
    </MethodContext.Provider>
  );
}
