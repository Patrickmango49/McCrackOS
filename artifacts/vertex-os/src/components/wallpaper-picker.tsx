import { useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { Check, Film, Link, Maximize2, Plus, RotateCcw, Search, Trash2, X } from "lucide-react";
import { t } from "../i18n";

export type PickerWallpaper = {
  id: string;
  name: string;
  image?: string;
  video?: string;
  videoLow?: string;
  category?: string;
  blob?: Blob;
};

const CUSTOM_DB = "vertex-os-cache";
const CUSTOM_STORE = "custom-wallpapers";

let customDbPromise: Promise<IDBDatabase> | null = null;

function openCustomDb(): Promise<IDBDatabase> {
  if (!customDbPromise) {
    customDbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(CUSTOM_DB, 2);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(CUSTOM_STORE)) {
          db.createObjectStore(CUSTOM_STORE, { keyPath: "id" });
        }
      };
      req.onsuccess = () => {
        const db = req.result as IDBDatabase;
        db.onversionchange = () => { try { db.close(); } catch { /* ignore */ } };
        resolve(db);
      };
      req.onerror = () => { customDbPromise = null; reject(req.error); };
      req.onblocked = () => { /* open is blocked by another tab — do not hang the cached promise */ };
    });
  }
  return customDbPromise;
}

const CUSTOM_LS = "vertex-custom-wallpapers-v2";

type CustomRow = { id: string; name: string; url: string; mime: string };

export function readCustomWallpapersLocal(): PickerWallpaper[] {
  try {
    const raw = localStorage.getItem(CUSTOM_LS);
    if (!raw) return [];
    const rows = JSON.parse(raw) as CustomRow[];
    return rows
      .map((r): PickerWallpaper | null => {
        if (!r.id || typeof r.url !== "string" || !r.url) return null;
        return r.mime.startsWith("image/")
          ? { id: r.id, name: r.name, image: r.url }
          : { id: r.id, name: r.name, video: r.url };
      })
      .filter((w): w is PickerWallpaper => w !== null);
  } catch {
    return [];
  }
}

function writeCustomWallpapersLocal(list: PickerWallpaper[]) {
  try {
    const rows: CustomRow[] = list.map((w) => ({
      id: w.id,
      name: w.name,
      url: (w.image ?? w.video) ?? "",
      mime: w.video ? "video/*" : "image/*",
    }));
    localStorage.setItem(CUSTOM_LS, JSON.stringify(rows));
  } catch {
    /* session still works */
  }
}

function isDurableSrc(url: string | undefined): url is string {
  return typeof url === "string" && (url.startsWith("data:") || /^https?:\/\//i.test(url));
}

// Every custom image is baked to an actual 1920x1080 (1080P) canvas — upscaled when smaller, downscaled when larger.
const CUSTOM_IMAGE_W = 1920;
const CUSTOM_IMAGE_H = 1080;

function readRawAsDataUrl(file: Blob): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(typeof fr.result === "string" ? fr.result : "");
    fr.onerror = () => reject(fr.error);
    fr.readAsDataURL(file);
  });
}

function decodeImageStrict(src: string): Promise<HTMLImageElement> {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const el = document.createElement("img");
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("decode"));
    el.src = src;
  });
}

async function fileToDataUrl(file: Blob): Promise<string> {
  if (/image\/svg/i.test(file.type)) return readRawAsDataUrl(file);
  const url = URL.createObjectURL(file);
  try {
    const img = await decodeImageStrict(url);
    const canvas = document.createElement("canvas");
    canvas.width = CUSTOM_IMAGE_W;
    canvas.height = CUSTOM_IMAGE_H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return readRawAsDataUrl(file);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    const scale = Math.max(CUSTOM_IMAGE_W / img.naturalWidth, CUSTOM_IMAGE_H / img.naturalHeight);
    const dw = img.naturalWidth * scale;
    const dh = img.naturalHeight * scale;
    ctx.drawImage(img, (CUSTOM_IMAGE_W - dw) / 2, (CUSTOM_IMAGE_H - dh) / 2, dw, dh);
    const keepAlpha = /png|gif|webp/i.test(file.type);
    return canvas.toDataURL(keepAlpha ? "image/png" : "image/jpeg", 0.92);
  } catch {
    return readRawAsDataUrl(file);
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function urlToDataUrl(url: string): Promise<string> {
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) return url;
    const blob = await res.blob();
    if (blob.size <= 0) return url;
    const data = await fileToDataUrl(blob);
    return data && data.startsWith("data:") ? data : url;
  } catch {
    return url;
  }
}

async function toDurable(wp: PickerWallpaper & { blob?: Blob }): Promise<PickerWallpaper | null> {
  if (wp.video || !wp.image) return null;
  if (wp.blob) {
    try { return { id: wp.id, name: wp.name, image: await fileToDataUrl(wp.blob) }; } catch { return null; }
  }
  if (isDurableSrc(wp.image)) return { id: wp.id, name: wp.name, image: wp.image };
  return null;
}

export async function loadCustomWallpapers(): Promise<PickerWallpaper[]> {
  const merged = new Map<string, PickerWallpaper>();
  for (const w of readCustomWallpapersLocal()) merged.set(w.id, w);
  try {
    const db = await openCustomDb();
    const rows = await new Promise<{ id: string; name: string; blob: Blob | null; url: string | null; mime: string }[]>((resolve, reject) => {
      const tx = db.transaction(CUSTOM_STORE, "readonly");
      const req = tx.objectStore(CUSTOM_STORE).getAll();
      req.onsuccess = () => resolve(req.result as { id: string; name: string; blob: Blob | null; url: string | null; mime: string }[]);
      req.onerror = () => reject(req.error);
    });
    for (const r of rows) {
      if (merged.has(r.id)) continue;
      const src = r.url ?? (r.blob ? URL.createObjectURL(r.blob) : undefined);
      if (!src) continue;
      merged.set(r.id, r.mime.startsWith("image/")
        ? { id: r.id, name: r.name, image: src }
        : { id: r.id, name: r.name, video: src });
    }
  } catch {
    /* local list only */
  }
  return [...merged.values()];
}

export async function persistCustomWallpaper(wp: PickerWallpaper & { blob?: Blob }): Promise<void> {
  const durable = await toDurable(wp);
  if (durable) {
    const rest = readCustomWallpapersLocal().filter((w) => w.id !== wp.id);
    writeCustomWallpapersLocal([...rest, durable]);
  }
  try {
    const db = await openCustomDb();
    const mime = wp.blob?.type ?? (wp.video ? "video/*" : "image/*");
    const url = wp.blob ? undefined : (wp.video ?? wp.image);
    await new Promise<void>((resolve) => {
      const tx = db.transaction(CUSTOM_STORE, "readwrite");
      tx.objectStore(CUSTOM_STORE).put({ id: wp.id, name: wp.name, blob: wp.blob ?? null, url: url ?? null, mime });
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    /* best effort */
  }
}

export async function removeCustomWallpaper(id: string): Promise<void> {
  try {
    writeCustomWallpapersLocal(readCustomWallpapersLocal().filter((w) => w.id !== id));
  } catch {
    /* best effort */
  }
  try {
    const db = await openCustomDb();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(CUSTOM_STORE, "readwrite");
      tx.objectStore(CUSTOM_STORE).delete(id);
      tx.oncomplete = () => resolve();
      tx.onabort = () => { customDbPromise = null; resolve(); };
      tx.onerror = () => { customDbPromise = null; resolve(); };
    });
  } catch {
    /* best effort */
  }
}

type ColorGroup = "all" | "dark" | "gray" | "red" | "orange" | "yellow" | "green" | "cyan" | "blue" | "purple" | "pink";
type PaletteGroup = Exclude<ColorGroup, "all">;

const COLOR_GROUPS: PaletteGroup[] = ["dark", "gray", "red", "orange", "yellow", "green", "cyan", "blue", "purple", "pink"];

const COLOR_CHIPS: Record<PaletteGroup, { color: string }> = {
  dark: { color: "#0e1626" },
  gray: { color: "#9aa8bc" },
  red: { color: "#ff6b6b" },
  orange: { color: "#ffa94d" },
  yellow: { color: "#ffd43b" },
  green: { color: "#51cf66" },
  cyan: { color: "#8de6ff" },
  blue: { color: "#4dabf7" },
  purple: { color: "#b197fc" },
  pink: { color: "#faa2c1" },
};

const GAP = 4;

function keywordGroup(p: PickerWallpaper): ColorGroup {
  const hay = `${p.name} ${p.category ?? ""}`.toLowerCase();
  if (/(dark|black|void|moon|night|shadow|space|king|angel|silk|holiday|fireplace|curtains|blooming|hollow)/.test(hay)) return "dark";
  if (/(green|forest|field|leaf|aurora)/.test(hay)) return "green";
  if (/(fire|sunset|sunrise|orange|lantern|burn|flame|warm|fiery)/.test(hay)) return "orange";
  if (/(red|crimson|blood|devil|skull|skeleton|falling)/.test(hay)) return "red";
  if (/(pink|bloom|romance|sakura)/.test(hay)) return "pink";
  if (/(purple|violet|magenta)/.test(hay)) return "purple";
  if (/(yellow|gold|desert)/.test(hay)) return "yellow";
  if (/(cyan|teal|neon|synthwave|aqua|aquarium|black-silk)/.test(hay)) return "cyan";
  if (/(city|rain|blue|sky|ocean|glacier|winter|galaxy|celestial|snow|water|river|northern|panels|crystal)/.test(hay)) return "blue";
  return "gray";
}

function MediaTile({ p }: { p: PickerWallpaper }) {
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const showFail = () => { setReady(true); setFailed(true); };
  const markReady = () => setReady(true);
  if (p.video) {
    const playSrc = p.videoLow ?? p.video;
    return (
      <>
        {!ready ? <div className="wp-skeleton" aria-hidden="true" /> : null}
        {failed ? (
          <div className="wp-no-preview"><Film size={18} /></div>
        ) : (
          <video
            className="wp-media"
            src={playSrc}
            muted
            loop
            playsInline
            autoPlay
            preload="metadata"
            onLoadedData={markReady}
            onPlaying={markReady}
            onError={showFail}
          />
        )}
      </>
    );
  }
  return (
    <>
      {!ready ? <div className="wp-skeleton" aria-hidden="true" /> : null}
      {failed ? (
        <div className="wp-no-preview"><Film size={18} /></div>
      ) : (
        <img
          className="wp-media"
          src={p.image}
          alt=""
          loading={active ? "eager" : "lazy"}
          draggable={false}
          onLoad={markReady}
          onError={showFail}
        />
      )}
    </>
  );
}

function WallpaperPreview({ wp, applied, onClose, onApply }: {
  wp: PickerWallpaper;
  applied: boolean;
  onClose: () => void;
  onApply: (id: string) => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="wp-preview" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="wp-preview-card">
        <div className="wp-preview-media">
          {wp.video ? (
            <video src={wp.videoLow ?? wp.video} autoPlay muted loop playsInline preload="metadata" />
          ) : (
            <img src={wp.image} alt="" draggable={false} />
          )}
        </div>
        <div className="wp-preview-meta">
          <span className="wp-preview-name">{wp.name}</span>
          {wp.category ? <span className="wp-preview-cat">{wp.category}</span> : null}
        </div>
        <div className="wp-preview-actions">
          {applied ? (
            <span className="wp-preview-tag"><Check size={12} /> {t("we.inUse")}</span>
          ) : (
            <button className="wp-preview-apply" onClick={() => onApply(wp.id)}><Check size={12} /> {t("we.apply")}</button>
          )}
          <button className="wp-preview-close" onClick={onClose} aria-label={t("wm.close")}><X size={14} /> {t("wm.close")}</button>
        </div>
      </div>
    </div>
  );
}

function computeGeo(stageW: number) {
  const countVisible = stageW < 860 ? 5 : 7;
  const available = stageW - (countVisible - 1) * GAP;
  const tileW = Math.max(110, Math.floor(available / countVisible));
  const tileH = Math.round((tileW * 9) / 16);
  const step = tileW + GAP;
  return {
    countVisible,
    tileW,
    tileH,
    step,
    stageH: tileH + 54,
    center: Math.max(0, (stageW - tileW) / 2),
  };
}

export function WallpaperPicker({ entries, appliedId, onApply, onClose, onCustomAdd, onCustomRemove }: {
  entries: PickerWallpaper[];
  appliedId: string | null;
  onApply: (id: string) => void;
  onClose: () => void;
  onCustomAdd: (wp: PickerWallpaper) => void;
  onCustomRemove: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [color, setColor] = useState<ColorGroup>("all");
  const [geo, setGeo] = useState(() => computeGeo(Math.min(window.innerWidth * 0.96, 1080)));
  const [sel, setSel] = useState(0);
  const [preview, setPreview] = useState<PickerWallpaper | null>(null);
  const [urlMode, setUrlMode] = useState(false);
  const [urlValue, setUrlValue] = useState("");

  const stageRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const rafId = useRef(0);
  const geoRef = useRef(geo);
  const contentX = useRef(0);
  const targetX = useRef(0);
  const visualSel = useRef(0);
  const targetSel = useRef(0);
  const wheelAcc = useRef(0);
  const dragState = useRef<{ x: number; baseX: number; moved: boolean; captured: boolean } | null>(null);
  const callbacksRef = useRef({ onApply, onClose, onCustomAdd, onCustomRemove });
  const previewRef = useRef<PickerWallpaper | null>(null);
  callbacksRef.current = { onApply, onClose, onCustomAdd, onCustomRemove };
  previewRef.current = preview;

  const pickFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    for (const file of files) {
      const isVideo = file.type.startsWith("video/");
      if (!isVideo && !file.type.startsWith("image/")) continue;
      const base = file.name.replace(/\.[^.]+$/, "").trim() || "Custom";
      const id = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      if (isVideo) {
        const url = URL.createObjectURL(file);
        callbacksRef.current.onCustomAdd({ id, name: base, blob: file, video: url });
        continue;
      }
      try {
        const image = await fileToDataUrl(file);
        callbacksRef.current.onCustomAdd({ id, name: base, image });
      } catch {
        const url = URL.createObjectURL(file);
        callbacksRef.current.onCustomAdd({ id, name: base, image: url });
      }
    }
    e.target.value = "";
  };

  const addUrl = () => {
    const raw = urlValue.trim();
    if (!raw) return;
    try {
      const u = new URL(raw);
      const isVideo = /\.(mp4|webm|ogg|mov|m4v)(?:$|[?#])/i.test(u.href);
      const name = decodeURIComponent(u.pathname.split("/").pop() ?? "").replace(/\.[^.]+$/, "").trim() || "Custom URL";
      const id = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      if (!isVideo) {
        void urlToDataUrl(raw).then((img) =>
          callbacksRef.current.onCustomAdd({ id, name, image: img || raw }),
        );
      } else {
        callbacksRef.current.onCustomAdd({ id, name, video: raw });
      }
      setUrlValue("");
      setUrlMode(false);
    } catch {
      /* invalid URL — ignore */
    }
  };

  const q = query.trim().toLowerCase();
  const visible = useMemo(
    () => entries.filter((e) => {
      if (q && !`${e.name} ${e.category ?? ""}`.toLowerCase().includes(q)) return false;
      if (color !== "all" && keywordGroup(e) !== color) return false;
      return true;
    }),
    [entries, q, color],
  );
  const listRef = useRef(visible);
  listRef.current = visible;

  const counts = useMemo(() => {
    const map: Partial<Record<ColorGroup, number>> = { all: entries.length };
    for (const e of entries) {
      const g = keywordGroup(e);
      map[g] = (map[g] ?? 0) + 1;
    }
    return map as Record<ColorGroup, number>;
  }, [entries]);

  const ensureAnim = useMemo(() => () => {
    if (rafId.current) return;
    rafId.current = requestAnimationFrame(() => paint());
  }, []);

  const wrap = useMemo(() => () => {
    const n = listRef.current.length;
    if (!n) return;
    const step = geoRef.current.step;
    while (targetSel.current >= n) {
      targetSel.current -= n;
      targetX.current += step * n;
      visualSel.current -= n;
    }
    while (targetSel.current < 0) {
      targetSel.current += n;
      targetX.current -= step * n;
      visualSel.current += n;
    }
  }, []);

  const moveBy = useMemo(() => (d: number) => {
    const n = listRef.current.length;
    if (!n) return;
    targetSel.current += d;
    targetX.current -= d * geoRef.current.step;
    wrap();
    setSel(Math.round(targetSel.current));
    ensureAnim();
  }, [wrap, ensureAnim]);

  const goTo = useMemo(() => (i: number) => {
    const n = listRef.current.length;
    if (!n) return;
    const g = geoRef.current;
    targetSel.current = ((i % n) + n) % n;
    targetX.current = g.center - targetSel.current * g.step;
    setSel(Math.round(targetSel.current));
    ensureAnim();
  }, [ensureAnim]);

  function paint() {
    const g = geoRef.current;
    contentX.current += (targetX.current - contentX.current) * 0.16;
    visualSel.current += (targetSel.current - visualSel.current) * 0.2;
    const dx = targetX.current - contentX.current;
    const ds = targetSel.current - visualSel.current;
    const contentEl = contentRef.current;
    if (contentEl) {
      contentEl.style.transform = `translate3d(${contentX.current.toFixed(2)}px,0,0)`;
      const children = contentEl.children;
      for (let i = 0; i < children.length; i += 1) {
        const slot = children[i] as HTMLElement;
        if (!slot.classList.contains("wp-slot")) continue;
        const idx = Number(slot.getAttribute("data-idx"));
        if (!Number.isFinite(idx)) continue;
        const card = slot.firstElementChild as HTMLElement | null;
        if (!card) continue;
        const d = visualSel.current - idx;
        const ad = Math.abs(d);
        const falloff = Math.max(0, 1 - ad / (g.countVisible * 0.6));
        const skew = (d > 0 ? 1 : -1) * Math.min(12, Math.abs(d) * 11) * falloff;
        const sx = 0.9 + 0.26 * falloff;
        const sy = 0.9 + 0.16 * falloff;
        card.style.transform = `skewY(${skew.toFixed(2)}deg) scale(${sx.toFixed(3)}, ${sy.toFixed(3)}) translateZ(0)`;
        card.style.opacity = (0.45 + 0.55 * falloff).toFixed(3);
        card.style.zIndex = String(10 + Math.round(falloff * 10));
      }
    }
    if (Math.abs(dx) < 0.5 && Math.abs(ds) < 0.005) {
      rafId.current = 0;
      return;
    }
    rafId.current = requestAnimationFrame(() => paint());
  }

  useEffect(() => {
    geoRef.current = geo;
  }, [geo]);

  useEffect(() => {
    const stage = stageRef.current;
    const measure = () => {
      const w = stage ? stage.clientWidth : Math.min(window.innerWidth * 0.96, 1080);
      const next = computeGeo(Math.max(320, w));
      geoRef.current = next;
      targetX.current = next.center - targetSel.current * next.step;
      setGeo(next);
      ensureAnim();
    };
    measure();
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("resize", measure);
      if (rafId.current) cancelAnimationFrame(rafId.current);
      rafId.current = 0;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const n = listRef.current.length;
    if (!n) {
      if (rafId.current) cancelAnimationFrame(rafId.current);
      rafId.current = 0;
      return;
    }
    let start = listRef.current.findIndex((e) => e.id === appliedId);
    if (start < 0) start = 0;
    const g = geoRef.current;
    targetSel.current = start;
    visualSel.current = start;
    contentX.current = g.center - start * g.step;
    targetX.current = contentX.current;
    setSel(start);
    ensureAnim();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, color]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const primary = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      wheelAcc.current += primary;
      const TH = 42;
      while (wheelAcc.current >= TH) { wheelAcc.current -= TH; moveBy(1); }
      while (wheelAcc.current <= -TH) { wheelAcc.current += TH; moveBy(-1); }
    };
    stage.addEventListener("wheel", onWheel, { passive: false });
    return () => stage.removeEventListener("wheel", onWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (previewRef.current) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag && ["INPUT", "TEXTAREA", "SELECT"].includes(tag)) return;
      if (e.key === "Escape") {
        e.preventDefault();
        callbacksRef.current.onClose();
        return;
      }
      switch (e.key) {
        case "ArrowRight":
        case "j":
          e.preventDefault();
          moveBy(1);
          break;
        case "ArrowLeft":
        case "k":
          e.preventDefault();
          moveBy(-1);
          break;
        case "d":
          e.preventDefault();
          moveBy(12);
          break;
        case "u":
          e.preventDefault();
          moveBy(-12);
          break;
        case "Enter":
        case " ": {
          e.preventDefault();
          const n = listRef.current.length;
          if (!n) break;
          const item = listRef.current[(Math.round(targetSel.current) + n) % n];
          if (item) callbacksRef.current.onApply(item.id);
          break;
        }
        default:
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    dragState.current = { x: e.clientX, baseX: contentX.current, moved: false, captured: false };
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const st = dragState.current;
    if (!st) return;
    const total = e.clientX - st.x;
    if (Math.abs(total) > 6) {
      st.moved = true;
      if (!st.captured) {
        st.captured = true;
        try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* ignore */ }
      }
    }
    const next = st.baseX + total;
    contentX.current = next;
    targetX.current = next;
    ensureAnim();
  };

  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    const st = dragState.current;
    if (!st) return;
    dragState.current = null;
    if (st.captured) {
      try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
    }
    if (!st.moved) return;
    const total = e.clientX - st.x;
    const delta = -Math.round(total / geoRef.current.step);
    moveBy(delta);
  };

  const handleFilter = (next: ColorGroup) => {
    wheelAcc.current = 0;
    setColor(next);
  };

  const empty = visible.length === 0;
  const roundSel = Math.round(sel);
  const selClamp = Math.max(0, Math.min(roundSel, visible.length - 1));
  const margin = geo.countVisible + 2;
  const winFrom = Math.max(0, selClamp - margin);
  const winTo = Math.min(visible.length, selClamp + margin + 1);
  const slotTop = Math.floor((geo.stageH - geo.tileH) / 2);

  const closePreview = () => setPreview(null);

  return (
    <>
      <div
      className="wp-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) callbacksRef.current.onClose(); }}
    >
      <div className="wp-panel" role="dialog" aria-modal="true" aria-label={t("wp.title")}>
        <header className="wp-head">
          <div className="wp-title">
            <span className="wp-kicker">{t("wp.kicker")}</span>
            <h2>{t("wp.title")}</h2>
          </div>
          <div className="wp-search">
            <Search size={14} />
            <input
              value={query}
              onChange={(e) => { setQuery(e.target.value); wheelAcc.current = 0; }}
              placeholder={t("we.searchWorkshop")}
              aria-label={t("we.searchWorkshop")}
            />
          </div>
          <button className="wp-add" onClick={() => fileInputRef.current?.click()} aria-label={t("wp.add")} title={t("wp.add")}>
            <Plus size={16} />
          </button>
          <button className={`wp-add wp-url-toggle ${urlMode ? "on" : ""}`} onClick={() => setUrlMode((v) => !v)} aria-label={t("wp.url")} title={t("wp.url")}>
            <Link size={16} />
          </button>
          <button className="wp-close" onClick={() => callbacksRef.current.onClose()} aria-label={t("wm.close")}>
            <X size={18} />
          </button>
          <input ref={fileInputRef} className="wp-file" type="file" accept="video/*,image/*" multiple onChange={pickFiles} />
        </header>

        {urlMode ? (
          <div className="wp-url-row">
            <input
              className="wp-url-input"
              value={urlValue}
              onChange={(e) => setUrlValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") addUrl(); if (e.key === "Escape") { setUrlMode(false); setUrlValue(""); } }}
              placeholder="https://…"
              spellCheck={false}
              autoFocus
              aria-label={t("wp.url")}
            />
            <button className="wp-url-submit" onClick={addUrl} aria-label={t("wp.add")} title={t("wp.add")}>
              <Check size={14} />
            </button>
            <button className="wp-url-cancel" onClick={() => { setUrlMode(false); setUrlValue(""); }} aria-label={t("wm.close")}>
              <X size={13} />
            </button>
          </div>
        ) : null}

        <div className="wp-filters" role="tablist" aria-label={t("wp.filterAria")}>
          <button
            className={`wp-chip ${color === "all" ? "active" : ""}`}
            onClick={() => handleFilter("all")}
          >
            <span className="wp-dot wp-dot-all" />
            {t("we.all")}
            <em>{counts.all}</em>
          </button>
          {COLOR_GROUPS.map((g) => {
            const count = counts[g] ?? 0;
            if (!count) return null;
            return (
              <button
                key={g}
                className={`wp-chip ${color === g ? "active" : ""}`}
                onClick={() => handleFilter(g)}
              >
                <span className="wp-dot" style={{ background: COLOR_CHIPS[g].color }} />
                {t(`wp.c.${g}`)}
                <em>{count}</em>
              </button>
            );
          })}
          {(color !== "all" || q) ? (
            <button
              className="wp-clear"
              onClick={() => { setQuery(""); setColor("all"); wheelAcc.current = 0; }}
            >
              <RotateCcw size={12} />
              {t("wp.clear")}
            </button>
          ) : null}
        </div>

        <div
          className="wp-stage"
          ref={stageRef}
          style={{ height: geo.stageH }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {empty ? <div className="wp-empty">{t("wp.empty")}</div> : null}
          <div className="wp-content" ref={contentRef}>
            {winFrom > 0 ? <div className="wp-slot-spacer" style={{ width: winFrom * geo.step }} /> : null}
            {visible.slice(winFrom, winTo).map((p, k) => {
              const fullIdx = winFrom + k;
              const live = fullIdx === roundSel;
              const applied = appliedId === p.id;
              return (
                <div
                  key={p.id}
                  className="wp-slot"
                  data-idx={fullIdx}
                  style={{
                    width: geo.tileW,
                    left: fullIdx * geo.step,
                    top: slotTop,
                  }}
                >
                  <button
                    className={`wp-card ${applied ? "applied" : ""}`}
                    style={{ width: geo.tileW, height: geo.tileH }}
                    onClick={() => {
                      goTo(fullIdx);
                      callbacksRef.current.onApply(p.id);
                    }}
                    aria-label={p.name}
                    title={p.name}
                  >
                    <MediaTile p={p} />
                    {applied ? <span className="wp-badge" title={t("we.inUse")}><Check size={12} /></span> : null}
                  </button>
                  <button
                    className={`wp-preview-btn ${live ? "on" : ""}`}
                    onClick={(e) => { e.stopPropagation(); setPreview(p); }}
                    aria-label={t("wp.preview")}
                    title={t("wp.preview")}
                  >
                    <Maximize2 size={13} />
                  </button>
                  {p.id.startsWith("custom-") ? (
                    <button
                      className="wp-remove-btn"
                      onClick={(e) => { e.stopPropagation(); callbacksRef.current.onCustomRemove(p.id); }}
                      aria-label={t("wp.remove")}
                      title={t("wp.remove")}
                    >
                      <Trash2 size={12} />
                    </button>
                  ) : null}
                  {live ? <div className="wp-caption">{p.name}</div> : null}
                </div>
              );
            })}
            {winTo < visible.length ? <div className="wp-slot-spacer" style={{ width: (visible.length - winTo) * geo.step }} /> : null}
          </div>
        </div>

        <footer className="wp-foot">
          <div className="wp-auto">
            <span className="wp-auto-badge">1080P</span>
            <span className="wp-res-note">custom images auto-saved at max 1080P</span>
          </div>
          <div className="wp-keys">
            <span>J/K</span>
            <span>D/U</span>
            <span>↵ {t("we.apply").toLowerCase()}</span>
            <span>Esc</span>
          </div>
          <div className="wp-hint">{t("wp.hint")}</div>
          <div className="wp-count">
            {visible.length} / {entries.length}
          </div>
        </footer>
      </div>
    </div>

      {preview ? (
        <WallpaperPreview
          wp={preview}
          applied={appliedId === preview.id}
          onClose={closePreview}
          onApply={(id) => { closePreview(); callbacksRef.current.onApply(id); }}
        />
      ) : null}
    </>
  );
}