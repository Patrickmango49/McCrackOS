import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType, type CSSProperties } from "react";
import { Check, ChevronRight, Download, Gamepad2, Home, Loader2, Maximize, Minimize, Monitor, MoreHorizontal, Music, PanelsTopLeft, Pause, Play, Plus, Power, Search, Settings, SkipBack, SkipForward, Sparkles, Star, Trash2, UserPlus, Volume2, VolumeX, X } from "lucide-react";
import Peer from "peerjs";
import { PS5_GAMES, PS5_TOTAL, type Ps5Game } from "../ps5-games";
import { getMediaSession, publishNowPlaying, subscribeMediaSession } from "../now-playing";
import { MessagesSurface } from "../messages";
import { BrowserSurface, ProxyUrlFrame } from "./browser-app";
import { VerAiSurface } from "./ver-ai";
import { getAudioSettings, sfx, subscribeAudio, unlockAudio, setAudioSettings, setMusicEnabled, bindAudioVisibility, stopMusic, type AudioSettings } from "../ps5-audio";

type Tab = "home" | "media";
type DeviceMode = "pc" | "controller";
type MediaApp = {
  id: string;
  name: string;
  publisher: string;
  icon: string;
  cover: string;
  description: string;
  /** "frame" = remote page in an iframe, "app" = a real app rendered inside the console. */
  kind: "frame" | "app";
  src?: string;
  external?: string;
};

/** Surfaces the host OS injects so the console can run its own media apps natively. */
export type Ps5EmbeddedSurfaces = {
  spotify?: ComponentType<{ onClose: () => void; onMinimize: () => void; onTrackChange: (track: { name: string; artist: string; artwork: string } | null) => void }> | null;
  verTube?: ComponentType | null;
};

const MEDIA_APPS: MediaApp[] = [
  { id: "browser", name: "Browser", publisher: "McCrack OS", kind: "app", icon: `${import.meta.env.BASE_URL}images/browser-icon.svg`, cover: `${import.meta.env.BASE_URL}images/browser-icon.svg`, description: "Browse the web with the built-in McCrack browser." },
  { id: "spotify", name: "Spotify", publisher: "Spicetify", kind: "app", icon: `${import.meta.env.BASE_URL}images/spicetify.ico`, cover: `${import.meta.env.BASE_URL}images/spicetify.ico`, description: "Your music and playlists, running inside the console." },
  { id: "vertube", name: "YouTube", publisher: "McCrack OS", kind: "app", icon: `${import.meta.env.BASE_URL}images/vertube.svg`, cover: `${import.meta.env.BASE_URL}images/vertube.svg`, description: "YouTube, streaming from inside the console." },
  { id: "messages", name: "Messages", publisher: "McCrack OS", kind: "app", icon: `${import.meta.env.BASE_URL}images/messages-icon.webp`, cover: `${import.meta.env.BASE_URL}images/messages-icon.webp`, description: "Your Messages chats, already signed in." },
  { id: "verai", name: "McCrack AI", publisher: "McCrack OS", kind: "app", icon: `${import.meta.env.BASE_URL}images/ver-ai.ico`, cover: `${import.meta.env.BASE_URL}images/ver-ai.ico`, description: "A free AI assistant that lives on your console. No key, no sign-in, daily limit." },
];

const OWNED_KEY = "vertex-ps5-owned";
const RECENT_KEY = "vertex-ps5-recent";
const FAVORITES_KEY = "vertex-ps5-favorites";
const THEME_KEY = "vertex-ps5-theme";
const ACCOUNT_KEY = "vertex-ps5-account";
const MSGS_PROFILE_KEY = "vertex-msgs-profile-v2";

const THEMES = [
  { id: "blue", name: "Blue", accent: "#438cff", soft: "#75a7ff" },
  { id: "green", name: "Green", accent: "#75f6a0", soft: "#9dffbe" },
  { id: "violet", name: "Violet", accent: "#a78bfa", soft: "#c4b5fd" },
  { id: "sunset", name: "Sunset", accent: "#ff9f68", soft: "#ffc29b" },
];

function readTheme(): string {
  try {
    const raw = localStorage.getItem(THEME_KEY);
    if (raw && THEMES.some((t) => t.id === raw)) return raw;
  } catch { /* ignore */ }
  return "blue";
}

const USERNAME_RE = /^[a-z0-9]{3,16}$/;
const NAME_RE = /^.{1,20}$/;

const AVATAR_HUES = [212, 268, 330, 22, 158, 190];

type Ps5Account = { username: string; displayName: string; dob?: string; hue?: number; avatar?: string };

function readAccount(): Ps5Account | null {
  try {
    const raw = localStorage.getItem(ACCOUNT_KEY);
    if (!raw) return null;
    const acc = JSON.parse(raw) as Ps5Account;
    if (!acc || !acc.username || !USERNAME_RE.test(acc.username) || !acc.displayName) return null;
    return acc;
  } catch {
    return null;
  }
}

function saveAccount(acc: Ps5Account) {
  try {
    localStorage.setItem(ACCOUNT_KEY, JSON.stringify(acc));
  } catch {
    /* ignore */
  }
}

/** The Messages app keeps its own profile; reuse it so nobody has to sign up twice. */
function accountFromMessages(): Ps5Account | null {
  try {
    const raw = localStorage.getItem(MSGS_PROFILE_KEY);
    if (!raw) return null;
    const profile = JSON.parse(raw) as { username?: string; name?: string } | null;
    if (!profile || typeof profile !== "object") return null;
    const displayName = (profile.name ?? "").trim().slice(0, 20);
    const username = (profile.username ?? "").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 16);
    if (!displayName || username.length < 3) return null;
    return { username, displayName };
  } catch {
    return null;
  }
}

function hasMessagesProfile(): boolean {
  return accountFromMessages() !== null;
}

function avatarStyle(hue?: number) {
  return { background: `linear-gradient(145deg, hsl(${hue ?? 212} 82% 76%), hsl(${(hue ?? 212) + 34} 62% 48%))` };
}

/** Profile picture: a custom photo when one was uploaded, otherwise the colour gradient. */
function avatarVisual(acc: { hue?: number; avatar?: string } | null | undefined): CSSProperties {
  if (acc?.avatar) {
    return { backgroundImage: `url("${acc.avatar}")`, backgroundSize: "cover", backgroundPosition: "center", backgroundColor: "#0d1526" };
  }
  return avatarStyle(acc?.hue ?? 212);
}

function readSet(key: string, fallback: string[]): string[] {
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return arr.filter((x) => typeof x === "string");
    }
  } catch {
    /* ignore */
  }
  return fallback;
}

function writeArray(key: string, arr: string[]) {
  try {
    localStorage.setItem(key, JSON.stringify(arr.slice(0, 60)));
  } catch {
    /* ignore */
  }
}

function fmtTime(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** The console is a fixed 1280x720 stage scaled to fit whatever window hosts it. */
function useConsoleScale(active = true): [React.RefObject<HTMLDivElement | null>, number] {
  const ref = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    if (!active) return;
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const r = el.getBoundingClientRect();
      setScale(r.width > 0 && r.height > 0 ? Math.min(r.width / 1280, r.height / 720) : 1);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [active]);
  return [ref, scale];
}

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 10000);
    return () => window.clearInterval(t);
  }, []);
  return now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// Deterministic art colour for the console hero, derived from the game id.
function artColorFor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return `hsl(${hash % 360} 34% 22%)`;
}

function NowPlayingCard() {
  const [, bump] = useState(0);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const rerender = () => bump((n) => n + 1);
    const unsubscribe = subscribeMediaSession(rerender);
    const id = window.setInterval(rerender, 250);
    return () => { unsubscribe(); window.clearInterval(id); };
  }, []);
  const session = getMediaSession();
  const active = Boolean(session && session.source === "music" && session.title);
  useEffect(() => {
    if (!active) { setVisible(false); return; }
    const id = window.setTimeout(() => setVisible(true), 20);
    return () => window.clearTimeout(id);
  }, [active]);
  if (!session || session.source !== "music" || !session.title) return null;
  const progress = Math.max(0, session.progress || 0);
  const duration = Math.max(0, session.duration || 0);
  const max = duration > 0 ? duration : Math.max(progress, 1);
  const volume = typeof session.volume === "number" ? session.volume : 1;
  const muted = Boolean(session.muted);
  const pct = Math.round((muted ? 0 : volume) * 100);
  return (
    <aside className={`vs-npc${visible ? " open" : ""}`} aria-label="Now playing" onKeyDown={(event) => event.stopPropagation()}>
      <div className="vs-npc-art">
        {session.artwork
          ? <img key={session.artwork} src={session.artwork} alt="" draggable={false} />
          : <span className="vs-npc-art-fallback"><Music size={32} /></span>}
      </div>
      <div className="vs-npc-body">
        <p className="vs-npc-title" key={`t:${session.title}`} title={session.title}>{session.title}</p>
        {session.artist ? <p className="vs-npc-artist" title={session.artist}>{session.artist}</p> : null}
        <div className="vs-npc-progress">
          <span>{fmtTime(Math.floor(progress))}</span>
          <input type="range" min={0} max={max} step={0.1} value={Math.min(progress, max)} onChange={(event) => session.onSeek?.(Number(event.target.value))} aria-label="Seek" style={{ "--vs-npc-fill": `${max > 0 ? Math.min(100, (Math.min(progress, max) / max) * 100) : 0}%` } as CSSProperties} />
          <span>{fmtTime(Math.floor(duration))}</span>
        </div>
        <div className="vs-npc-controls">
          <button type="button" className="vs-npc-btn vs-npc-prev" aria-label="Previous track" onClick={() => session.onPrev?.()} disabled={!session.onPrev}><SkipBack size={20} /></button>
          <button type="button" className="vs-npc-btn vs-npc-play" aria-label={session.playing ? "Pause" : "Play"} onClick={() => session.onToggle?.()} disabled={!session.onToggle}>{session.playing ? <Pause size={24} /> : <Play size={24} />}</button>
          <button type="button" className="vs-npc-btn vs-npc-next" aria-label="Next track" onClick={() => session.onNext?.()} disabled={!session.onNext}><SkipForward size={20} /></button>
        </div>
        <div className="vs-npc-volume">
          <button type="button" className="vs-npc-btn vs-npc-mute" aria-label={muted ? "Unmute" : "Mute"} onClick={() => session.onToggleMute?.()} disabled={!session.onToggleMute}>{muted ? <VolumeX size={18} /> : <Volume2 size={18} />}</button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={muted ? 0 : volume}
            onChange={(event) => { const next = Number(event.target.value); session.onSetVolume?.(next); if (muted && next > 0) session.onToggleMute?.(); }}
            aria-label="Volume"
            style={{ "--vs-npc-fill": `${(muted ? 0 : volume) * 100}%` } as CSSProperties}
          />
          <span className="vs-npc-pct">{pct}%</span>
        </div>
      </div>
    </aside>
  );
}

export function Ps5EmulatorSurface({ surfaces }: { surfaces?: Ps5EmbeddedSurfaces } = {}) {
  const [stage, setStage] = useState<"boot" | "device" | "account" | "ready">("boot");
  const [tab, setTab] = useState<Tab>("home");
  const [deviceMode, setDeviceMode] = useState<DeviceMode>("pc");
  const [account, setAccount] = useState<Ps5Account | null>(() => readAccount());
  const [owned, setOwned] = useState<string[]>(() => readSet(OWNED_KEY, []));
  const [recent, setRecent] = useState<string[]>(() => readSet(RECENT_KEY, []));
  const [favs, setFavs] = useState<string[]>(() => readSet(FAVORITES_KEY, []));
  const [favOnly, setFavOnly] = useState(false);
  const [theme, setTheme] = useState<string>(() => readTheme());
  const [sound, setSound] = useState(() => getAudioSettings());
  const [playing, setPlaying] = useState<Ps5Game | null>(null);
  const [sessionSec, setSessionSec] = useState(0);
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [selectedHomeId, setSelectedHomeId] = useState<string | null>(null);
  const [selectedMediaId, setSelectedMediaId] = useState("browser");
  const [mediaApp, setMediaApp] = useState<MediaApp | null>(null);
  const [storeSelection, setStoreSelection] = useState<Ps5Game | null>(null);
  const [uninstallTarget, setUninstallTarget] = useState<Ps5Game | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<"profile" | "sound" | "theme" | "library">("profile");
  const [powerMenu, setPowerMenu] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [controlOpen, setControlOpen] = useState(false);
  const [introOpen, setIntroOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [rowX, setRowX] = useState(0);
  const [titleLeft, setTitleLeft] = useState(128);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const wheelLockRef = useRef(0);
  const [viewportRef, scale] = useConsoleScale(stage === "ready");
  const clock = useClock();

  const ownedSet = useMemo(() => new Set(owned), [owned]);
  const favSet = useMemo(() => new Set(favs), [favs]);

  // Reference look: swap the accent + soft accent CSS variables on theme change.
  useEffect(() => {
    const t = THEMES.find((x) => x.id === theme) ?? THEMES[0];
    const root = document.documentElement;
    root.style.setProperty("--vs-accent", t.accent);
    root.style.setProperty("--vs-accent-soft", t.soft);
    try { localStorage.setItem(THEME_KEY, theme); } catch { /* ignore */ }
  }, [theme]);

  useEffect(() => subscribeAudio(() => setSound(getAudioSettings())), []);

  // Sound engine: unlock on the first real interaction, run ambient music on the console.
  useEffect(() => {
    if (stage !== "ready") return;
    bindAudioVisibility();
    const onFirst = () => unlockAudio();
    window.addEventListener("pointerdown", onFirst);
    window.addEventListener("keydown", onFirst);
    return () => {
      window.removeEventListener("pointerdown", onFirst);
      window.removeEventListener("keydown", onFirst);
      stopMusic();
    };
  }, [stage]);

  const toggleFav = useCallback((id: string) => {
    sfx("select");
    setFavs((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      writeArray(FAVORITES_KEY, next);
      return next;
    });
  }, []);

  const collected = useMemo(() => {
    const out: Ps5Game[] = [];
    for (const g of PS5_GAMES) if (ownedSet.has(g.id)) out.push(g);
    return out;
  }, [ownedSet]);

  const recentGames = useMemo(() => {
    const out: Ps5Game[] = [];
    for (const id of recent) {
      const g = PS5_GAMES.find((x) => x.id === id);
      if (g) out.push(g);
      if (out.length >= 12) break;
    }
    return out;
  }, [recent]);

  const homeGames = useMemo(() => PS5_GAMES, []);

  const homeMatches = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = q ? homeGames.filter((g) => g.name.toLowerCase().includes(q)) : homeGames;
    return favOnly ? base.filter((g) => favSet.has(g.id)) : base;
  }, [homeGames, query, favOnly, favSet]);

  const mediaMatches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? MEDIA_APPS.filter((app) => `${app.name} ${app.publisher}`.toLowerCase().includes(q)) : MEDIA_APPS;
  }, [query]);
  const homeHero = homeMatches.find((game) => game.id === selectedHomeId) ?? homeMatches[0] ?? null;
  const selectedMedia = MEDIA_APPS.find((app) => app.id === selectedMediaId) ?? MEDIA_APPS[0];

  const isMedia = tab === "media";
  const activeList = useMemo(
    () => (isMedia
      ? mediaMatches.map((app) => ({ id: app.id, name: app.name, cover: app.icon }))
      : homeMatches.map((game) => ({ id: game.id, name: game.name, cover: game.cover }))),
    [isMedia, mediaMatches, homeMatches],
  );
  const selectedCarouselId = isMedia ? selectedMediaId : selectedHomeId;

  const install = useCallback((id: string) => {
    sfx("select");
    setOwned((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      writeArray(OWNED_KEY, next);
      return next;
    });
    const g = PS5_GAMES.find((x) => x.id === id);
    if (g) setSelectedHomeId(g.id);
    setToast(`${g?.name ?? "Game"} added to Home`);
    window.setTimeout(() => setToast(null), 2200);
  }, []);

  const launch = useCallback((g: Ps5Game) => {
    sfx("select");
    setSelectedHomeId(g.id);
    setRecent((prev) => {
      const next = [g.id, ...prev.filter((x) => x !== g.id)];
      writeArray(RECENT_KEY, next);
      return next;
    });
    setOwned((prev) => {
      if (prev.includes(g.id)) return prev;
      const next = [...prev, g.id];
      writeArray(OWNED_KEY, next);
      return next;
    });
    setSessionSec(0);
    setPlaying(g);
  }, []);

  const createDesktopShortcut = useCallback((game: Ps5Game) => {
    sfx("select");
    window.dispatchEvent(new CustomEvent("vertex-ps5-create-shortcut", { detail: { id: game.id, name: game.name, cover: game.cover } }));
    setStoreSelection(null);
    setToast(`${game.name} shortcut added to desktop`);
    window.setTimeout(() => setToast(null), 2400);
  }, []);

  const uninstall = useCallback((game: Ps5Game) => {
    sfx("back");
    setOwned((prev) => {
      const next = prev.filter((id) => id !== game.id);
      writeArray(OWNED_KEY, next);
      return next;
    });
    setRecent((prev) => {
      const next = prev.filter((id) => id !== game.id);
      writeArray(RECENT_KEY, next);
      return next;
    });
    window.dispatchEvent(new CustomEvent("vertex-ps5-remove-shortcut", { detail: { id: game.id } }));
    if (playing?.id === game.id) setPlaying(null);
    setSelectedHomeId((id) => (id === game.id ? null : id));
    setUninstallTarget(null);
    setToast(`${game.name} uninstalled from Home`);
    window.setTimeout(() => setToast(null), 2400);
  }, [playing]);

  const updateAccount = useCallback((next: Ps5Account) => {
    saveAccount(next);
    setAccount(next);
  }, []);

  const openSettings = useCallback((tabName: "profile" | "sound" | "theme" | "library") => {
    sfx("controlOpen");
    setSettingsTab(tabName);
    setSettingsOpen(true);
  }, []);

  const centerCarousel = useCallback((id: string) => {
    const idx = activeList.findIndex((item) => item.id === id);
    if (idx < 0) return;
    // Pin the selected tile to the carousel's left edge (tile 74px + 7px gap = 81px pitch),
    // computed from the index so the animating previous tile can't skew the measurement.
    setRowX(-(idx * 81));
  }, [activeList]);

  const stepCarousel = useCallback((delta: number) => {
    if (!activeList.length) return;
    sfx("navigate");
    const current = activeList.findIndex((item) => item.id === selectedCarouselId);
    const nextIndex = current < 0
      ? (delta > 0 ? 0 : activeList.length - 1)
      : Math.max(0, Math.min(activeList.length - 1, current + delta));
    const next = activeList[nextIndex];
    if (!next) return;
    if (isMedia) setSelectedMediaId(next.id);
    else setSelectedHomeId(next.id);
    window.requestAnimationFrame(() => centerCarousel(next.id));
  }, [activeList, selectedCarouselId, isMedia, centerCarousel]);

  const jumpCarousel = useCallback((edge: "first" | "last") => {
    if (!activeList.length) return;
    sfx("navigate");
    const next = edge === "first" ? activeList[0] : activeList[activeList.length - 1];
    if (!next) return;
    if (isMedia) setSelectedMediaId(next.id);
    else setSelectedHomeId(next.id);
    window.requestAnimationFrame(() => centerCarousel(next.id));
  }, [activeList, isMedia, centerCarousel]);

  useEffect(() => {
    if (!playing) return;
    const t = window.setInterval(() => setSessionSec((s) => s + 1), 1000);
    return () => window.clearInterval(t);
  }, [playing]);

  useEffect(() => {
    publishNowPlaying(playing ? playing.name : "");
  }, [playing]);

  useEffect(() => {
    if (!playing) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { sfx("back"); setPlaying(null); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [playing]);

  useEffect(() => {
    const handleShortcutLaunch = (event: Event) => {
      const id = (event as CustomEvent<{ id?: string }>).detail?.id;
      const game = id ? PS5_GAMES.find((item) => item.id === id) : null;
      if (!game) return;
      if (stage === "ready") { localStorage.removeItem("vertex-ps5-launch-request"); launch(game); }
      else localStorage.setItem("vertex-ps5-launch-request", game.id);
    };
    window.addEventListener("vertex-ps5-launch-game", handleShortcutLaunch);
    return () => window.removeEventListener("vertex-ps5-launch-game", handleShortcutLaunch);
  }, [stage, launch]);

  useEffect(() => {
    if (stage !== "ready") return;
    const id = localStorage.getItem("vertex-ps5-launch-request");
    if (!id) return;
    localStorage.removeItem("vertex-ps5-launch-request");
    const game = PS5_GAMES.find((item) => item.id === id);
    if (game) launch(game);
  }, [stage, launch]);

  useEffect(() => {
    setPage(0);
  }, [tab, query, libraryOpen]);

  // Keep the selected game's name pinned in the notch beside its tile.
  useEffect(() => {
    const idx = activeList.findIndex((item) => item.id === selectedCarouselId);
    if (idx < 0) { setTitleLeft(128); return; }
    setTitleLeft(rowX + 128 + idx * 81);
  }, [selectedCarouselId, rowX, activeList]);

  // Reset the carousel offset whenever the tab changes.
  useEffect(() => {
    setRowX(0);
  }, [tab]);

  // Mouse wheel / trackpad scrolls the carousel one tile at a time.
  useEffect(() => {
    if (stage !== "ready") return;
    const el = trackRef.current?.parentElement;
    if (!el) return;
    const onWheel = (event: WheelEvent) => {
      const now = performance.now();
      if (now - wheelLockRef.current < 220) return;
      const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
      if (Math.abs(delta) < 2) return;
      event.preventDefault();
      wheelLockRef.current = now;
      stepCarousel(delta > 0 ? 1 : -1);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [stage, stepCarousel, activeList.length]);

  // Arrow keys / Home / End browse the carousel.
  useEffect(() => {
    if (stage !== "ready") return;
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
      const node = event.target as HTMLElement | null;
      const tag = node?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || node?.isContentEditable) return;
      if (playing || storeSelection || uninstallTarget || settingsOpen || powerMenu || mediaApp || libraryOpen || controlOpen || !activeList.length) return;
      if (event.key === "ArrowRight") { event.preventDefault(); stepCarousel(1); }
      else if (event.key === "ArrowLeft") { event.preventDefault(); stepCarousel(-1); }
      else if (event.key === "Home") { event.preventDefault(); jumpCarousel("first"); }
      else if (event.key === "End") { event.preventDefault(); jumpCarousel("last"); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [stage, tab, playing, storeSelection, uninstallTarget, settingsOpen, powerMenu, mediaApp, libraryOpen, controlOpen, activeList.length, stepCarousel, jumpCarousel]);

  if (stage === "boot") {
    return (
      <div className="ps5-surface">
        <Ps5BootSurface account={account} onDone={() => setStage("device")} />
      </div>
    );
  }

  if (stage === "device") {
    return (
      <div className="ps5-surface">
        <Ps5DeviceSurface
          onSelect={(mode) => {
            setDeviceMode(mode);
            if (readAccount() || account) {
              setStage("ready");
              return;
            }
            const linked = accountFromMessages();
            if (linked) {
              saveAccount(linked);
              setAccount(linked);
              setStage("ready");
              return;
            }
            setStage("account");
          }}
        />
      </div>
    );
  }

  if (stage === "account") {
    return (
      <div className="ps5-surface">
        <Ps5AccountSurface onDone={(acc) => { setAccount(acc); setStage("ready"); }} />
      </div>
    );
  }

  const activeItem = activeList.find((item) => item.id === selectedCarouselId) ?? activeList[0] ?? null;
  const activeIndex = Math.max(0, activeList.findIndex((item) => item.id === selectedCarouselId));
  const overlaysOpen = settingsOpen || playing || storeSelection || uninstallTarget || powerMenu || mediaApp || libraryOpen || controlOpen || introOpen;
  const artColor = artColorFor(activeItem?.id ?? "vertex");

  return (
    <main
      ref={viewportRef}
      className="vs-console viewport"
      data-input="pointer"
      onPointerMove={(e) => { e.currentTarget.dataset.input = "pointer"; }}
      onKeyDown={(e) => { e.currentTarget.dataset.input = "keyboard"; }}
    >
      <div className={`hero-stack${overlaysOpen ? " is-obscured" : ""}`} aria-hidden="true">
        <div className={`hero-background catalog-hero${isMedia ? " media-hero" : ""}${activeItem ? " current-art" : ""}`} style={{ "--art-color": artColor } as CSSProperties}>
          {activeItem ? <img className="catalog-hero-art" src={activeItem.cover} alt="" draggable={false} /> : null}
        </div>
        <div className="hero-shade" />
      </div>
      <div className={`vs-console-dim${overlaysOpen ? " on" : ""}`} aria-hidden="true" />
      <div
        className={`console-canvas${playing ? " in-game-menu" : ""}`}
        style={{ transform: `translate(-50%,-50%) scale(${scale})` }}
        onPointerMove={(e) => { e.currentTarget.dataset.input = "pointer"; }}
        onKeyDown={(e) => { e.currentTarget.dataset.input = "keyboard"; }}
      >
        <div className={`home-content${overlaysOpen ? " is-obscured" : ""}`}>
          <header>
            <nav aria-label="Main navigation">
              <button type="button" className={`nav-tab${tab === "home" ? " active" : ""}`} aria-pressed={tab === "home"} onClick={() => { if (tab !== "home") sfx("navigate"); setTab("home"); }}>Games</button>
              <button type="button" className={`nav-tab${tab === "media" ? " active" : ""}`} aria-pressed={tab === "media"} onClick={() => { if (tab !== "media") sfx("navigate"); setTab("media"); }}>Media</button>
            </nav>
            <div className="system-actions">
              <button type="button" className="icon-button" aria-label="Search" onClick={() => { sfx("controlOpen"); setLibraryOpen(true); }}>
                <Search /><span className="tooltip">Search</span>
              </button>
              <button type="button" className="icon-button" aria-label="Settings" onClick={() => openSettings("sound")}>
                <Settings /><span className="tooltip">Settings</span>
              </button>
              <button type="button" className="icon-button profile-button" aria-label="Profile" onClick={() => openSettings("profile")}>
                <span className="profile-indicator status-online">
                  <span className="avatar-art" style={avatarVisual(account)}>{(account?.displayName ?? "V").slice(0, 1).toUpperCase()}</span>
                  <span className="online" />
                  <span className="tooltip">Profile</span>
                </span>
              </button>
              <time className="clock">{clock}</time>
            </div>
          </header>

          {activeList.length ? (
            <>
              <section className="carousel" aria-label={isMedia ? "Media" : "Games"}>
                <div className="tile-row" ref={trackRef} style={{ transform: `translateX(${rowX}px)` }}>
                  {activeList.map((item) => (
                    <VsTile
                      key={item.id}
                      game={item}
                      selected={item.id === activeItem?.id}
                      onSelect={() => { if (isMedia) setSelectedMediaId(item.id); else setSelectedHomeId(item.id); centerCarousel(item.id); }}
                      onHover={() => { if (isMedia) setSelectedMediaId(item.id); else setSelectedHomeId(item.id); }}
                    />
                  ))}
                </div>
                <p className="selected-title" style={{ left: titleLeft, width: 992 }}>{activeItem?.name}</p>
                <span className="carousel-position">{activeIndex + 1} / {activeList.length}</span>
              </section>
              {isMedia ? (
                <section className="game-info media-info" aria-label="Selected app">
                  <div className="game-brand">
                    <div className="text-logo"><h1 key={activeItem?.id}>{activeItem?.name}</h1></div>
                  </div>
                  <p className="tagline">By {selectedMedia.publisher}</p>
                  <div className="primary-actions">
                    <button type="button" className="play-button" onClick={() => { sfx("select"); setMediaApp(selectedMedia); }}>Open</button>
                  </div>
                </section>
              ) : (
                <section className="game-info" aria-label="Selected game">
                  <div className="game-brand">
                    <div className="text-logo"><h1 key={activeItem?.id}>{activeItem?.name}</h1></div>
                  </div>
                  <p className="tagline">HTML5 game · In your collection</p>
                  <div className="primary-actions">
                    <button type="button" className="play-button" onClick={() => homeHero && launch(homeHero)}>Play</button>
                    <button type="button" className="more-button" aria-label="Game options" onClick={() => { sfx("optionsOpen"); if (homeHero) setStoreSelection(homeHero); }}><MoreHorizontal /></button>
                  </div>
                </section>
              )}
            </>
          ) : (
            <section className="game-info">
              <div className="game-brand">
                <div className="text-logo"><h1>{query ? "Nothing here" : "Welcome to McCrack Station"}</h1></div>
              </div>
              <p className="tagline">{query ? `No games match “${query}”.` : "Your games. Your station. Open the Game Library to install something new."}</p>
              <div className="primary-actions">
                <button type="button" className="play-button" onClick={() => { sfx("navigate"); setLibraryOpen(true); }}>Open Library</button>
              </div>
            </section>
          )}

          {isMedia ? null : (
            <button type="button" className="library-trigger" onClick={() => { sfx("controlOpen"); setLibraryOpen(true); }}>
              <PanelsTopLeft /><span>All Games Library</span><small>{PS5_TOTAL} games</small>
            </button>
          )}
          <button type="button" className="control-trigger" aria-label="Open Control Center" onClick={() => { sfx("controlOpen"); setControlOpen(true); }}>
            <span className="ps-mark" style={{ filter: "none", color: "#438cff", fontWeight: 700, fontSize: 13 }}>VS</span>
            <span>Control Center</span><kbd>Home</kbd>
          </button>
          <NowPlayingCard />
        </div>

        {settingsOpen ? (
          <Ps5SettingsPanel
            account={account}
            deviceMode={deviceMode}
            installedCount={collected.length}
            recentCount={recentGames.length}
            sound={sound}
            theme={theme}
            favOnly={favOnly}
            onFavOnly={setFavOnly}
            tab={settingsTab}
            onTab={setSettingsTab}
            onSound={setAudioSettings}
            onTheme={setTheme}
            onDeviceMode={setDeviceMode}
            onUpdate={updateAccount}
            onPower={() => { sfx("controlClose"); setSettingsOpen(false); setPowerMenu(true); }}
            onClose={() => { sfx("controlClose"); setSettingsOpen(false); }}
          />
        ) : null}

        {uninstallTarget ? (
          <div className="modal-root">
            <div className="panel-shade" onMouseDown={(event) => { if (event.target === event.currentTarget) { sfx("dialogClose"); setUninstallTarget(null); } }}>
              <section className="overlay-panel" role="dialog" aria-modal="true" aria-labelledby="vs-uninstall-title">
                <div className="panel-header">
                  <h2 id="vs-uninstall-title">Uninstall {uninstallTarget.name}</h2>
                  <button type="button" className="icon-button close-button" onClick={() => { sfx("dialogClose"); setUninstallTarget(null); }} aria-label="Close"><X size={22} /></button>
                </div>
                <img className="panel-art" src={uninstallTarget.cover} alt="" />
                <p className="muted-copy">This removes the game from your console Home screen and deletes its desktop shortcut. You can download it again from the Game Library any time.</p>
                <div className="form-actions">
                  <button type="button" className="secondary-button" onClick={() => { sfx("dialogClose"); setUninstallTarget(null); }}>Keep installed</button>
                  <button
                    type="button"
                    className="solid-button"
                    onMouseDown={(event) => { event.preventDefault(); event.stopPropagation(); }}
                    onClick={() => { if (uninstallTarget) uninstall(uninstallTarget); }}
                  ><Trash2 size={18} /> Uninstall</button>
                </div>
              </section>
            </div>
          </div>
        ) : null}

        {storeSelection ? (
          <GameOptions
            game={storeSelection}
            owned={ownedSet.has(storeSelection.id)}
            fav={favSet.has(storeSelection.id)}
            onToggleFav={() => toggleFav(storeSelection.id)}
            onInstall={() => { install(storeSelection.id); setStoreSelection(null); }}
            onUninstall={() => { const g = storeSelection; setStoreSelection(null); setUninstallTarget(g); }}
            onShortcut={() => createDesktopShortcut(storeSelection)}
            onLibrary={() => { setStoreSelection(null); setLibraryOpen(true); }}
            onLaunch={() => { const g = storeSelection; setStoreSelection(null); launch(g); }}
            onClose={() => { sfx("dialogClose"); setStoreSelection(null); }}
          />
        ) : null}

        {controlOpen ? (
          <ControlCenter
            account={account}
            clock={clock}
            playing={playing}
            onSettings={() => { setControlOpen(false); openSettings("sound"); }}
            onLibrary={() => { setControlOpen(false); setLibraryOpen(true); }}
            onProfile={() => { setControlOpen(false); openSettings("profile"); }}
            onPower={() => { sfx("controlClose"); setControlOpen(false); setPowerMenu(true); }}
            onClose={() => { sfx("controlClose"); setControlOpen(false); }}
          />
        ) : null}

        {libraryOpen ? (
          <LibraryPanel
            games={PS5_GAMES}
            query={query}
            onQuery={setQuery}
            ownedSet={ownedSet}
            favSet={favSet}
            page={page}
            onPage={setPage}
            onOpen={(game) => { sfx("dialogOpen"); setStoreSelection(game); }}
            favOnly={favOnly}
            onFavOnly={setFavOnly}
            onClose={() => { sfx("controlClose"); setLibraryOpen(false); setQuery(""); }}
          />
        ) : null}

        {toast ? <div className="toast visible" role="status"><Check size={18} /> {toast}</div> : null}

        {playing ? (
          <VsGamePlayer
            game={playing}
            sessionSec={sessionSec}
            sound={sound}
            onVolume={(v) => setAudioSettings({ volume: v, muted: false })}
            onMute={() => { setAudioSettings({ muted: !sound.muted }); sfx(sound.muted ? "controlOpen" : "back"); }}
            onClose={() => { sfx("back"); setPlaying(null); }}
          />
        ) : null}

        {mediaApp ? (
          <div className="media-app-open">
            <div className="media-exit-dock">
              <button type="button" className="media-exit-button" onClick={() => { sfx("back"); setMediaApp(null); }} aria-label="Close media app" title="Close">
                <X size={22} />
              </button>
            </div>
            {mediaApp.kind === "frame" && mediaApp.src ? (
              <iframe className="media-app-frame" src={mediaApp.src} title={mediaApp.name} allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" allowFullScreen />
            ) : (
              <div className="media-app-stage">
                <MediaAppStage app={mediaApp} surfaces={surfaces} onExit={() => setMediaApp(null)} />
              </div>
            )}
            <div className="game-exit-dock">
              <div className="game-dock-zone game-home-zone">
                <button type="button" className="ps-home-button" onClick={() => { sfx("back"); setMediaApp(null); }} aria-label="Go to console home">
                  <span className="game-dock-icon ps-home-mark">VS</span>
                  <span style={{ fontSize: 12 }}>Home</span>
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {powerMenu ? <PowerMenu account={account} onWake={() => { sfx("controlOpen"); setPowerMenu(false); }} /> : null}

        {introOpen ? (
          <WelcomePanel
            account={account}
            onClose={() => {
              sfx("dialogClose");
              try { localStorage.setItem("vertex-ps5-intro", "done"); } catch {}
              setIntroOpen(false);
            }}
          />
        ) : null}
      </div>
    </main>
  );
}

function VsTile({ game, selected, onSelect, onHover }: { game: { id: string; name: string; cover: string }; selected: boolean; onSelect: () => void; onHover: () => void }) {
  return (
    <button
      type="button"
      className={`game-tile${selected ? " selected" : ""}`}
      data-ps5-game={game.id}
      onClick={onSelect}
      onMouseEnter={onHover}
      aria-label={`Select ${game.name}`}
      aria-current={selected}
    >
      <img className="game-cover" src={game.cover} alt={game.name} loading="lazy" draggable={false} />
    </button>
  );
}

function LibraryPanel({ games, query, onQuery, ownedSet, favSet, page, onPage, onOpen, favOnly, onFavOnly, onClose }: {
  games: readonly Ps5Game[];
  query: string;
  onQuery: (next: string) => void;
  ownedSet: Set<string>;
  favSet: Set<string>;
  page: number;
  onPage: (next: number) => void;
  onOpen: (game: Ps5Game) => void;
  favOnly: boolean;
  onFavOnly: (next: boolean) => void;
  onClose: () => void;
}) {
  // Show the entire catalogue in one vertically scrollable five-column library.
  const PAGE_SIZE = Math.max(1, games.length);
  const normalized = query.trim().toLowerCase();
  const filtered = games.filter((game) => {
    if (favOnly && !favSet.has(game.id)) return false;
    if (!normalized) return true;
    return game.name.toLowerCase().includes(normalized);
  });
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pageCount - 1);
  const slice = filtered.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE);

  return (
    <div className="modal-root">
      <div className="panel-shade" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
        <section className="overlay-panel wide-panel" role="dialog" aria-modal="true" aria-labelledby="vs-library-title">
          <div className="panel-header">
            <h2 id="vs-library-title">All Games Library</h2>
            <button type="button" className="icon-button close-button" onClick={onClose} aria-label="Close library"><X size={24} /></button>
          </div>
          <div className="library-tools">
            <Ps5SearchField value={query} onChange={onQuery} placeholder="Search all games" />
            <button
              type="button"
              className={`secondary-button${favOnly ? " on" : ""}`}
              aria-pressed={favOnly}
              onClick={() => { onFavOnly(!favOnly); onPage(0); }}
            ><Star size={18} fill={favOnly ? "currentColor" : "none"} /> Favorites</button>
          </div>
          {slice.length ? (
            <div className="collection-grid">
              {slice.map((game) => (
                <button type="button" key={game.id} className="collection-game" onClick={() => onOpen(game)} title={`View ${game.name}`}>
                  <img className="game-cover" src={game.cover} alt={game.name} loading="lazy" draggable={false} />
                  <span>{game.name}</span>
                  <small className="collection-publisher">{ownedSet.has(game.id) ? "Installed" : "In store"}</small>
                </button>
              ))}
            </div>
          ) : (
            <p className="muted-copy">{query ? `No games match “${query}”.` : "Nothing to show yet."}</p>
          )}
          {pageCount > 1 ? (
            <div className="collection-pagination">
              <button type="button" disabled={current <= 0} onClick={() => onPage(current - 1)}>Previous</button>
              <span>Page {current + 1} of {pageCount}</span>
              <button type="button" disabled={current >= pageCount - 1} onClick={() => onPage(current + 1)}>Next</button>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}

function downloadGameHtml(game: Ps5Game) {
  const title = game.name.replace(/[<>&"]/g, "");
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${title}</title>
<style>html,body{margin:0;height:100%;background:#03050a}iframe{border:0;width:100%;height:100%;display:block}</style>
</head>
<body>
<iframe src="${game.play}" allow="autoplay; fullscreen; gamepad; clipboard-write; encrypted-media" allowfullscreen></iframe>
</body>
</html>`;
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${game.id}.html`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}

function GameOptions({ game, owned, fav, onToggleFav, onInstall, onUninstall, onShortcut, onLibrary, onLaunch, onClose }: {
  game: Ps5Game;
  owned: boolean;
  fav: boolean;
  onToggleFav: () => void;
  onInstall: () => void;
  onUninstall: () => void;
  onShortcut: () => void;
  onLibrary: () => void;
  onLaunch: () => void;
  onClose: () => void;
}) {
  const [downloaded, setDownloaded] = useState(false);
  const download = () => {
    sfx("select");
    downloadGameHtml(game);
    setDownloaded(true);
    window.setTimeout(() => setDownloaded(false), 2000);
  };
  return (
    <div className="modal-root">
      <div className="panel-shade" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
        <section className="overlay-panel" role="dialog" aria-modal="true" aria-labelledby="vs-options-title">
          <div className="panel-header">
            <h2 id="vs-options-title">Game options</h2>
            <button type="button" className="icon-button close-button" onClick={onClose} aria-label="Close"><X size={24} /></button>
          </div>
          <div className="options-game">
            <img className="game-cover options-logo" src={game.cover} alt="" draggable={false} />
            <div>
              <h3>{game.name}</h3>
              <p>{owned ? "Installed on this console" : "Not installed yet"}</p>
            </div>
          </div>
          <div className="options-actions">
            {owned ? (
              <button type="button" className="solid-button" onClick={onLaunch}><Play size={19} fill="currentColor" /> Play</button>
            ) : (
              <button type="button" className="solid-button" onClick={onInstall}><Plus size={19} /> Install</button>
            )}
            <button type="button" className="secondary-button" onClick={download}><Download size={18} /> {downloaded ? "Saved to downloads" : "Download single HTML file"}</button>
            <button type="button" className="secondary-button" aria-pressed={fav} onClick={onToggleFav}><Star size={18} fill={fav ? "currentColor" : "none"} /> {fav ? "In favorites" : "Add to favorites"}</button>
            <button type="button" className="secondary-button" onClick={onLibrary}><PanelsTopLeft size={18} /> Game library</button>
            <button type="button" className="secondary-button" onClick={onShortcut}><Monitor size={18} /> Add desktop shortcut</button>
            {owned ? (
              <button type="button" className="secondary-button" onClick={onUninstall}><Trash2 size={18} /> Uninstall</button>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}

function ControlCenter({ account, clock, playing, onSettings, onLibrary, onProfile, onPower, onClose }: {
  account: Ps5Account | null;
  clock: string;
  playing: Ps5Game | null;
  onSettings: () => void;
  onLibrary: () => void;
  onProfile: () => void;
  onPower: () => void;
  onClose: () => void;
}) {
  return (
    <div className="control-center">
      <time className="clock control-center-clock">{clock}</time>
      <div className="activity-cards">
        <button type="button" className="activity-card" onClick={onLibrary}>
          <span className="activity-art"><Gamepad2 /></span>
          <span className="kicker">{playing ? "NOW PLAYING" : "YOUR LIBRARY"}</span>
          <h3>{playing ? playing.name : "Browse games"}</h3>
          <p>{playing ? "Tap to return to your game." : "Open the library to install something new."}</p>
        </button>
        <button type="button" className="activity-card" onClick={onProfile}>
          <span className="activity-art"><UserPlus /></span>
          <span className="kicker">PROFILE</span>
          <h3>{account?.displayName ?? "McCrack Player"}</h3>
          <p>Manage your account, avatar and console theme.</p>
        </button>
        <button type="button" className="activity-card" onClick={onSettings}>
          <span className="activity-art"><Music /></span>
          <span className="kicker">SOUND &amp; A/V</span>
          <h3>Audio settings</h3>
          <p>Adjust volume, mute and interface sounds.</p>
        </button>
      </div>
      <div className="control-bar">
        <div className="control-group">
          <button type="button" className="control-icon" onClick={onSettings} aria-label="Settings"><Settings /><span className="tooltip">Settings</span></button>
          <button type="button" className="control-icon" onClick={onLibrary} aria-label="Game Library"><PanelsTopLeft /><span className="tooltip">Library</span></button>
          <button type="button" className="control-icon" onClick={onProfile} aria-label="Profile"><UserPlus /><span className="tooltip">Profile</span></button>
        </div>
        <div className="control-group">
          <button type="button" className="control-icon" onClick={onPower} aria-label="Rest console"><Power /><span className="tooltip">Rest</span></button>
          <button type="button" className="control-icon" onClick={onClose} aria-label="Close Control Center"><X /><span className="tooltip">Close</span></button>
        </div>
      </div>
      <span className="control-help">Press <kbd>Home</kbd> to open the Control Center</span>
    </div>
  );
}

function WelcomePanel({ account, onClose }: { account: Ps5Account | null; onClose: () => void }) {
  return (
    <div className="modal-root" role="dialog" aria-modal="true" aria-label="Console menu">
      <div className="panel-shade">
        <section className="overlay-panel panel-intro">
          <div className="panel-header">
            <h2>Welcome</h2>
            <button type="button" className="icon-button close-button" onClick={onClose} aria-label="Close"><X size={24} /></button>
          </div>
          <div className="console-introduction">
            <span className="intro-mark" style={{ filter: "none", color: "#438cff", fontWeight: 700, display: "grid", placeItems: "center" }}>VS</span>
            <p className="intro-eyebrow">YOUR GAMES. YOUR MEDIA. ONE HOME.</p>
            <h3>Welcome to your console{account ? `, ${account.displayName}` : ""}.</h3>
            <p className="intro-summary">McCrack Station brings your HTML5 games and media together. Browse the carousel with the arrow keys, open the Game Library to install more, and press Home for the Control Center.</p>
            <div className="intro-features">
              <article><Gamepad2 /><div><h4>Play instantly</h4><p>Every game launches right in the console — no downloads to babysit.</p></div></article>
              <article><Star /><div><h4>Make it yours</h4><p>Favorite games, rearrange Home and pick a theme that fits.</p></div></article>
              <article><Music /><div><h4>Games &amp; media</h4><p>Switch between games and media apps with the tabs up top.</p></div></article>
              <article><Settings /><div><h4>Fine-tune it</h4><p>Volume, avatars and console settings are always a couple taps away.</p></div></article>
            </div>
            <footer>
              <span>You can reopen this anytime from Settings.</span>
              <button type="button" className="solid-button" onClick={onClose}>Let&rsquo;s play</button>
            </footer>
          </div>
        </section>
      </div>
    </div>
  );
}

function VsGamePlayer({ game, sessionSec, sound, onVolume, onMute, onClose }: {
  game: Ps5Game;
  sessionSec: number;
  sound: AudioSettings;
  onVolume: (v: number) => void;
  onMute: () => void;
  onClose: () => void;
}) {
  const [paused, setPaused] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const volumePct = sound.muted ? 0 : sound.volume;
  const wrapRef = useRef<HTMLDivElement>(null);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    const onFs = () => setFullscreen(document.fullscreenElement === wrapRef.current);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  // Every game opens full-screen by default. requestFullscreen keeps the VS Home dock
  // (rendered inside .game-player) on screen so the player can always switch games.
  useEffect(() => {
    const el = wrapRef.current;
    if (el?.requestFullscreen && !document.fullscreenElement) el.requestFullscreen().catch(() => {});
    return () => { if (document.fullscreenElement === el) document.exitFullscreen?.().catch(() => {}); };
  }, []);

  const toggleFullscreen = useCallback(() => {
    sfx("controlOpen");
    if (document.fullscreenElement) { document.exitFullscreen?.().catch(() => {}); return; }
    const el = wrapRef.current;
    if (el?.requestFullscreen) el.requestFullscreen().catch(() => {});
  }, []);

  const togglePause = useCallback(() => {
    setPaused((p) => !p);
    sfx("controlOpen");
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === " " || e.key === "Enter") { e.preventDefault(); togglePause(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePause]);

  return (
      <div ref={wrapRef} className={`game-player${paused ? " is-paused" : ""}`} role="dialog" aria-modal="true" aria-label={`${game.name} is active in game`}>
      {paused ? (
        <div className="game-loading">
          <img src={game.cover} alt="" />
          <h1>{game.name}</h1>
          <p>Paused</p>
        </div>
      ) : null}
      <div className="ps5-game-wrap">
        <GameFrame key={game.id} game={game} />
      </div>
      <div className="game-exit-dock">
        <div className="game-dock-zone game-volume-zone">
          <div className="game-dock-surface">
            <button type="button" className="game-dock-icon" onClick={onMute} aria-label={sound.muted ? "Unmute" : "Mute"}>
              {sound.muted ? <VolumeX size={23} /> : <Volume2 size={23} />}
            </button>
            <div className="game-volume-slider">
              <label><span>GAME VOLUME</span><output>{volumePct}%</output></label>
              <input type="range" min={0} max={100} value={volumePct} onChange={(e) => onVolume(Number(e.target.value))} aria-label="Game sound volume" style={{ "--volume": `${volumePct}%` } as CSSProperties} />
            </div>
            <span className="game-audio-status">{sound.muted ? "Console muted" : "Sound on"}</span>
          </div>
        </div>
        <div className="game-dock-zone game-home-zone">
          <button type="button" className="ps-home-button" onClick={onClose} aria-label="Go to console home">
            <span className="game-dock-icon ps-home-mark">VS</span>
            <span style={{ fontSize: 12 }}>Home</span>
          </button>
        </div>
        <div className="game-dock-zone game-actions-zone">
          <div className="game-dock-surface">
            <button type="button" className="game-dock-icon" onClick={toggleFullscreen} aria-label={fullscreen ? "Exit fullscreen" : "Enter fullscreen"} aria-pressed={fullscreen}>
              {fullscreen ? <Minimize size={23} /> : <Maximize size={23} />}
            </button>
            <button type="button" className="game-dock-icon" onClick={() => { sfx("optionsOpen"); setOptionsOpen((o) => !o); }} aria-label="Game options" aria-pressed={optionsOpen}>
              <MoreHorizontal size={23} />
            </button>
            <button type="button" className="game-dock-icon" onClick={onClose} aria-label="Close game">
              <X size={23} />
            </button>
          </div>
          {optionsOpen ? (
            <div className="game-player-options">
              <button type="button" onClick={togglePause}>{paused ? "Resume game" : "Pause game"}</button>
              <button type="button" onClick={onMute}>{sound.muted ? "Unmute console" : "Mute console"}</button>
              <button type="button" onClick={onClose}>Close game</button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function PowerMenu({ account, onWake }: { account: Ps5Account | null; onWake: () => void }) {
  return (
    <div className="power-screen">
      <div className="power-indicator rest"><Power size={46} /></div>
      <h1>McCrack Station is resting</h1>
      <p>{account ? `${account.displayName}, your console is still running in the background.` : "Your console is still running in the background."} Wake it up anytime to jump back in.</p>
      <button type="button" onClick={onWake}><Play size={20} fill="currentColor" /> Wake console</button>
      <p className="power-menu-note">Resting keeps your games paused where you left them. Sound and ambient music are suspended while you’re gone.</p>
    </div>
  );
}

function Ps5BootSurface({ account, onDone }: { account: Ps5Account | null; onDone: () => void }) {
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  const firedRef = useRef(false);

  useEffect(() => {
    const doneTimer = window.setTimeout(() => {
      if (firedRef.current) return;
      firedRef.current = true;
      onDoneRef.current();
    }, 3400);
    return () => window.clearTimeout(doneTimer);
  }, []);

  const skipIntro = () => {
    if (firedRef.current) return;
    firedRef.current = true;
    onDoneRef.current();
  };

  return (
    <div className="ps5-boot">
      <div className="ps5-boot-glow" aria-hidden="true" />
      <div className="ps5-boot-orbit ps5-boot-orbit-one" aria-hidden="true" />
      <div className="ps5-boot-orbit ps5-boot-orbit-two" aria-hidden="true" />
      <div className="ps5-boot-inner">
        <div className="ps5-boot-logo" aria-hidden="true"><span>VS</span></div>
        <div className="ps5-boot-returning">
          <span>{account ? "Welcome back" : "Welcome to McCrack Station"}</span>
          {account ? <strong>{account.displayName}</strong> : <strong>McCrack Player</strong>}
          {account ? <div className="ps5-boot-avatar" style={avatarVisual(account)}>{account.displayName.slice(0, 1).toUpperCase()}</div> : null}
        </div>
        <div className="ps5-boot-loader" aria-hidden="true"><span /></div>
        <div className="ps5-boot-caption">Your games. Your station.</div>
      </div>
      <button type="button" className="ps5-boot-skip" onClick={skipIntro}>Skip intro <ChevronRight size={14} /></button>
    </div>
  );
}

function Ps5DeviceSurface({ onSelect }: { onSelect: (mode: DeviceMode) => void }) {
  return (
    <div className="ps5-device-screen">
      <div className="ps5-device-card">
        <span className="ps5-home-kicker">QUICK SETUP</span>
        <h1>What are you playing on?</h1>
        <p>Choose how you want to control games this session.</p>
        <div className="ps5-device-options">
          <button type="button" onClick={() => onSelect("pc")}>
            <span className="ps5-device-icon"><PanelsTopLeft size={28} /></span>
            <strong>PC / Normal</strong>
            <small>Keyboard and mouse</small>
          </button>
          <button type="button" onClick={() => onSelect("controller")}>
            <span className="ps5-device-icon"><Gamepad2 size={29} /></span>
            <strong>Controller</strong>
            <small>Use a connected gamepad</small>
          </button>
        </div>
      </div>
    </div>
  );
}

function Ps5AccountSurface({ onDone }: { onDone: (acc: Ps5Account) => void }) {
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [dob, setDob] = useState("");
  const [err, setErr] = useState("");
  const [status, setStatus] = useState<"idle" | "checking" | "taken">("idle");
  const [checking, setChecking] = useState(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  const claimRef = useRef<Peer | null>(null);
  const cancelledRef = useRef(false);

  useEffect(() => () => { cancelledRef.current = true; try { claimRef.current?.destroy(); } catch { /* noop */ } }, []);

  const submit = () => {
    const u = username.trim().toLowerCase();
    const n = displayName.trim();
    if (!USERNAME_RE.test(u)) return setErr("Username: 3–16 letters or numbers, no spaces.");
    if (!NAME_RE.test(n) || !n.trim()) return setErr("Pick a display name (up to 20 characters).");
    if (status !== "idle" && status !== "taken") return;
    setErr("");
    setChecking(true);
    setStatus("checking");

    if (claimRef.current) { try { claimRef.current.destroy(); } catch { /* noop */ } }
    const claim = new Peer(`vertex-u-${u}`, { debug: 0 });
    claimRef.current = claim;
    const finish = (ok: boolean, reason = "") => {
      if (cancelledRef.current) return;
      setChecking(false);
      if (!ok) { setStatus("taken"); setErr(`@${u} is already taken — pick another username.`); try { claim.destroy(); } catch { /* noop */ } return; }
      setStatus("idle");
      try { claim.destroy(); } catch { /* noop */ }
      const acc: Ps5Account = { username: u, displayName: n.slice(0, 20), dob: dob || undefined };
      try { localStorage.setItem(ACCOUNT_KEY, JSON.stringify(acc)); } catch { /* noop */ }
      window.setTimeout(() => onDoneRef.current(acc), 400);
    };
    claim.on("open", () => finish(true, ""));
    claim.on("error", (e) => {
      if (cancelledRef.current) return;
      if (e.type === "unavailable-id") return finish(false, "taken");
      finish(true, "");
    });
  };

  return (
    <div className="ps5-account">
      <div className="ps5-account-glow" aria-hidden="true" />
      <div className="ps5-account-card">
        <span className="ps5-account-badge">MCCRACK-COS PRESENTS :</span>
        <h1 className="ps5-account-title">Create your account</h1>
        <p className="ps5-account-sub">One account for your console profile. Your username is unique, your display name is shown on the console.</p>
        {err && <div className="ps5-account-err">{err}</div>}
        <label className="ps5-account-field"><span>Username</span>
          <div className="ps5-account-prefix">
            <span>@</span>
            <input className="ps5-account-input" placeholder="onirifalx" maxLength={16} value={username} onChange={(e) => { setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, "")); setStatus("idle"); }} aria-label="Username" autoFocus spellCheck={false} />
          </div>
          <em>3–16 letters or numbers · unique — no one else can take it</em>
        </label>
        <label className="ps5-account-field"><span>Display name</span>
          <input className="ps5-account-input" placeholder="How the console shows you" maxLength={20} value={displayName} onChange={(e) => setDisplayName(e.target.value)} aria-label="Display name" spellCheck={false} />
          <em>Shown on the console only.</em>
        </label>
        <label className="ps5-account-field"><span>Date of birth (optional)</span>
          <input className="ps5-account-input" type="date" max={new Date().toISOString().slice(0, 10)} value={dob} onChange={(e) => setDob(e.target.value)} aria-label="Date of birth" />
          <em>No age restrictions — just for your profile</em>
        </label>
        <button type="button" className="ps5-account-btn" onClick={submit} disabled={checking}>
          {checking ? <><Loader2 size={15} className="ps5-spin" /> Checking availability…</> : status === "taken" ? <><UserPlus size={15} /> Try another username</> : <><Check size={15} /> Create account</>}
        </button>
        <p className="ps5-account-note">Your username is your console ID — nobody else can claim it. Change your display name any time from console Settings.</p>
      </div>
    </div>
  );
}

const JS_DELIVR_DIV = /cdn\.jsdelivr\.net\/gh\//i;

type RewriteCtx = {
  bannedUsers: Set<string>;
  branchFor?: (user: string, repo: string) => string | null;
};

function sanitizeBannedUrls(html: string, bannedUsers: Set<string>): string {
  return html.replace(
    /https?:\/\/(?:cdn|fastly|gcore|testingcf)\.jsdelivr\.net\/gh\/([^/@\s"'<>]+)\/([^/@\s"'<>]+)(?:@([^/@\s"'<>]+))?(\/[^"'\s<>]*)?/gi,
    (whole, user, repo, ref, path) => {
      if (!bannedUsers.has(user)) return whole;
      const branch = !ref || ref === "latest" ? "HEAD" : ref;
      return `https://raw.githack.com/${user}/${repo}/${branch}${path ?? ""}`;
    }
  );
}

const JS_DELIVR_BANNED_USERS = new Set([
  "genizy",
  "web-ports",
  "waycrosspublicmedia",
  "gn-math",
  "Stinkalistic",
  "67-Factory",
  "slqntdevss",
  "aukak",
  "Pixelsuft",
  "NotRexed",
  "WhoIsEv",
  "R74nCom",
  "New25Said",
  "faralong",
]);

function neutralizeBootKillers(html: string): string {
  html = html.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gi, (block, body) =>
    /navigator\.serviceWorker\.register|ServiceWorkerContainer/.test(body) ? "<!-- sw stripped -->" : block
  );
  html = html.replace(/\bnavigator\.serviceWorker\.register\s*\([^;]*?\)\s*;?/g, "/* sw register removed */");
  html = html.replace(
    /<script[^>]*\bsrc=["'][^"']*(?:google-analytics\.com|googletagmanager\.com|pagead2\.googlesyndication\.com|adsbygoogle\.js|doubleclick\.net)[^"']*["'][^>]*><\/script>/gi,
    "<!-- ad/tracker script removed -->"
  );
  html = html.replace(
    /\b(?:gtag|ga)\s*\(\s*['"]js['"]\s*,\s*['"][^'"]*['"]\s*\)\s*;?\s*\n?/g,
    "/* analytics removed */"
  );
  html = html.replace(/\b(?:adsbygoogle|push)\s*=\s*\w*\(\)\s*;?/g, "/* ads off */");
  return html;
}

const INLINEABLE_GAME_HOSTS = new Set(["cdn.jsdelivr.net", "raw.githack.com", "rawcdn.githack.com", "raw.githubusercontent.com", "script.googleusercontent.com", "firebasestorage.googleapis.com"]);

function canInlineGame(src: string): boolean {
  try { return INLINEABLE_GAME_HOSTS.has(new URL(src).hostname); } catch { return false; }
}

const GAME_URL_SHIM = `(function(){var B={genizy:1,"web-ports":1,waycrosspublicmedia:1,"gn-math":1,Stinkalistic:1,"67-Factory":1,slqntdevss:1,aukak:1,Pixelsuft:1,NotRexed:1,WhoIsEv:1,R74nCom:1,New25Said:1,faralong:1};function fix(u){if(typeof u!="string")return u;var m=/^(https?:)\\/\\/(?:cdn|fastly|gcore|testingcf)\\.jsdelivr\\.net\\/gh\\/([^\\/@]+)\\/([^\\/@]+)(?:@([^\\/]+))?(\\/[^?#]*)?(\\?[^#]*)?/i.exec(u);if(m&&B[m[2]]){return "https://raw.githack.com/"+m[2]+"/"+m[3]+"/"+(m[4]||"HEAD")+(m[5]||"")+(m[6]||"");}return u;}window.__fix=fix;try{var of=window.fetch;if(of){window.fetch=function(i,init){if(typeof i==="string")i=fix(i);return of.call(this,i,init);};}}catch(e){}try{var xo=XMLHttpRequest.prototype.open;XMLHttpRequest.prototype.open=function(){var a=[].slice.call(arguments);if(a.length>1)a[1]=fix(a[1]);return xo.apply(this,a);};}catch(e){}function sp2(proto,prop){try{var d=Object.getOwnPropertyDescriptor(proto,prop);if(!d||!d.set||!d.get)return;Object.defineProperty(proto,prop,{configurable:true,enumerable:d.enumerable,get:d.get,set:function(v){return d.set.call(this,fix(v));}});}catch(e){}}sp2(HTMLScriptElement.prototype,"src");sp2(HTMLImageElement.prototype,"src");sp2(HTMLLinkElement.prototype,"href");sp2(HTMLIFrameElement.prototype,"src");sp2(HTMLSourceElement.prototype,"src");sp2(HTMLVideoElement.prototype,"src");sp2(HTMLAudioElement.prototype,"src");})();`;

function GameFrame({ game, onLoad }: { game: Ps5Game; onLoad?: () => void }) {
  const [state, setState] = useState<"loading" | "error" | "ready">("loading");
  const [src, setSrc] = useState<string | null>(null);
  const [direct, setDirect] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!canInlineGame(game.play)) {
      setState("ready");
      setDirect(true);
      setSrc(null);
      return;
    }
    let cancelled = false;
    let objUrl: string | null = null;
    setState("loading");
    setSrc(null);
    setDirect(false);

    (async () => {
      try {
        const res = await fetch(game.play, { mode: "cors" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        let html = await res.text();
        html = html.replace(/^\uFEFF/, "");
        html = neutralizeBootKillers(html);
        html = sanitizeBannedUrls(html, JS_DELIVR_BANNED_USERS);
        if (!/<base\s/i.test(html)) {
          const baseUrl = game.play.slice(0, game.play.lastIndexOf("/") + 1).replace(/([^:]\/)\/+/g, "$1");
          const headIdx = html.search(/<head[^>]*>/i);
          if (headIdx >= 0) {
            const end = html.indexOf(">", headIdx);
            html = html.slice(0, end + 1) + `<base href="${baseUrl}" />` + html.slice(end + 1);
          } else {
            html = `<head><base href="${baseUrl}" /></head>` + html;
          }
        }
        const shimTag = `<script>${GAME_URL_SHIM}</script>`;
        if (/<head[^>]*>/i.test(html)) {
          html = html.replace(/<head[^>]*>/i, (m) => m + shimTag);
        } else {
          html = shimTag + html;
        }
        const blob = new Blob([html], { type: "text/html;charset=utf-8" });
        objUrl = URL.createObjectURL(blob);
        if (!cancelled) setSrc(objUrl);
      } catch (err) {
        if (!cancelled) setState("error");
      }
    })();

    return () => {
      cancelled = true;
      if (objUrl) URL.revokeObjectURL(objUrl);
    };
  }, [game.play, attempt]);

  if (game.proxy) {
    return (
      <div className="ps5-game-wrap">
        <ProxyUrlFrame url={game.play} title={game.name} blockAds />
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="ps5-game-msg">
        <div className="ps5-game-msg-title">Couldn&apos;t start this game</div>
        <button type="button" className="ps5-ghost-btn" onClick={() => setAttempt((a) => a + 1)}>Retry</button>
      </div>
    );
  }

  return (
    <div className="ps5-game-wrap">
      {!src ? (
        <div className="ps5-game-msg">
          <div className="ps5-spinner" />
          <div className="ps5-game-msg-title">Booting {game.name}...</div>
        </div>
      ) : null}
      {src || direct ? (
        <iframe
          className="ps5-game-frame"
          src={direct ? game.play : src ?? undefined}
          title={game.name}
          allow="autoplay; clipboard-write; camera; microphone; fullscreen; gamepad; encrypted-media"
          allowFullScreen
          referrerPolicy="no-referrer"
          onLoad={() => onLoad?.()}
        />
      ) : null}
    </div>
  );
}

function Ps5SearchField({ value, onChange, placeholder }: { value: string; onChange: (next: string) => void; placeholder: string }) {
  return (
    <div className="search-field">
      <Search size={20} />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} />
      {value ? <button type="button" className="search-clear" onClick={() => onChange("")} aria-label="Clear search"><X size={17} /></button> : <kbd>/</kbd>}
    </div>
  );
}

/** Renders the real in-OS app (Spicetify / YouTube / Messages) inside the console. */
function MediaAppStage({ app, surfaces, onExit }: { app: MediaApp; surfaces?: Ps5EmbeddedSurfaces; onExit: () => void }) {
  if (app.id === "browser") {
    return (
      <div className="ps5-media-app">
        <BrowserSurface />
      </div>
    );
  }
  if (app.id === "spotify") {
    if (!surfaces?.spotify) return <MediaAppMissing name={app.name} />;
    const Spotify = surfaces.spotify;
    return (
      <div className="ps5-media-app">
        <Spotify onClose={onExit} onMinimize={onExit} onTrackChange={() => {}} />
      </div>
    );
  }
  if (app.id === "vertube") {
    if (!surfaces?.verTube) return <MediaAppMissing name={app.name} />;
    const YouTube = surfaces.verTube;
    return (
      <div className="ps5-media-app">
        <YouTube />
      </div>
    );
  }
  if (app.id === "messages") {
    return (
      <div className="ps5-media-app">
        <MessagesSurface />
      </div>
    );
  }
  if (app.id === "verai") {
    return (
      <div className="ps5-media-app">
        <VerAiSurface />
      </div>
    );
  }
  return <MediaAppMissing name={app.name} />;
}

function MediaAppMissing({ name }: { name: string }) {
  return (
    <div className="ps5-game-msg">
      <div className="ps5-game-msg-title">{name} isn&apos;t available right now</div>
      <p className="ps5-media-missing-copy">Open the console from the desktop so the app can start.</p>
    </div>
  );
}

function Ps5SettingsPanel({
  account,
  deviceMode,
  installedCount,
  recentCount,
  sound,
  theme,
  favOnly,
  onFavOnly,
  tab,
  onTab,
  onSound,
  onTheme,
  onDeviceMode,
  onUpdate,
  onPower,
  onClose,
}: {
  account: Ps5Account | null;
  deviceMode: DeviceMode;
  installedCount: number;
  recentCount: number;
  sound: AudioSettings;
  theme: string;
  favOnly: boolean;
  onFavOnly: (next: boolean) => void;
  tab: "profile" | "sound" | "theme" | "library";
  onTab: (next: "profile" | "sound" | "theme" | "library") => void;
  onSound: (patch: Partial<AudioSettings>) => void;
  onTheme: (theme: string) => void;
  onDeviceMode: (mode: DeviceMode) => void;
  onUpdate: (next: Ps5Account) => void;
  onPower: () => void;
  onClose: () => void;
}) {
  const [displayName, setDisplayName] = useState(account?.displayName ?? "");
  const [username, setUsername] = useState(account?.username ?? "");
  const [hue, setHue] = useState(account?.hue ?? 212);
  const [avatar, setAvatar] = useState<string | undefined>(account?.avatar);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setDisplayName(account?.displayName ?? "");
    setUsername(account?.username ?? "");
    setHue(account?.hue ?? 212);
    setAvatar(account?.avatar);
    setError("");
  }, [account]);

  const cleanUser = username.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  const userError = !cleanUser ? "Pick a username." : !USERNAME_RE.test(cleanUser) ? "3 to 16 letters or numbers, no spaces." : "";
  const nameError = !displayName.trim() ? "Your display name can't be empty." : "";
  const draft = { hue, avatar };

  const dirty =
    !!account &&
    (displayName.trim() !== account.displayName ||
      cleanUser !== account.username ||
      hue !== (account.hue ?? 212) ||
      (avatar ?? "") !== (account.avatar ?? ""));

  const pickPhoto = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("That file isn't an image.");
      return;
    }
    if (file.size > 6 * 1024 * 1024) {
      setError("Pick an image under 6 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => setError("That image could not be read.");
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => setError("That image could not be read.");
      img.onload = () => {
        const size = 192;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        const side = Math.min(img.width, img.height);
        ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, size, size);
        setAvatar(canvas.toDataURL("image/jpeg", 0.86));
        setError("");
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const save = () => {
    if (!account) return;
    if (userError || nameError) {
      setError(userError || nameError);
      return;
    }
    onUpdate({ ...account, displayName: displayName.trim().slice(0, 20), username: cleanUser, hue, avatar });
    setError("");
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  };

  return (
    <div className="modal-root">
      <div className="panel-shade" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
        <section className="overlay-panel panel-settings" role="dialog" aria-modal="true" aria-labelledby="vs-settings-title">
          <div className="panel-header">
            <h2 id="vs-settings-title">Settings</h2>
            <button type="button" className="icon-button" onClick={onClose} aria-label="Close settings"><X size={22} /></button>
          </div>
          <div className="panel-tabs" role="tablist" aria-label="Settings sections">
            <button type="button" className={tab === "profile" ? "active" : ""} onClick={() => onTab("profile")} role="tab" aria-selected={tab === "profile"}>Profile</button>
            <button type="button" className={tab === "sound" ? "active" : ""} onClick={() => onTab("sound")} role="tab" aria-selected={tab === "sound"}>Sound</button>
            <button type="button" className={tab === "theme" ? "active" : ""} onClick={() => onTab("theme")} role="tab" aria-selected={tab === "theme"}>Theme</button>
            <button type="button" className={tab === "library" ? "active" : ""} onClick={() => onTab("library")} role="tab" aria-selected={tab === "library"}>Library</button>
          </div>

          {tab === "profile" ? (
            <div className="settings-list">
              <div className="profile-summary">
                <span className="profile-indicator"><span className="avatar-art" style={avatarVisual(draft)}>{(displayName || account?.displayName || "P").slice(0, 1).toUpperCase()}</span></span>
                <span className="online" aria-hidden="true" />
                <div className="profile-summary-name">
                  <h3>{displayName || account?.displayName || "Player"}</h3>
                  <p>@{username || account?.username || "guest"}</p>
                </div>
              </div>
              <div className="profile-editor">
                <div className="ps5-settings-photo">
                  <button type="button" className="ps5-settings-photo-btn" onClick={() => fileRef.current?.click()}>
                    <UserPlus size={15} /> {avatar ? "Replace photo" : "Upload a photo"}
                  </button>
                  {avatar ? (
                    <button type="button" className="ps5-settings-photo-clear" onClick={() => setAvatar(undefined)}>
                      <X size={15} /> Use colour
                    </button>
                  ) : null}
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="ps5-settings-file"
                    onChange={(event) => {
                      pickPhoto(event.target.files?.[0]);
                      event.target.value = "";
                    }}
                  />
                </div>
                <label className="form-field">
                  <span>Display name</span>
                  <input value={displayName} maxLength={20} onChange={(e) => { setDisplayName(e.target.value); setError(""); }} aria-label="Display name" spellCheck={false} />
                </label>
                <label className="form-field">
                  <span>Username</span>
                  <input
                    value={username}
                    maxLength={16}
                    onChange={(e) => { setUsername(e.target.value); setError(""); }}
                    aria-label="Console username"
                    spellCheck={false}
                    className={userError && username !== account?.username ? "bad" : ""}
                  />
                  <em>{userError || "3 to 16 letters or numbers."}</em>
                </label>
                <legend>Avatar colour</legend>
                <div className="avatar-choices">
                  {AVATAR_HUES.map((option) => (
                    <button key={option} type="button" className={hue === option && !avatar ? "on" : ""} style={avatarStyle(option)} onClick={() => setHue(option)} aria-label={`Avatar colour ${option}`} aria-pressed={hue === option && !avatar} />
                  ))}
                </div>
                <div className="ps5-settings-modes">
                  <label className="list-row">
                    <Monitor size={22} />
                    <span>Controller mode</span>
                    <div className="mode-choice">
                      <button type="button" className={deviceMode === "pc" ? "on" : ""} onClick={() => onDeviceMode("pc")}>PC / Normal</button>
                      <button type="button" className={deviceMode === "controller" ? "on" : ""} onClick={() => onDeviceMode("controller")}>Controller</button>
                    </div>
                  </label>
                </div>
                {account?.dob ? (
                  <label className="form-field">
                    <span>Date of birth</span>
                    <p className="ps5-settings-static">{account.dob}</p>
                  </label>
                ) : null}
                {error ? <p className="ps5-settings-error">{error}</p> : null}
                <div className="form-actions">
                  <button type="button" className="secondary-button" onClick={onClose}>Close</button>
                  <button type="button" className="solid-button" onClick={save} disabled={!dirty}>
                    {saved ? <><Check size={18} /> Saved</> : <><Check size={18} /> Save changes</>}
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {tab === "sound" ? (
            <div className="settings-list panel-sound">
              <label className="slider-label">
                <span>Master volume</span>
                <output>{sound.muted ? "Muted" : `${sound.volume}%`}</output>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={sound.muted ? 0 : sound.volume}
                  onChange={(e) => onSound({ volume: Number(e.target.value), muted: false })}
                  aria-label="Console volume"
                  style={{ "--volume": `${sound.muted ? 0 : sound.volume}%` } as CSSProperties}
                />
              </label>
              <label className="list-row">
                <Volume2 size={22} />
                <span>Sound effects</span>
                <small>{sound.effects ? "On" : "Off"}</small>
                <button type="button" className={`toggle ${sound.effects ? "on" : ""}`} onClick={() => { onSound({ effects: !sound.effects }); sfx(!sound.effects ? "controlOpen" : "back"); }} aria-pressed={sound.effects} aria-label="Toggle sound effects" />
              </label>
              <label className="list-row">
                <Music size={22} />
                <span>Ambient music</span>
                <small>{sound.music ? "On" : "Off"}</small>
                <button type="button" className={`toggle ${sound.music ? "on" : ""}`} onClick={() => setMusicEnabled(!sound.music)} aria-pressed={sound.music} aria-label="Toggle ambient music" />
              </label>
              <label className="list-row">
                {sound.muted ? <VolumeX size={22} /> : <Volume2 size={22} />}
                <span>Mute console</span>
                <small>{sound.muted ? "Muted" : "Unmuted"}</small>
                <button type="button" className={`toggle ${sound.muted ? "on" : ""}`} onClick={() => { onSound({ muted: !sound.muted }); sfx(sound.muted ? "controlOpen" : "back"); }} aria-pressed={sound.muted} aria-label="Toggle mute" />
              </label>
            </div>
          ) : null}

          {tab === "theme" ? (
            <div className="settings-list">
              <p className="section-label">Accent colour</p>
              <div className="color-choices">
                {THEMES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className={theme === t.id ? "on" : ""}
                    style={{ background: `linear-gradient(135deg, ${t.accent}, ${t.soft})` }}
                    onClick={() => { onTheme(t.id); sfx("select"); }}
                    aria-label={`${t.name} theme`}
                    aria-pressed={theme === t.id}
                  />
                ))}
              </div>
              <p className="muted-copy">Every accent on the console follows this colour — buttons, highlights and the system music feel.</p>
            </div>
          ) : null}

          {tab === "library" ? (
            <div className="settings-list">
              <p className="section-label">Your library</p>
              <label className="list-row">
                <PanelsTopLeft size={22} />
                <span>Installed games</span>
                <small>{installedCount}</small>
              </label>
              <label className="list-row">
                <Play size={22} />
                <span>Recently played</span>
                <small>{recentCount}</small>
              </label>
              <label className="list-row">
                <Star size={22} />
                <span>Show favorites only on Home</span>
                <small>{favOnly ? "On" : "Off"}</small>
                <button type="button" className={`toggle ${favOnly ? "on" : ""}`} onClick={() => { sfx("navigate"); onFavOnly(!favOnly); }} aria-pressed={favOnly} aria-label="Toggle favorites only" />
              </label>
              <label className="list-row">
                <Power size={22} />
                <span>Rest console</span>
                <small>Pauses everything</small>
                <button type="button" className="chevron" onClick={onPower} aria-label="Rest console"><ChevronRight size={20} /></button>
              </label>
              <p className="muted-copy">Installed games live in your browser. Favorites and recently-played are saved with your profile.</p>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}