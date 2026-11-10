import { Component, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode, MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowLeft, ArrowRight, BadgeCheck, CalendarClock, Check, ChevronDown, ChevronRight, ChevronUp, CircleHelp,
  Code2, Compass, Cpu, Download, Eye, Gamepad2, Grid2X2,
  Image, LayoutGrid, LockKeyhole, Menu, MessageCircle, Minus, MonitorCog, Music2,
  Palette, Pin, PinOff, Play, Power, Puzzle, Radio, Rocket, RotateCcw,
  Settings2, ShieldBan, SlidersHorizontal, Search, Sparkles, Terminal, Volume2, VolumeX, Waves, X, Pause, Maximize, Maximize2, Minimize2, House, Plus, Package, EyeOff, ExternalLink, Contrast, Calculator, ImagePlus,
  Shuffle, Repeat, Clock, ListVideo, Trash2, Link2, User, Languages, Info, Monitor, Paintbrush, SunMoon, Cloud, FileDown, Clapperboard,
  Bot, PlaySquare, Film,
} from "lucide-react";


import { Ps5EmulatorSurface } from "./components/ps5-emulator";
import { VerAiSurface } from "./components/ver-ai";
import { JarvisSurface } from "./components/jarvis-ai";
import { BrowserSurface, ProxyUrlFrame } from "./components/browser-app";
import { VertexStudioWallpaper } from "./components/vertex-wallpaper";
import { HalloweenDecor, HalloweenWallpaper } from "./components/halloween";

import { LockAppsLayer, recordRecentApp } from "./components/lock-apps";
import { AdminSurface } from "./components/admin-app";
import { startAnalytics, trackEvent } from "./analytics";
import { MessagesSurface } from "./messages";
import { MC_REALMS, type McRealm } from "./mcrealms";
import { LANG, LANGS, t, tf, tp, readLang, saveLang, localeOf, type Lang } from "./i18n";
import { WallpaperPicker, type PickerWallpaper, loadCustomWallpapers, persistCustomWallpaper, removeCustomWallpaper, readCustomWallpapersLocal } from "./components/wallpaper-picker";
import { SystemTray } from "./components/system-tray";
import { MacMenuBar } from "./components/mac-menubar";

import { LinksApp } from "./components/links-app";
import { assetUrl } from "./asset-map";
import { VStudiosSurface } from "./v-market";

import { TerminalBanner } from "./terminal/TerminalBanner";
import { ansiToNodes } from "./terminal/ansi";
import { CUSTOM_BANNER_ID, CUSTOM_PALETTE_ID, TERMINAL_BANNERS, TERMINAL_PALETTES, getBanner, getPalette, normalizeHex, type TerminalPalette } from "./terminal/banners";
import { DEFAULT_TERMINAL_CONFIG, TERMINAL_CURSORS, TERMINAL_FONTS, readTerminalConfig, terminalCssVars, terminalHasWallpaper, writeTerminalConfig, type TerminalConfig } from "./terminal/config";
import { PERF } from "./perf";
import { GhostPayloadCard, GhostViewSurface, captureScreenHtml, ghostDeliver, ghostExecute, ghostProbe, ghostSetSnapGetter, ghostSetStatus, ghostStop, ghostUiStore, snapSig, startGhostView, useGhostViewUi, type GvIncoming, type GvSnap, type GvWindow } from "./ghostview";
import { getMediaSession, setMediaSession, notifyMediaSession, subscribeMediaSession, type MediaSession } from "./now-playing";
const base = import.meta.env.BASE_URL.endsWith("/") ? import.meta.env.BASE_URL : `${import.meta.env.BASE_URL}/`;
const asset = (path: string) => assetUrl(base, path);
const MCC_LOGO_URL = "https://raw.githubusercontent.com/Patrickmango49/McCrack/refs/heads/main/assets/icons/favicon.png";
const isGitHubPages = import.meta.env.BASE_URL.startsWith("/vertexosweb");
type WallpaperId = "vertex-studio" | "halloween" | "macos-default" | "macos-lock" | "singularity" | "snake-skeleton" | "snow-fox" | "cine55" | "gojo" | "rainy-city" | "green-anime" | "brother" | "99-med" | "gojo-sukuna" | "sukuna-fire" | "desktop-lines" | "skello" | "we-black-hole" | "we-snow-fox" | "we-gojo-sukuna" | "we-sukuna-fire" | "we-cine-55" | "we-snake" | "we-green-anime" | "we-brother" | "we-gojo" | "we-rainy-city" | "we-desktop-lines" | "we-skello" | "we-99-med" | "we-45e33" | "we-f1-formula" | "we-hunt-shadow-2" | "we-minecraft-01" | "we-minecraft-02" | "we-minecraft-03" | "we-monkey" | "we-supra-drift" | "we-yuji-52" | "we-cozy-fox" | "we-yuta" | "we-bmw-car-driving" | "we-eyes-toward-heaven" | "we-goku-ultra" | "we-galaxy-eyes" | "we-celestial-battle" | "we-tess-kotkin" | "we-yuta-rika" | "we-satoru-gojo" | "we-dark-angel" | "we-makima-devilish" | "we-makima-burning" | "we-haimiya-mio" | "we-toji" | "we-mamonir" | "we-lantern-festival" | "we-miyabi" | "we-qingxiao" | "we-megumin" | "we-odette" | "we-blue-sky" | "we-frutiger" | "we-synthwave-dmc" | "we-zankou" | "we-ghost-rider" | "we-molala" | "we-dark-king" | "we-celestial-veil" | "we-miku-nakano" | "we-gotoubun" | "we-quintuplets" | "we-black-silk-waves" | "we-blue-dragon-logo" | "we-astra-yao" | "we-luo-tianyi-christmas" | "we-mc-northern-light" | "we-mc-falling-snow" | "we-mc-aquarium" | "we-mc-holiday-heart" | "we-mc-fireplace" | "we-mc-panels" | "we-mc-cherry-blossom" | "we-mc-raindrops" | "we-silver-surfer" | "we-girl-behind-curtains" | "we-vagabond-miyamoto" | "we-itachi-crow" | "we-gojo-hollow" | "we-quintuplets-sister" | "we-yuta-okkotsu" | "we-gojo-vs-sukuna-2" | "we-gojo-cursed-world" | "we-gojo-six-eyes" | "we-frieren-blue-horizon" | "we-frieren-blooming-stream" | "we-nissan-skyline-r33-mc" | "we-torii";
type AppId = "hub" | "spicetify" | "browser" | "pizza" | "roblox" | "messages" | "verai" | "jarvis" | "vertube" | "movies" | "settings" | "games" | "translucenttb" | "wallpaper-engine" | "minecraft" | "rainmeter" | "terminal" | "calculator" | "ghostview" | "links" | "discord" | "vcloud" | "admin" | "appmaker" | string & {};
type Ps5DesktopShortcut = { id: string; name: string; cover: string };
type TaskbarPos = "bottom" | "top" | "left" | "right";
type WindowRect = { x: number; y: number; w: number; h: number };
type WindowState = { id: AppId; minimized: boolean; maximized: boolean; rect: WindowRect; prevRect: WindowRect | null; closingAt?: number };
type Wallpaper = { id: WallpaperId; name: string; meta: string; video?: string; image?: string; videoLow?: string };
type ColorMode = "dark" | "light";
type SystemStyle = "vertex" | "macos";
type TabHideImage = { id: string; name: string; src: string };
type SystemSettings = { optimized: boolean; fastBoot: boolean; idleLock: boolean; confirm: boolean; cloak: string; cloakName: string; cloakIcon: string; panicKey: string; panicUrl: string; adblock: boolean; adblockUrl: string; deviceName: string; colorMode: ColorMode; systemStyle: SystemStyle; fontStyle: string; tabHide: boolean; tabHideImage: string; tabHideImages: TabHideImage[] };
const defaultSettings: SystemSettings = { optimized: false, fastBoot: false, idleLock: false, confirm: false, cloak: "none", cloakName: "McCrack-COS", cloakIcon: "", panicKey: "`", panicUrl: "", adblock: false, adblockUrl: "", deviceName: "McCrack-PC", colorMode: "dark", systemStyle: "vertex", fontStyle: "vertex", tabHide: false, tabHideImage: "iready", tabHideImages: [{ id: "black", name: "Black screen", src: "black" }, { id: "white", name: "White screen", src: "white" }, { id: "iready", name: "I-Ready", src: asset("images/tabhide-iready.png") }, { id: "classroom", name: "Google Classroom", src: asset("images/tabhide-classroom.png") }] };
const AVATAR_MAX_GIF = 2 * 1024 * 1024;
const AVATAR_MAX_PIX = 512;
const PASSWORD_KEY = "vertex-password";
const PROFILE_KEY = "vertex-profile";
const ACCOUNTS_KEY = "vertex-accounts";
const VERTEX_VERSION = "4.1";
const HALLOWEEN_ACTIVE = new Date().getMonth() === 9;
const SEASON_WALLPAPER: WallpaperId = HALLOWEEN_ACTIVE ? "halloween" : "vertex-studio";

type VertexAccount = { id: string; name: string; createdAt: number; pass?: string; avatar?: string; email?: string };

function avatarFromFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const isGif = /image\/gif/.test(file.type);
    const isPng = /image\/png/.test(file.type);
    if (isGif && file.size <= AVATAR_MAX_GIF) {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result ?? ""));
      r.onerror = () => reject(new Error("Couldn't read your GIF."));
      r.readAsDataURL(file);
      return;
    }
    if (!/image\//.test(file.type)) { reject(new Error("Pick an image or GIF file.")); return; }
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      const scale = Math.min(1, AVATAR_MAX_PIX / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) { URL.revokeObjectURL(url); reject(new Error("Canvas unavailable.")); return; }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL(isPng ? "image/png" : "image/jpeg", 0.86));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Not a valid image.")); };
    img.src = url;
  });
}

function readAccounts(): VertexAccount[] {
  try {
    const raw = storage.read<string>(ACCOUNTS_KEY, "");
    if (raw) {
      const list = JSON.parse(raw);
      if (Array.isArray(list)) {
        return list
          .filter((a) => a && typeof a.name === "string" && a.name.trim())
          .map((a) => ({
            id: typeof a.id === "string" && a.id ? a.id : `a${Math.random().toString(36).slice(2, 9)}`,
            name: a.name.trim(),
            createdAt: Number(a.createdAt) || 0,
            pass: typeof a.pass === "string" ? a.pass : "",
            avatar: typeof a.avatar === "string" ? a.avatar : "",
          })) as VertexAccount[];
      }
    }
  } catch { /* fall through to legacy migration */ }
  try {
    const legacyRaw = storage.read<string>(PROFILE_KEY, "");
    const legacyName = legacyRaw ? ((JSON.parse(legacyRaw) as { name?: string }).name ?? "") : "";
    if (typeof legacyName === "string" && legacyName.trim()) {
      const legacyPass = storage.read<string>(PASSWORD_KEY, "");
      const account: VertexAccount = { id: "legacy", name: legacyName.trim(), createdAt: Date.now(), pass: legacyPass || "" };
      storage.write(ACCOUNTS_KEY, JSON.stringify([account]));
      storage.remove(PROFILE_KEY);
      storage.remove(PASSWORD_KEY);
      return [account];
    }
  } catch { /* ignore */ }
  return [];
}

const DROP_GRID_COLS = 8;
const DROP_CELL_W = 94;
const DROP_CELL_H = 104;

function defaultWindowRect(index: number): WindowRect {
  const vw = typeof window !== "undefined" ? window.innerWidth : 1280;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const w = Math.min(vw - 32, Math.max(420, Math.round(vw * 0.72)));
  const h = Math.min(vh - 92, Math.max(320, Math.round(vh * 0.72)));
  const cascade = index % 6;
  const x = Math.max(6, Math.round((vw - w) / 2) + cascade * 26);
  const y = Math.max(6, Math.round((vh - h) / 2.3) + cascade * 20);
  return { x, y, w, h };
}

function ghostTypeCtrl(text: string) {
  const term = document.querySelector<HTMLInputElement>(".term-input");
  const el = (term ?? document.activeElement) as HTMLInputElement | HTMLTextAreaElement | HTMLElement | null;
  if (!el) return;
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    el.focus();
    const set = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), "value")?.set;
    if (set) { set.call(el, (el.value ?? "") + text); } else { el.value += text; }
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  } else if (el.isContentEditable) {
    el.focus();
    el.textContent = (el.textContent ?? "") + text;
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }
}

function ghostKeyCtrl(key: string) {
  const term = document.querySelector<HTMLInputElement>(".term-input");
  const el = (term ?? document.activeElement) as HTMLInputElement | HTMLElement | null;
  if (!el) return;
  const isText = el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el.isContentEditable;
  if (key === "Backspace" && isText) {
    let cur = el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement ? el.value : (el.textContent ?? "");
    cur = cur.slice(0, -1);
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
      const set = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), "value")?.set;
      if (set) { set.call(el, cur); } else { el.value = cur; }
      el.dispatchEvent(new Event("input", { bubbles: true }));
    } else {
      el.textContent = cur;
      el.dispatchEvent(new Event("input", { bubbles: true }));
    }
  } else {
    el.dispatchEvent(new KeyboardEvent("keydown", { key, code: key, bubbles: true, cancelable: true }));
    el.dispatchEvent(new KeyboardEvent("keyup", { key, code: key, bubbles: true }));
  }
}

function ghostEnterCtrl() {
  const term = document.querySelector<HTMLInputElement>(".term-input");
  const el = (term ?? document.activeElement) as HTMLElement | null;
  if (!el) return;
  el.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", code: "Enter", bubbles: true, cancelable: true }));
  el.dispatchEvent(new KeyboardEvent("keyup", { key: "Enter", code: "Enter", bubbles: true }));
}

const screenHighRes = typeof window !== "undefined" && window.devicePixelRatio * window.innerWidth >= 3200;
const nativeVideoQualified = !PERF.low && screenHighRes;
const bgSrc = (nativeV?: string, lowV?: string) => (!nativeV ? undefined : lowV && !nativeVideoQualified ? lowV : nativeV);
const pvSrc = (nativeV?: string, lowV?: string) => (!nativeV ? undefined : lowV ?? nativeV);

const BOOT_INTRO_SRC = "https://cineosweb.github.io/Videos/Boot.mp4";

const CLOAKS: Record<string, { title: string; icon: string }> = {
  none: { title: "McCrack-COS", icon: MCC_LOGO_URL },
  google: {
    title: "Google",
    icon: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAMAAABEpIrGAAAA5FBMVEVHcEz9SlD/TkL/RUH/RUD/RkP4gyr/SUX/Rj//SE3/Yjb/UDn/Szz9TFb/Yi7/WTT8TVn/cyf/Zi7/iRz/fSL/lRb/SEjeuwX/qQ7/nhP/tgv9TFX6yQj/wwn/zAffugr8zgb+zwnzzQb4ywkvhv82qo79zgQek+ApjurzzAPlywIvhv0qifjRyQEth/y5yAKnxwAoivaMxQUak94fj+hzxAtawxdawhgLpa4OncYVltc8wCobvFIMuWgHqp0KorWaxQEnvz4bvUwPumUNumQMumgIr4wIqaIRvFoNu2MKtnRJwh6BPIl6AAAATHRSTlMAWZDK7P8Orf//Gv///+b/5P7////4dor///8qmP/9K0j/tu7/DeYwRP//HWr/rv///v/b///+HMT///+XTvD/5f//yGzw///////mXfQ9oAAAAWBJREFUeAF0z1UCgCAQRdEZ7O7u/W9STPr93oMCcENi2Y5jWwRBM9fz7zl0QeCFcidRHLMeJAkRj6dZdom/0+Uu62FRlpcQQILsfFVfIrqE/wPWoWleEXstYutdgO9dP9wi++/VCt0dx0dwL5u4DvNyiaFywbB1WS6ymfp+rJSMM5g2H7fYjOCsi5wOIAiCKNhRnG1bazv/fG7erFW/VcNezFEsKWVVZk2bOVi0BVuawE9GbcGOJrxoD3DEZD5ZtAcLdsX9vvWSW/ZM5g+H7JnHhFMcsI+CPpwXVOGSBsT8+Xy9VX5qfQerC77yDP94rEvB8/VCscO4z1f49+db8D9BFJEQ6N64/0hyqhVV03hxIo7+eMNLhmnZimLLjut6msCKZ3qhR+wN0/f9IAjD0PV4kV3rW/QoXF5sC4+KcEAShMkWzBeQ+QaFLX5rKrOWzcQjsHbUgCJbThA4lmwXVv8BPaBVEHC66TMAAAAASUVORK5CYII=",
  },
  classroom: { title: "Google Classroom", icon: "https://www.gstatic.com/classroom/logo_square_rounded.svg" },
};

const wallpapers: Wallpaper[] = [
  { id: "vertex-studio", name: "McCrack Studios", meta: "Animated · McCrack-COS", image: asset("images/vertex-studios-thumb.svg") },
  { id: "halloween", name: "Halloween Night", meta: "Animated · Spooky", image: asset("images/halloween-thumb.svg") },
  { id: "macos-default", name: "macOS 27", meta: "macOS · Default", image: asset("images/macos-27-home.jpg") },
  { id: "macos-lock", name: "macOS 27 Night", meta: "macOS · Lock screen", image: asset("images/macos-27-lock.jpg") },
  { id: "singularity", name: "Singularity", meta: t("wpMeta.singularity"), video: asset("videos/BlackHole.mp4"), videoLow: asset("videos/low/BlackHole.mp4") },
  { id: "snake-skeleton", name: "Snake Skeleton", meta: t("wpMeta.snake"), video: asset("videos/default.mp4"), videoLow: asset("videos/low/default.mp4") },
  { id: "snow-fox", name: "Snow Fox", meta: t("wpMeta.snow"), video: asset("videos/SnowFox.mp4") },
  { id: "cine55", name: "Cine 55", meta: t("wpMeta.cine55"), image: asset("wallpapers/Cine55.png") },
  { id: "gojo", name: "Gojo", meta: t("wpMeta.gojo"), video: asset("videos/Gojo.mp4"), videoLow: asset("videos/low/Gojo.mp4") },
  { id: "rainy-city", name: "Rainy City", meta: t("wpMeta.rainy"), video: asset("videos/RainyCity.mp4"), videoLow: asset("videos/low/RainyCity.mp4") },
  { id: "green-anime", name: "Green Anime", meta: t("wpMeta.green"), video: asset("videos/green.mp4"), videoLow: asset("videos/low/green.mp4") },
  { id: "brother", name: "Brother", meta: t("wpMeta.brother"), video: asset("videos/Brother.mp4"), videoLow: asset("videos/low/Brother.mp4") },
  { id: "99-med", name: "99 Med", meta: t("wpMeta.med"), video: asset("videos/99Med.mp4") },
  { id: "gojo-sukuna", name: "Gojo vs Sukuna", meta: t("wpMeta.gojoSukuna"), video: asset("videos/Gojo-Sukuna.mp4"), videoLow: asset("videos/low/Gojo-Sukuna.mp4") },
  { id: "sukuna-fire", name: "Sukuna Fire", meta: t("wpMeta.sukuna"), video: asset("videos/sukuna-fire.mp4") },
  { id: "desktop-lines", name: "Desktop Lines", meta: t("wpMeta.desktop"), video: asset("videos/Desktop.mp4"), videoLow: asset("videos/low/Desktop.mp4") },
  { id: "skello", name: "Skello", meta: t("wpMeta.skello"), video: asset("videos/Skello.mp4") },
];

type WallEngineEntry = {
  id: WallpaperId;
  name: string;
  category: string;
  resolution: string;
  age: string;
  ageLabel: string;
  stars: number;
  image?: string;
  video?: string;
  videoLow?: string;
};

const WE_AUTHOR = { name: "McCrack", verified: true };

const resolvedSize = (e: WallEngineEntry): string =>
  e.image ? "8.4 MB" : e.resolution.startsWith("3840") ? "58 MB" : "28 MB";

const entryTags = (e: WallEngineEntry): string[] => {
  const tags = [e.resolution, e.ageLabel.toLowerCase()];
  if (e.category !== "Gaming") tags.push(e.category.toLowerCase());
  if (e.video) tags.push("video");
  else tags.push("image");
  tags.push("vertex-os");
  return tags;
};

const CATEGORY_ICONS: Record<string, string> = {
  Anime: "⚡",
  Space: "🪐",
  Animals: "🐾",
  Scenery: "🏞️",
  City: "🌆",
  Cinematic: "🎬",
  Gaming: "🎮",
  Abstract: "🌀",
  Minimal: "▫️",
  Bizarre: "👁️",
  Synthwave: "🌇",
  Dark: "🕶️",
  Utility: "🛠️",
};

type ApplyTarget = "both" | "home" | "lock";

const wallEngineEntries: WallEngineEntry[] = [
  { id: "we-black-hole", name: "Black Hole", category: "Space", resolution: "3840 x 2160", age: "G", ageLabel: "All ages", stars: 4.9, video: asset("videos/BlackHole.mp4"), videoLow: asset("videos/low/BlackHole.mp4") },
  { id: "we-snow-fox", name: "Snow Fox", category: "Animals", resolution: "1920 x 1080", age: "G", ageLabel: "All ages", stars: 4.8, video: asset("videos/SnowFox.mp4") },
  { id: "we-gojo-sukuna", name: "Gojo vs Sukuna", category: "Anime", resolution: "3840 x 2160", age: "T", ageLabel: "Teen", stars: 4.7, video: asset("videos/Gojo-Sukuna.mp4"), videoLow: asset("videos/low/Gojo-Sukuna.mp4") },
  { id: "we-rainy-city", name: "Rainy City", category: "City", resolution: "2560 x 1440", age: "G", ageLabel: "All ages", stars: 4.6, video: asset("videos/RainyCity.mp4"), videoLow: asset("videos/low/RainyCity.mp4") },
  { id: "we-sukuna-fire", name: "Sukuna Fire", category: "Anime", resolution: "1920 x 1080", age: "T", ageLabel: "Teen", stars: 4.6, video: asset("videos/sukuna-fire.mp4") },
  { id: "we-cine-55", name: "Cine 55", category: "Cinematic", resolution: "2560 x 1440", age: "G", ageLabel: "All ages", stars: 4.5, image: asset("wallpapers/Cine55.png") },
  { id: "we-snake", name: "Snake Skeleton", category: "Bizarre", resolution: "2560 x 1440", age: "T", ageLabel: "Teen", stars: 4.4, video: asset("videos/default.mp4"), videoLow: asset("videos/low/default.mp4") },
  { id: "we-green-anime", name: "Neon Field", category: "Scenery", resolution: "3840 x 2160", age: "G", ageLabel: "All ages", stars: 4.4, video: asset("videos/green.mp4"), videoLow: asset("videos/low/green.mp4") },
  { id: "we-brother", name: "Kin", category: "Cinematic", resolution: "3840 x 2160", age: "T", ageLabel: "Teen", stars: 4.3, video: asset("videos/Brother.mp4"), videoLow: asset("videos/low/Brother.mp4") },
  { id: "we-gojo", name: "Gojo", category: "Anime", resolution: "3840 x 2160", age: "T", ageLabel: "Teen", stars: 4.3, video: asset("videos/Gojo.mp4"), videoLow: asset("videos/low/Gojo.mp4") },
  { id: "we-skello", name: "Skello", category: "Minimal", resolution: "1920 x 1080", age: "G", ageLabel: "All ages", stars: 4.2, video: asset("videos/Skello.mp4") },
  { id: "we-desktop-lines", name: "Desktop Lines", category: "Abstract", resolution: "4096 x 2048", age: "G", ageLabel: "All ages", stars: 4.1, video: asset("videos/Desktop.mp4"), videoLow: asset("videos/low/Desktop.mp4") },
  { id: "we-99-med", name: "Med Monitor", category: "Utility", resolution: "1920 x 1080", age: "G", ageLabel: "All ages", stars: 3.9, video: asset("videos/99Med.mp4") },
  { id: "we-45e33", name: "45E33", category: "Cinematic", resolution: "1920 x 1080", age: "G", ageLabel: "All ages", stars: 4.0, video: asset("videos/we-45e33.mp4") },
  { id: "we-f1-formula", name: "F-1 Formula", category: "Gaming", resolution: "1920 x 1080", age: "G", ageLabel: "All ages", stars: 4.3, video: "https://cineosweb.github.io/Videos/F-1.mp4" },
  { id: "we-hunt-shadow-2", name: "Hunt Shadow 2", category: "Cinematic", resolution: "1920 x 1080", age: "T", ageLabel: "Teen", stars: 4.4, video: asset("videos/we-hunt.mp4") },
  { id: "we-minecraft-01", name: "Minecraft 01", category: "Gaming", resolution: "1920 x 1080", age: "G", ageLabel: "All ages", stars: 4.2, video: asset("videos/we-minecraft-01.mp4") },
  { id: "we-minecraft-02", name: "Minecraft 02", category: "Gaming", resolution: "1920 x 1080", age: "G", ageLabel: "All ages", stars: 4.1, video: asset("videos/we-minecraft-02.mp4") },
  { id: "we-minecraft-03", name: "Minecraft 03", category: "Gaming", resolution: "1920 x 1080", age: "G", ageLabel: "All ages", stars: 4.2, video: asset("videos/we-minecraft-03.mp4") },
  { id: "we-monkey", name: "Monkey", category: "Animals", resolution: "1920 x 1080", age: "G", ageLabel: "All ages", stars: 4.1, video: asset("videos/we-monkey.mp4") },
  { id: "we-supra-drift", name: "Supra drift", category: "Gaming", resolution: "1920 x 1080", age: "G", ageLabel: "All ages", stars: 4.5, image: "https://cineosweb.github.io/Videos/Supra.PNG" },
  { id: "we-yuji-52", name: "Yuji 52", category: "Anime", resolution: "3840 x 2160", age: "T", ageLabel: "Teen", stars: 4.4, video: "https://cineosweb.github.io/Videos/Yuji52.mp4" },
  { id: "we-cozy-fox", name: "Cozy fox", category: "Animals", resolution: "3840 x 2160", age: "G", ageLabel: "All ages", stars: 4.3, video: "https://cineosweb.github.io/Videos/CozyFox.mp4" },
  { id: "we-yuta", name: "Yuta", category: "Anime", resolution: "1920 x 1080", age: "T", ageLabel: "Teen", stars: 4.3, video: asset("videos/we-yuta.mp4") },
  { id: "we-bmw-car-driving", name: "BMW Car driving", category: "Gaming", resolution: "1920 x 1080", age: "G", ageLabel: "All ages", stars: 4.4, video: "https://motionbgs.com/media/660/bmw-carros-driving.1920x1080.mp4" },
  { id: "we-eyes-toward-heaven", name: "Eyes toward heaven", category: "Cinematic", resolution: "1920 x 1080", age: "G", ageLabel: "All ages", stars: 4.3, video: "https://motionbgs.com/media/10052/eyes-toward-heaven.1920x1080.mp4" },
  { id: "we-goku-ultra", name: "Goku Ultra Instinct", category: "Anime", resolution: "1920 x 1080", age: "G", ageLabel: "All ages", stars: 4.7, video: "https://motionbgs.com/media/1397/goku-ultra-instinct_2.1920x1080.mp4" },
  { id: "we-galaxy-eyes", name: "Galaxy eyes", category: "Abstract", resolution: "1920 x 1080", age: "G", ageLabel: "All ages", stars: 4.4, video: "https://motionbgs.com/media/10050/galaxy-eyes.1920x1080.mp4" },
  { id: "we-celestial-battle", name: "Celestial battle", category: "Anime", resolution: "1920 x 1080", age: "T", ageLabel: "Teen", stars: 4.6, video: "https://motionbgs.com/media/9967/celestial-battle-gojo-vs-mahoraga.1920x1080.mp4" },
  { id: "we-tess-kotkin", name: "Tess Kotkin", category: "Gaming", resolution: "1920 x 1080", age: "T", ageLabel: "Teen", stars: 4.4, video: "https://motionbgs.com/media/10095/tess-kotkin-snowbreak.1920x1080.mp4" },
  { id: "we-yuta-rika", name: "Yuta and cursed rika", category: "Anime", resolution: "1920 x 1080", age: "T", ageLabel: "Teen", stars: 4.6, video: "https://motionbgs.com/media/10060/yuta-and-cursed-rika.1920x1080.mp4" },
  { id: "we-satoru-gojo", name: "Satoru Gojo", category: "Anime", resolution: "1920 x 1080", age: "G", ageLabel: "All ages", stars: 4.7, video: "https://motionbgs.com/media/415/satoru-gojo-with-red-and-blue-circles.1920x1080.mp4" },
  { id: "we-dark-angel", name: "Dark Angel Rising", category: "Cinematic", resolution: "1920 x 1080", age: "T", ageLabel: "Teen", stars: 4.5, video: "https://motionbgs.com/media/10102/dark-angel-rising.1920x1080.mp4" },
  { id: "we-makima-devilish", name: "Makima Devilish Gaze", category: "Anime", resolution: "1920 x 1080", age: "T", ageLabel: "Teen", stars: 4.5, video: "https://motionbgs.com/media/10100/makima-devilish-gaze.1920x1080.mp4" },
  { id: "we-makima-burning", name: "Makima Burning eyes", category: "Anime", resolution: "1920 x 1080", age: "T", ageLabel: "Teen", stars: 4.4, video: "https://motionbgs.com/media/8613/makima-burning-eyes.1920x1080.mp4" },
  { id: "we-haimiya-mio", name: "Haimiya Mio manga memories", category: "Anime", resolution: "1920 x 1080", age: "T", ageLabel: "Teen", stars: 4.4, video: "https://motionbgs.com/media/10096/haimiya-mio-manga-memories.1920x1080.mp4" },
  { id: "we-toji", name: "Toji Fushiguro", category: "Anime", resolution: "1920 x 1080", age: "T", ageLabel: "Teen", stars: 4.6, video: "https://motionbgs.com/media/10047/toji-fushiguro-playful-cloud.1920x1080.mp4" },
  { id: "we-mamonir", name: "Mamonir Night of Death", category: "Anime", resolution: "1920 x 1080", age: "T", ageLabel: "Teen", stars: 4.5, video: "https://motionbgs.com/media/10069/mamonir.1920x1080.mp4" },
  { id: "we-lantern-festival", name: "Lantern Festival Night", category: "Scenery", resolution: "1920 x 1080", age: "G", ageLabel: "All ages", stars: 4.6, video: "https://motionbgs.com/media/9923/lantern-festival-night.1920x1080.mp4" },
  { id: "we-miyabi", name: "Miyabi Moonlit silence", category: "Anime", resolution: "1920 x 1080", age: "T", ageLabel: "Teen", stars: 4.5, video: "https://motionbgs.com/media/10002/miyabi-moonlit-silence.1920x1080.mp4" },
  { id: "we-qingxiao", name: "Qingxiao Wuthering Wave", category: "Anime", resolution: "1920 x 1080", age: "T", ageLabel: "Teen", stars: 4.4, video: "https://motionbgs.com/media/9989/qingxiao.1920x1080.mp4" },
  { id: "we-megumin", name: "Fiery Megumin", category: "Anime", resolution: "1920 x 1080", age: "T", ageLabel: "Teen", stars: 4.5, video: "https://motionbgs.com/media/10021/fiery-megumin.1920x1080.mp4" },
  { id: "we-odette", name: "Odette Grace of the white swan", category: "Cinematic", resolution: "1920 x 1080", age: "G", ageLabel: "All ages", stars: 4.4, video: "https://motionbgs.com/media/10022/odette-grace-of-the-white-swan.1920x1080.mp4" },
  { id: "we-blue-sky", name: "Blue sky memories", category: "Scenery", resolution: "1920 x 1080", age: "G", ageLabel: "All ages", stars: 4.3, video: "https://motionbgs.com/media/10026/blue-sky-memories.1920x1080.mp4" },
  { id: "we-frutiger", name: "Frutiger aero", category: "Abstract", resolution: "1920 x 1080", age: "G", ageLabel: "All ages", stars: 4.3, video: "https://motionbgs.com/media/10011/frutiger-aero.1920x1080.mp4" },
  { id: "we-synthwave-dmc", name: "Synthwave DMC", category: "Synthwave", resolution: "1920 x 1080", age: "T", ageLabel: "Teen", stars: 4.5, video: "https://motionbgs.com/media/9969/synthwave-delorean.1920x1080.mp4" },
  { id: "we-zankou", name: "Zankou Neverness", category: "Anime", resolution: "1920 x 1080", age: "T", ageLabel: "Teen", stars: 4.4, video: "https://motionbgs.com/media/9968/zankou-nte.1920x1080.mp4" },
  { id: "we-ghost-rider", name: "Ghost Rider burning soul", category: "Dark", resolution: "1920 x 1080", age: "T", ageLabel: "Teen", stars: 4.5, video: "https://motionbgs.com/media/9948/ghost-rider-burning-soul.1920x1080.mp4" },
  { id: "we-molala", name: "Molala", category: "Anime", resolution: "1920 x 1080", age: "G", ageLabel: "All ages", stars: 4.4, video: "https://motionbgs.com/media/9885/molala.1920x1080.mp4" },
  { id: "we-dark-king", name: "Dark King Abyss", category: "Dark", resolution: "1920 x 1080", age: "T", ageLabel: "Teen", stars: 4.6, video: "https://motionbgs.com/media/9780/dark-king-abyss.1920x1080.mp4" },
  { id: "we-celestial-veil", name: "Celestial Veil", category: "Abstract", resolution: "1920 x 1080", age: "G", ageLabel: "All ages", stars: 4.4, video: "https://motionbgs.com/media/8626/celestial-veil.1920x1080.mp4" },
  { id: "we-miku-nakano", name: "Miku Nakano", category: "Anime", resolution: "1920 x 1080", age: "G", ageLabel: "All ages", stars: 4.6, video: "https://motionbgs.com/media/9806/miku-nakano-quintessential-quintuplets.1920x1080.mp4" },
  { id: "we-gotoubun", name: "Gotoubun No hanayome", category: "Anime", resolution: "1920 x 1080", age: "G", ageLabel: "All ages", stars: 4.5, video: "https://motionbgs.com/media/9819/gotoubun-no-hanayome.1920x1080.mp4" },
  { id: "we-quintuplets", name: "The Quintessential Quintuplets", category: "Anime", resolution: "1920 x 1080", age: "G", ageLabel: "All ages", stars: 4.6, video: "https://motionbgs.com/media/9784/the-quintessential-quintuplets.1920x1080.mp4" },
  { id: "we-black-silk-waves", name: "Black Silk Waves", category: "Abstract", resolution: "1920 x 1080", age: "G", ageLabel: "All ages", stars: 4.5, video: "https://motionbgs.com/media/10046/black-silk-waves.1920x1080.mp4" },
  { id: "we-blue-dragon-logo", name: "Blue Dragon", category: "Gaming", resolution: "1920 x 1080", age: "G", ageLabel: "All ages", stars: 4.4, video: "https://motionbgs.com/media/2773/blue-dragon-logo.1920x1080.mp4" },
  { id: "we-astra-yao", name: "Astra Yao (ZZZ)", category: "Anime", resolution: "1920 x 1080", age: "G", ageLabel: "All ages", stars: 4.6, video: "https://motionbgs.com/media/9956/astra-yao-zzz.1920x1080.mp4" },
  { id: "we-luo-tianyi-christmas", name: "Luo Tianyi Christmas", category: "Anime", resolution: "1920 x 1080", age: "G", ageLabel: "All ages", stars: 4.5, video: "https://motionbgs.com/media/9163/luo-tianyi-christmas-wish.1920x1080.mp4" },
  { id: "we-mc-northern-light", name: "Minecraft Northern Light", category: "Gaming", resolution: "1920 x 1080", age: "G", ageLabel: "All ages", stars: 4.3, video: "https://motionbgs.com/media/9360/minecraft-northern-light.1920x1080.mp4" },
  { id: "we-mc-falling-snow", name: "Minecraft Falling Snow", category: "Gaming", resolution: "1920 x 1080", age: "G", ageLabel: "All ages", stars: 4.3, video: "https://motionbgs.com/media/9269/minecraft-falling-snow.1920x1080.mp4" },
  { id: "we-mc-aquarium", name: "Minecraft Aquarium", category: "Gaming", resolution: "1920 x 1080", age: "G", ageLabel: "All ages", stars: 4.4, video: "https://motionbgs.com/media/6069/minecraft-aquarium.1920x1080.mp4" },
  { id: "we-mc-holiday-heart", name: "Minecraft Holiday Heart", category: "Gaming", resolution: "1920 x 1080", age: "G", ageLabel: "All ages", stars: 4.3, video: "https://motionbgs.com/media/8300/minecraft-holiday-hearth.1920x1080.mp4" },
  { id: "we-mc-fireplace", name: "Fireplace in Minecraft", category: "Gaming", resolution: "1920 x 1080", age: "G", ageLabel: "All ages", stars: 4.4, video: "https://motionbgs.com/media/1963/fireplace-in-minecraft.1920x1080.mp4" },
  { id: "we-mc-panels", name: "Minecraft Panels", category: "Gaming", resolution: "1920 x 1080", age: "G", ageLabel: "All ages", stars: 4.2, video: "https://motionbgs.com/media/4776/minecraft-panels.1920x1080.mp4" },
  { id: "we-mc-cherry-blossom", name: "Cherry Blossom Minecraft", category: "Gaming", resolution: "1920 x 1080", age: "G", ageLabel: "All ages", stars: 4.4, video: "https://motionbgs.com/media/3227/cherry-blossom.1920x1080.mp4" },
  { id: "we-mc-raindrops", name: "Raindrops Minecraft", category: "Gaming", resolution: "1920 x 1080", age: "G", ageLabel: "All ages", stars: 4.2, video: "https://motionbgs.com/media/3073/raindrops-minecraft.1920x1080.mp4" },
  { id: "we-silver-surfer", name: "Silver Surfer Cosmic Void", category: "Cinematic", resolution: "1920 x 1080", age: "T", ageLabel: "Teen", stars: 4.5, video: "https://motionbgs.com/media/9078/silver-surfer-cosmic-void.1920x1080.mp4" },
  { id: "we-girl-behind-curtains", name: "Girl Behind Curtains", category: "Cinematic", resolution: "1920 x 1080", age: "T", ageLabel: "Teen", stars: 4.4, video: "https://motionbgs.com/media/8925/girl-behind-curtains-3.1920x1080.mp4" },
  { id: "we-vagabond-miyamoto", name: "Vagabond Miyamoto Musashi", category: "Anime", resolution: "1920 x 1080", age: "T", ageLabel: "Teen", stars: 4.6, video: "https://motionbgs.com/media/7160/vagabon-miyamoto-musashi.1920x1080.mp4" },
  { id: "we-itachi-crow", name: "Uchiha Itachi Crow Attack", category: "Anime", resolution: "1920 x 1080", age: "T", ageLabel: "Teen", stars: 4.6, video: "https://motionbgs.com/media/10055/uchiha-crow-attack.1920x1080.mp4" },
  { id: "we-gojo-hollow", name: "Gojo Hollow Eyes", category: "Anime", resolution: "1920 x 1080", age: "T", ageLabel: "Teen", stars: 4.6, video: "https://motionbgs.com/media/9624/gojo-hollow-eyes.1920x1080.mp4" },
  { id: "we-quintuplets-sister", name: "Quintuplets Sister (FULL)", category: "Anime", resolution: "1920 x 1080", age: "G", ageLabel: "All ages", stars: 4.6, video: "https://motionbgs.com/media/9807/nakano-miku-ichika-itsuki-yotsuba-nino-quintuplets-sisters.1920x1080.mp4" },
  { id: "we-yuta-okkotsu", name: "Yuta Okkotsu Curse Spirit", category: "Anime", resolution: "1920 x 1080", age: "T", ageLabel: "Teen", stars: 4.6, video: "https://motionbgs.com/media/9450/yuta-okkotsu-curse-spirit.1920x1080.mp4" },
  { id: "we-gojo-vs-sukuna-2", name: "Gojo vs Sukuna 2", category: "Anime", resolution: "1920 x 1080", age: "T", ageLabel: "Teen", stars: 4.7, video: "https://motionbgs.com/media/5452/gojo-vs-sukuna-battle.1920x1080.mp4" },
  { id: "we-gojo-cursed-world", name: "Gojo Cursed World", category: "Anime", resolution: "1920 x 1080", age: "T", ageLabel: "Teen", stars: 4.6, video: "https://motionbgs.com/media/2310/jujutsu-kaisen-gojos-cursed-world.1920x1080.mp4" },
  { id: "we-gojo-six-eyes", name: "Gojo Six Eyes", category: "Anime", resolution: "1920 x 1080", age: "T", ageLabel: "Teen", stars: 4.6, video: "https://motionbgs.com/media/1864/gojo-six-eyes-jujutsu-kaisen.1920x1080.mp4" },
  { id: "we-frieren-blue-horizon", name: "Frieren Blue Horizon", category: "Anime", resolution: "1920 x 1080", age: "G", ageLabel: "All ages", stars: 4.6, video: "https://motionbgs.com/media/9181/frieren-blue-horizon.1920x1080.mp4" },
  { id: "we-frieren-blooming-stream", name: "Frieren Blooming Stream", category: "Anime", resolution: "1920 x 1080", age: "G", ageLabel: "All ages", stars: 4.5, video: "https://motionbgs.com/media/9344/frieren-blooming-stream.1920x1080.mp4" },
  { id: "we-nissan-skyline-r33-mc", name: "Nissan Skyline R33 X Minecraft", category: "Gaming", resolution: "3840 x 2160", age: "G", ageLabel: "All ages", stars: 4.8, video: asset("videos/nissan-skyline-r33-mc.mp4"), videoLow: asset("videos/low/nissan-skyline-r33-mc.mp4") },
  { id: "we-torii", name: "Torii", category: "Scenery", resolution: "1920 x 1080", age: "G", ageLabel: "All ages", stars: 4.5, video: "https://motionbgs.com/media/3764/torii.1920x1080.mp4" },
];

const WE_RECENT: WallpaperId[] = ["we-torii", "we-nissan-skyline-r33-mc", "we-frieren-blooming-stream", "we-frieren-blue-horizon", "we-gojo-six-eyes", "we-gojo-cursed-world", "we-gojo-vs-sukuna-2", "we-yuta-okkotsu", "we-quintuplets-sister", "we-gojo-hollow", "we-itachi-crow", "we-vagabond-miyamoto", "we-girl-behind-curtains", "we-silver-surfer", "we-mc-raindrops", "we-mc-cherry-blossom", "we-mc-panels", "we-mc-fireplace", "we-mc-holiday-heart", "we-mc-aquarium", "we-mc-falling-snow", "we-mc-northern-light", "we-luo-tianyi-christmas", "we-astra-yao", "we-blue-dragon-logo", "we-black-silk-waves", "we-snow-fox", "we-rainy-city", "we-cine-55", "we-green-anime", "we-gojo", "we-45e33", "we-f1-formula", "we-hunt-shadow-2", "we-minecraft-01", "we-minecraft-02", "we-minecraft-03", "we-monkey", "we-supra-drift", "we-yuji-52", "we-cozy-fox", "we-yuta", "we-bmw-car-driving", "we-eyes-toward-heaven", "we-goku-ultra", "we-galaxy-eyes", "we-celestial-battle", "we-tess-kotkin", "we-yuta-rika", "we-satoru-gojo", "we-dark-angel", "we-makima-devilish", "we-makima-burning", "we-haimiya-mio", "we-toji", "we-mamonir", "we-lantern-festival", "we-miyabi", "we-qingxiao", "we-megumin", "we-odette", "we-blue-sky", "we-frutiger", "we-synthwave-dmc", "we-zankou", "we-ghost-rider", "we-molala", "we-dark-king", "we-celestial-veil", "we-miku-nakano", "we-gotoubun", "we-quintuplets"];
const WE_POPULAR: WallpaperId[] = ["we-nissan-skyline-r33-mc", "we-black-hole", "we-gojo-sukuna", "we-sukuna-fire", "we-snake", "we-brother"];

wallpapers.push(...wallEngineEntries.map((e) => ({ id: e.id, name: e.name, meta: `${e.category} // ${e.resolution}`, video: e.video, image: e.image, videoLow: e.videoLow })));

const WALLPAPER_IMAGE: Record<string, string> = {};
[...wallpapers, ...wallEngineEntries].forEach((w) => { if (w.image) WALLPAPER_IMAGE[w.id] = w.image; });
function wallImg(id: string): string | null { return WALLPAPER_IMAGE[id] ?? null; }

const MC_ICON = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABwAAAAcCAMAAABF0y+mAAAATlBMVEVSpTVRpDRJli9PoDNMmzEAAwABDgIAAAA9eydUqTY9eygCAAUJCAhdpEE2ZiQfRxUgQRU6diYGFQUOIgk3byRGeTEVGhFBgCpYqztis0Op4b1OAAAAiUlEQVR4AdXLBQ7EIBRF0Y9Td9v/QvG6xEZvhZecAH8YwjZiJ3ETbZAyzrmQEUAkhZmMblHYAtrOGFuMT/h8M0nTNPHo5hYhs+WFKXcTDkVRKUxlFMEpQqlHSsnpXlU33CJv6io6YiuW2g9il5m6G5SRSV5h1fdDZM6h76sjwjhN4+Y8hNDmfGsa0OAJeZWq1QUAAAAASUVORK5CYII=";
const RAINMETER_ICON = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABwAAAAcCAMAAABF0y+mAAAAVFBMVEVHcEwobJoma5oobZsjapkgapo6d6Mma5kcZ5d0m76mvtkma5rX4PTw8P9Th64japknbJqTsc++zuX19P/x6Orv39jou5DjoE/s1MPgjhzgkSnlrG/pPPZZAAAAEXRSTlMAOoEJ1f3/p+f//1r////AIySV8nYAAADzSURBVHgBYiAeMALqJI8kC2EYiBZBco4ic/97DmIS+Nu9fYpd3bfZMELXhD2gGFpDpdJgGkMFWOdDrEIjk3MZqjfF4K1zLsmuek12l6yv3BRHZR0rVW7qMRMzsj6UrVEqRkwTmkbjvXUsIKhfRpSgazSy8N0q/YMVrQY0TfP8S+3LJgFuXtZ12X62+vHxTfC07JfWZSai7fLwYf/I8DiOC5/LebwNDkgbQ8bHvpIa49N0O503ZbwRhMK8+Tx21rG4Ig89aDct53pfnDEUEcFk+dXZOe3HIipRgE/Z2qwVhu4jXiYAeo84mruvxNH0vYkPb74AqzITDrilOz4AAAAASUVORK5CYII=";
const ARCH_ICON = asset("images/archlinux.png");

type AppDef = { id: AppId; title: string; subtitle: string; icon: LucideIcon; iconImg?: string; pinned?: boolean; squircle?: boolean };

const baseApps: AppDef[] = [
  { id: "browser", title: "Browser", subtitle: t("appSub.browser"), icon: Compass, iconImg: asset("images/browser-icon.png"), pinned: true },
  { id: "messages", title: "Messages", subtitle: t("appSub.messages"), icon: MessageCircle, iconImg: "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/51/IMessage_logo.svg/3840px-IMessage_logo.svg.png?utm_source=commons.wikimedia.org&utm_campaign=index&utm_content=thumbnail", pinned: true },
  { id: "verai", title: "McCrack AI", subtitle: t("appSub.verai"), icon: Sparkles, iconImg: asset("images/ver-ai.ico"), pinned: true },
  { id: "vertube", title: "YouTube", subtitle: t("appSub.vertube"), icon: PlaySquare, iconImg: asset("images/vertube.svg"), pinned: true },
  { id: "movies", title: "Movies", subtitle: t("appSub.movies"), icon: Film, iconImg: "https://images.icon-icons.com/3053/PNG/512/netflix_macos_bigsur_icon_189917.png", pinned: true },
  { id: "settings", title: "Config", subtitle: t("appSub.settings"), icon: Settings2, iconImg: asset("images/config-icon.png"), pinned: true },
  { id: "appmaker", title: "McCrack Studios", subtitle: "build & publish your own", icon: Code2, iconImg: asset("images/v-studios-logo.svg"), squircle: true },
  { id: "spicetify", title: "McCrackify", subtitle: t("appSub.spicetify"), icon: Music2, iconImg: asset("images/spicetify.ico"), pinned: true },
  { id: "wallpaper-engine", title: "Wallpaper Engine", subtitle: t("appSub.wallpaperEngine"), icon: Image, iconImg: asset("images/wallpaper-engine.gif"), squircle: true },
  { id: "pizza", title: "Pizza edition", subtitle: t("appSub.pizza"), icon: Compass, iconImg: asset("images/pizza.ico") },
  { id: "roblox", title: "Roblox", subtitle: t("appSub.roblox"), icon: Gamepad2, iconImg: asset("images/roblox.ico") },
  { id: "jarvis", title: "JARVIS", subtitle: t("appSub.jarvis"), icon: Bot, iconImg: asset("images/jarvis-logo.png") },
  { id: "games", title: "PS5 Emu", subtitle: t("appSub.games"), icon: Gamepad2, iconImg: asset("images/ps5-emu.png"), squircle: true },
  { id: "minecraft", title: "Minecraft Launcher", subtitle: t("appSub.minecraft"), icon: Gamepad2, iconImg: MC_ICON, squircle: true },
  { id: "translucenttb", title: "TranslucentTB", subtitle: t("appSub.translucenttb"), icon: Waves, iconImg: asset("images/translucenttb-logo.png") },
  { id: "calculator", title: "Calculator", subtitle: t("appSub.calculator"), icon: Calculator, iconImg: asset("images/calculator-logo.svg") },
  { id: "rainmeter", title: "Rainmeter", subtitle: t("appSub.rainmeter"), icon: MonitorCog, iconImg: RAINMETER_ICON },
  { id: "terminal", title: "Terminal", subtitle: t("appSub.terminal"), icon: Terminal, iconImg: ARCH_ICON },
  { id: "links", title: "Links", subtitle: t("appSub.links"), icon: Link2, iconImg: asset("images/links.svg") },
];;

// Installed V-MARKET listings are folded into this list at runtime by <App />.
let apps: AppDef[] = baseApps;

type AppOverride = { name?: string; showName?: boolean; iconUrl?: string; pinned?: boolean };

const APP_SECTIONS: { id: string; tone: string; all?: boolean; ids: AppId[] }[] = [
  { id: "all", tone: "tone-all", all: true, ids: [] },
  { id: "watch", tone: "tone-watch", ids: ["vertube", "movies", "spicetify", "messages", "verai", "jarvis"] },
  { id: "play", tone: "tone-play", ids: ["roblox", "minecraft", "games", "pizza"] },
  { id: "create", tone: "tone-create", ids: ["terminal", "wallpaper-engine", "browser", "calculator", "appmaker", "settings", "translucenttb", "rainmeter", "links"] },
];;

const GV_APP: { id: AppId; title: string; subtitle: string; icon: LucideIcon; pinned: boolean; showName: boolean } = { id: "ghostview", title: "GhostView", subtitle: "remote view", icon: Eye, pinned: false, showName: false };

function getApp(id: AppId, overrides: Record<string, AppOverride>) {
  if (id === "ghostview") {
    const gvOv = overrides.ghostview ?? {};
    return { ...GV_APP, title: gvOv.name ?? GV_APP.title, showName: gvOv.showName ?? false };
  }
  if (id === "admin") return { id: "admin" as AppId, title: "Control Panel", subtitle: "restricted", icon: Settings2, pinned: false, showName: false, squircle: false };
  const base = apps.find((app) => app.id === id) ?? apps[0];
  const ov = overrides[id] ?? {};
  return { ...base, title: ov.name ?? base.title, showName: ov.showName ?? false, iconUrl: ov.iconUrl };
}

const storage = {
  read<T>(key: string, fallback: T): T {
    try {
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) as T : fallback;
    } catch {
      return fallback;
    }
  },
  write(key: string, value: unknown) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* session still works */ }
  },
  remove(key: string) {
    try { localStorage.removeItem(key); } catch { /* ignore */ }
  },
};

let clickSfxCtx: AudioContext | null = null;
let msFeedBridge: ((line: string) => void) | null = null;
let ghostWinCloser: (() => void) | null = null;
function pushMsFeed(line: string) { msFeedBridge?.(line); }
function playClick() {
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    clickSfxCtx ??= new AC();
    const ctx = clickSfxCtx;
    if (ctx.state === "suspended") void ctx.resume();
    const t = ctx.currentTime;

    const frames = Math.floor(ctx.sampleRate * 0.06);
    const buf = ctx.createBuffer(1, frames, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 2500;
    bp.Q.value = 1.1;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.0001, t);
    ng.gain.exponentialRampToValueAtTime(0.55, t + 0.004);
    ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
    noise.connect(bp);
    bp.connect(ng);
    ng.connect(ctx.destination);
    noise.start(t);
    noise.stop(t + 0.065);

    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(230, t);
    osc.frequency.exponentialRampToValueAtTime(100, t + 0.09);
    const og = ctx.createGain();
    og.gain.setValueAtTime(0.0001, t);
    og.gain.exponentialRampToValueAtTime(0.45, t + 0.004);
    og.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
    osc.connect(og);
    og.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.11);

    const snap = ctx.createOscillator();
    snap.type = "triangle";
    snap.frequency.setValueAtTime(1200, t);
    snap.frequency.exponentialRampToValueAtTime(500, t + 0.05);
    const sg = ctx.createGain();
    sg.gain.setValueAtTime(0.0001, t);
    sg.gain.exponentialRampToValueAtTime(0.22, t + 0.004);
    sg.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
    snap.connect(sg);
    sg.connect(ctx.destination);
    snap.start(t);
    snap.stop(t + 0.07);
  } catch { /* clicks keep working silently */ }
}

function readRainmeterConfig(): RainmeterSettings {
  const stored = storage.read<Partial<RainmeterSettings>>("rainmeter-config", {});
  const cfg = { ...DEFAULT_RAINMETER, ...stored };
  if (!RM_SKINS.includes(cfg.skin)) cfg.skin = "mond";
  if (!RM_DATE_STYLES.includes(cfg.dateFormat)) cfg.dateFormat = "mond";
  if (!Number.isFinite(cfg.posX)) cfg.posX = DEFAULT_RAINMETER.posX;
  if (!Number.isFinite(cfg.posY)) cfg.posY = DEFAULT_RAINMETER.posY;
  if (!Number.isFinite(cfg.darkThreshold)) cfg.darkThreshold = DEFAULT_RAINMETER.darkThreshold;
  if (!Number.isFinite(cfg.lightThreshold)) cfg.lightThreshold = DEFAULT_RAINMETER.lightThreshold;
  if (!Number.isFinite(cfg.centerRegionPct)) cfg.centerRegionPct = DEFAULT_RAINMETER.centerRegionPct;
  return cfg;
}

function rmTimeText(date: Date, format24: boolean, showSeconds: boolean): string {
  const mm = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");
  const seconds = showSeconds ? `:${ss}` : "";
  if (format24) return `${String(date.getHours()).padStart(2, "0")}:${mm}${seconds}`;
  const h = date.getHours() % 12 || 12;
  return `${String(h).padStart(2, "0")}:${mm}${seconds} ${date.getHours() >= 12 ? "PM" : "AM"}`;
}

function rmDateText(date: Date, style: RainmeterDateStyle, lang: Lang): string {
  const mon = date.toLocaleDateString(localeOf(lang), { month: "long" });
  const day = String(date.getDate()).padStart(2, "0");
  const year = String(date.getFullYear());
  if (style === "dot") return `${day}.${String(date.getMonth() + 1).padStart(2, "0")}.${year}`;
  if (style === "long") return `${day} ${mon}, ${year}.`;
  if (style === "short") return `${day} ${mon}`;
  return `${day}  ${mon},  ${year}.`;
}

function dayPartOf(date: Date): "morning" | "afternoon" | "evening" | "night" {
  const h = date.getHours();
  if (h >= 5 && h < 12) return "morning";
  if (h >= 12 && h < 18) return "afternoon";
  if (h >= 18) return "evening";
  return "night";
}

function rmAnchorStyle(position: RainmeterPosition, marginH: number, marginV: number): CSSProperties {
  switch (position) {
    case "top": return { left: "50%", top: 0, transform: `translate(calc(-50% + ${marginH}px), ${marginV}px)` };
    case "top-left": return { left: marginH, top: marginV, transform: "none" };
    case "top-right": return { right: marginH, top: marginV, transform: "none" };
    case "middle-left": return { left: marginH, top: "50%", transform: `translate(0, calc(-50% + ${marginV}px))` };
    case "middle-right": return { right: marginH, top: "50%", transform: `translate(0, calc(-50% + ${marginV}px))` };
    case "bottom-left": return { left: marginH, bottom: marginV, transform: "none" };
    case "bottom-center": return { left: "50%", bottom: 0, transform: `translate(calc(-50% + ${marginH}px), -${marginV}px)` };
    case "bottom-right": return { right: marginH, bottom: marginV, transform: "none" };
    default: return { left: "50%", top: "50%", transform: `translate(calc(-50% + ${marginH}px), calc(-50% + ${marginV}px))` };
  }
}

const lumaCache = new Map<string, number | null>();

function avgLuma(ctx: CanvasRenderingContext2D, w: number, h: number): number {
  const data = ctx.getImageData(0, 0, w, h).data;
  let sum = 0;
  for (let i = 0; i < data.length; i += 4) sum += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
  return data.length ? sum / (data.length / 4) : 128;
}

function analyzeCenterLuminance(src: string, regionPct: number): Promise<number | null> {
  const key = `${src}|${regionPct}`;
  if (lumaCache.has(key)) return Promise.resolve(lumaCache.get(key) ?? null);
  if (PERF.low) return Promise.resolve(null);
  return new Promise((resolve) => {
    const pct = Math.min(100, Math.max(1, regionPct));
    const done = (value: number | null) => { lumaCache.set(key, value); resolve(value); };
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) { done(null); return; }
    const isRemote = /^https?:/i.test(src);
    if (/\.(png|jpe?g|gif|webp|bmp|avif|svg|ico)(\?|$)/i.test(src) || src.startsWith("blob:")) {
      const imgEl = document.createElement("img");
      if (isRemote) imgEl.crossOrigin = "anonymous";
      imgEl.onload = () => {
        try {
          canvas.width = Math.max(1, Math.round((imgEl.width * pct) / 100));
          canvas.height = Math.max(1, Math.round((imgEl.height * pct) / 100));
          ctx.drawImage(imgEl, (imgEl.width - canvas.width) / 2, (imgEl.height - canvas.height) / 2, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height);
          done(avgLuma(ctx, canvas.width, canvas.height));
        } catch { done(null); }
      };
      imgEl.onerror = () => done(null);
      imgEl.src = src;
      return;
    }
    const video = document.createElement("video");
    if (isRemote) video.crossOrigin = "anonymous";
    video.muted = true;
    video.playsInline = true;
    video.preload = "metadata";
    let settled = false;
    const release = () => { clearTimeout(timer); if (!settled) { settled = true; } video.removeAttribute("src"); video.load(); };
    const timer = window.setTimeout(() => { done(null); release(); }, 8000);
    const sample = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        canvas.width = Math.max(1, Math.round((video.videoWidth * pct) / 100));
        canvas.height = Math.max(1, Math.round((video.videoHeight * pct) / 100));
        ctx.drawImage(video, (video.videoWidth - canvas.width) / 2, (video.videoHeight - canvas.height) / 2, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height);
        done(avgLuma(ctx, canvas.width, canvas.height));
      } catch { done(null); }
      video.removeAttribute("src");
      video.load();
    };
    video.onloadedmetadata = () => { try { video.currentTime = Math.min(0.5, Math.max(0.1, video.duration * 0.01)); } catch { /* ignore */ } };
    video.onseeked = sample;
    video.onerror = () => { done(null); release(); };
    video.src = src;
  });
}

function RainmeterClock({ cfg, date, tone, color }: { cfg: RainmeterSettings; date: Date; tone: "lock" | "home"; color?: string }) {
  const time = rmTimeText(date, cfg.format24, cfg.showSeconds);
  const dayFull = date.toLocaleDateString(localeOf(LANG), { weekday: "long" }).toUpperCase();
  const dayShort = date.toLocaleDateString(localeOf(LANG), { weekday: "short" }).toUpperCase().replace(/\.$/, "");
  const dateLine = rmDateText(date, cfg.dateFormat, LANG).toUpperCase();
  const isNarrow = typeof window !== "undefined" && window.matchMedia("(max-width: 900px)").matches;
  const rmZ = 1;
  const rootStyle = { color: color ?? cfg.color, "--rm-accent": cfg.accent, "--rm-z": rmZ } as CSSProperties;
  const scaleStyle = { transform: `scale(${cfg.scale})` } as CSSProperties;
  const cls = `rm-clock rm-clock--${tone} rm-${cfg.skin}`;
  if (cfg.skin === "bigsur") {
    const bigSurDate = date.toLocaleDateString(localeOf(LANG), { weekday: "long", month: "long", day: "numeric" });
    return <div className={cls} style={rootStyle}><div className="rm-scale" style={scaleStyle}>
      <span className="rm-big-sur-date">{bigSurDate}</span>
      <strong className="rm-big-sur-time">{time}</strong>
      <span className="rm-big-sur-caption">{t("rm.day." + dayPartOf(date))}</span>
    </div></div>;
  }
  if (cfg.skin === "summit") {
    return <div className={cls} style={rootStyle}><div className="rm-scale" style={scaleStyle}>
      <span className="rm-summit-line" />
      <span className="rm-summit-greet">GOOD</span>
      <span className="rm-summit-part">{t(`rm.day.${dayPartOf(date)}`).toUpperCase()}</span>
      <span className="rm-summit-day">{dayShort}</span>
      <span className="rm-summit-date">{dateLine}</span>
      <span className={`rm-summit-time${cfg.format24 ? "" : " rm-summit-time--12h"}`}>{time}</span>
      <span className="rm-summit-line" />
    </div></div>;
  }
  if (cfg.skin === "default") {
    if (tone === "home") {
      return <div className={cls} style={rootStyle}><div className="rm-scale" style={scaleStyle}>
        <span className="rm-default-day">{dayFull}</span>
      </div></div>;
    }
    const fullDate = date.toLocaleDateString(localeOf(LANG), { day: "2-digit", month: "long", year: "numeric" }).toUpperCase();
    return <div className={cls} style={rootStyle}><div className="rm-scale" style={scaleStyle}>
      <span className="rm-default-day">{dayFull}</span>
      <span className="rm-default-date">{fullDate}</span>
      <span className="rm-default-time">- {time} -</span>
    </div></div>;
  }
  const mondDate = `${String(date.getDate()).padStart(2, "0")}  ${date.toLocaleDateString(localeOf(LANG), { month: "long" }).toUpperCase()}  ${date.getFullYear()}.`;
  return <div className={cls} style={rootStyle}><div className="rm-scale" style={scaleStyle}>
    <span className="rm-mond-day">{dayFull}</span>
    <span className="rm-mond-date">{cfg.dateFormat === "mond" ? mondDate : dateLine}</span>
    <span className="rm-mond-time">- {time} -</span>
  </div></div>;
}

function MondWeather() {
  const [weather, setWeather] = useState<{ city: string; temperature: number; condition: string } | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const locationResponse = await fetch("https://ipwho.is/", { cache: "no-store" });
        if (!locationResponse.ok) throw new Error("Location lookup failed");
        const location = await locationResponse.json() as { success?: boolean; city?: string; latitude?: number; longitude?: number };
        if (!location.success || typeof location.latitude !== "number" || typeof location.longitude !== "number") throw new Error("Location unavailable");
        const params = new URLSearchParams({ latitude: String(location.latitude), longitude: String(location.longitude), current: "temperature_2m,weather_code", temperature_unit: "fahrenheit", timezone: "auto" });
        const weatherResponse = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`, { cache: "no-store" });
        if (!weatherResponse.ok) throw new Error("Weather lookup failed");
        const data = await weatherResponse.json() as { current?: { temperature_2m?: number; weather_code?: number } };
        const code = Number(data.current?.weather_code ?? -1);
        const conditions: Record<number, string> = { 0: "Clear", 1: "Mostly clear", 2: "Partly cloudy", 3: "Cloudy", 45: "Fog", 48: "Fog", 51: "Drizzle", 53: "Drizzle", 55: "Drizzle", 61: "Rain", 63: "Rain", 65: "Heavy rain", 71: "Snow", 73: "Snow", 75: "Heavy snow", 80: "Showers", 81: "Showers", 82: "Heavy showers", 95: "Thunderstorm", 96: "Thunderstorm", 99: "Thunderstorm" };
        if (alive && typeof data.current?.temperature_2m === "number") {
          setWeather({ city: location.city || "Local weather", temperature: Math.round(data.current.temperature_2m), condition: conditions[code] ?? "Current conditions" });
          setFailed(false);
        } else throw new Error("Weather data unavailable");
      } catch {
        if (alive) setFailed(true);
      }
    };
    void load();
    const interval = window.setInterval(() => { void load(); }, 30 * 60 * 1000);
    return () => { alive = false; window.clearInterval(interval); };
  }, []);
  return <div className="rm-mond-weather" aria-live="polite">
    <Cloud size={15} strokeWidth={1.7} />
    {weather ? <><span>{weather.city}</span><span className="rm-weather-dot">·</span><strong>{weather.temperature}°F</strong><span className="rm-weather-dot">·</span><span>{weather.condition}</span></> : <span>{failed ? "Weather unavailable" : "Loading local weather…"}</span>}
  </div>;
}

function RainmeterWidget({ cfg, date, tone, wallpaper, onAlternative }: { cfg: RainmeterSettings; date: Date; tone: "lock" | "home"; wallpaper?: PickerWallpaper; onAlternative?: () => void }) {
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [autoColor, setAutoColor] = useState<string | null>(null);
  const dragRef = useRef<{ dx: number; dy: number } | null>(null);
  const targetRef = useRef<{ x: number; y: number } | null>(null);
  const didDrag = useRef(false);

  const wallpaperSrc = wallpaper?.image ?? wallpaper?.videoLow ?? wallpaper?.video ?? "";
  useEffect(() => {
    if (!cfg.autoTextColor || !wallpaperSrc) { setAutoColor(null); return; }
    let alive = true;
    analyzeCenterLuminance(wallpaperSrc, cfg.centerRegionPct).then((luma) => {
      if (!alive) return;
      if (luma === null) { setAutoColor(null); return; }
      if (luma < (cfg.darkThreshold / 100) * 255) setAutoColor("#ffffff");
      else if (luma > (cfg.lightThreshold / 100) * 255) setAutoColor("#0d1117");
      else setAutoColor(null);
    });
    return () => { alive = false; };
  }, [cfg.autoTextColor, cfg.darkThreshold, cfg.lightThreshold, cfg.centerRegionPct, wallpaperSrc]);

  useEffect(() => {
    if (cfg.position === "free") setDragPos({ x: cfg.posX, y: cfg.posY });
    else setDragPos(null);
  }, [cfg.position, cfg.posX, cfg.posY]);

  const commit = (patch: Partial<RainmeterSettings>) => {
    storage.write("rainmeter-config", { ...cfg, ...patch });
    window.dispatchEvent(new CustomEvent("rainmeter-config-updated"));
    setMenu(null);
  };

  const handleDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest(".rm-context-menu, .rm-menu-backdrop")) return;
    if (!cfg.draggable || event.button !== 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    dragRef.current = { dx: event.clientX - rect.left, dy: event.clientY - rect.top };
    targetRef.current = null;
    didDrag.current = false;
    setDragging(true);
    setMenu(null);
    try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* ignore */ }
    event.preventDefault();
  };

  const handleMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    didDrag.current = true;
    const dx = event.clientX - dragRef.current.dx;
    const dy = event.clientY - dragRef.current.dy;
    const x = Math.min(100, Math.max(0, (dx / window.innerWidth) * 100));
    const y = Math.min(100, Math.max(0, (dy / window.innerHeight) * 100));
    targetRef.current = { x, y };
    setDragPos({ x, y });
  };

  const handleUp = () => {
    if (!dragRef.current) return;
    dragRef.current = null;
    setDragging(false);
    const target = targetRef.current;
    targetRef.current = null;
    if (target) commit({ position: "free", posX: target.x, posY: target.y });
  };

  const handleClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (didDrag.current) {
      didDrag.current = false;
      event.stopPropagation();
    }
  };

  const handleContext = (event: ReactMouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setMenu({ x: event.clientX, y: event.clientY });
  };

  const free = dragPos ?? (cfg.position === "free" ? { x: cfg.posX, y: cfg.posY } : null);
  const style: CSSProperties = free
    ? { left: `${free.x}%`, top: `${free.y}%`, transform: "none" }
    : rmAnchorStyle(cfg.position, cfg.marginH, cfg.marginV);

  return <div
    className={`rm-widget ${cfg.draggable ? "" : "rm-widget--static"} ${dragging ? "rm-dragging" : ""}`}
    style={style}
    onPointerDown={handleDown}
    onPointerMove={handleMove}
    onPointerUp={handleUp}
    onPointerCancel={handleUp}
    onClick={handleClick}
    onContextMenu={handleContext}
  >
    <RainmeterClock cfg={cfg} date={date} tone={tone} color={autoColor ?? undefined} />
    {cfg.skin === "mond" && tone === "home" ? <MondWeather /> : null}
    {menu ? <>
      <div className="rm-menu-backdrop" onClick={() => setMenu(null)} onContextMenu={(event) => { event.preventDefault(); event.stopPropagation(); setMenu(null); }} />
      <div className="rm-context-menu" style={{ left: menu.x, top: menu.y }}>
        <button className="rm-menu-row" onClick={() => commit({ draggable: !cfg.draggable })}>
          <span className={`rm-menu-check ${cfg.draggable ? "on" : ""}`}>{cfg.draggable ? <Check size={12} strokeWidth={3} /> : null}</span>
          Draggable
        </button>
        {onAlternative ? <button className="rm-menu-row" onClick={() => { setMenu(null); onAlternative(); }}><SlidersHorizontal size={14} /> Alternative</button> : null}
        <div className="rm-menu-sep" />
        <button className="rm-menu-row rm-menu-danger" onClick={() => commit({ showClock: false })}>Unload skin</button>
      </div>
    </> : null}
  </div>;
}

type CinefyTrack = {
  trackId: number;
  trackName: string;
  artistName: string;
  collectionName: string;
  artworkUrl100: string;
  previewUrl: string;
  trackViewUrl: string;
  primaryGenreName: string;
  fullUrl?: string;
  color?: string;
};

type MarketCategory = "extensions" | "themes" | "snippets";
type MarketItem = { id: string; name: string; by: string; version: string; desc: string; category: MarketCategory; glyph: "theme" | "extension" | "snippet"; color: string; art?: string };
type HazyConfig = { enabled: boolean; custom: boolean; url: string; colorOn: boolean; color: string; tint: number; blur: number; contrast: number; saturation: number; brightness: number; size: number };
const DEFAULT_HAZY: HazyConfig = { enabled: true, custom: false, url: "", colorOn: false, color: "#8b5cf6", tint: 0.28, blur: 0, contrast: 104, saturation: 114, brightness: 88, size: 1 };
type SpicetifyTab = "home" | "search" | "liked" | "playlist" | "marketplace" | "hazy" | "nowplaying";
type Playlist = { id: number; name: string; trackIds: number[] };
type TrackCache = Record<number, CinefyTrack>;
type LyricLine = { time: number; text: string };

const FULL_LIBRARY: CinefyTrack[] = [
  { trackId: -1, trackName: "Starboy", artistName: "The Weeknd", collectionName: "Full Length", artworkUrl100: "https://archive.org/download/starboy_202407/Starboy.png", previewUrl: "", trackViewUrl: "https://archive.org/details/starboy_202407", primaryGenreName: "R&B", fullUrl: "https://archive.org/download/starboy_202407/Starboy.mp3", color: "linear-gradient(135deg,#c0392b,#6b1d12)" },
  { trackId: -2, trackName: "Afterglow", artistName: "SoundHelix", collectionName: "Full Length", artworkUrl100: "https://picsum.photos/seed/vertex-afterglow/600/600", previewUrl: "", trackViewUrl: "", primaryGenreName: "Electronic", fullUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3", color: "linear-gradient(135deg,#1db954,#0b6e38)" },
  { trackId: -3, trackName: "Neon Drift", artistName: "SoundHelix", collectionName: "Full Length", artworkUrl100: "https://picsum.photos/seed/vertex-neon/600/600", previewUrl: "", trackViewUrl: "", primaryGenreName: "Electronic", fullUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3", color: "linear-gradient(135deg,#0b84ff,#051f4d)" },
  { trackId: -4, trackName: "Midnight Loop", artistName: "SoundHelix", collectionName: "Full Length", artworkUrl100: "https://picsum.photos/seed/vertex-midnight/600/600", previewUrl: "", trackViewUrl: "", primaryGenreName: "Electronic", fullUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3", color: "linear-gradient(135deg,#8b5cf6,#2e1065)" },
  { trackId: -5, trackName: "Golden Hour", artistName: "SoundHelix", collectionName: "Full Length", artworkUrl100: "https://picsum.photos/seed/vertex-golden/600/600", previewUrl: "", trackViewUrl: "", primaryGenreName: "Downtempo", fullUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3", color: "linear-gradient(135deg,#f59e0b,#7c3a00)" },
  { trackId: -6, trackName: "Liquid Sky", artistName: "SoundHelix", collectionName: "Full Length", artworkUrl100: "https://picsum.photos/seed/vertex-liquid/600/600", previewUrl: "", trackViewUrl: "", primaryGenreName: "Electronic", fullUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3", color: "linear-gradient(135deg,#06b6d4,#083344)" },
  { trackId: -7, trackName: "Static Bloom", artistName: "SoundHelix", collectionName: "Full Length", artworkUrl100: "https://picsum.photos/seed/vertex-static/600/600", previewUrl: "", trackViewUrl: "", primaryGenreName: "Electronic", fullUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3", color: "linear-gradient(135deg,#ec4899,#500724)" },
  { trackId: -8, trackName: "Paper Planes", artistName: "SoundHelix", collectionName: "Full Length", artworkUrl100: "https://picsum.photos/seed/vertex-paper/600/600", previewUrl: "", trackViewUrl: "", primaryGenreName: "Midtempo", fullUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3", color: "linear-gradient(135deg,#22c55e,#14532d)" },
  { trackId: -9, trackName: "Glass Avenue", artistName: "SoundHelix", collectionName: "Full Length", artworkUrl100: "https://picsum.photos/seed/vertex-glass/600/600", previewUrl: "", trackViewUrl: "", primaryGenreName: "Electronic", fullUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3", color: "linear-gradient(135deg,#a3a3f6,#312e81)" },
  { trackId: -10, trackName: "Monkeys Spinning Monkeys", artistName: "Kevin MacLeod", collectionName: "Full Length", artworkUrl100: "https://picsum.photos/seed/vertex-monkeys/600/600", previewUrl: "", trackViewUrl: "", primaryGenreName: "Library", fullUrl: "https://incompetech.com/music/royalty-free/mp3-royaltyfree/Monkeys%20Spinning%20Monkeys.mp3", color: "linear-gradient(135deg,#f97316,#7c2d12)" },
  { trackId: -11, trackName: "Fluffing a Duck", artistName: "Kevin MacLeod", collectionName: "Full Length", artworkUrl100: "https://picsum.photos/seed/vertex-duck/600/600", previewUrl: "", trackViewUrl: "", primaryGenreName: "Library", fullUrl: "https://incompetech.com/music/royalty-free/mp3-royaltyfree/Fluffing%20a%20Duck.mp3", color: "linear-gradient(135deg,#14b8a6,#134e4a)" },
  { trackId: -12, trackName: "Fast Talkin", artistName: "Kevin MacLeod", collectionName: "Full Length", artworkUrl100: "https://picsum.photos/seed/vertex-fasttalk/600/600", previewUrl: "", trackViewUrl: "", primaryGenreName: "Library", fullUrl: "https://incompetech.com/music/royalty-free/mp3-royaltyfree/Fast%20Talkin.mp3", color: "linear-gradient(135deg,#ef4444,#450a0a)" },
  { trackId: -13, trackName: "Solaris", artistName: "SoundHelix", collectionName: "Full Length", artworkUrl100: "https://picsum.photos/seed/vertex-solaris/600/600", previewUrl: "", trackViewUrl: "", primaryGenreName: "Electronic", fullUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-12.mp3", color: "linear-gradient(135deg,#eab308,#3f2d04)" },
  { trackId: -14, trackName: "Aurora", artistName: "SoundHelix", collectionName: "Full Length", artworkUrl100: "https://picsum.photos/seed/vertex-aurora/600/600", previewUrl: "", trackViewUrl: "", primaryGenreName: "Electronic", fullUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-16.mp3", color: "linear-gradient(135deg,#6366f1,#1e1b4b)" },
  { trackId: -15, trackName: "Cobalt Drift", artistName: "SoundHelix", collectionName: "Full Length", artworkUrl100: "https://picsum.photos/seed/vertex-cobalt/600/600", previewUrl: "", trackViewUrl: "", primaryGenreName: "Tech House", fullUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3", color: "linear-gradient(135deg,#3b82f6,#1e3a8a)" },
  { trackId: -16, trackName: "Solar Flare", artistName: "SoundHelix", collectionName: "Full Length", artworkUrl100: "https://picsum.photos/seed/vertex-solar/600/600", previewUrl: "", trackViewUrl: "", primaryGenreName: "Electronic", fullUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3", color: "linear-gradient(135deg,#f97316,#7c2d12)" },
  { trackId: -17, trackName: "Pulse Line", artistName: "SoundHelix", collectionName: "Full Length", artworkUrl100: "https://picsum.photos/seed/vertex-pulse/600/600", previewUrl: "", trackViewUrl: "", primaryGenreName: "Synthwave", fullUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-11.mp3", color: "linear-gradient(135deg,#d946ef,#701a75)" },
  { trackId: -18, trackName: "Canyon Echo", artistName: "SoundHelix", collectionName: "Full Length", artworkUrl100: "https://picsum.photos/seed/vertex-canyon/600/600", previewUrl: "", trackViewUrl: "", primaryGenreName: "Downtempo", fullUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-13.mp3", color: "linear-gradient(135deg,#84cc16,#365314)" },
  { trackId: -19, trackName: "Prism Walk", artistName: "SoundHelix", collectionName: "Full Length", artworkUrl100: "https://picsum.photos/seed/vertex-prism/600/600", previewUrl: "", trackViewUrl: "", primaryGenreName: "Electronica", fullUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-14.mp3", color: "linear-gradient(135deg,#f43f5e,#881337)" },
  { trackId: -20, trackName: "Night Circuit", artistName: "SoundHelix", collectionName: "Full Length", artworkUrl100: "https://picsum.photos/seed/vertex-night/600/600", previewUrl: "", trackViewUrl: "", primaryGenreName: "Synthpop", fullUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-15.mp3", color: "linear-gradient(135deg,#0ea5e9,#0c4a6e)" },
  { trackId: -21, trackName: "Carefree", artistName: "Kevin MacLeod", collectionName: "Full Length", artworkUrl100: "https://picsum.photos/seed/vertex-carefree/600/600", previewUrl: "", trackViewUrl: "", primaryGenreName: "Library", fullUrl: "https://incompetech.com/music/royalty-free/mp3-royaltyfree/Carefree.mp3", color: "linear-gradient(135deg,#10b981,#065f46)" },
  { trackId: -22, trackName: "Investigations", artistName: "Kevin MacLeod", collectionName: "Full Length", artworkUrl100: "https://picsum.photos/seed/vertex-invest/600/600", previewUrl: "", trackViewUrl: "", primaryGenreName: "Library", fullUrl: "https://incompetech.com/music/royalty-free/mp3-royaltyfree/Investigations.mp3", color: "linear-gradient(135deg,#64748b,#1e293b)" },
  { trackId: -23, trackName: "Firebrand", artistName: "Kevin MacLeod", collectionName: "Full Length", artworkUrl100: "https://picsum.photos/seed/vertex-firebrand/600/600", previewUrl: "", trackViewUrl: "", primaryGenreName: "Library", fullUrl: "https://incompetech.com/music/royalty-free/mp3-royaltyfree/Firebrand.mp3", color: "linear-gradient(135deg,#dc2626,#450a0a)" },
  { trackId: -24, trackName: "Killers", artistName: "Kevin MacLeod", collectionName: "Full Length", artworkUrl100: "https://picsum.photos/seed/vertex-killers/600/600", previewUrl: "", trackViewUrl: "", primaryGenreName: "Library", fullUrl: "https://incompetech.com/music/royalty-free/mp3-royaltyfree/Killers.mp3", color: "linear-gradient(135deg,#7c3aed,#2e1065)" },
];

function parseLrc(text: string): LyricLine[] {
  const lines: LyricLine[] = [];
  const tagRe = /\[(\d{1,2}):(\d{1,2})(?:[.:](\d{1,3}))?\]/g;
  for (const raw of text.split(/\r?\n/)) {
    const matches = Array.from(raw.matchAll(tagRe));
    const content = raw.replace(tagRe, "").trim();
    if (!content || content.startsWith("[")) continue;
    for (const match of matches) {
      const minutes = Number(match[1]);
      const seconds = Number(match[2]);
      const fractionRaw = match[3] ?? "0";
      const fraction = fractionRaw.length === 2 ? Number(fractionRaw) / 100 : Number(fractionRaw) / 1000;
      lines.push({ time: minutes * 60 + seconds + fraction, text: content });
    }
  }
  return lines.sort((a, b) => a.time - b.time);
}

function estimateLyricTimes(lines: string[], total: number): LyricLine[] {
  const weights = lines.map((line) => Math.max(1, line.split(/\s+/).filter(Boolean).length));
  const sum = weights.reduce((a, b) => a + b, 0) || 1;
  let cursor = 0;
  return lines.map((text, i) => {
    const out: LyricLine = { time: cursor, text };
    cursor += (weights[i] / sum) * total;
    return out;
  });
}

function renderLyricText(line: LyricLine, live: boolean, progress: number): ReactNode {
  if (!live) return line.text;
  const tokens = line.text.split(/\s+/).filter(Boolean);
  if (!tokens.length) return line.text;
  const lit = Math.max(1, Math.min(tokens.length, Math.round(tokens.length * Math.max(0, Math.min(1, progress)))));
  return <>{tokens.map((token, wi) => <span key={wi} className={wi < lit ? "sung" : "upcoming"}>{token}{wi < tokens.length - 1 ? " " : ""}</span>)}</>;
}

function BeautifulLyricsPanel({ track, lines, lyricIndex, lineProgress, playing, progress, duration, timeNow, timeTotal, synced, offset, onOffset, onSyncNow, strings }: {
  track: CinefyTrack;
  lines: LyricLine[];
  lyricIndex: number;
  lineProgress: number;
  playing: boolean;
  progress: number;
  duration: number;
  timeNow: string;
  timeTotal: string;
  synced: boolean;
  offset: number;
  onOffset: (v: number) => void;
  onSyncNow: () => void;
  strings: { title: string; noLyrics: string; full: string; collapse: string; synced: string; estimate: string; syncNow: string };
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<(HTMLParagraphElement | null)[]>([]);
  const userScrollRef = useRef(false);
  const userScrollTimer = useRef(0);
  const [full, setFull] = useState(false);
  const [hueBase] = useState(() => Math.abs((track.trackId * 137.508) % 360));
  const art = track.artworkUrl100.replace("100x100", "600x600");
  const h2 = (hueBase + 42) % 360;
  const h3 = (hueBase - 42 + 360) % 360;
  const particles = useMemo(() => Array.from({ length: 10 }, (_, i) => ({
    left: ((i * 37 + 11) % 94) + 2,
    top: ((i * 23 + 17) % 70) + 8,
    size: 2 + ((i * 5) % 5),
    delay: (i % 5) * 0.9,
    dur: 12 + (i % 4) * 5,
    hue: (hueBase + i * 41) % 360,
  })), [hueBase]);

  function tilt(clientX: number, clientY: number) {
    const el = stageRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (clientX - rect.left) / rect.width - 0.5;
    const y = (clientY - rect.top) / rect.height - 0.5;
    el.style.setProperty("--bl-rx", `${(-y * 3.5).toFixed(2)}deg`);
    el.style.setProperty("--bl-ry", `${(x * 5).toFixed(2)}deg`);
  }

  function resetTilt() {
    const el = stageRef.current;
    if (!el) return;
    el.style.setProperty("--bl-rx", "0deg");
    el.style.setProperty("--bl-ry", "0deg");
  }

  function markUserScroll() {
    userScrollRef.current = true;
    window.clearTimeout(userScrollTimer.current);
    userScrollTimer.current = window.setTimeout(() => { userScrollRef.current = false; }, 2500);
  }

  useEffect(() => {
    if (full || userScrollRef.current) return;
    const el = lineRefs.current[lyricIndex];
    if (el && listRef.current) listRef.current.scrollTo({ top: Math.max(0, el.offsetTop - 120), behavior: "smooth" });
  }, [lyricIndex, full]);

  useEffect(() => () => window.clearTimeout(userScrollTimer.current), []);

  const ratio = duration > 0 ? Math.max(0, Math.min(1, progress / duration)) : 0;

  return <div className="bl-panel" style={{ "--bl-h1": hueBase, "--bl-h2": h2, "--bl-h3": h3 } as CSSProperties}>
    <div className="bl-panel-bg" aria-hidden="true">
      <img className="bl-panel-art" src={art} alt="" draggable={false} />
      {particles.map((p, i) => <span key={i} className="bl-particle" style={{ left: `${p.left}%`, top: `${p.top}%`, width: p.size, height: p.size, animationDelay: `${p.delay}s`, animationDuration: `${p.dur}s`, background: `hsl(${p.hue} 95% 72% / .85)`, boxShadow: `0 0 ${p.size * 3}px hsl(${p.hue} 95% 65% / .7)` }} />)}
      <span className="bl-aurora bl-a1" />
      <span className="bl-aurora bl-a2" />
      <span className="bl-veil" />
    </div>
    <div className="bl-panel-body" ref={stageRef} onPointerMove={(e) => tilt(e.clientX, e.clientY)} onPointerLeave={resetTilt}>
      <div className="bl-head">
        <span className="bl-vinyl-mini" style={{ backgroundImage: `url(${art})` }} aria-hidden="true" />
        <span className="bl-title">{strings.title}</span>
        <span className="bl-badge">BL</span>
        <span className={`bl-sync ${synced ? "synced" : "estimate"}`}>{synced ? strings.synced : strings.estimate}</span>
        {lines.length > 0 && <button className="bl-full" onClick={() => setFull((v) => !v)}>{full ? strings.collapse : strings.full}</button>}
      </div>
      {synced && lines.length > 0 && <div className="bl-syncrow" data-testid="bl-syncrow">
        <button data-testid="bl-nudge-dn" onClick={() => onOffset(Math.round((offset - 0.25) * 100) / 100)} aria-label="Shift lyrics 0.25s earlier">−0.25</button>
        <span className={`bl-offset ${offset ? "active" : ""}`}>{offset > 0 ? "+" : ""}{offset.toFixed(2)}s</span>
        <button data-testid="bl-nudge-up" onClick={() => onOffset(Math.round((offset + 0.25) * 100) / 100)} aria-label="Shift lyrics 0.25s later">+0.25</button>
        <button className="bl-resync" data-testid="bl-sync-now" onClick={onSyncNow} aria-label={strings.syncNow}><RotateCcw size={11} /> {strings.syncNow}</button>
        {offset !== 0 && <button className="bl-resync bl-reset" onClick={() => onOffset(0)} aria-label="Reset sync offset">↺ 0</button>}
      </div>}
      {lines.length === 0
        ? <div className="bl-empty"><span className="bl-eq"><span /><span /><span /></span><div>{strings.noLyrics}</div></div>
        : <div className={`bl-list ${full ? "full" : "clip"}`} ref={listRef} onWheel={markUserScroll} onPointerDown={markUserScroll} onTouchStart={markUserScroll}>
            {lines.map((line, i) => {
              if (i !== lyricIndex) {
                return <p key={i} ref={(el) => { lineRefs.current[i] = el; }} className="bl-cl">{line.text}</p>;
              }
              const words = line.text.split(/\s+/).filter(Boolean);
              const lit = Math.max(0, Math.min(words.length, Math.round(words.length * Math.max(0, Math.min(1, lineProgress)))));
              return <p key={i} ref={(el) => { lineRefs.current[i] = el; }} className="bl-cl active">
                <span className="bl-words" key={`w-${lyricIndex}`}>{words.map((w, wi) => <span key={wi} className={`bl-word ${wi < lit ? "lit" : ""}`} style={{ animationDelay: `${wi * 45}ms` }}>{w}</span>)}</span>
                <span className="bl-pline"><span style={{ width: `${lineProgress * 100}%` }} /></span>
              </p>;
            })}
          </div>}
      <div className="bl-foot">
        <span className="bl-time">{timeNow} / {timeTotal}</span>
        <div className="bl-bar"><span style={{ width: `${ratio * 100}%` }} /></div>
      </div>
    </div>
  </div>;
}

const SPLASH_LINES = [t("sp.splash0"), t("sp.splash1"), t("sp.splash2"), t("sp.splash3"), t("sp.splash4"), t("sp.splash5")];

const MARKETPLACE_ITEMS: MarketItem[] = [
  { id: "hazy-astromations", name: "Hazy Astromations", by: "drea.mz", version: "1.2.0", desc: t("market.desc.hazy"), category: "themes", glyph: "theme", color: "linear-gradient(135deg,#7c3aed,#38bdf8 55%,#f0abfc)", art: "images/hazy-art.png" },
  { id: "starry-nights", name: "StarryNights", by: "spicetify-themes", version: "full", desc: t("market.desc.starry"), category: "themes", glyph: "theme", color: "linear-gradient(135deg,#101b2e,#4687d6 60%,#fff3c4)", art: "images/starry-night-preview.png" },
  { id: "beautiful-lyrics", name: "Beautiful Lyrics", by: "surfbryce", version: "4.2.0", desc: t("market.desc.beautiful"), category: "extensions", glyph: "extension", color: "linear-gradient(135deg,#a78bfa,#22d3ee 60%,#f472b6)", art: MCC_LOGO_URL },
  { id: "sonic-dancing", name: "Sonic Dancing", by: "vertex.labs", version: "1.0.0", desc: t("market.desc.sonic"), category: "snippets", glyph: "snippet", color: "linear-gradient(135deg,#0284c7,#38bdf8)", art: "images/sonic-dancing.png" },
];

function BrandMark() {
  return <span className="brand-mark"><img className="brand-mark-logo" src={MCC_LOGO_URL} alt="" /><span>McCrack Studios</span></span>;
}

function AvatarGlyph({ value, name, size = 34 }: { value?: string; name: string; size?: number }) {
  if (value) {
    if (value.startsWith("preset:")) {
      return <span style={{ fontSize: Math.round(size * 0.5), lineHeight: 1 }}>{value.slice(7)}</span>;
    }
    return <img className="account-avatar-img" src={value} alt="" style={{ width: size, height: size }} />;
  }
  return <span style={{ fontSize: Math.round(size * 0.44) }}>{name.slice(0, 1).toUpperCase()}</span>;
}

function AppIcon({ app, size = 21 }: { app: { icon: LucideIcon; iconImg?: string; iconUrl?: string; squircle?: boolean }; size?: number }) {
  const src = app.iconUrl || app.iconImg;
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  useEffect(() => { setFailedSrc(null); }, [src]);
  const Icon = app.icon;
  if (src && failedSrc !== src) {
    return <img className={`app-icon-img${app.squircle ? " icon-squircle" : ""}`} src={src} alt="" style={{ width: size, height: size }} onError={() => setFailedSrc(src)} />;
  }
  return <Icon size={size} strokeWidth={1.55} />;
}

function App() {
  const [phase, setPhase] = useState<"boot" | "profile" | "lock" | "picker" | "signin" | "desktop">("boot");
  const [bootVideo, setBootVideo] = useState(false);
  const [accounts, setAccounts] = useState<VertexAccount[]>(() => readAccounts());
  const [activeAccount, setActiveAccount] = useState<VertexAccount | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<VertexAccount | null>(null);
  const [profileName, setProfileName] = useState("");
  const [profilePass, setProfilePass] = useState("");
  const [profilePass2, setProfilePass2] = useState("");
  const [profileAvatar, setProfileAvatar] = useState("");
  const [profileErr, setProfileErr] = useState("");
  const [profileAskPass, setProfileAskPass] = useState(false);
  const [loginName, setLoginName] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [loginErr, setLoginErr] = useState("");
  const [gvInbox, setGvInbox] = useState<GvIncoming[]>([]);
  const gvPrevSnap = useRef<GvSnap | null>(null);
  const gvFrameAt = useRef(0);
  const gvStartedRef = useRef<string | null>(null);
  const [gvEngineReady, setGvEngineReady] = useState(false);
  
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState(false);
  const [mobileWarning, setMobileWarning] = useState(() => window.innerWidth < 760);
  const [now, setNow] = useState(() => new Date());
  const [dockViewport, setDockViewport] = useState(() => ({ width: window.innerWidth, height: window.innerHeight }));
  useEffect(() => {
    const resize = () => setDockViewport({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);
  const rmCfg = readRainmeterConfig();
  const [, setRmTick] = useState(0);
  useEffect(() => {
    const bump = () => setRmTick((value) => value + 1);
    window.addEventListener("rainmeter-config-updated", bump);
    return () => window.removeEventListener("rainmeter-config-updated", bump);
  }, []);
  const [chosenLang, setChosenLang] = useState<Lang>(() => readLang());
  const [languageOpen, setLanguageOpen] = useState(() => !storage.read("vertex-language-set", false));
  const homeVideoRef = useRef<HTMLVideoElement>(null);
  const lockVideoRef = useRef<HTMLVideoElement>(null);
  const bootVideoRef = useRef<HTMLVideoElement>(null);
  const bootEnters = useRef(0);
  const [wallpaper, setWallpaper] = useState<WallpaperId>(() => storage.read("vertex-wallpaper-v2", SEASON_WALLPAPER));
  const [lockWallpaper, setLockWallpaper] = useState<WallpaperId>(() => storage.read("vertex-lock-wallpaper-v2", SEASON_WALLPAPER));
  const [iconSize, setIconSize] = useState<"small" | "medium" | "large">(() => storage.read("vertex-icon-size", "medium"));
  const [showDesktopIcons, setShowDesktopIcons] = useState(() => storage.read("vertex-show-icons", false));
  const [customCursor, setCustomCursor] = useState(() => storage.read("vertex-custom-cursor", false));
  const [pressFx, setPressFx] = useState(() => storage.read("vertex-press-fx", false));
  const [personalizeOpen, setPersonalizeOpen] = useState(false);
  const [translucentOpen, setTranslucentOpen] = useState(false);
  const [wpPickerOpen, setWpPickerOpen] = useState(false);
  const [customWallpapers, setCustomWallpapers] = useState<PickerWallpaper[]>(() => readCustomWallpapersLocal());
  const [customsLoaded, setCustomsLoaded] = useState(false);
const [wppInstalled, setWppInstalled] = useState<boolean>(() => 
storage.read("vertex-wpp-installed", false));
const [jarvisInstalled, setJarvisInstalled] = useState<boolean>(() => 
storage.read("vertex-jarvis-installed", false));
  const [startOpen, setStartOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [dockOverflowOpen, setDockOverflowOpen] = useState(false);
  const [drawerQuery, setDrawerQuery] = useState("");
  const [drawerSection, setDrawerSection] = useState<string>("all");
  const [startQuery, setStartQuery] = useState("");
  const [previewId, setPreviewId] = useState<AppId | null>(null);
  const [previewPos, setPreviewPos] = useState<{ left: number; top: number } | null>(null);
  const previewCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [taskbarPos, setTaskbarPos] = useState<TaskbarPos>(() => {
    const saved = storage.read<string>("vertex-taskbar-position", "bottom");
    return saved === "top" || saved === "left" || saved === "right" || saved === "bottom" ? saved : "bottom";
  });
  const moveTaskbar = (pos: TaskbarPos) => {
    setTaskbarPos(pos);
    storage.write("vertex-taskbar-position", pos);
    if (previewCloseTimer.current) { clearTimeout(previewCloseTimer.current); previewCloseTimer.current = null; }
    setPreviewId(null);
    setPreviewPos(null);
    setDockMenu(null);
  };

  const openTaskPreview = (event: ReactMouseEvent<HTMLButtonElement>, appId: AppId) => {
    if (previewCloseTimer.current) { clearTimeout(previewCloseTimer.current); previewCloseTimer.current = null; }
    const rect = event.currentTarget.getBoundingClientRect();
    const vw = typeof window !== "undefined" ? window.innerWidth : 1280;
    const vh = typeof window !== "undefined" ? window.innerHeight : 800;
    const cw = 324;
    const ch = 234;
    let left: number;
    let top: number;
    if (taskbarPos === "top") {
      left = Math.max(12, Math.min(rect.left + rect.width / 2 - cw / 2, vw - cw - 12));
      top = Math.max(8, rect.bottom + 12);
    } else if (taskbarPos === "left") {
      left = Math.max(8, rect.right + 12);
      top = Math.max(12, Math.min(rect.top + rect.height / 2 - ch / 2, vh - ch - 12));
    } else if (taskbarPos === "right") {
      left = Math.min(vw - cw - 8, Math.max(12, rect.left - cw - 12));
      top = Math.max(12, Math.min(rect.top + rect.height / 2 - ch / 2, vh - ch - 12));
    } else {
      left = Math.max(12, Math.min(rect.left + rect.width / 2 - cw / 2, vw - cw - 12));
      top = Math.max(10, rect.top - ch - 12);
    }
    setPreviewPos({ left, top });
    setPreviewId(appId);
  };
  const keepTaskPreview = () => {
    if (previewCloseTimer.current) { clearTimeout(previewCloseTimer.current); previewCloseTimer.current = null; }
  };
  const pendingHideTaskPreview = () => {
    if (previewCloseTimer.current) { clearTimeout(previewCloseTimer.current); previewCloseTimer.current = null; }
    previewCloseTimer.current = setTimeout(() => {
      setPreviewId(null);
      setPreviewPos(null);
    }, 170);
  };
  const hideTaskPreview = () => {
    if (previewCloseTimer.current) { clearTimeout(previewCloseTimer.current); previewCloseTimer.current = null; }
    setPreviewId(null);
    setPreviewPos(null);
  };
  const [dockMenu, setDockMenu] = useState<{ x: number; y: number } | null>(null);
  const openDockMenu = (event: ReactMouseEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setContextMenu(null); setAppMenu(null); 
    if (previewCloseTimer.current) { clearTimeout(previewCloseTimer.current); previewCloseTimer.current = null; }
    setPreviewId(null);
    setPreviewPos(null);
    const rect = event.currentTarget.getBoundingClientRect();
    const vw = typeof window !== "undefined" ? window.innerWidth : 1280;
    const vh = typeof window !== "undefined" ? window.innerHeight : 800;
    const MENU_W = 218;
    const MENU_H = 208;
    let left = event.clientX;
    let top = event.clientY;
    if (taskbarPos === "bottom") { left = event.clientX; top = rect.top - MENU_H - 10; }
    else if (taskbarPos === "top") { left = event.clientX; top = rect.bottom + 10; }
    else if (taskbarPos === "left") { left = rect.right + 10; top = event.clientY; }
    else { left = rect.left - MENU_W - 10; top = event.clientY; }
    left = Math.max(8, Math.min(left, vw - MENU_W - 8));
    top = Math.max(8, Math.min(top, vh - MENU_H - 8));
    setDockMenu({ x: left, y: top });
  };
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  apps = useMemo<AppDef[]>(() => [...baseApps], []);
  const [desktopApps, setDesktopApps] = useState<AppId[]>(() => {
    const saved = storage.read<AppId[]>("vertex-desktop-apps", []);
    const valid = Array.isArray(saved) ? saved.filter((id) => apps.some((app) => app.id === id)) : [];
    return valid.length ? valid : apps.slice(0, 6).map((app) => app.id);
  });
  const [ps5Shortcuts, setPs5Shortcuts] = useState<Ps5DesktopShortcut[]>(() => storage.read("vertex-ps5-desktop-shortcuts", []));
  useEffect(() => {
    const addShortcut = (event: Event) => {
      const shortcut = (event as CustomEvent<Ps5DesktopShortcut>).detail;
      if (!shortcut?.id || !shortcut.name || !shortcut.cover) return;
      setShowDesktopIcons(true);
      storage.write("vertex-show-icons", true);
      setPs5Shortcuts((previous) => {
        const next = [shortcut, ...previous.filter((item) => item.id !== shortcut.id)].slice(0, 48);
        storage.write("vertex-ps5-desktop-shortcuts", next);
        return next;
      });
    };
    const removeShortcut = (event: Event) => {
      const id = (event as CustomEvent<{ id?: string }>).detail?.id;
      if (!id) return;
      setPs5Shortcuts((previous) => {
        if (!previous.some((item) => item.id === id)) return previous;
        const next = previous.filter((item) => item.id !== id);
        storage.write("vertex-ps5-desktop-shortcuts", next);
        return next;
      });
    };
    window.addEventListener("vertex-ps5-create-shortcut", addShortcut);
    window.addEventListener("vertex-ps5-remove-shortcut", removeShortcut);
    return () => {
      window.removeEventListener("vertex-ps5-create-shortcut", addShortcut);
      window.removeEventListener("vertex-ps5-remove-shortcut", removeShortcut);
    };
  }, []);
  const [appOverrides, setAppOverrides] = useState<Record<string, AppOverride>>(() => {
    const saved = storage.read<Record<string, AppOverride>>("vertex-app-overrides", {});
    if (storage.read("mccrack-dock-v1-migrated", false)) return saved;
    const next = { ...saved };
    const defaults = new Set(["browser", "messages", "verai", "vertube", "movies", "settings"]);
    for (const app of baseApps) {
      const current = next[app.id] ?? {};
      if (defaults.has(app.id)) next[app.id] = { ...current, pinned: true };
      else if (current.pinned === true) next[app.id] = { ...current, pinned: false };
    }
    storage.write("mccrack-dock-v1-migrated", true);
    storage.write("vertex-app-overrides", next);
    return next;
  });
  const setFsocietyOverride = (active: boolean) => {
    setAppOverrides((prev) => {
      const current = prev.terminal ?? {};
      let nextTerminal: AppOverride;
      if (active) {
        nextTerminal = { ...current, name: "Arch Linux", iconUrl: ARCH_ICON };
      } else {
        const { name: _name, iconUrl: _iconUrl, ...rest } = current;
        nextTerminal = { ...rest };
      }
      const next: Record<string, AppOverride> = { ...prev };
      if (Object.keys(nextTerminal).length) next.terminal = nextTerminal;
      else delete next.terminal;
      storage.write("vertex-app-overrides", next);
      return next;
    });
  };
  const [appMenu, setAppMenu] = useState<{ appId: AppId; x: number; y: number } | null>(null);
  const [appMenuMode, setAppMenuMode] = useState<"default" | "icon">("default");
  const [appMenuPos, setAppMenuPos] = useState<{ x: number; y: number } | null>(null);
  const appMenuRef = useRef<HTMLDivElement>(null);
  const [renameValue, setRenameValue] = useState("");
  const [iconUrl, setIconUrl] = useState("");
  const [dragId, setDragId] = useState<AppId | null>(null);
  const [dockOrder, setDockOrder] = useState<AppId[]>(() => storage.read<AppId[]>("vertex-dock-order", []));
  const [dockDragId, setDockDragId] = useState<AppId | null>(null);
  const [placedCells, setPlacedCells] = useState<Record<string, number>>(() => storage.read<Record<string, number>>("vertex-desktop-cells", {}));
  const desktopGridRef = useRef<HTMLDivElement>(null);
  const [translucentTB, setTranslucentTB] = useState<boolean>(() => storage.read("vertex-translucenttb", false) !== false);
  const [windows, setWindows] = useState<WindowState[]>([]);
  const [activeWindow, setActiveWindow] = useState<AppId | null>(null);
  const gvWindowsRef = useRef<WindowState[]>([]);
  gvWindowsRef.current = windows;
  const [settings, setSettings] = useState<SystemSettings>(() => {
    const loaded = { ...defaultSettings, ...storage.read<Partial<SystemSettings>>("vertex-settings", {}) };
    if (loaded.cloak === "canvas") loaded.cloak = "none";
    if (!Array.isArray(loaded.tabHideImages) || !loaded.tabHideImages.length) loaded.tabHideImages = defaultSettings.tabHideImages;
    else {
      const builtins = defaultSettings.tabHideImages.filter((item) => !loaded.tabHideImages!.some((saved) => saved.id === item.id));
      loaded.tabHideImages = [...builtins, ...loaded.tabHideImages].map((item) => {
        const fresh = defaultSettings.tabHideImages.find((builtin) => builtin.id === item.id);
        return fresh && !item.id.startsWith("custom-") ? { ...item, src: fresh.src } : item;
      });
    }
    return loaded;
  });

  const resolveWallpaperImage = useCallback((id: string): string | null => {
    return wallImg(id);
  }, []);

  const buildGvSnap = useCallback((): GvSnap | null => {
    const acc = (() => { try { return JSON.parse(localStorage.getItem("vertex-ps5-account") ?? "null") as { username?: string } | null; } catch { return null; } })();
    const activeWp = [...wallpapers, ...customWallpapers].find((x) => x.id === wallpaper);
    let term: GvSnap["term"] = null;
    if (activeWindow === "terminal") {
      const el = document.querySelector<HTMLDivElement>(".term-output");
      if (el) {
        const text = (el.innerText || "").replace(/\n{3,}/g, "\n\n").trim();
        const prompt = document.querySelector<HTMLElement>(".term-entry .term-prompt")?.textContent ?? "vertex@vertex-os:~$";
        term = { prompt, lines: text.split("\n") };
      }
    }
    const activeHtml = document.querySelector(".desktop-shell.active") ?? document.querySelector(".desktop-shell");
    const html = activeHtml ? captureScreenHtml(".desktop-shell") : null;
    return {
      v: 1,
      t: Date.now(),
      user: acc?.username ?? (gvEngineReady ? "guest" : "?") ,
      wallpaper,
      wallpaperName: activeWp?.name ?? wallpaper,
      vpW: window.innerWidth,
      vpH: window.innerHeight,
      active: activeWindow,
      wins: windows.map((w) => ({ id: w.id, title: getApp(w.id, appOverrides).title, x: w.rect.x, y: w.rect.y, w: w.rect.w, h: w.rect.h, minimized: w.minimized, focused: activeWindow === w.id })),
      term,
      html: html ?? undefined,
      eh: html ? snapSig(html) : undefined,
    };
  }, [wallpaper, windows, activeWindow, appOverrides, customWallpapers, gvEngineReady, wallEngineEntries]);

  useEffect(() => { ghostSetSnapGetter(() => buildGvSnap()); }, [buildGvSnap]);

  useEffect(() => {
    // lazily (re)start the GhostView engine whenever a session account appears
    const iv = window.setInterval(() => {
      const acc = (() => { try { return JSON.parse(localStorage.getItem("vertex-ps5-account") ?? "null") as { username?: string } | null; } catch { return null; } })();
      const code = acc?.username ?? null;
      if (!code) { gvStartedRef.current = null; return; }
      if (gvStartedRef.current === code) return;
      gvStartedRef.current = code;
      setGvEngineReady(true);
      ghostWinCloser = () => {
        setWindows((prev) => prev.filter((w) => w.id !== "ghostview"));
        setActiveWindow((prev) => (prev === "ghostview" ? null : prev));
      };
      startGhostView(code, {
        onStatus: (msg) => pushMsFeed(msg),
        onPayload: (item) => {
          setGvInbox((prev) => prev.some((x) => x.token === item.token) ? prev : [...prev, item]);
          addToast("Incoming download", `${item.file} · from ${item.from}`);
        },
        onSessionOpen: (peerCode, token) => {
          window.setTimeout(() => {
            setStartOpen(false); setDrawerOpen(false);
            setWindows((prev) => prev.some((x) => x.id === "ghostview") ? prev : [...prev, { id: "ghostview", minimized: false, maximized: false, rect: defaultWindowRect(prev.length), prevRect: null }]);
            setActiveWindow("ghostview");
          }, 180);
        },
        onSessionSnap: (_peer, snap, latency) => {
          const prev = gvPrevSnap.current;
          const ev = (line: string) => pushMsFeed(line);
          if (!prev) {
            ev(`[+] session sync · ${snap.user}@vertex-os`);
            ev(`[+] wallpaper topology → “${snap.wallpaperName}”`);
            if (snap.active) ev(`[>] focusing ${getApp(snap.active as AppId, appOverrides).title}`);
          } else {
            if (prev.wallpaper !== snap.wallpaper) ev(`[>] wallpaper → “${snap.wallpaperName}”`);
            if (prev.active !== snap.active && snap.active) ev(`[>] focusing ${getApp(snap.active as AppId, appOverrides).title}`);
            const opened = snap.wins.filter((n) => !prev.wins.some((o) => o.id === n.id));
            const closed = prev.wins.filter((o) => !snap.wins.some((n) => n.id === o.id));
            opened.forEach((n) => ev(`[+] opened ${n.title}`));
            closed.forEach((o) => ev(`[−] closed ${o.title}`));
            if (prev.term && snap.term && snap.term.lines.length - prev.term.lines.length >= 1 && prev.term.lines.length > 0) {
              ev(`[↕] terminal: ${snap.term.lines.length - prev.term.lines.length} new line(s)`);
            }
          }
          if (Date.now() - gvFrameAt.current > 2800) { ev(`[·] frame ${latency}ms`); gvFrameAt.current = Date.now(); }
          gvPrevSnap.current = snap;
        },
onSessionClose: (peerCode) => {
        pushMsFeed(`SESSION ${peerCode} ENDED — stream closed`);
        if (ghostUiStore().get().role === "attacker") ghostWinCloser?.();
        ghostSetStatus("closed");
      },
      onControl: (ctrl) => {
        if (ctrl.cmd === "open") {
          const id = ctrl.app as AppId | undefined;
          if (!id || id === "ghostview") return;
          setStartOpen(false); setDrawerOpen(false);
          if (id === "translucenttb") {
            setTranslucentOpen(true);
            setWindows((items) => items.filter((w) => w.id !== id));
            setActiveWindow((a) => (a === id ? null : a));
            return;
          }
          setWindows((items) => items.some((w) => w.id === id)
            ? items.map((w) => (w.id === id ? { ...w, minimized: false } : w))
            : [...items, { id, minimized: false, maximized: false, rect: defaultWindowRect(items.length), prevRect: null }]);
          setActiveWindow(id);
        } else if (ctrl.cmd === "close") {
          const id = ctrl.app as AppId | undefined;
          if (!id) return;
          setWindows((items) => items.filter((w) => w.id !== id));
          setActiveWindow((a) => (a === id ? null : a));
        } else if (ctrl.cmd === "min") {
          const id = ctrl.app as AppId | undefined;
          if (!id) return;
          setWindows((items) => items.map((w) => (w.id === id ? { ...w, minimized: true } : w)));
          setActiveWindow((a) => (a === id ? null : a));
        } else if (ctrl.cmd === "run") {
          const text = ctrl.text ?? "";
          if (!text) return;
          const hasTerm = gvWindowsRef.current.some((w) => w.id === "terminal");
          if (!hasTerm) {
            setStartOpen(false); setDrawerOpen(false);
            setWindows((items) => items.some((w) => w.id === "terminal")
              ? items.map((w) => (w.id === "terminal" ? { ...w, minimized: false } : w))
              : [...items, { id: "terminal", minimized: false, maximized: false, rect: defaultWindowRect(items.length), prevRect: null }]);
            setActiveWindow("terminal");
          }
          window.setTimeout(() => {
            ghostTypeCtrl(text);
            ghostEnterCtrl();
          }, 420);
        } else if (ctrl.cmd === "click") {
          const x = ctrl.x ?? 0;
          const y = ctrl.y ?? 0;
          const stack = document.elementsFromPoint(x, y);
          let el: Element | null = stack.find((e) => e !== document.body && e !== document.documentElement && !(e as Element).closest?.(".language-gate")) ?? null;
          if (!el) el = document.elementFromPoint(x, y);
          if (el) {
            const opts = { bubbles: true, cancelable: true, composed: true, clientX: x, clientY: y, button: 0 };
            el.dispatchEvent(new PointerEvent("pointerdown", opts));
            el.dispatchEvent(new MouseEvent("mousedown", opts));
            el.dispatchEvent(new PointerEvent("pointerup", opts));
            el.dispatchEvent(new MouseEvent("mouseup", opts));
            el.dispatchEvent(new MouseEvent("click", opts));
          }
        } else if (ctrl.cmd === "type") {
          ghostTypeCtrl(ctrl.text ?? "");
          if (ctrl.enter) ghostEnterCtrl();
        } else if (ctrl.cmd === "enter") {
          ghostEnterCtrl();
        } else if (ctrl.cmd === "key") {
          ghostKeyCtrl(ctrl.key ?? "Backspace");
        }
      },
      });
    }, 1000);
    return () => window.clearInterval(iv);
  }, []);

  useEffect(() => {
    const cloak = settings.cloak === "custom"
      ? { title: (settings.cloakName || CLOAKS.none.title), icon: (settings.cloakIcon || CLOAKS.none.icon) }
      : (CLOAKS[settings.cloak] ?? CLOAKS.none);
    document.title = cloak.title;
    let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
    if (!link) { link = document.createElement("link"); link.rel = "icon"; document.head.appendChild(link); }
    link.href = cloak.icon || MCC_LOGO_URL;
  }, [settings.cloak, settings.cloakName, settings.cloakIcon]);

  const [tabHidden, setTabHidden] = useState(false);
  useEffect(() => {
    if (!settings.tabHide) { setTabHidden(false); return; }
    const sync = () => setTabHidden(document.hidden || document.visibilityState === "hidden" || !document.hasFocus());
    const onHide = () => setTabHidden(true);
    const onShow = () => sync();
    sync();
    window.addEventListener("blur", onHide);
    window.addEventListener("focus", onShow);
    document.addEventListener("visibilitychange", sync);
    window.addEventListener("pageshow", sync);
    window.addEventListener("pagehide", onHide);
    const poll = window.setInterval(sync, 250);
    return () => {
      window.clearInterval(poll);
      window.removeEventListener("blur", onHide);
      window.removeEventListener("focus", onShow);
      document.removeEventListener("visibilitychange", sync);
      window.removeEventListener("pageshow", sync);
      window.removeEventListener("pagehide", onHide);
    };
  }, [settings.tabHide]);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = settings.colorMode === "light" ? "light" : "dark";
    root.dataset.season = HALLOWEEN_ACTIVE ? "halloween" : "";
    root.dataset.style = settings.systemStyle === "macos" ? "macos" : "";
    root.dataset.font = settings.fontStyle || "vertex";
  }, [settings.colorMode, settings.systemStyle, settings.fontStyle]);
  const [faqOpen, setFaqOpen] = useState<number | null>(null);
  const [toasts, setToasts] = useState<{ id: number; title: string; copy: string; href?: string }[]>([]);
  const [notifications, setNotifications] = useState<{ id: number; title: string; copy: string; href?: string }[]>([]);
  const [notifReadCut, setNotifReadCut] = useState(0);
  const [currentTrack, setCurrentTrack] = useState<{ name: string; artist: string; artwork: string } | null>(null);

  const activeWallpaper = wallpapers.find((item) => item.id === wallpaper) ?? customWallpapers.find((item) => item.id === wallpaper) ?? wallpapers[0];
  const activeLockWallpaper = wallpapers.find((item) => item.id === lockWallpaper) ?? customWallpapers.find((item) => item.id === lockWallpaper) ?? wallpapers[1];
  const pickerWallpapers = useMemo<PickerWallpaper[]>(() => [
    ...customWallpapers,
    ...wallpapers.map((w) => ({ id: w.id, name: w.name, image: w.image, video: w.video })),
    ...wallEngineEntries.map((e) => ({ id: e.id, name: e.name, image: e.image, video: e.video, videoLow: e.videoLow, category: e.category })),
  ], [customWallpapers]);

  useEffect(() => {
    let alive = true;
    loadCustomWallpapers().then((list) => { if (alive) { setCustomWallpapers(list); setCustomsLoaded(true); } });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!customsLoaded) return;
    if (wallpaper.startsWith("custom-") && !customWallpapers.some((c) => c.id === wallpaper)) {
      setWallpaper("singularity");
      storage.write("vertex-wallpaper-v2", "singularity");
    }
    if (lockWallpaper.startsWith("custom-") && !customWallpapers.some((c) => c.id === lockWallpaper)) {
      setLockWallpaper("singularity");
      storage.write("vertex-lock-wallpaper-v2", "singularity");
    }
  }, [customsLoaded, customWallpapers, wallpaper, lockWallpaper]);

  useEffect(() => {
    storage.write("vertex-wpp-installed", wppInstalled);
    storage.write("vertex-jarvis-installed", jarvisInstalled);
  }, [wppInstalled, jarvisInstalled]);
  const filteredApps = useMemo(() => apps.filter((app) => getApp(app.id, appOverrides).title.toLowerCase().includes(drawerQuery.toLowerCase())), [drawerQuery, appOverrides, apps]);
  const pinnedApps = useMemo(() => apps.filter((app) => { const themed = getApp(app.id, appOverrides); return (appOverrides[app.id]?.pinned ?? app.pinned) && themed.title.toLowerCase().includes(startQuery.toLowerCase()); }), [startQuery, appOverrides, apps]);
  const activeSection = useMemo(() => APP_SECTIONS.find((s) => s.id === drawerSection) ?? null, [drawerSection]);
  const drawerApps = useMemo(() => {
    if (!activeSection || activeSection.all) return filteredApps;
    return filteredApps.filter((app) => activeSection.ids.includes(app.id));
  }, [filteredApps, activeSection]);

  const desktopPlacements = useMemo(() => {
    const map: Record<string, number> = {};
    const taken = new Set<number>();
    desktopApps.forEach((appId) => {
      const cell = placedCells[appId];
      if (cell !== undefined) { map[appId] = cell; taken.add(cell); }
    });
    let autoIndex = 0;
    desktopApps.forEach((appId) => {
      if (map[appId] !== undefined) return;
      let free = -1;
      let cell = -1;
      while (free < autoIndex) { cell += 1; if (!taken.has(cell)) free += 1; }
      map[appId] = cell;
      taken.add(cell);
      autoIndex += 1;
    });
    return map;
  }, [desktopApps, placedCells]);

  useEffect(() => {
    storage.write("vertex-desktop-cells", placedCells);
  }, [placedCells]);

  useEffect(() => {
    storage.write("vertex-translucenttb", translucentTB);
  }, [translucentTB]);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    document.documentElement.lang = LANG;
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (phase === "boot" && (event.key === "Enter" || event.key === " ")) {
        event.preventDefault();
        if (!bootVideo) { startIntro(); return; }
        bootEnters.current += 1;
        window.setTimeout(() => { bootEnters.current = 0; }, 1200);
        if (bootEnters.current >= 2) finishBoot();
        return;
      }
      if (event.key === "Escape") {
        setContextMenu(null);
        setStartOpen(false);
        setDrawerOpen(false);
        if (phase === "signin" || phase === "picker") { setPhase("lock"); setPinError(false); setPinInput(""); }
      }
      const target = event.target as HTMLElement | null;
      const isEditing = target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
      if (phase === "desktop" && event.altKey && !event.ctrlKey && !event.shiftKey && event.key.toLowerCase() === "w") {
        event.preventDefault();
        if (wppInstalled) setWpPickerOpen((open) => !open);
        else toggleApp("terminal");
      }
      if (phase === "desktop" && !isEditing && settings.panicKey && event.key.toLowerCase() === settings.panicKey.toLowerCase()) {
        redirectPanic();
      }
      if (event.ctrlKey && event.altKey && event.key.toLowerCase() === "a") {
        event.preventDefault();
        setWindows((prev) => prev.some((w) => w.id === "admin") ? prev.map((w) => (w.id === "admin" ? { ...w, minimized: false } : w)) : [...prev, { id: "admin", minimized: false, maximized: false, rect: defaultWindowRect(prev.length), prevRect: null }]);
        return;
      }
    };
    window.addEventListener("keydown", onKey);
    const onAdminLaunch = (event: Event) => { const detail = (event as CustomEvent).detail; if (typeof detail === "string") toggleApp(detail as AppId); };
    window.addEventListener("vertex-open-app", onAdminLaunch);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("vertex-open-app", onAdminLaunch); };
  });

  useEffect(() => {
    const stop = startAnalytics();
    return stop;
  }, []);

  useEffect(() => {
    if (phase !== "boot" || !settings.fastBoot) return;
    const skip = window.setTimeout(() => finishBoot(), 150);
    return () => window.clearTimeout(skip);
  }, [phase, settings.fastBoot]);

  useEffect(() => {
    if (phase !== "boot" || !bootVideo) return;
    const video = bootVideoRef.current;
    if (!video || !video.paused) return;
    void video.play().catch(() => undefined);
  }, [phase, bootVideo]);

  useEffect(() => {
    if (phase !== "desktop" || !settings.idleLock) return;
    let timer = 0;
    const reset = () => { window.clearTimeout(timer); timer = window.setTimeout(() => setPhase("lock"), 180000); };
    reset();
    window.addEventListener("mousemove", reset);
    window.addEventListener("keydown", reset);
    return () => { window.clearTimeout(timer); window.removeEventListener("mousemove", reset); window.removeEventListener("keydown", reset); };
  }, [phase, settings.idleLock]);

  function addToast(title: string, copy: string, href?: string) {
    const id = Date.now() + Math.random();
    setNotifications((items) => [{ id, title, copy, href }, ...items].slice(0, 12));
  }

  function toastPopup(title: string, copy: string, href?: string) {
    const id = Date.now();
    setToasts((items) => [...items, { id, title, copy, href }]);
    window.setTimeout(() => setToasts((items) => items.filter((item) => item.id !== id)), 5000);
  }

  function dismissNotification(id: number) {
    setNotifications((items) => items.filter((item) => item.id !== id));
  }

  function clearNotifications() {
    setNotifications([]);
  }

  const unseenNotifications = Math.max(0, notifications.length - notifReadCut);
  function markNotificationsRead() { setNotifReadCut(notifications.length); }

  useEffect(() => {
    syncPasswordMirror();
  }, [activeAccount]);

  useEffect(() => {
    const onSetAccountPassword = (event: Event) => {
      const pass = (event as CustomEvent<string>).detail ?? "";
      if (!activeAccount) return;
      const updated: VertexAccount = { ...activeAccount, pass };
      persistAccounts(accounts.map((a) => (a.id === updated.id ? updated : a)));
      setActiveAccount(updated);
      syncPasswordMirror();
    };
    window.addEventListener("vertex-set-password", onSetAccountPassword);
    return () => window.removeEventListener("vertex-set-password", onSetAccountPassword);
  }, [activeAccount, accounts]);

  useEffect(() => {
    if (phase !== "desktop") return;
    try {
      const shown = Number(sessionStorage.getItem("vertex-lf-promos") || "0");
      if (shown >= 3) return;
      const draft: { title: string; copy: string }[] = [
        { title: "Link Finder — McCrack-COS", copy: "School site blocked? Find a link that isn't caught yet, for free." },
        { title: "New: Link Finder", copy: "Map of what your filter blocks + fresh, unblocked portal links." },
        { title: "McCrack-COS · Beta Program", copy: "Unblocked games + BETA build — grab a link, no install." },
      ];
      const slots = [8000, 70000, 140000];
      const timers = slots.map((delay, i) => window.setTimeout(() => {
        if (shown >= 3) return;
        if (i >= draft.length) return;
        const item = draft[i];
        toastPopup(item.title, item.copy, "https://link-finder.netlify.app/");
        try { sessionStorage.setItem("vertex-lf-promos", String(Math.min(3, shown + i + 1))); } catch { /* noop */ }
      }, delay));
      return () => timers.forEach((id) => window.clearTimeout(id));
    } catch { return undefined; }
  }, [phase]);

  function chooseLanguage(next: Lang) {
    saveLang(next);
    setChosenLang(next);
    setLanguageOpen(false);
  }

  function pickLanguage(next: Lang) {
    saveLang(next);
    setChosenLang(next);
  }

  useEffect(() => {
    const video = phase === "desktop" ? homeVideoRef.current : phase === "lock" ? lockVideoRef.current : null;
    if (!video) return;
    const play = () => void video.play().catch(() => undefined);
    play();
    video.addEventListener("canplay", play);
    return () => video.removeEventListener("canplay", play);
  }, [phase, wallpaper, lockWallpaper]);

  useEffect(() => {
    if (!pressFx) return;
    const handler = () => playClick();
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, [pressFx]);

  function startIntro() {
    if (phase !== "boot" || bootVideo) return;
    if (settings.fastBoot) { finishBoot(); return; }
    const video = bootVideoRef.current;
    if (video) {
      video.currentTime = 0;
      video.muted = false;
      void video.play().catch(() => { video.muted = true; void video.play().catch(() => undefined); });
    }
    setBootVideo(true);
  }

  function finishBoot() {
    if (phase !== "boot") return;
    setBootVideo(false);
    const video = bootVideoRef.current;
    if (video) { video.pause(); video.currentTime = 0; }
    const first = accounts.length === 0;
    setPhase(first ? "profile" : "lock");
    if (!first) { setSelectedAccount(null); setPinInput(""); setPinError(false); }
  }

  function syncPasswordMirror() {
    try { storage.write(PASSWORD_KEY, activeAccount?.pass ?? ""); } catch { /* ignore */ }
  }

  function enterDesktop() {
    setPhase("desktop");
    addToast(t("toast.welcomeTitle"), t("toast.welcomeCopy"));
  }

  function signInAs(account: VertexAccount) {
    setActiveAccount(account);
    enterDesktop();
  }

  function persistAccounts(next: VertexAccount[]) {
    setAccounts(next);
    storage.write(ACCOUNTS_KEY, JSON.stringify(next));
  }

  function createProfile() {
    const name = profileName.trim();
    if (!name) { setProfileErr(t("lock.needName")); return; }
    if (profilePass !== profilePass2) { setProfileErr(t("lock.passMismatch")); return; }
    const account: VertexAccount = { id: `a${Date.now().toString(36)}`, name, createdAt: Date.now(), pass: profilePass, avatar: profileAvatar || "" };
    persistAccounts([...accounts, account]);
    setPinInput("");
    setPinError(false);
    signInAs(account);
  }

  function updateActiveAvatar(avatar: string) {
    if (!activeAccount) return;
    const updated: VertexAccount = { ...activeAccount, avatar };
    persistAccounts(accounts.map((a) => (a.id === updated.id ? updated : a)));
    setActiveAccount(updated);
  }

  function updateActiveAccount(patch: { name?: string; email?: string }) {
    if (!activeAccount) return;
    const updated: VertexAccount = { ...activeAccount, ...patch };
    persistAccounts(accounts.map((a) => (a.id === updated.id ? updated : a)));
    setActiveAccount(updated);
  }

  function openSignIn() {
    if (phase !== "lock") return;
    if (accounts.length === 0) { setProfileErr(""); setLoginErr(""); setPhase("profile"); return; }
    setSelectedAccount(null);
    setPinInput("");
    setPinError(false);
    setLoginName("");
    setLoginPass("");
    setLoginErr("");
    setPhase("picker");
  }

  function pickAccount(account: VertexAccount) {
    setSelectedAccount(account);
    setPinInput("");
    setPinError(false);
    if (!account.pass) { signInAs(account); return; }
    setPhase("signin");
  }

  function loginWithCredentials() {
    const name = loginName.trim();
    if (!name) { setLoginErr("Enter an account name."); return; }
    const match = accounts.find((a) => a.name.toLowerCase() === name.toLowerCase());
    if (!match) {
      setLoginErr(`No account named "${name}" on this device.`);
      return;
    }
    if (match.pass && match.pass !== loginPass) {
      setLoginErr("Wrong password — try again.");
      return;
    }
    setLoginErr("");
    setPinInput("");
    setPinError(false);
    signInAs(match);
  }

  function unlock() {
    if (phase !== "signin") return;
    const account = selectedAccount ?? accounts[0];
    if (!account) return;
    if (!account.pass || pinInput === account.pass) {
      setPinError(false);
      setPinInput("");
      signInAs(account);
    } else {
      setPinError(true);
      setPinInput("");
    }
  }

  function resetPassword() {
    if (phase !== "signin" || !selectedAccount) return;
    if (!window.confirm(t("lock.forgotConfirm"))) return;
    const cleared: VertexAccount = { ...selectedAccount, pass: "" };
    persistAccounts(accounts.map((a) => (a.id === cleared.id ? cleared : a)));
    setPinInput("");
    setPinError(false);
    signInAs(cleared);
    addToast(t("lock.forgotDoneTitle"), t("lock.forgotDoneCopy"));
  }

  function updateSetting(key: keyof SystemSettings | Partial<SystemSettings>, value?: boolean | string | TabHideImage[]) {
    const patch = typeof key === "string" ? { [key]: value } : key;
    const next = { ...settings, ...patch } as SystemSettings;
    setSettings(next);
    storage.write("vertex-settings", next);
  }

  function redirectPanic() {
    const raw = (settings.panicUrl ?? "").trim();
    if (!raw) {
      addToast(t("toast.panicMissingTitle"), t("toast.panicMissingCopy"));
      return;
    }
    try {
      const destination = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
      if (!["http:", "https:"].includes(destination.protocol)) throw new Error("Unsupported protocol");
      if (settings.confirm && !window.confirm(`Open ${destination.href}?`)) return;
      window.location.assign(destination.href);
    } catch {
      addToast(t("toast.panicInvalidTitle"), t("toast.panicInvalidCopy"));
    }
  }

  function saveRainmeterPatch(patch: Partial<RainmeterSettings>) {
    const next = { ...readRainmeterConfig(), ...patch };
    storage.write("rainmeter-config", next);
    window.dispatchEvent(new CustomEvent("rainmeter-config-updated"));
  }

  function applyAlternativeStyle(style: SystemStyle) {
    if (settings.systemStyle === style) return;
    updateSetting("systemStyle", style);
    if (style === "macos") {
      applyWallEngine("macos-default", "home");
      applyWallEngine("macos-lock", "lock");
    } else {
      applyWallEngine(SEASON_WALLPAPER, "both");
    }
  }

  function applyWallEngine(id: WallpaperId, target: "both" | "home" | "lock") {
    if (target === "both" || target === "home") {
      setWallpaper(id);
      storage.write("vertex-wallpaper-v2", id);
    }
    if (target === "both" || target === "lock") {
      setLockWallpaper(id);
      storage.write("vertex-lock-wallpaper-v2", id);
    }
    addToast(t("toast.wallpaperTitle"), tf("toast.wallpaperCopy", { name: wallpapers.find((item) => item.id === id)?.name ?? customWallpapers.find((item) => item.id === id)?.name ?? "" }));
  }

  function toggleApp(id: AppId) {
    if (id === "ghostview") return;
    setStartOpen(false);
    setDrawerOpen(false);
    if (id === "translucenttb") {
      setWindows((items) => items.filter((item) => item.id !== id));
      setActiveWindow((active) => active === id ? null : active);
      setTranslucentOpen(true);
      return;
    }
    try { recordRecentApp(id, getApp(id, appOverrides).title); } catch { /* noop */ }
    try { void trackEvent("app_open", { app: id, title: getApp(id, appOverrides).title }); } catch { /* noop */ }
    const existing = windows.find((item) => item.id === id);
    if (!existing) {
      setWindows((items) => [...items, { id, minimized: false, maximized: false, rect: defaultWindowRect(items.length), prevRect: null }]);
      setActiveWindow(id);
      return;
    }
    if (activeWindow === id && !existing.minimized) {
      setWindows((items) => items.map((item) => item.id === id ? { ...item, minimized: true } : item));
      setActiveWindow(null);
      return;
    }
    setWindows((items) => items.map((item) => item.id === id ? { ...item, minimized: false } : item));
    setActiveWindow(id);
  }

  useEffect(() => {
    const onStoreOpen = (event: Event) => {
      const id = (event as CustomEvent<string>).detail;
      if (typeof id === "string" && id) toggleApp(id as AppId);
    };
    window.addEventListener("vertex-open-app", onStoreOpen);
    return () => window.removeEventListener("vertex-open-app", onStoreOpen);
    // Re-register so the handler always sees the latest window layout.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [windows, activeWindow]);

  function installWallpaperPicker() {
    if (wppInstalled) return;
    setWppInstalled(true);
  }

  function closeWindow(id: AppId) {
    setWindows((items) => items.map((item) => item.id === id ? { ...item, closingAt: Date.now() } : item));
    setTimeout(() => {
      setWindows((items) => items.filter((item) => item.id !== id));
      setActiveWindow((active) => active === id ? null : active);
    }, 200);
  }

  function minimizeWindow(id: AppId) {
    setWindows((items) => items.map((item) => item.id === id ? { ...item, minimized: true } : item));
    setActiveWindow((active) => active === id ? null : active);
  }

  function toggleMaximize(id: AppId) {
    setWindows((items) => items.map((item) => {
      if (item.id !== id) return item;
      if (item.maximized) {
        return { ...item, maximized: false, rect: item.prevRect ?? item.rect };
      }
      return { ...item, maximized: true, prevRect: item.rect };
    }));
  }

  function moveWindow(id: AppId, clientX: number, clientY: number) {
    setWindows((items) => items.map((item) => {
      if (item.id !== id || item.maximized) return item;
      const vw = typeof window !== "undefined" ? window.innerWidth : 1280;
      const vh = typeof window !== "undefined" ? window.innerHeight : 800;
      const x = Math.max(-item.rect.w + 96, Math.min(Math.round(clientX), vw - 60));
      const y = Math.max(0, Math.min(Math.round(clientY), vh - 34));
      return { ...item, rect: { ...item.rect, x, y } };
    }));
  }

  function clampMenu(anchor: { x: number; y: number }, rect: DOMRect): { x: number; y: number } {
    const MARGIN = 10;
    let x = anchor.x;
    let y = anchor.y;
    if (y + rect.height > window.innerHeight - MARGIN) y = Math.max(MARGIN, window.innerHeight - MARGIN - rect.height);
    if (x + rect.width > window.innerWidth - MARGIN) x = Math.max(MARGIN, window.innerWidth - MARGIN - rect.width);
    return { x, y };
  }

  function saveOverride(appId: AppId, patch: Partial<AppOverride>) {
    const next = { ...appOverrides, [appId]: { ...(appOverrides[appId] ?? {}), ...patch } };
    setAppOverrides(next);
    storage.write("vertex-app-overrides", next);
  }

  function isPinned(id: AppId): boolean {
    const ov = appOverrides[id];
    if (ov?.pinned !== undefined) return ov.pinned;
    return apps.find((app) => app.id === id)?.pinned ?? false;
  }

  function openAppMenu(appId: AppId, x: number, y: number) {
    setContextMenu(null);
    
    const ov = appOverrides[appId] ?? {};
    const base = apps.find((app) => app.id === appId);
    setRenameValue(ov.name ?? base?.title ?? "");
    setIconUrl(ov.iconUrl ?? "");
    setAppMenuMode("default");
    setAppMenu({ appId, x, y });
  }

  function removeFromDesktop(appId: AppId) {
    setAppMenu(null);
    const next = desktopApps.filter((id) => id !== appId);
    setDesktopApps(next);
    storage.write("vertex-desktop-apps", next);
    setPlacedCells((prev) => {
      const copy = { ...prev };
      delete copy[appId];
      return copy;
    });
  }

  function dropCell(clientX: number, clientY: number): number {
    const el = desktopGridRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    const col = Math.max(0, Math.min(DROP_GRID_COLS - 1, Math.floor((clientX - rect.left) / DROP_CELL_W)));
    const row = Math.max(0, Math.floor((clientY - rect.top) / DROP_CELL_H));
    return row * DROP_GRID_COLS + col;
  }

  function placeAt(appId: AppId, cell: number) {
    setPlacedCells((prev) => {
      const map = { ...prev };
      const old = map[appId];
      if (old === cell) return prev;
      map[appId] = cell;
      const occupant = Object.keys(map).find((key) => key !== appId && map[key] === cell);
      if (occupant) {
        if (old !== undefined) map[occupant] = old;
        else delete map[occupant];
      }
      return map;
    });
  }

  function addToDesktop(appId: AppId) {
    if (desktopApps.includes(appId)) return;
    const next = [...desktopApps, appId];
    setDesktopApps(next);
    storage.write("vertex-desktop-apps", next);
  }

  function restart() {
    setStartOpen(false);
    setWindows([]);
    setActiveWindow(null);
    setPhase("boot");
  }

  const dockRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const dock = dockRef.current;
    if (!dock) return;
    const reduced = () => {
      try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch { return false; }
    };
    let centers: { btn: HTMLElement; x: number; y: number }[] = [];
    let vertical = false;
    let stale = true;

    const measure = () => {
      vertical = dock.classList.contains("dock--left") || dock.classList.contains("dock--right");
      centers = Array.from(dock.querySelectorAll<HTMLElement>(".dock-button")).map((btn) => {
        const rect = btn.getBoundingClientRect();
        return { btn, x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      });
      stale = false;
    };
    const apply = (clientX: number, clientY: number) => {
      if (stale || dock.querySelectorAll(".dock-button").length !== centers.length) measure();
      for (const item of centers) {
        const dist = vertical ? Math.abs(clientY - item.y) : Math.abs(clientX - item.x);
        const t = dist >= 108 ? 0 : Math.pow(1 - dist / 108, 1.6);
        item.btn.style.setProperty("--dock-scale", (1 + 0.45 * t).toFixed(3));
        item.btn.style.setProperty("--dock-lift", ((1 - t) * 8).toFixed(1) + "px");
      }
    };
    const onMove = (event: PointerEvent) => {
      if (reduced()) return;
      dock.classList.add("magnify");
      apply(event.clientX, event.clientY);
    };
    const onLeave = () => {
      stale = true;
      dock.classList.remove("magnify");
      for (const item of centers) {
        item.btn.style.removeProperty("--dock-scale");
        item.btn.style.removeProperty("--dock-lift");
      }
    };
    const mutations = new MutationObserver(() => { stale = true; });
    mutations.observe(dock, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
    dock.addEventListener("pointerenter", onLeave);
    dock.addEventListener("pointermove", onMove);
    dock.addEventListener("pointerleave", onLeave);
    window.addEventListener("resize", onLeave);
    return () => {
      dock.removeEventListener("pointerenter", onLeave);
      dock.removeEventListener("pointermove", onMove);
      dock.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("resize", onLeave);
      mutations.disconnect();
      onLeave();
    };
  }, []);

  const chromeHidden = windows.some((item) => item.maximized && !item.minimized);
  const verticalDock = taskbarPos === "left" || taskbarPos === "right";
  const dockMaxWidth = dockViewport.width <= 760 ? Math.max(160, dockViewport.width - 24) : Math.min(1180, dockViewport.width - 420);
  const dockCapacity = verticalDock
    ? Math.max(4, Math.floor((dockViewport.height - 200) / 56))
    : Math.max(4, Math.floor((dockMaxWidth - 180) / 56));
  const dockEntries = apps.filter((app) => isPinned(app.id) || windows.some((win) => win.id === app.id)).sort((a, b) => {
    const ai = dockOrder.indexOf(a.id); const bi = dockOrder.indexOf(b.id);
    return (ai < 0 ? Number.MAX_SAFE_INTEGER : ai) - (bi < 0 ? Number.MAX_SAFE_INTEGER : bi);
  });
  const dockOverflowed = dockEntries.length > dockCapacity;
  const visibleDockEntries = dockOverflowed ? dockEntries.slice(0, dockCapacity) : dockEntries;

  return (
        <main className={`os-root${PERF.low ? " perf-low" : ""}`} onClick={() => { setContextMenu(null); setAppMenu(null);  setDockMenu(null); setDockOverflowOpen(false); }} onContextMenu={(event) => {
      event.preventDefault();
      if (phase === "desktop") { setAppMenu(null);  setDockMenu(null); setContextMenu({ x: event.clientX, y: event.clientY }); }
    }}>
      <div className={`wallpaper-layer ${phase === "desktop" ? "active" : ""}`} aria-hidden="true">
        {activeWallpaper.id === "vertex-studio"
          ? <VertexStudioWallpaper className="wallpaper-scene" />
          : activeWallpaper.id === "halloween"
            ? <HalloweenWallpaper className="wallpaper-scene" />
            : activeWallpaper.image
            ? <img className="wallpaper-image" src={activeWallpaper.image} alt={`${activeWallpaper.name} wallpaper`} />
            : (phase === "boot" || phase === "desktop")
              ? <video key={activeWallpaper.id} ref={homeVideoRef} className="wallpaper-video" src={bgSrc(activeWallpaper.video, activeWallpaper.videoLow)} preload="metadata" autoPlay muted loop playsInline aria-label={`${activeWallpaper.name} wallpaper`} />
              : null}
      </div>

      <section className={`boot-screen ${phase !== "boot" ? "hidden" : ""}`} aria-label="McCrack-COS boot sequence">
        <video
          ref={bootVideoRef}
          className={`boot-video ${bootVideo ? "on" : ""}`}
          src={BOOT_INTRO_SRC}
          preload="auto"
          playsInline
          onEnded={() => finishBoot()}
          onError={() => finishBoot()}
        />
        {!bootVideo && (
          <div className="boot-core">
            <BrandMark />
            <h1 className="boot-title">McCrack-COS</h1>
            <p className="boot-sub">{t("boot.bootSub")}</p>
            <div className="boot-actions">
              <button className="primary-button" data-testid="button-enter-vertex" onClick={(event) => { event.stopPropagation(); startIntro(); }}>
                {t("boot.enter")}
              </button>
              <span className="boot-hint">{t("boot.hint")}</span>
            </div>
          </div>
        )}
      </section>

      <section className={`profile-screen ${phase === "profile" ? "active" : ""}`} aria-label="Create McCrack-COS profile">
        {activeLockWallpaper.image
          ? <img className="signin-bg" src={activeLockWallpaper.image} alt="" />
          : phase === "profile"
            ? <video className="signin-bg" src={bgSrc(activeLockWallpaper.video, activeLockWallpaper.videoLow)} preload="metadata" autoPlay muted loop playsInline aria-hidden="true" />
            : null}
        <div className="signin-card profile-card">
          <div className="lock-avatar"><BrandMark /></div>
          <div className="profile-kicker">McCrack-COS · v{VERTEX_VERSION}</div>
          <h2 className="profile-title">Create your profile</h2>
          <p className="profile-sub">Choose a name and upload a profile picture, or use your initials.</p>
          <div className="profile-avatar-row">
            <span className={`profile-avatar-preview ${profileAvatar ? "has-img" : ""}`}>
              {profileAvatar ? <AvatarGlyph value={profileAvatar} name={profileName} size={52} /> : <span className="profile-avatar-glyph">{profileName.trim().slice(0, 1).toUpperCase() || "?"}</span>}
            </span>
            <label className="profile-avatar-upload">
              <Image size={14} /> Upload image or GIF
              <input type="file" accept="image/*,.gif" onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (!file) return;
                setProfileErr("");
                void avatarFromFile(file).then(setProfileAvatar).catch((err: Error) => setProfileErr(err.message));
              }} />
            </label>
          </div>
          <form className="profile-fields" onSubmit={(event) => { event.preventDefault(); createProfile(); }}>
            <label>
              <span>Profile name</span>
              <input autoFocus value={profileName} onChange={(event) => { setProfileName(event.target.value); setProfileErr(""); }} placeholder="Type any name…" autoComplete="off" data-testid="input-profile-name" />
            </label>
            <button type="button" className={`profile-pass-btn ${profileAskPass ? "on" : ""}`} onClick={() => setProfileAskPass((v) => !v)}>
              <LockKeyhole size={13} /> {profileAskPass ? "Password on · tap to remove" : "Add a password (optional)"}
            </button>
            {profileAskPass && (
              <>
                <label>
                  <span>Password</span>
                  <input type="password" value={profilePass} onChange={(event) => { setProfilePass(event.target.value); setProfileErr(""); }} placeholder="Keep it secret" data-testid="input-profile-pass" />
                </label>
                <label>
                  <span>Confirm password</span>
                  <input type="password" value={profilePass2} onChange={(event) => { setProfilePass2(event.target.value); setProfileErr(""); }} placeholder="Repeat your password" data-testid="input-profile-pass2" />
                </label>
              </>
            )}
            {profileErr ? <span className="lock-error">{profileErr}</span> : null}
            <button type="submit" className="profile-create">{profileAskPass ? "Create profile & sign in" : "Create & enter"}</button>
          </form>
          {accounts.length > 0 && <button className="signin-back" onClick={() => { setProfileErr(""); setPhase("picker"); }}>Back</button>}
        </div>
      </section>

      <section className={`signin-screen ${phase === "picker" ? "active" : ""}`} aria-label="Pick an account" onClick={(event) => { if (event.target === event.currentTarget) setPhase("lock"); }}>
        {activeLockWallpaper.image
          ? <img className="signin-bg" src={activeLockWallpaper.image} alt="" />
          : phase === "picker"
            ? <video className="signin-bg" src={bgSrc(activeLockWallpaper.video, activeLockWallpaper.videoLow)} preload="metadata" autoPlay muted loop playsInline aria-hidden="true" />
            : null}
        <div className="signin-card account-card">
          <div className="checker-card-title">Who&apos;s using this device?</div>
          <div className="checker-grid">
            {accounts.map((account) => (
              <button key={account.id} className="checker-tile" onClick={() => pickAccount(account)} data-testid={`button-account-${account.name}`}>
                <span className="checker-avatar"><AvatarGlyph value={account.avatar} name={account.name} size={64} /></span>
                <span className="checker-name">{account.name}</span>
              </button>
            ))}
            <button className="checker-tile checker-add" onClick={() => { setProfileName(""); setProfilePass(""); setProfilePass2(""); setProfileAvatar(""); setProfileAskPass(false); setProfileErr(""); setPhase("profile"); }} data-testid="button-add-account">
              <span className="checker-avatar checker-add-avatar"><Plus size={30} /></span>
              <span className="checker-name">Add profile</span>
            </button>
          </div>
          <div className="account-divider">or log in with an account name</div>
          <form className="account-login" onSubmit={(event) => { event.preventDefault(); loginWithCredentials(); }}>
            <input value={loginName} onChange={(event) => { setLoginName(event.target.value); setLoginErr(""); }} placeholder="Account name" autoComplete="off" data-testid="input-login-name" />
            <div className="account-login-row">
              <input type="password" value={loginPass} onChange={(event) => { setLoginPass(event.target.value); setLoginErr(""); }} placeholder="Password" data-testid="input-login-pass" />
              <button type="submit" aria-label="Log in"><ArrowRight size={15} /></button>
            </div>
            {loginErr ? <span className="lock-error">{loginErr}</span> : null}
          </form>
          <button className="account-add" onClick={() => { setProfileName(""); setProfilePass(""); setProfilePass2(""); setProfileAvatar(""); setProfileAskPass(false); setProfileErr(""); setPhase("profile"); }}><Plus size={15} /> Create new account</button>
          <button className="signin-back" onClick={() => setPhase("lock")}>Back</button>
        </div>
      </section>

      <section className={`lock-screen ${phase === "lock" ? "active" : ""}`} onClick={openSignIn} aria-label="McCrack-COS lock screen">
         {activeLockWallpaper.id === "vertex-studio"
          ? <VertexStudioWallpaper className="lock-wallpaper-scene" />
          : activeLockWallpaper.id === "halloween"
            ? <HalloweenWallpaper className="lock-wallpaper-scene" />
            : activeLockWallpaper.image
            ? <img className="lock-wallpaper" src={activeLockWallpaper.image} alt={`${activeLockWallpaper.name} lock wallpaper`} />
            : phase === "lock"
              ? <video key={activeLockWallpaper.id} ref={lockVideoRef} className="lock-wallpaper-video" src={bgSrc(activeLockWallpaper.video, activeLockWallpaper.videoLow)} preload="metadata" autoPlay muted loop playsInline aria-label={`${activeLockWallpaper.name} lock wallpaper`} />
              : null}
        <LockAppsLayer
          catalog={apps.map((app) => ({ id: app.id, title: app.title }))}
          renderIcon={(appId) => <AppIcon app={getApp(appId as AppId, appOverrides)} size={26} />}
          onLaunch={(appId) => { setPhase("desktop"); toggleApp(appId as AppId); }}
        />
         <div className="lock-help">{t("lock.help")}</div>
      </section>

      <section className={`signin-screen ${phase === "signin" ? "active" : ""}`} aria-label="McCrack-COS sign in" onClick={(event) => { if (event.target === event.currentTarget) setPhase("lock"); }}>
        {activeLockWallpaper.image
          ? <img className="signin-bg" src={activeLockWallpaper.image} alt="" />
          : phase === "signin"
            ? <video className="signin-bg" src={bgSrc(activeLockWallpaper.video, activeLockWallpaper.videoLow)} preload="metadata" autoPlay muted loop playsInline aria-hidden="true" />
            : null}
        <div className="signin-card">
           <div className="lock-avatar lock-avatar-account">{selectedAccount ? <AvatarGlyph value={selectedAccount.avatar} name={selectedAccount.name} size={92} /> : <BrandMark />}</div>
           <div className="lock-user">{selectedAccount?.name ?? t("set.passwordLabel")}</div>
           <div className="lock-version">McCrack-COS · v{VERTEX_VERSION}</div>
          <form className="lock-pass-row" onSubmit={(event) => { event.preventDefault(); unlock(); }}>
            <input type="password" autoFocus value={pinInput} onChange={(event) => { setPinInput(event.target.value); setPinError(false); }} placeholder={t("lock.pass")} aria-label={t("lock.pass")} data-testid="input-vertex-password" />
            <button type="submit">{t("lock.signIn")}</button>
          </form>
           {pinError ? <span className="lock-error">{t("lock.tryAgain")}</span> : null}
           <button className="signin-back" onClick={resetPassword}>{t("lock.forgot")}</button>
           <button className="signin-back" onClick={() => { setPinError(false); setPinInput(""); setPhase("picker"); }}>{t("lock.back")}</button>
        </div>
      </section>

      <section className={`desktop-shell ${phase === "desktop" ? "active" : ""} ${iconSize === "large" ? "large-icons" : iconSize === "small" ? "icon-small" : ""} ${translucentTB ? "translucent-tb" : ""} ${taskbarPos !== "bottom" ? `tb-${taskbarPos}` : ""} ${customCursor ? "custom-cursor" : ""} ${pressFx ? "press-fx" : ""} ${chromeHidden ? "chrome-hidden" : ""}`}>
        {rmCfg.showClock ? <RainmeterWidget cfg={rmCfg} date={now} tone="home" onAlternative={() => toggleApp("rainmeter")} /> : null}
        {settings.systemStyle === "macos" ? <MacMenuBar
          now={now}
          lang={chosenLang}
          appName={activeWindow ? getApp(activeWindow, appOverrides).title : "Finder"}
          accountName={activeAccount?.name ?? "McCrack-COS"}
          windows={windows.filter((w) => !w.minimized).map((w) => ({ id: w.id, title: getApp(w.id, appOverrides).title }))}
          activeWindowId={activeWindow}
          unseen={unseenNotifications}
          showIcons={showDesktopIcons}
          onPickLanguage={pickLanguage}
          onOpenApp={(id) => toggleApp(id as AppId)}
          onFocusApp={(id) => setActiveWindow(id as AppId)}
          onMinimizeApp={(id) => minimizeWindow(id as AppId)}
          onCloseApp={(id) => closeWindow(id as AppId)}
          onAbout={() => addToast("McCrack-COS", "Your browser desktop environment.")}
          onSettings={() => { setStartOpen(false); setDrawerOpen(false); toggleApp("settings"); }}
          onLaunchpad={() => { setStartOpen((v) => !v); setDrawerOpen(false); }}
          onNotifications={() => markNotificationsRead()}
          onRestart={() => { setStartOpen(false); restart(); }}
          onLock={() => { setStartOpen(false); setDrawerOpen(false); setWindows([]); setActiveWindow(null); setPhase("lock"); }}
          onToggleIcons={() => setShowDesktopIcons((visible) => { const next = !visible; storage.write("vertex-show-icons", next); return next; })}
          onHint={(title, copy) => addToast(title, copy)}
        /> : null}
        {HALLOWEEN_ACTIVE && <HalloweenDecor />}


        <div className={`desktop-grid ${showDesktopIcons ? "" : "hidden"}`} ref={desktopGridRef} aria-label="Desktop applications" onDragOver={(event) => {
          event.preventDefault();
          if (dragId && desktopApps.includes(dragId)) placeAt(dragId, dropCell(event.clientX, event.clientY));
        }} onDrop={(event) => {
          const id = event.dataTransfer.getData("text/plain");
          if (id && apps.some((app) => app.id === id)) addToDesktop(id as AppId);
          setDragId(null);
        }}>
          {desktopApps.map((appId) => {
            const app = getApp(appId, appOverrides);
            const cell = desktopPlacements[appId] ?? 0;
            const col = (cell % DROP_GRID_COLS) + 1;
            const row = Math.floor(cell / DROP_GRID_COLS) + 1;
            return <button key={appId} className={`desktop-icon ${dragId === appId ? "dragging" : ""}`} draggable onClick={() => toggleApp(appId)} style={{ gridColumnStart: col, gridRowStart: row }}
              onDragStart={(event) => { setDragId(appId); event.dataTransfer.setData("text/plain", appId); event.dataTransfer.effectAllowed = "move"; }}
              onDragOver={(event) => { event.preventDefault(); event.stopPropagation(); if (dragId && dragId !== appId) placeAt(dragId, dropCell(event.clientX, event.clientY)); }}
              onDragEnd={() => setDragId(null)}
              onContextMenu={(event) => { event.preventDefault(); event.stopPropagation(); openAppMenu(appId, event.clientX, event.clientY); }}
              data-testid={`button-desktop-${appId}`}>
              <span className="icon-tile"><AppIcon app={app} size={22} /></span>
              {app.showName && <span>{app.title}</span>}
            </button>;
          })}
          {ps5Shortcuts.map((shortcut, index) => {
            const cell = Math.max(desktopApps.length, ...Object.values(desktopPlacements).map((placed) => placed + 1)) + index;
            const openShortcutGame = () => {
              localStorage.setItem("vertex-ps5-launch-request", shortcut.id);
              window.dispatchEvent(new CustomEvent("vertex-ps5-launch-game", { detail: { id: shortcut.id } }));
              if (windows.some((item) => item.id === "games")) {
                setWindows((items) => items.map((item) => item.id === "games" ? { ...item, minimized: false } : item));
                setActiveWindow("games");
              } else {
                toggleApp("games");
              }
            };
            return <button key={shortcut.id} className="desktop-icon ps5-game-desktop-icon" onClick={openShortcutGame}
              onContextMenu={(event) => { event.preventDefault(); event.stopPropagation(); setPs5Shortcuts((previous) => { const next = previous.filter((item) => item.id !== shortcut.id); storage.write("vertex-ps5-desktop-shortcuts", next); return next; }); }}
              style={{ gridColumnStart: (cell % DROP_GRID_COLS) + 1, gridRowStart: Math.floor(cell / DROP_GRID_COLS) + 1 }} title={`Play ${shortcut.name}`}>
              <span className="icon-tile"><img className="ps5-desktop-shortcut-cover" src={shortcut.cover} alt="" /></span>
              <span>{shortcut.name}</span>
            </button>;
          })}
        </div>

        <WindowLayer windows={windows} activeWindow={activeWindow} onFocus={setActiveWindow} onClose={closeWindow} onMinimize={minimizeWindow} onMaximize={toggleMaximize} onMove={moveWindow} settings={settings} updateSetting={updateSetting} faqOpen={faqOpen} setFaqOpen={setFaqOpen} lang={chosenLang} onLanguagePick={pickLanguage} onPanic={redirectPanic} onTrackChange={setCurrentTrack} translucent={translucentTB} onTranslucent={setTranslucentTB} onApplyWallpaper={applyWallEngine} appliedWallpaper={wallpaper} appliedLockWallpaper={lockWallpaper} onNotify={addToast} wppInstalled={wppInstalled} onInstallPicker={() => { installWallpaperPicker(); setStartOpen(false); setDrawerOpen(false); addToast("Quick Wallpaper Picker", "Installed — press Alt+W to open it."); }} onJarvisInstall={() => setJarvisInstalled(true)} jarvisInstalled={jarvisInstalled} onFsociety={setFsocietyOverride} appOverrides={appOverrides} activeAccount={activeAccount} onAvatarChange={updateActiveAvatar} onAccountChange={updateActiveAccount} />

        <div className={`tb-hotzone tb-hotzone--${taskbarPos}`} aria-hidden="true" />

        <nav
          ref={dockRef}
          className={`dock ${taskbarPos === "bottom" ? "" : `dock--${taskbarPos}`}${dockOverflowOpen ? " dock--overflow-open" : ""}`}
          aria-label="System taskbar"
          onContextMenu={openDockMenu}
        >
          <button className="dock-button" data-dock-label="Start" onClick={(event) => { event.stopPropagation(); setStartOpen((open) => !open); setDrawerOpen(false); }} aria-label="Open start menu" data-testid="button-start-menu"><img className="dock-start-icon" src={asset("images/windows11.png")} alt="" /></button>
          <span className="dock-separator" />
          <button className="dock-button" data-dock-label="All apps" onClick={(event) => { event.stopPropagation(); setDrawerOpen((open) => !open); setStartOpen(false); }} aria-label="Open app drawer" data-testid="button-app-drawer"><Grid2X2 size={20} /></button>
          <span className="dock-separator" />
          <span className="dock-apps">
            {visibleDockEntries.slice(0, dockOverflowed ? Math.max(0, dockCapacity - 1) : dockCapacity).map((app) => {
              const themed = getApp(app.id, appOverrides);
              const isOpen = windows.some((item) => item.id === app.id);
              return <button key={app.id} draggable className={`dock-button ${isOpen ? "active open" : ""} ${dockDragId === app.id ? "dock-dragging" : ""}`} data-dock-label={themed.title} onClick={(event) => { event.stopPropagation(); toggleApp(app.id); }} onMouseEnter={(event) => { if (isOpen) openTaskPreview(event, app.id); }} onMouseLeave={isOpen ? pendingHideTaskPreview : undefined} onContextMenu={(event) => { event.preventDefault(); event.stopPropagation(); openAppMenu(app.id, event.clientX, event.clientY); }} onDragStart={(event) => { setDockDragId(app.id); event.dataTransfer.setData("application/x-mccrack-dock-app", app.id); event.dataTransfer.effectAllowed = "move"; }} onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "move"; }} onDrop={(event) => { event.preventDefault(); event.stopPropagation(); const from = event.dataTransfer.getData("application/x-mccrack-dock-app") as AppId; if (!from || from === app.id) return; const next = dockEntries.map((entry) => entry.id); const fromIndex = next.indexOf(from); const toIndex = next.indexOf(app.id); if (fromIndex < 0 || toIndex < 0) return; const [moved] = next.splice(fromIndex, 1); next.splice(toIndex, 0, moved); const saved = [...next, ...dockOrder.filter((id) => !next.includes(id))]; setDockOrder(saved); storage.write("vertex-dock-order", saved); setDockDragId(null); }} onDragEnd={() => setDockDragId(null)} title={`${themed.title} · drag to reorder · right-click for options`} aria-label={`${themed.title}, drag to reorder; right-click for options`} data-testid={`button-dock-${app.id}`}><AppIcon app={themed} size={20} /></button>;
            })}
            {dockOverflowed && <button className={`dock-button dock-overflow-trigger${dockOverflowOpen ? " active" : ""}`} data-dock-label="Show all taskbar apps" aria-label="Show all taskbar apps" title="Show all taskbar apps" aria-expanded={dockOverflowOpen} onClick={(event) => { event.stopPropagation(); setDockOverflowOpen((open) => !open); setPreviewId(null); setPreviewPos(null); }}><ChevronUp size={19} /></button>}
          </span>
          <span className="dock-separator" />
          {dockOverflowOpen && dockOverflowed && <div className={`dock-overflow-panel${verticalDock ? ` dock-overflow-panel--${taskbarPos}` : taskbarPos === "top" ? " dock-overflow-panel--top" : ""}`} role="dialog" aria-label="All taskbar apps" onClick={(event) => event.stopPropagation()}>
            <div className="dock-overflow-grid">{dockEntries.map((app) => {
              const themed = getApp(app.id, appOverrides), isOpen = windows.some((item) => item.id === app.id);
              return <button key={app.id} className={`dock-overflow-app${isOpen ? " is-open" : ""}`} title={themed.title} aria-label={`${themed.title}${isOpen ? ", open" : ""}`} onClick={(event) => { event.stopPropagation(); setDockOverflowOpen(false); toggleApp(app.id); }} onContextMenu={(event) => { event.preventDefault(); event.stopPropagation(); openAppMenu(app.id, event.clientX, event.clientY); }}><AppIcon app={themed} size={25} /></button>;
            })}</div>
          </div>}
        </nav>

        <SystemTray now={now} lang={chosenLang} onPickLanguage={pickLanguage} notifications={notifications} unseen={unseenNotifications} onOpenClock={markNotificationsRead} onDismiss={dismissNotification} onClear={clearNotifications} />

        {gvInbox.length > 0 && (
          <div className="gv-cards">
            {gvInbox.map((item) => (
              <GhostPayloadCard
                key={item.token}
                item={item}
                onDismiss={() => setGvInbox((prev) => prev.filter((x) => x.token !== item.token))}
                onRun={() => {
                  setGvInbox((prev) => prev.filter((x) => x.token !== item.token));
                  void ghostExecute(item);
                  setAppOverrides((prev) => ({ ...prev, ghostview: { ...(prev.ghostview ?? {}), name: "McCrack Network", showName: prev.ghostview?.showName ?? false } }));
                  window.setTimeout(() => {
                    setWindows((prev) => prev.some((x) => x.id === "ghostview") ? prev : [...prev, { id: "ghostview", minimized: false, maximized: false, rect: defaultWindowRect(prev.length), prevRect: null }]);
                    setActiveWindow("ghostview");
                  }, 240);
                }}
              />
            ))}
          </div>
        )}

        {previewId && previewPos && windows.some((item) => item.id === previewId) && (() => {
          const win = windows.find((item) => item.id === previewId)!;
          const themed = getApp(win.id, appOverrides);
          const rw = Math.max(460, win.rect.w);
          const rh = Math.max(340, win.rect.h);
          const scale = Math.min(300 / rw, 172 / rh, 0.85);
          const displayW = Math.max(200, Math.round(rw * scale));
          const displayH = Math.max(120, Math.round(rh * scale));
          const fallback = (
            <div className="task-preview-fallback">
              <AppIcon app={themed} size={26} />
              <span>{themed.title}</span>
              <small>preview crashed</small>
            </div>
          );
          return (
            <div className="task-preview" style={{ left: previewPos.left, top: previewPos.top }} onMouseEnter={keepTaskPreview} onMouseLeave={hideTaskPreview} onClick={() => { if (win.minimized) toggleApp(win.id); setActiveWindow(win.id); }}>
              <div className="task-preview-head">
                <AppIcon app={themed} size={14} />
                <span>{themed.title}</span>
                <i className="task-preview-live" aria-hidden="true" />
              </div>
              <div className="task-preview-stage" style={{ width: displayW, height: displayH }}>
                <PreviewBoundary fallback={fallback}>
                  <div className="task-preview-window" style={{ width: rw, height: rh, transform: `scale(${scale})`, transformOrigin: "top left" }}>
                    <header className="window-bar"><span className="window-title"><span className="window-app-icon"><AppIcon app={themed} size={13} /></span><span className="window-title-text">{themed.title}</span></span></header>
                    <div className="window-body">
                       {renderWindowBody(win.id, settings, updateSetting, faqOpen, setFaqOpen, chosenLang, pickLanguage, redirectPanic, null, null, setCurrentTrack, translucentTB, setTranslucentTB, applyWallEngine, wallpaper, lockWallpaper, addToast, wppInstalled, () => { installWallpaperPicker(); setStartOpen(false); setDrawerOpen(false); addToast("Quick Wallpaper Picker", "Installed — press Alt+W to open it."); }, jarvisInstalled, () => setJarvisInstalled(true), setFsocietyOverride, activeAccount, updateActiveAvatar, updateActiveAccount)}
                    </div>
                  </div>
                </PreviewBoundary>
              </div>
            </div>
          );
        })()}

        <div className={`overlay-panel start-panel ${startOpen ? "open" : ""}`} onClick={(event) => event.stopPropagation()} aria-label="Start menu">
          <div className="start-top">
            <div className="start-hero">
              <span className="start-avatar">{activeAccount ? <AvatarGlyph value={activeAccount.avatar} name={activeAccount.name} size={40} /> : "VX"}</span>
              <div className="start-hero-meta">
                <strong>{activeAccount?.name ?? t("start.administrator")}</strong>
                <span>{activeAccount?.email || t("start.adminLocal")}</span>
              </div>
            </div>
            <button className="start-all-btn" onClick={() => { setStartOpen(false); setDrawerOpen(true); }} data-testid="button-start-all-apps"><Grid2X2 size={15} /> All apps</button>
          </div>
          <div className="search-field start-search"><Search size={16} /><input value={startQuery} onChange={(event) => setStartQuery(event.target.value)} placeholder={t("start.search")} aria-label={t("start.searchAria")} data-testid="input-start-search" /></div>
          <div className="panel-heading"><h3>{t("start.pinned")}</h3><span>{pinnedApps.length} pinned</span></div>
          <div className="pinned-grid">
            {pinnedApps.map((app) => { const themed = getApp(app.id, appOverrides); return <button key={app.id} className="pinned-item" onClick={() => toggleApp(app.id)} data-testid={`button-pinned-${app.id}`}><AppIcon app={themed} size={22} /><span>{themed.title}</span></button>; })}
          </div>
          <div className="panel-footer"><div className="user-chip"><span className="avatar">{activeAccount ? <AvatarGlyph value={activeAccount.avatar} name={activeAccount.name} size={26} /> : "VX"}</span><span>{activeAccount?.name ?? t("start.adminLocal")}</span></div><button className="power-button" onClick={restart} aria-label={t("start.restartAria")} data-testid="button-restart"><Power size={17} /></button></div>
        </div>

        <div className={`drawer ${drawerOpen ? "open" : ""}`} onClick={(event) => { if (event.target === event.currentTarget) setDrawerOpen(false); }} aria-label="All applications">
          <div className="drawer-head">
            <div className="drawer-head-title">
              <span className="drawer-head-icon"><Grid2X2 size={18} /></span>
              <div><h2>All apps</h2><p>{drawerApps.length} of {apps.length} shown</p></div>
            </div>
            <button className="drawer-close" onClick={() => setDrawerOpen(false)} aria-label="Close app drawer" data-testid="button-close-drawer"><X size={20} /></button>
          </div>
          <div className="search-field drawer-search"><Search size={16} /><input value={drawerQuery} onChange={(event) => setDrawerQuery(event.target.value)} placeholder={t("start.searchApps")} aria-label={t("start.drawerAria")} data-testid="input-drawer-search" /></div>
          <div className="drawer-tabs" role="tablist" aria-label="App sections">
            {APP_SECTIONS.map((section) => {
              const on = activeSection?.id === section.id;
              const count = section.all ? apps.length : apps.filter((app) => section.ids.includes(app.id)).length;
              return (
                <button
                  key={section.id}
                  className={`drawer-tab ${on ? "on" : ""}`}
                  role="tab"
                  aria-selected={on}
                  aria-label={`${section.id} — ${count} apps`}
                  title={`${section.id} · ${count} apps`}
                  onClick={() => setDrawerSection(section.id)}
                  data-testid={`button-drawer-section-${section.id}`}
                >
                  <span className={`drawer-dot ${section.tone}`} />
                  <span className="drawer-tab-label">{section.id}</span>
                  <em>{count}</em>
                </button>
              );
            })}
          </div>
          <div className="drawer-section-head">
            {activeSection && !activeSection.all && (
              <button className="drawer-all-btn" onClick={() => setDrawerSection("all")} data-testid="button-drawer-all">Show all apps</button>
            )}
            <span>{drawerApps.length} shown</span>
          </div>
          {drawerApps.length ? (
          <div className="drawer-grid">{drawerApps.map((app) => {
            const themed = getApp(app.id, appOverrides);
            return <button key={app.id} className="drawer-item" draggable onClick={() => toggleApp(app.id)} onDragStart={(event) => { event.dataTransfer.setData("text/plain", app.id); event.dataTransfer.effectAllowed = "move"; }} onContextMenu={(event) => { event.preventDefault(); event.stopPropagation(); openAppMenu(app.id, event.clientX, event.clientY); }} data-testid={`button-drawer-${app.id}`}><span className="icon-tile"><AppIcon app={themed} size={25} /></span><span>{themed.title}</span></button>;
          })}</div>
          ) : (
            <div className="drawer-empty">Nothing matches &ldquo;{drawerQuery}&rdquo;.</div>
          )}
        </div>

        {wpPickerOpen && (
          <WallpaperPicker
            entries={pickerWallpapers}
            appliedId={wallpaper}
            onApply={(id) => applyWallEngine(id as WallpaperId, "home")}
            onClose={() => setWpPickerOpen(false)}
            onCustomAdd={(wp) => {
              setCustomWallpapers((list) => [...list, wp]);
              void persistCustomWallpaper(wp);
            }}
            onCustomRemove={(id) => {
              setCustomWallpapers((list) => {
                const dead = list.find((c) => c.id === id);
                if (dead?.video) URL.revokeObjectURL(dead.video);
                if (dead?.image) URL.revokeObjectURL(dead.image);
                return list.filter((c) => c.id !== id);
              });
              void removeCustomWallpaper(id);
            }}
          />
        )}


        {personalizeOpen && <div className="wallpaper-modal open" onClick={(event) => { if (event.target === event.currentTarget) setPersonalizeOpen(false); }} data-testid="personalize-modal">
          <div className="modal-card personalize-card">
            <header className="modal-header"><h2>{t("pers.title")}</h2><button className="icon-close" onClick={() => setPersonalizeOpen(false)} aria-label={t("wm.close")} data-testid="button-close-personalize"><X size={19} /></button></header>
            <SettingToggle label={t("pers.cursor")} help={t("pers.cursorHelp")} value={customCursor} onChange={(value) => { setCustomCursor(value); storage.write("vertex-custom-cursor", value); }} />
            <SettingToggle label={t("pers.press")} help={t("pers.pressHelp")} value={pressFx} onChange={(value) => { setPressFx(value); storage.write("vertex-press-fx", value); }} />
          </div>
        </div>}

        {translucentOpen && <div className="wallpaper-modal open" onClick={(event) => { if (event.target === event.currentTarget) setTranslucentOpen(false); }} data-testid="translucent-modal">
          <div className="modal-card">
            <header className="modal-header"><span className="surface-kicker">{t("surf.translucent.kicker")}</span><button className="icon-close" onClick={() => setTranslucentOpen(false)} aria-label={t("wm.close")} data-testid="button-close-translucent"><X size={19} /></button></header>
            <h2 className="surface-title">{t("surf.translucent.title")}</h2>
            <p className="surface-copy">{t("surf.translucent.body")}</p>
            <SettingToggle label={t("surf.translucent.enable")} help={t("surf.translucent.help")} value={translucentTB} onChange={(value) => { setTranslucentTB(value); storage.write("vertex-translucenttb", value); }} />
          </div>
        </div>}

        <div className={`context-menu ${contextMenu ? "" : "hidden"}`} ref={contextMenuRef} style={contextMenu ? { left: (contextMenuPos ?? contextMenu).x, top: (contextMenuPos ?? contextMenu).y } : { display: "none" }} onClick={(event) => event.stopPropagation()}>
          <span className="context-menu-hover">
            <button className="context-menu-parent"><Eye size={15} /> {t("ctx.view")} <ChevronRight className="context-menu-caret" size={12} /></button>
            <div className="context-submenu">
              <button onClick={() => { setIconSize("large"); storage.write("vertex-icon-size", "large"); setContextMenu(null); }}><span className="context-menu-checkmark">{iconSize === "large" ? <Check size={12} /> : null}</span> {t("ctx.iconLarge")}</button>
              <button onClick={() => { setIconSize("medium"); storage.write("vertex-icon-size", "medium"); setContextMenu(null); }}><span className="context-menu-checkmark">{iconSize === "medium" ? <Check size={12} /> : null}</span> {t("ctx.iconMedium")}</button>
              <button onClick={() => { setIconSize("small"); storage.write("vertex-icon-size", "small"); setContextMenu(null); }}><span className="context-menu-checkmark">{iconSize === "small" ? <Check size={12} /> : null}</span> {t("ctx.iconSmall")}</button>
            </div>
          </span>
          <button aria-pressed={showDesktopIcons} onClick={() => { setShowDesktopIcons((visible) => { const value = !visible; storage.write("vertex-show-icons", value); return value; }); }}><span className="context-menu-checkmark">{showDesktopIcons ? <Check size={12} /> : null}</span> Show desktop icons</button>
          <button onClick={() => { setContextMenu(null); toggleApp("wallpaper-engine"); }}><Image size={15} /> {t("ctx.openWallEngine")}</button>
          <button onClick={() => { setContextMenu(null); setPersonalizeOpen(true); }}><Palette size={15} /> {t("ctx.personalize")}</button>
          <button onClick={() => { setContextMenu(null); addToast(t("ctx.refreshTitle"), t("ctx.refreshCopy")); }}><RotateCcw size={15} /> {t("ctx.refreshSystem")}</button>
        </div>

        {appMenu && <div className="app-context-menu" ref={appMenuRef} style={{ left: (appMenuPos ?? appMenu).x, top: (appMenuPos ?? appMenu).y }} onMouseDown={(event) => event.stopPropagation()} onClick={(event) => event.stopPropagation()} onContextMenu={(event) => { event.preventDefault(); event.stopPropagation(); }}>
          <input className="app-menu-input" value={renameValue} onChange={(event) => setRenameValue(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") saveOverride(appMenu.appId, { name: renameValue.trim() || undefined }); if (event.key === "Escape") setAppMenu(null); }} placeholder={t("appMenu.rename")} aria-label={t("appMenu.rename")} autoFocus />
          {appMenuMode === "icon" ? <>
            <input className="app-menu-input" value={iconUrl} onChange={(event) => setIconUrl(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") saveOverride(appMenu.appId, { iconUrl: iconUrl.trim() || undefined }); }} placeholder={t("appMenu.iconHint")} aria-label={t("appMenu.iconHint")} />
            <button className="app-menu-item" onClick={() => saveOverride(appMenu.appId, { iconUrl: iconUrl.trim() || undefined })}><Image size={14} /> {t("appMenu.applyIcon")}</button>
            <button className="app-menu-item" onClick={() => { saveOverride(appMenu.appId, { iconUrl: undefined }); setIconUrl(""); }}>{t("appMenu.resetIcon")}</button>
            <button className="app-menu-item" onClick={() => setAppMenuMode("default")}>{t("appMenu.back")}</button>
          </> : <>
            <button className="app-menu-item" onClick={() => saveOverride(appMenu.appId, { name: renameValue.trim() || undefined })}><Terminal size={14} /> {t("appMenu.saveName")}</button>
            <button className="app-menu-item" onClick={() => saveOverride(appMenu.appId, { showName: !(appOverrides[appMenu.appId]?.showName ?? false) })}>{t("appMenu.toggleName")}</button>
            <button className="app-menu-item" onClick={() => setAppMenuMode("icon")}><Image size={14} /> {t("appMenu.changeIcon")}</button>
            {isPinned(appMenu.appId)
              ? <button className="app-menu-item" onClick={() => saveOverride(appMenu.appId, { pinned: false })}><PinOff size={14} /> {t("appMenu.unpinTaskbar")}</button>
              : <button className="app-menu-item" onClick={() => saveOverride(appMenu.appId, { pinned: true })}><Pin size={14} /> {t("appMenu.pinTaskbar")}</button>}
            <button className="app-menu-item danger" onClick={() => removeFromDesktop(appMenu.appId)}><X size={14} /> {t("appMenu.removeDesktop")}</button>
          </>}
        </div>}



        {dockMenu && <div className="app-context-menu dock-menu" style={{ left: dockMenu.x, top: dockMenu.y }} onMouseDown={(event) => event.stopPropagation()} onClick={(event) => event.stopPropagation()} onContextMenu={(event) => { event.preventDefault(); event.stopPropagation(); }}>
          <div className="dock-menu-title">{t("ctx.taskbarPos")}</div>
          {(["bottom", "left", "right", "top"] as TaskbarPos[]).map((pos) => (
            <button key={pos} className="app-menu-item" onClick={() => { moveTaskbar(pos); setDockMenu(null); }}>
              <span className="context-menu-checkmark">{taskbarPos === pos ? <Check size={12} /> : null}</span>
              {pos === "bottom" ? t("ctx.taskbarBottom") : pos === "top" ? t("ctx.taskbarTop") : pos === "left" ? t("ctx.taskbarLeft") : t("ctx.taskbarRight")}
            </button>
          ))}
        </div>}

        </section>

       {languageOpen && <div className="language-gate" role="dialog" aria-modal="true" aria-labelledby="language-title" onClick={(event) => event.stopPropagation()}>
         <div className="language-card">
           <BrandMark />
           <div className="language-kicker">{t("gate.kicker")}</div>
           <h2 id="language-title">{t("gate.title")}</h2>
           <p>{t("gate.subtitle")}</p>
           <div className="language-options">
             {LANGS.map((option) => <button key={option.code} className="language-option" onClick={() => chooseLanguage(option.code)} data-testid={`button-language-${option.code}`}>
               <span>{option.native}</span><small>{option.label}</small><ChevronRight size={16} />
             </button>)}
           </div>
         </div>
       </div>}

      {mobileWarning && <div className="mobile-warning" onDoubleClick={() => setMobileWarning(false)}><div className="mobile-warning-card"><div className="mobile-warning-kicker">{t("mobile.kicker")}</div><h2>{t("mobile.title")}</h2><p>{t("mobile.copy")}</p><button className="primary-button" onClick={() => setMobileWarning(false)} data-testid="button-continue-mobile">{t("mobile.continue")}</button></div></div>}
      <div className="toast-stack">{toasts.map((toast) => toast.href ? <a className="toast" key={toast.id} href={toast.href} target="_blank" rel="noopener noreferrer" onClick={() => setToasts((items) => items.filter((item) => item.id !== toast.id))}><strong>{toast.title}</strong><span>{toast.copy}</span></a> : <button className="toast" key={toast.id} onClick={() => setToasts((items) => items.filter((item) => item.id !== toast.id))}><strong>{toast.title}</strong><span>{toast.copy}</span></button>)}</div>
      {settings.tabHide && tabHidden && (() => {
        const img = settings.tabHideImages.find((item) => item.id === settings.tabHideImage) ?? settings.tabHideImages[0];
        if (!img) return null;
        if (img.src === "black" || img.src === "white") return <div className="tab-hide-overlay" style={{ background: img.src === "black" ? "#000" : "#fff" }} aria-hidden="true" />;
        return <div className="tab-hide-overlay" aria-hidden="true"><img src={img.src} alt="" /></div>;
      })()}
    </main>
  );
}

function WindowLayer({ windows, activeWindow, onFocus, onClose, onMinimize, onMaximize, onMove, settings, updateSetting, faqOpen, setFaqOpen, lang, onLanguagePick, onPanic, onTrackChange, translucent, onTranslucent, onApplyWallpaper, appliedWallpaper, appliedLockWallpaper, onNotify, wppInstalled, onInstallPicker, jarvisInstalled, onJarvisInstall, onFsociety, appOverrides, activeAccount, onAvatarChange, onAccountChange }: {
  jarvisInstalled?: boolean;
  onJarvisInstall?: () => void;
  windows: WindowState[];
  activeWindow: AppId | null;
  onFocus: (id: AppId) => void;
  onClose: (id: AppId) => void;
  onMinimize: (id: AppId) => void;
  onMaximize: (id: AppId) => void;
  onMove: (id: AppId, x: number, y: number) => void;
  settings: SystemSettings;
  updateSetting: (key: keyof SystemSettings | Partial<SystemSettings>, value?: boolean | string | TabHideImage[]) => void;
  faqOpen: number | null;
  setFaqOpen: (value: number | null) => void;
  lang: Lang;
  onLanguagePick: (language: Lang) => void;
  onPanic: () => void;
  onTrackChange: (track: { name: string; artist: string; artwork: string } | null) => void;
  translucent: boolean;
  onTranslucent: (value: boolean) => void;
  onApplyWallpaper: (id: WallpaperId, target: "both" | "home" | "lock") => void;
  appliedWallpaper: WallpaperId;
  appliedLockWallpaper: WallpaperId;
  onNotify: (title: string, copy: string) => void;
  wppInstalled: boolean;
  onInstallPicker: () => void;
  onFsociety: (active: boolean) => void;
  appOverrides: Record<string, AppOverride>;
  activeAccount: VertexAccount | null;
  onAvatarChange: (avatar: string) => void;
  onAccountChange: (patch: { name?: string; email?: string }) => void;
}) {
  const dragRef = useRef<{ id: AppId; dx: number; dy: number } | null>(null);

  const startDrag = (event: ReactPointerEvent<HTMLElement>, win: WindowState) => {
    if (win.maximized) return;
    if (event.button !== 0) return;
    if ((event.target as HTMLElement).closest("button")) return;
    onFocus(win.id);
    event.preventDefault();
    dragRef.current = { id: win.id, dx: event.clientX - win.rect.x, dy: event.clientY - win.rect.y };
  };

  useEffect(() => {
    const handleMove = (event: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      onMove(drag.id, event.clientX - drag.dx, event.clientY - drag.dy);
    };
    const handleUp = () => { dragRef.current = null; };
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    window.addEventListener("pointercancel", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("pointercancel", handleUp);
    };
  }, [onMove]);

  return <div className="window-layer">{windows.map((win) => {
    const app = getApp(win.id, appOverrides);
    const classNames = [
      "app-window",
      settings.systemStyle === "macos" ? "mac-style" : "",
      activeWindow === win.id ? "active" : "",
      win.closingAt ? "closing" : "",
      win.minimized ? "minimized" : "",
      win.maximized ? "maximized" : "",
    ].filter(Boolean).join(" ");
    const rectStyle = win.maximized ? {} : { left: win.rect.x, top: win.rect.y, width: win.rect.w, height: win.rect.h };
    const mac = settings.systemStyle === "macos";
    return <article key={win.id} className={classNames} onMouseDown={() => onFocus(win.id)} style={{ ...rectStyle, zIndex: activeWindow === win.id ? 40 : 30 }}>
      <header className="window-bar" onPointerDown={(event) => startDrag(event, win)} onDoubleClick={() => onMaximize(win.id)}>
        {mac ? <>
          <div className="window-controls mac-traffic">
            <button className="mac-dot mac-dot-close" onClick={() => onClose(win.id)} aria-label={tf("win.close", { title: app.title })}><X size={8} /></button>
            <button className="mac-dot mac-dot-min" onClick={() => onMinimize(win.id)} aria-label={tf("win.min", { title: app.title })}><Minus size={8} /></button>
            <button className="mac-dot mac-dot-max" onClick={() => onMaximize(win.id)} aria-label={win.maximized ? "Restore window" : "Maximize window"}><Maximize2 size={8} /></button>
          </div>
          <span className="window-title mac-title"><span className="window-app-icon"><AppIcon app={app} size={14} /></span><span className="window-title-text">{app.title}</span></span>
          <div className="window-controls mac-spacer" aria-hidden="true" />
        </> : <>
          <span className="window-title"><span className="window-app-icon"><AppIcon app={app} size={15} /></span><span className="window-title-text">{app.title}</span></span>
          <div className="window-controls">
            <button className="window-control" onClick={() => onMinimize(win.id)} aria-label={tf("win.min", { title: app.title })}><Minus size={13} /></button>
            <button className="window-control" onClick={() => onMaximize(win.id)} aria-label={win.maximized ? "Restore window" : "Maximize window"} title={win.maximized ? "Restore down" : "Maximize"}>{win.maximized ? <Minimize2 size={13} /> : <Maximize2 size={13} />}</button>
            <button className="window-control close" onClick={() => onClose(win.id)} aria-label={tf("win.close", { title: app.title })}><X size={13} /></button>
          </div>
        </>}
      </header>
      <div className="window-body">{renderWindowBody(win.id, settings, updateSetting, faqOpen, setFaqOpen, lang, onLanguagePick, onPanic, () => onClose(win.id), () => onMinimize(win.id), onTrackChange, translucent, onTranslucent, onApplyWallpaper, appliedWallpaper, appliedLockWallpaper, onNotify, wppInstalled, onInstallPicker, jarvisInstalled, onJarvisInstall, onFsociety, activeAccount, onAvatarChange, onAccountChange)}</div>
    </article>;
  })}</div>;
}

const WP_REPO_DIR = "Quick-Wallpaper-Picker";

const WP_INSTALL_STEPS: ReactNode[] = [
  <span className="term-out">Checking system requirements... <span className="term-success">OK</span></span>,
  <span className="term-out">Downloading Quick Wallpaper Picker v2.0...</span>,
  <span className="term-out">[##########----------] 49%</span>,
  <span className="term-out">Extracting files from quick-wallpaper-picker.tar.gz...</span>,
  <span className="term-out">Installing core components...</span>,
  <span className="term-out">Writing assets to ~/.vertex-os/wallpapers/quick-picker/</span>,
  <span className="term-out">Registering storage subsystem (IndexedDB)...</span>,
  <span className="term-out">Registering hotkey <span className="term-cmd">Alt+W</span>...</span>,
  <span className="term-out">Verifying integrity... <span className="term-success">OK</span></span>,
];

function resolveTerminalPalette(config: TerminalConfig): TerminalPalette {
  if (config.palette === CUSTOM_PALETTE_ID) {
    return { id: CUSTOM_PALETTE_ID, name: "Custom", from: config.colorFrom, to: config.colorTo };
  }
  return getPalette(config.palette) ?? TERMINAL_PALETTES[0];
}

function resolveBannerArt(config: TerminalConfig): string {
  if (config.banner === CUSTOM_BANNER_ID) {
    return config.customArt.trim() ? config.customArt : TERMINAL_BANNERS[0].art;
  }
  return getBanner(config.banner)?.art ?? TERMINAL_BANNERS[0].art;
}

function applyThemeTokens(current: TerminalConfig, tokens: string[]): { next: TerminalConfig; applied: string[]; errors: string[] } {
  const next: TerminalConfig = { ...current };
  const applied: string[] = [];
  const errors: string[] = [];
  const setColor = (label: string, rawValue: string, token: string, apply: (hex: string) => void) => {
    const hex = normalizeHex(rawValue, "");
    if (hex) { apply(hex); applied.push(`${label}=${hex}`); } else errors.push(token);
  };
  for (const token of tokens) {
    const eq = token.indexOf("=");
    if (eq < 0) { errors.push(token); continue; }
    const key = token.slice(0, eq).trim().toLowerCase().replace(/[-_]/g, "");
    const raw = token.slice(eq + 1).trim();
    switch (key) {
      case "bg": case "background": setColor("bg", raw, token, (hex) => { next.bg = hex; }); break;
      case "text": case "fg": setColor("text", raw, token, (hex) => { next.text = hex; }); break;
      case "accent": setColor("accent", raw, token, (hex) => { next.accent = hex; }); break;
      case "prompt": setColor("prompt", raw, token, (hex) => { next.prompt = hex; }); break;
      case "colorfrom": setColor("colorFrom", raw, token, (hex) => { next.colorFrom = hex; }); break;
      case "colorto": setColor("colorTo", raw, token, (hex) => { next.colorTo = hex; }); break;
      case "font": {
        const font = TERMINAL_FONTS.find((entry) => entry.id === raw);
        if (font) { next.font = font.id; applied.push(`font=${font.id}`); } else errors.push(token);
        break;
      }
      case "fontsize": case "size": {
        const size = Number(raw);
        if (Number.isFinite(size)) { next.fontSize = Math.min(22, Math.max(10, Math.round(size))); applied.push(`fontSize=${next.fontSize}`); } else errors.push(token);
        break;
      }
      case "cursor": {
        if (raw === "block" || raw === "bar" || raw === "underline") { next.cursor = raw; applied.push(`cursor=${raw}`); } else errors.push(token);
        break;
      }
      case "opacity": case "transparency": {
        const value = Number(raw);
        if (Number.isFinite(value)) { next.opacity = Math.min(100, Math.max(35, Math.round(value))); applied.push(`opacity=${next.opacity}`); } else errors.push(token);
        break;
      }
      case "wallpaper": {
        next.wallpaper = /^(none|off|clear|empty)$/i.test(raw) ? "" : raw;
        applied.push(`wallpaper=${next.wallpaper || "none"}`);
        break;
      }
      case "scanlines": {
        next.scanlines = !/^(false|off|0|no)$/i.test(raw);
        applied.push(`scanlines=${next.scanlines}`);
        break;
      }
      case "glow": {
        next.glow = !/^(false|off|0|no)$/i.test(raw);
        applied.push(`glow=${next.glow}`);
        break;
      }
      case "banner": {
        if (/^(off|false|0|no|hide)$/i.test(raw)) { next.bannerEnabled = false; applied.push("banner=off"); }
        else if (/^(on|true|1|yes|show)$/i.test(raw)) { next.bannerEnabled = true; applied.push("banner=on"); }
        else if (raw === CUSTOM_BANNER_ID || getBanner(raw)) { next.banner = raw; next.bannerEnabled = true; applied.push(`banner=${raw}`); }
        else errors.push(token);
        break;
      }
      case "palette": {
        if (raw === CUSTOM_PALETTE_ID || getPalette(raw)) { next.palette = raw; applied.push(`palette=${raw}`); } else errors.push(token);
        break;
      }
      default: errors.push(token);
    }
  }
  return { next, applied, errors };
}

function TerminalColorField({ label, value, onChange }: { label: string; value: string; onChange: (hex: string) => void }) {
  return (
    <div className="term-set-color">
      <span className="term-set-label">{label}</span>
      <span className="term-set-color-inputs">
        <input type="color" value={normalizeHex(value, "#8de6ff")} onChange={(e) => onChange(e.target.value)} aria-label={`${label} picker`} />
        <input
          key={value}
          className="term-set-input term-set-hex"
          defaultValue={value}
          spellCheck={false}
          aria-label={`${label} hex value`}
          onBlur={(e) => onChange(normalizeHex(e.target.value, value))}
          onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
        />
      </span>
    </div>
  );
}

type TerminalSettingsTab = "banner" | "colors" | "appearance" | "typography";

const TERMINAL_SETTINGS_TABS: { id: TerminalSettingsTab; label: string }[] = [
  { id: "banner", label: "Banner" },
  { id: "colors", label: "Colors" },
  { id: "appearance", label: "Appearance" },
  { id: "typography", label: "Typography" },
];

class PreviewBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

const TERMINAL_PRESET_THEMES: { name: string; swatches: string[]; patch: Partial<TerminalConfig> }[] = [
  { name: "McCrack Dark", swatches: ["#050b14", "#c9d7ea", "#37c6ed"], patch: { bg: "#050b14", text: "#c9d7ea", accent: "#37c6ed", prompt: "#37c6ed" } },
  { name: "Amber", swatches: ["#140a02", "#ffbf8a", "#ff9e3d"], patch: { bg: "#140a02", text: "#ffbf8a", accent: "#ff9e3d", prompt: "#ffb454" } },
  { name: "Matrix", swatches: ["#020d05", "#7dffb2", "#22e584"], patch: { bg: "#020d05", text: "#7dffb2", accent: "#22e584", prompt: "#22e584" } },
  { name: "Synthwave", swatches: ["#13062a", "#e8e0ff", "#ff5ec2"], patch: { bg: "#13062a", text: "#e8e0ff", accent: "#ff5ec2", prompt: "#b388ff" } },
  { name: "Blueprint", swatches: ["#04121f", "#b6d7f5", "#4aa8ff"], patch: { bg: "#04121f", text: "#b6d7f5", accent: "#4aa8ff", prompt: "#9ad0ff" } },
  { name: "Paper Light", swatches: ["#e8e4d8", "#2a2a2e", "#b3552c"], patch: { bg: "#e8e4d8", text: "#2a2a2e", accent: "#b3552c", prompt: "#8a4b23" } },
  { name: "Cyber Acid", swatches: ["#0b0f06", "#f2ffd6", "#b6ff2e"], patch: { bg: "#0b0f06", text: "#f2ffd6", accent: "#b6ff2e", prompt: "#d4ff5c" } },
  { name: "Vapor Noir", swatches: ["#090814", "#dfdcff", "#c3a4ff"], patch: { bg: "#090814", text: "#dfdcff", accent: "#c3a4ff", prompt: "#8de6ff" } },
];

function TerminalSettingsPanel({ config, update, onBack }: {
  config: TerminalConfig;
  update: (patch: Partial<TerminalConfig>) => void;
  onBack: () => void;
}) {
  const [subTab, setSubTab] = useState<TerminalSettingsTab>("banner");
  const previewBase = Math.min(20, Math.max(13, config.fontSize + 2));
  const previewArt = resolveBannerArt(config);
  const previewPalette = resolveTerminalPalette(config);
  const trimmedArt = config.customArt.replace(/\s+$/, "");
  const artLines = trimmedArt ? trimmedArt.split("\n").length : 0;
  const artColumns = trimmedArt ? trimmedArt.split("\n").reduce((max, line) => Math.max(max, line.length), 0) : 0;
  const useCustomArt = (value: string) => update({ customArt: value, banner: CUSTOM_BANNER_ID, bannerEnabled: true });

  return (
    <section className="term-settings-view">
      <header className="term-settings-head">
        <span className="term-settings-title"><SlidersHorizontal size={14} /> Terminal Settings</span>
        <button className="term-set-btn" onClick={onBack}><ArrowLeft size={13} /> Back to terminal</button>
      </header>
      <nav className="term-subtabs" aria-label="Terminal settings sections">
        {TERMINAL_SETTINGS_TABS.map((tab) => (
          <button key={tab.id} className={`term-subtab${subTab === tab.id ? " is-active" : ""}`} onClick={() => setSubTab(tab.id)}>{tab.label}</button>
        ))}
        <button className="term-subtab term-subtab-reset" onClick={() => update({ ...DEFAULT_TERMINAL_CONFIG })}><RotateCcw size={12} /> Reset</button>
      </nav>
      <div className="term-settings-scroll">
        <div className="settings-list term-settings-list">
          <div className={`term-set-preview ${config.bannerEnabled ? "" : "is-off"}`}>
            {config.bannerEnabled
              ? <TerminalBanner art={previewArt} palette={previewPalette} baseSize={previewBase} fontKey={config.font} />
              : <span className="term-set-hint">Banner is off — the terminal opens with the welcome text only.</span>}
          </div>

          {subTab === "banner" && (
            <>
              <div className="term-set-group">Startup banner</div>
              <label className="term-set-row">
                <span className="term-set-label">Show on launch<small>Print the ASCII wordmark when the terminal opens.</small></span>
                <span className="switch">
                  <input type="checkbox" checked={config.bannerEnabled} onChange={(e) => update({ bannerEnabled: e.target.checked })} />
                  <span className="switch-track" />
                </span>
              </label>
              <div className="term-set-row">
                <span className="term-set-label">Banner style</span>
                <select className="term-set-select" value={config.banner} onChange={(e) => update({ banner: e.target.value, bannerEnabled: true })}>
                  {TERMINAL_BANNERS.map((banner) => <option key={banner.id} value={banner.id}>{banner.name}</option>)}
                  <option value={CUSTOM_BANNER_ID}>Custom art…</option>
                </select>
              </div>
              <div className="term-set-row term-set-row-col">
                <span className="term-set-label">
                  Custom ASCII art
                  <small>Paste any multi-line art — blocks, box-drawing and braille all work. Leading spaces and blank braille characters are preserved.</small>
                </span>
                <textarea
                  className="term-set-input term-set-art"
                  spellCheck={false}
                  value={config.customArt}
                  placeholder={"Paste your art here…\n⣠⣾⣿⣿  ⣠⣄\n⠈⣿⣿⣿⣿⣦⣽⣦⡀"}
                  onChange={(e) => useCustomArt(e.target.value)}
                />
                <div className="term-set-art-actions">
                  <span className="term-set-hint">{artLines ? `${artLines} lines · ${artColumns} cols` : "no custom art yet"}</span>
                  <span className="term-set-art-buttons">
                    <button className="term-set-btn" onClick={() => useCustomArt("")} disabled={!config.customArt}><RotateCcw size={13} /> Clear</button>
                  </span>
                </div>
              </div>
              <div className="term-set-row">
                <span className="term-set-label">Banner colors</span>
                <select className="term-set-select" value={config.palette} onChange={(e) => update({ palette: e.target.value })}>
                  {TERMINAL_PALETTES.map((palette) => <option key={palette.id} value={palette.id}>{palette.name}</option>)}
                  <option value={CUSTOM_PALETTE_ID}>Custom gradient…</option>
                </select>
              </div>
              {config.palette === CUSTOM_PALETTE_ID && (
                <>
                  <TerminalColorField label="Gradient start" value={config.colorFrom} onChange={(hex) => update({ colorFrom: hex })} />
                  <TerminalColorField label="Gradient end" value={config.colorTo} onChange={(hex) => update({ colorTo: hex })} />
                </>
              )}
            </>
          )}

          {subTab === "colors" && (
            <>
              <div className="term-set-group">Color combinations</div>
              <div className="term-preset-grid">
                {TERMINAL_PRESET_THEMES.map((theme) => {
                  const isActive = config.bg === theme.patch.bg && config.text === theme.patch.text && config.accent === theme.patch.accent && config.prompt === theme.patch.prompt;
                  return (
                    <button key={theme.name} className={`term-preset${isActive ? " is-active" : ""}`} onClick={() => update(theme.patch)}>
                      <span className="term-preset-swatches">
                        {theme.swatches.map((color) => <i key={color} style={{ background: color }} />)}
                      </span>
                      <span className="term-preset-name">{theme.name}</span>
                    </button>
                  );
                })}
              </div>
              <div className="term-set-group">Custom colors</div>
              <TerminalColorField label="Background" value={config.bg} onChange={(hex) => update({ bg: hex })} />
              <TerminalColorField label="Text" value={config.text} onChange={(hex) => update({ text: hex })} />
              <TerminalColorField label="Accent" value={config.accent} onChange={(hex) => update({ accent: hex })} />
              <TerminalColorField label="Prompt" value={config.prompt} onChange={(hex) => update({ prompt: hex })} />
            </>
          )}

          {subTab === "appearance" && (
            <>
              <div className="term-set-group">Background</div>
              <label className="term-set-row">
                <span className="term-set-label">Fully transparent<small>Drops the terminal background to 0% so the desktop wallpaper shows straight through. Text stays fully readable.</small></span>
                <span className="switch">
                  <input type="checkbox" checked={config.glass} onChange={(e) => update({ glass: e.target.checked })} />
                  <span className="switch-track" />
                </span>
              </label>
              <div className="term-set-row term-set-row-col">
                <span className="term-set-label">Transparency<small>{config.glass ? "off (window glass on)" : `${config.opacity}%`}</small></span>
                <input className="term-set-range" type="range" min={35} max={100} step={1} value={config.glass ? 100 : config.opacity} disabled={config.glass} onChange={(e) => update({ opacity: Number(e.target.value) })} />
              </div>
              <div className="term-set-row term-set-row-col">
                <span className="term-set-label">Wallpaper URL<small>Leave empty to use the desktop backdrop.</small></span>
                <input className="term-set-input" value={config.wallpaper} spellCheck={false} placeholder="https://…" onChange={(e) => update({ wallpaper: e.target.value })} />
              </div>
              <div className="term-set-group">Effects</div>
              <label className="term-set-row">
                <span className="term-set-label">CRT scanlines<small>Subtle scanlines across the terminal.</small></span>
                <span className="switch">
                  <input type="checkbox" checked={config.scanlines} onChange={(e) => update({ scanlines: e.target.checked })} />
                  <span className="switch-track" />
                </span>
              </label>
              <label className="term-set-row">
                <span className="term-set-label">Neon glow<small>Soft glow around the terminal edge.</small></span>
                <span className="switch">
                  <input type="checkbox" checked={config.glow} onChange={(e) => update({ glow: e.target.checked })} />
                  <span className="switch-track" />
                </span>
              </label>
            </>
          )}

          {subTab === "typography" && (
            <>
              <div className="term-set-group">Text &amp; cursor</div>
              <div className="term-set-row">
                <span className="term-set-label">Font</span>
                <select className="term-set-select" value={config.font} onChange={(e) => update({ font: e.target.value })}>
                  {TERMINAL_FONTS.map((font) => <option key={font.id} value={font.id}>{font.name}</option>)}
                </select>
              </div>
              <div className="term-set-row term-set-row-col">
                <span className="term-set-label">Font size<small>{config.fontSize}px</small></span>
                <input className="term-set-range" type="range" min={10} max={22} step={1} value={config.fontSize} onChange={(e) => update({ fontSize: Number(e.target.value) })} />
              </div>
              <div className="term-set-row">
                <span className="term-set-label">Cursor</span>
                <select className="term-set-select" value={config.cursor} onChange={(e) => update({ cursor: e.target.value as TerminalConfig["cursor"] })}>
                  {TERMINAL_CURSORS.map((cursor) => <option key={cursor.id} value={cursor.id}>{cursor.name}</option>)}
                </select>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function formatUptime(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours ? `${hours}h` : "", minutes ? `${minutes}m` : "", `${seconds}s`].filter(Boolean).join(" ");
}

const METASPLOIT_BANNER = String.raw`  __  __ ______ _______        _____ _____  _      ____ _____ _______ 
 |  \/  |  ____|__   __|/\    / ____|  __ \| |    / __ \_   _|__   __|
 | \  / | |__     | |  /  \  | (___ | |__) | |   | |  | || |    | |   
 | |\/| |  __|    | | / /\ \  \___ \|  ___/| |   | |  | || |    | |   
 |  |  | |____   | |/ ____ \ ____) | |    | |___| |__| || |_   | |   
 |_|  |_|______|  |_/_/    \_\_____/|_|    |______\____/_____|  |_|   
                                                                      
                                                                      
⡀⡦⡧⡄⠄⡠⢤⠼⢤⢰⢼⠔⢰⢠⠴⠤⠧⡄⡦⡦⠆⠦⡦⠦⠼⢤⠰⢱⢐⢰⢠⠵⣤⠭⡤⠆⠦⠦⡦⡬⠦⡴⢤⠴⢤⢰⢴⢼⠵⢠⠮⠤⠂⡄⡧⡦⡯⠆⡤⢧⠐
⠨⡇⡧⡂⠄⡉⠯⠽⢭⢼⢸⢼⢰⢬⠽⠭⠏⡭⡧⠧⢧⣧⣏⣯⣽⣭⣽⣿⣿⣿⣿⣾⣿⣿⣭⣭⣥⣤⣏⣉⡯⠭⢭⠽⢨⢼⢸⢽⠽⢭⠯⠅⠂⡀⡏⡯⡏⠇⡍⢯⠐
⠀⡧⡇⡧⠆⡠⢎⠱⢌⢸⢼⢸⠴⣀⣰⣭⣴⣷⣾⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣶⣮⣭⣜⣙⠴⢉⠴⡉⠦⡂⡆⡇⡧⡎⡡⢎⠐
⢀⡇⣇⡃⣎⡱⢎⡱⢊⣸⢸⣹⢼⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡷⣉⠶⣉⠆⣋⡇⣇⡇⣎⡑⢎⡱
⢁⡗⣇⡓⢂⡑⢊⡰⢚⣸⢺⠸⢺⣿⣿⣿⠛⠛⠛⠛⠛⠻⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡿⠛⠛⠛⠛⠛⢻⣿⣿⣿⣷⣈⠖⣀⠖⣁⡗⣇⡗⣆⡑⢎⡠
⠑⡇⡇⠇⡀⠓⡚⢲⢚⢺⢺⢰⣸⣿⣿⣿⠀⠀⠀⠀⠀⠀⠈⠻⢿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡿⠋⠀⠀⠀⠀⠀⠀⢸⣿⣿⣿⣷⡚⣖⠒⠄⠑⠗⡗⡗⡖⡃⡞⠂
⠀⣗⡇⡅⡄⢓⡆⢰⢚⢨⣺⢸⣸⣿⣿⣿⠀⠀⠀⠀⠀⠀⠀⠀⠀⠙⢿⣿⣿⣿⣿⣿⣿⣿⡿⠋⠀⠀⠀⠀⠀⠀⠀⠀⢸⣿⣿⣿⣷⠚⣲⠂⡄⠄⡗⡇⡗⡖⢁⡞⢠
⠀⡇⡇⡇⡔⢣⡜⢢⠜⢸⢼⢺⢸⣿⣿⣿⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠙⢿⣿⣿⣿⡿⠋⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢸⣿⣿⣿⣧⠚⣤⠓⡤⠇⡇⡇⡇⡕⠣⡜⢢
⠂⡧⡇⠇⠁⠣⠜⢡⠼⢸⢼⢸⢸⣿⣿⣿⠀⠀⠀⠀⠀⢀⠀⠀⠀⠀⠀⠀⠀⠙⠟⠋⠀⠀⠀⠀⠀⠀⠀⡀⠀⠀⠀⠀⢸⣿⣿⣿⣧⠘⡤⠋⡄⠃⡧⡇⡧⡅⠃⡜⠁
⠊⡧⡏⡃⠈⠧⠼⢥⠼⢹⢼⢠⢹⣿⣿⣿⠀⠀⠀⠀⠀⢸⣷⣄⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣤⣾⡇⠀⠀⠀⠀⢸⣿⣿⣿⣯⠽⡤⠍⡀⠋⡧⡏⡧⡭⠇⡼⠁
⠀⡇⡇⡃⡁⠆⡉⢩⠹⢸⢸⢸⢹⣿⣿⣿⠀⠀⠀⠀⠀⢸⣿⣿⣿⣦⡀⠀⠀⠀⠀⠀⠀⠀⣠⣴⣿⣿⣿⡇⠀⠀⠀⠀⢸⣿⣿⣿⣏⠼⢉⠅⡈⡆⡆⡇⡇⡥⠏⡹⢀
⠀⣇⡧⣇⡡⢆⡱⢌⡹⢸⣹⢼⣹⣿⣿⣿⠀⠀⠀⠀⠀⢸⣿⣿⣿⣿⣿⡆⠀⠀⠀⠀⠀⣾⣿⣿⣿⣿⣿⡇⠀⠀⠀⠀⢸⣿⣿⣿⣏⠴⣉⠦⣁⠦⣇⡇⣇⡣⢆⡱⢌
⠔⡇⡇⡆⠀⢎⡱⢊⢰⢺⢸⢸⢸⣿⣿⣿⠀⠀⠀⠀⠀⢸⣿⣿⣿⣿⣿⡇⠀⠀⠀⠀⠀⣿⣿⣿⣿⣿⣿⡇⠀⠀⠀⠀⢸⣿⣿⣿⣏⢲⣉⠖⠁⠆⣇⡗⡇⡓⠆⡱⠊
⠔⣇⡗⢄⠀⢆⣲⣚⣲⢺⣸⠈⣺⣿⣿⣿⠀⠀⠀⠀⠀⢸⣿⣿⣿⣿⣿⡇⠀⠀⠀⠀⠀⣿⣿⣿⣿⣿⣿⡇⠀⠀⠀⠀⢸⣿⣿⣿⣟⢲⣑⡂⣁⠆⣇⡗⣗⡓⢆⣳⠀
⠐⡇⣗⡇⠂⡄⠒⣚⢰⣸⢸⣸⢺⣿⣿⣿⠀⠀⠀⠀⠀⢸⣿⣿⣿⣿⣿⡇⠀⠀⠀⠀⠀⣿⣿⣿⣿⣿⣿⡇⠀⠀⠀⠀⢸⣿⣿⣿⣟⣲⠓⣐⠓⡄⡇⣗⡇⢃⡔⢣⡂
⠀⡇⡇⡗⠂⡔⢣⡘⢲⢸⢺⢸⢺⣿⣿⣿⡆⠀⠀⠀⠀⢸⣿⣿⣿⣿⣿⡇⠀⠀⠀⠀⠀⣿⣿⣿⣿⣿⣿⡇⠀⠀⠀⠀⢸⣿⣿⣿⡟⣠⠛⡄⠓⡄⡗⡇⡗⠇⡔⢣⠘
⡠⡇⡧⡅⠃⡜⢣⠜⢡⢼⢸⢼⠘⣿⣿⣿⣷⠀⠀⠀⠀⢸⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡇⠀⠀⠀⢀⣿⣿⣿⡿⠙⢤⠛⠤⠃⡆⡃⡧⡇⠧⡔⢣⠜
⡠⡏⡧⡇⠄⡌⠥⠜⢥⢼⢹⢼⢽⢌⢿⣿⣿⣧⡀⠀⠀⢸⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡇⠀⠀⣠⣿⣿⣿⣿⢹⠼⢤⠏⠄⠂⡄⡏⡧⡯⠇⡌⢣⠐
⠠⡏⡧⡆⠆⡈⠭⠼⢩⢼⢹⢼⢹⢬⠤⡻⣿⣿⣿⣦⡀⢸⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡇⢀⣴⣿⣿⣿⢏⢱⢼⠽⢬⠯⠡⠇⡂⡏⡧⡏⠇⡄⢏⠄
⠈⡧⡏⡧⠌⡡⢌⠱⢬⢹⢼⢹⢸⢉⠴⣉⠮⡻⣿⣿⣷⣾⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣷⣿⣿⣿⠟⢥⢸⢼⢙⠴⢉⠶⡉⠦⡍⡧⡏⡣⠎⡡⢎⠱
⢀⡇⣇⡃⠂⡑⢎⡱⢈⣸⢸⣸⢸⣈⠰⣉⠶⣁⡎⡛⢿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡿⠛⢁⡰⢈⣸⢸⣸⢰⣈⠖⣁⠆⡁⡇⣇⡇⣆⡁⢎⡡
⠁⡗⡇⡗⡀⡑⣊⣰⣊⢸⣺⢸⢪⢈⢲⣁⣖⡁⣗⣇⣗⡝⡿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡿⠋⣄⣱⣊⣰⣊⢸⢺⢸⣲⢈⢖⣀⢖⡁⡗⡇⣗⡆⣑⣎⠠
⢀⡇⣇⡅⠄⡑⣂⣰⢚⣸⢸⣸⠠⣘⢲⣂⡖⣃⡇⣗⡗⣗⣗⣎⡻⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣟⡋⣗⡓⣖⣳⢚⣰⢈⢸⢸⣸⢰⣚⣖⣂⡄⣄⡇⣇⡇⣆⡁⣞⡠
⠀⣇⡇⣇⡂⢃⡐⢲⣘⢸⣸⢸⢸⠘⣠⠒⣄⠃⣇⡇⡇⡄⣇⡔⢣⡘⢛⠿⣿⣿⣿⣿⣿⣿⠛⣅⡗⣇⡗⢃⡔⢣⡘⢢⣘⢸⣸⢸⣠⠚⣤⠒⣄⡃⣇⡇⣇⡕⢃⡜⢠
⠐⡇⡗⠇⠔⢣⡜⢢⠜⢸⢸⢺⢸⠘⢤⠛⡤⠓⡇⡗⡇⡔⠧⡔⢣⠜⢲⢼⢫⠻⢿⠟⠛⣤⠓⡤⡗⡇⡗⠧⡔⢣⡜⢢⠘⢺⢼⢺⢤⠚⡤⠓⡄⠓⡧⡗⡧⡔⠃⡜⢂
⠃⡧⡏⠂⠀⠣⠜⢡⠜⢸⢼⠱⠘⠘⢤⠋⡤⠃⡧⡇⡆⡍⠧⡌⢣⠜⢨⠼⢹⢼⠹⢤⠙⠤⠋⡤⠃⠆⡏⠧⡌⠣⠜⢡⠜⠸⢼⢹⢤⠘⠤⠃⠀⠃⠦⡏⡧⡅⠣⡜⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠈⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠄⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀`;

const METASPLOIT_ACTIVITY = (friend: string): string[] => [
  `${friend} opened Messages`,
  `${friend} typed: "heyyy what's up"`,
  `${friend} scrolled vertex-hub`,
  `${friend} opened Browser → Arch Linux docs`,
  `${friend} opened Settings → Privacy`,
  `${friend} switched desktop workspace`,
  `${friend} moved the mouse`,
  `${friend} opened Terminal → ran: ls`,
  "keystrokes captured · 3",
  "keystrokes captured · 7 (2 ignored)",
  "webcam: OFF · mic: OFF",
  `${friend} minimized a window`,
  `${friend} launched Wallpaper Engine`,
  `${friend} watched a video in the Browser`,
  `${friend} copy-pasted a password (masked)`,
];

function msTick(friend: string): string {
  const t = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const pool = METASPLOIT_ACTIVITY(friend);
  return `[${pad(t.getHours())}:${pad(t.getMinutes())}:${pad(t.getSeconds())}] ${pool[Math.floor(Math.random() * pool.length)]}`;
}

const PORT_WITS = [
  "22/tcp ssh",
  "23/tcp telnet",
  "25/tcp smtp",
  "80/tcp http",
  "443/tcp https",
  "3306/tcp mysql",
  "5432/tcp postgresql",
  "6379/tcp redis",
  "8000/tcp http-alt",
  "8080/tcp http-proxy",
  "8443/tcp https-alt",
  "9000/tcp cslistener",
];

const GEO_FIELDS = "status,message,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,asname,mobile,proxy,hosting,query";

function fetchWithTimeout(url: string, ms: number): Promise<Response> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), ms);
  return fetch(url, { signal: controller.signal }).finally(() => window.clearTimeout(timer));
}

function delayMs(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

type GeoDatum = {
  status?: string;
  message?: string;
  query?: string;
  country?: string;
  countryCode?: string;
  region?: string;
  regionName?: string;
  city?: string;
  zip?: string;
  lat?: number;
  lon?: number;
  timezone?: string;
  isp?: string;
  org?: string;
  as?: string;
  asname?: string;
  mobile?: boolean;
  proxy?: boolean;
  hosting?: boolean;
  provider?: string;
};

type IpWhoDatum = {
  ip?: string;
  success?: boolean;
  message?: string;
  country?: string;
  country_code?: string;
  region?: string;
  region_code?: string;
  city?: string;
  postal?: string;
  latitude?: number;
  longitude?: number;
  connection?: { asn?: number; org?: string; isp?: string; domain?: string };
  timezone?: { id?: string };
};

async function fetchGeoDatum(ip: string): Promise<GeoDatum> {
  try {
    const res = await fetchWithTimeout(`https://ip-api.com/json/${encodeURIComponent(ip)}?fields=${GEO_FIELDS}`, 6500);
    if (res.ok) {
      const d = (await res.json()) as GeoDatum;
      if (d.status === "success") return { ...d, provider: "ip-api.com" };
    }
  } catch {
    /* fall through to secondary feed */
  }
  try {
    const res = await fetchWithTimeout(`https://ipwho.is/${encodeURIComponent(ip)}`, 8500);
    if (!res.ok) throw new Error(String(res.status));
    const d = (await res.json()) as IpWhoDatum;
    if (d.success && d.ip) {
      return {
        status: "success",
        query: d.ip,
        provider: "ipwho.is",
        country: d.country,
        countryCode: d.country_code,
        region: d.region_code,
        regionName: d.region,
        city: d.city,
        zip: d.postal,
        lat: d.latitude,
        lon: d.longitude,
        timezone: d.timezone?.id,
        isp: d.connection?.isp,
        org: d.connection?.org,
        as: d.connection?.asn ? `AS${d.connection.asn}` : undefined,
        asname: d.connection?.domain,
      };
    }
    return { status: "fail", message: d.message ?? "no data", provider: "ipwho.is" };
  } catch {
    return { status: "fail", message: "uplink blocked or offline", provider: "none" };
  }
}

function printGeoRow(print: (text: string) => void, label: string, value: string) {
  print(`  \u001b[36m${label.padEnd(17)}\u001b[0m${value}`);
}

function printGeoServices(print: (text: string) => void, d: GeoDatum) {
  print("  \u001b[2mservices ──────────────────────────────────\u001b[0m");
  const flag = (v: boolean | undefined, yesText: string) =>
    v === undefined ? "\u001b[2mn/a (feed doesn't flag it)" : v ? `\u001b[1m\u001b[38;5;45myes — ${yesText}\u001b[0m` : "\u001b[2mno\u001b[0m";
  print(`  \u001b[36mpublic proxy server${flag(d.proxy, "forwarding traffic")}`);
  print(`  \u001b[36mhosting / datacenter${flag(d.hosting, "server/net location")}`);
  print(`  \u001b[36mmobile carrier${" ".repeat(6)}${flag(d.mobile, "cellular uplink")}`);
  if (d.provider) print(`  \u001b[2mgeo feed · ${d.provider} · live uplink\u001b[0m`);
}

function printGeoBody(print: (text: string) => void, header: string, d: GeoDatum) {
  print(`\u001b[2m───────────────────────────────────────────────\u001b[0m`);
  print(`  \u001b[1m${header} \u001b[2m>\u001b[0m`);
  printGeoRow(print, "IP address", d.query ?? "?");
  printGeoRow(print, "country recon", `${d.country ?? "?"} (${d.countryCode ?? "?"})`);
  printGeoRow(print, "region recon", `${d.regionName ?? "?"} (${d.region ?? "?"})`);
  printGeoRow(print, "city recon", `${d.city ?? "?"}${d.zip ? ` · ${d.zip}` : ""}`);
  printGeoRow(print, "timezone recon", d.timezone ?? "?");
  printGeoRow(print, "coordinates", `${d.lat ?? "?"}°, ${d.lon ?? "?"}°`);
  printGeoRow(print, "ASN", `${d.as ?? "?"}${d.asname ? ` (${d.asname})` : ""}`);
  printGeoRow(print, "ISP", `${d.isp ?? "?"}${d.org && d.org !== d.isp ? ` · ${d.org}` : ""}`);
  printGeoServices(print, d);
  print(`\u001b[2m───────────────────────────────────────────────\u001b[0m`);
}

async function geoRecon({ target, print }: { target: string; print: (text: string) => void }) {
  await delayMs(500);
  print(`  \u001b[2m:: target resolved → \u001b[0m\u001b[1m${target}\u001b[0m \u001b[2m· querying geo database …\u001b[0m`);
  const d = await fetchGeoDatum(target);
  if (d.status !== "success" || !d.query) {
    print(`\u001b[31m!! geo_tracker.py: recon failed — ${d.message ?? "no data"}.\u001b[0m`);
    return;
  }
  printGeoBody(print, `target \u001b[38;5;45m${target}`, d);
}

async function ipConfigMe({ print }: { print: (text: string) => void }) {
  await delayMs(450);
  let publicIp = "";
  try {
    const res = await fetchWithTimeout("https://api.ipify.org?format=json", 9000);
    if (res.ok) publicIp = String((await res.json()).ip ?? "");
  } catch {
    /* fall through */
  }
  if (!publicIp) {
    print("\u001b[31m!! IpConfig: uplink dark — could not resolve your public IP.\u001b[0m");
    return;
  }
  print(`  \u001b[2m:: your public IP resolved → \u001b[0m\u001b[1m${publicIp}\u001b[0m`);
  const d = await fetchGeoDatum(publicIp);
  if (d.status !== "success" || !d.query) {
    print(`\u001b[31m!! IpConfig: detail lookup failed — ${d.message ?? "no data"}.\u001b[0m`);
    return;
  }
  printGeoBody(print, "IpConfig — your network uplink", d);
}

const TERM_HELP_ROWS: [string, string][] = [
  ["help", "show this list"],
  ["clear", "clear the screen"],
  ["echo <text>", "print text"],
  ["pwd · ls · cat <file>", "filesystem basics"],
  ["git clone <url> · cd <dir>", "repository workflow"],
  ["./start.sh", "install Quick Wallpaper Picker"],
  ["about", "system information"],
  ["banner [list|on|off|<id>|art]", "customize the startup banner"],
  ["theme [set k=v … | reset]", "colors, font, cursor, effects"],
  ["ansi", "preview ANSI colors & text styles"],
  ["settings", "open the terminal settings panel"],
  ["!sudo install fsociety.tool?full", "fsociety™ — take over the banner"],
  ["!sudo uninstall fsociety", "remove fsociety™ and restore McCrack-COS"],
  ["!sudo curl install NMAP", "unlock the recon toolkit (needs fsociety)"],
  ["nmap <host>", "port scan a target (needs NMAP)"],
  ["!sudo curl py. geo_tracker.py target <IP>", "target recon — geo, ASN, ISP, proxy check"],
  ["!sudo IpConfig", "your own public IP + network recon"],
  ["!sudo curl fetch Metasploit.com download", "install the metasploit framework (needs fsociety)"],
  ["!run metasploit", "open the METASPLOIT TOOL tab"],
  ["!sudo install jarvis", "install JARVIS AI — Iron Man assistant"],
  ["!sudo install JARVIS", "install JARVIS AI — Iron Man assistant"],
  ["jarvis", "open JARVIS AI"],
];

function TerminalSurface({ installed, onInstalled, onFsociety, jarvisInstalled, setJarvisInstalled, onJarvisInstall, toggleApp }: { installed: boolean; onInstalled: () => void; onFsociety: (active: boolean) => void; jarvisInstalled?: boolean; setJarvisInstalled?: (v: boolean) => void; onJarvisInstall?: () => void; toggleApp?: (id: AppId) => void }) {
  const [config, setConfig] = useState<TerminalConfig>(() => readTerminalConfig());
  const [introVisible, setIntroVisible] = useState<boolean>(() => config.bannerEnabled);
  const [tab, setTab] = useState<"terminal" | "settings" | "metasploit">("terminal");
  const [lines, setLines] = useState<ReactNode[]>([]);
  const [msAct, setMsAct] = useState<string[]>([]);
  useEffect(() => {
    msFeedBridge = (line: string) => setMsAct((prev) => { const next = [...prev, "· " + line]; return next.slice(-40); });
    return () => { if (msFeedBridge) msFeedBridge = null; };
  }, []);
  const [input, setInput] = useState("");
  const [ready, setReady] = useState(false);
  const [caretX, setCaretX] = useState(0);
  const [caretTick, setCaretTick] = useState(0);
  const clonedRef = useRef(false);
  const installingRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const outRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const openedAt = useRef(Date.now());
  const msInputRef = useRef<HTMLInputElement>(null);
  const [msLines, setMsLines] = useState<ReactNode[]>([]);
  const [msInput, setMsInput] = useState("");
  const [msPayloads, setMsPayloads] = useState<{ name: string }[]>([]);
  const msFeedUi = useGhostViewUi();
  const msFeedSnap = msFeedUi.snap ?? { wins: [] as GvWindow[], active: null as string | null };
  const [msSession, setMsSession] = useState<{ friend: string; addr: string; id: string } | null>(null);

  const palette = useMemo(() => resolveTerminalPalette(config), [config]);
  const bannerArt = useMemo(() => resolveBannerArt(config), [config]);
  const bannerBase = Math.min(20, Math.max(13, config.fontSize + 2));

  const update = (patch: Partial<TerminalConfig>) => {
    setConfig((prev) => {
      const next = { ...prev, ...patch };
      writeTerminalConfig(next);
      return next;
    });
  };

  useEffect(() => {
    const el = outRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines, tab, introVisible]);

  useEffect(() => {
    if (!msSession) return;
    setMsAct([]);
    pushMsFeed(`SESSION ${msSession.id} LIVE`);
    pushMsFeed(`tunnel ${msSession.addr} · waiting wireframes`);
  }, [msSession]);

  useLayoutEffect(() => {
    if (config.cursor === "bar") return;
    const measure = measureRef.current;
    const el = inputRef.current;
    if (!measure || !el) return;
    const pos = el.selectionStart ?? input.length;
    measure.textContent = input.slice(0, pos);
    setCaretX(measure.getBoundingClientRect().width);
  }, [input, caretTick, config.cursor, config.fontSize, config.font, config.text]);

  const fsociety = config.fsociety;
  const prompt = fsociety ? `arch@archlinux:${ready ? "~/Quick-Wallpaper-Picker" : "~"}$` : `vertex@vertex-os:${ready ? "~/Quick-Wallpaper-Picker" : "~"}$`;

  const p = (node: ReactNode) => setLines((prev) => [...prev, node]);
  const pa = (text: string) => setLines((prev) => [...prev, ansiToNodes(text, `a${prev.length}`)]);
  const scrollToTop = () => {
    if (outRef.current) outRef.current.scrollTop = 0;
  };

  const runInstall = () => {
    if (installingRef.current) return;
    installingRef.current = true;
    p(<span className="term-success">Installing Quick Wallpaper Picker...</span>);
    let i = 0;
    const tick = () => {
      if (i < WP_INSTALL_STEPS.length) {
        p(WP_INSTALL_STEPS[i]);
        i += 1;
        window.setTimeout(tick, 260 + Math.random() * 300);
      } else {
        p(<span className="term-success">Installation complete ✓</span>);
        p(<span className="term-out">Quick Wallpaper Picker is now installed.</span>);
        p(<span className="term-out">Press <span className="term-cmd">Alt+W</span> to open it — no app, no desktop icon.</span>);
        p("");
        window.setTimeout(() => onInstalled(), 500);
      }
    };
    tick();
  };

  const msLog = (node: ReactNode) => setMsLines((prev) => [...prev, node]);
  const msLogA = (text: string) => setMsLines((prev) => [...prev, ansiToNodes(text, `m${prev.length}`)]);
  const msLogErr = (node: ReactNode) => setMsLines((prev) => [...prev, <span className="term-error">{node}</span>]);

  const runMs = (raw: string) => {
    const cmd = raw.trim();
    if (!cmd) return;
    msLog(<span className="term-in"><span className="term-prompt term-prompt-ms">msf6 ▸</span> <span className="term-cmd">{cmd}</span></span>);
    const pieces = cmd.split(/\s+/);
    const head = pieces[0].toLowerCase();
    const rest = cmd.slice(pieces[0].length).trim();
    if (!head.startsWith("!")) {
      msLogErr(<>unknown metasploit command: <span className="term-cmd">{head}</span> — type <span className="term-cmd">!help</span></>);
      return;
    }
    if (head === "!help" || head === "!?" || head === "!h") {
      msLogA("\u001b[1m\u001b[38;5;45mmsf6 \u001b[0m\u001b[2m— metasploit tool commands\u001b[0m");
      msLogA("\u001b[2m──────────────────────────────────────────────\u001b[0m");
      const rows: [string, string][] = [
        ["!create RemoteAccess.Exe file", "forge an .exe payload to send people"],
        ["!payloads", "list the payloads you've forged"],
        ["!copy-link <payload>", "grab a fake share link for a payload"],
        ["!send <payload> <friend>", "deliver a real payload file over P2P"],
        ["!probe <friend>", "ping a friend's P2P channel (online check)"],
        ["!disconnect", "kill the remote session + ghostview"],
        ["!session", "show the active remote session"],
        ["!exit", "leave metasploit, back to the shell"],
        ["!clear", "clear this console"],
      ];
      for (const [usage, description] of rows) {
        msLogA(`  \u001b[36m${usage.padEnd(34)}\u001b[0m\u001b[2m${description}\u001b[0m`);
      }
      msLogA("\u001b[2m──────────────────────────────────────────────\u001b[0m");
      msLogA("\u001b[2m  real P2P delivery — friend must have a McCrack-COS session with an account code.\u001b[0m");
      return;
    }
    if (head === "!clear") { setMsLines([]); return; }
    if (head === "!exit" || head === "!back" || head === "!quit") {
      msLogA("\u001b[2m[*] leaving metasploit framework — back to the shell …\u001b[0m");
      window.setTimeout(() => setTab("terminal"), 380);
      return;
    }
    if (head === "!create") {
      let name = rest.replace(/\s+file$/i, "").trim() || "RemoteAccess.Exe";
      if (!/\.[eE][xX][eE]$/.test(name)) name += ".exe";
      if (msPayloads.some((pld) => pld.name.toLowerCase() === name.toLowerCase())) {
        msLogErr(<>payload <span className="term-cmd">{name}</span> already exists — use <span className="term-cmd">!payloads</span></>);
        return;
      }
      const size = 128 + Math.floor(Math.random() * 140);
      const hash = Array.from({ length: 6 }, () => "0123456789abcdef".charAt(Math.floor(Math.random() * 16))).join("");
      setMsPayloads((prev) => [...prev, { name }]);
      msLogA("\u001b[33m[!] generating payload …\u001b[0m");
      window.setTimeout(() => msLogA("\u001b[2m  ▸ stage    · injecting fsociety stub + msfvenom shellcode …\u001b[0m"), 300);
      window.setTimeout(() => msLogA("\u001b[2m  ▸ obfusc   · packing body (aes+base64) …\u001b[0m"), 640);
      window.setTimeout(() => msLogA("\u001b[2m  ▸ evade    · vertex-defender sigs → clean …\u001b[0m"), 980);
      window.setTimeout(() => {
        msLogA(`\u001b[32m[+] payload ready: \u001b[1m${name}\u001b[0m · ${size} KB · hash ${hash}`);
        msLogA(`\u001b[2m    deliver it with:  \u001b[0m\u001b[36m!send ${name} <friend>\u001b[0m`);
      }, 1340);
      return;
    }
    if (head === "!payloads") {
      if (msPayloads.length === 0) { msLogA("\u001b[33m[!] no payloads forged yet — run \u001b[1m!create RemoteAccess.Exe file\u001b[0m"); return; }
      for (const pld of msPayloads) msLogA(` \u001b[38;5;45m▸\u001b[0m \u001b[1m${pld.name}\u001b[0m`);
      return;
    }
    if (head === "!copy-link") {
      const name = rest.trim() || "RemoteAccess.Exe";
      const pld = msPayloads.find((x) => x.name.toLowerCase() === name.toLowerCase());
      if (!pld) { msLogErr(<>payload <span className="term-cmd">{name}</span> not found — forge one first with <span className="term-cmd">!create</span></>); return; }
      msLogA(`\u001b[32m[+] fake share link → \u001b[1mhttps://vrts.hx/${pld.name.toLowerCase().replace(/\.exe$/, "")}-${pld.name.length}${Math.floor(Math.random() * 90 + 10)}\u001b[0m`);
      msLogA("\u001b[2m    (purely cosmetic — never send a real file to anyone)");
      return;
    }
    if (head === "!send") {
      const sendMatch = cmd.match(/^!?send\s+(.+?)\s+(\S+)$/i);
      const name = sendMatch?.[1]?.trim();
      const friend = sendMatch?.[2]?.trim();
      const pld = name ? msPayloads.find((x) => x.name.toLowerCase() === name.toLowerCase()) : undefined;
      if (!pld) { msLogErr(<>payload not found. forge one first: <span className="term-cmd">!create RemoteAccess.Exe file</span></>); return; }
      if (!friend) { msLogErr(<>expected a friend name. usage: <span className="term-cmd">!send {pld.name} alice</span></>); return; }
      const addr = `p2p://${friend}@vertex-gv`;
      const id = Array.from({ length: 6 }, () => "0123456789abcdef".charAt(Math.floor(Math.random() * 16))).join("");
      msLogA(`\u001b[2m[*] forging deliver tunnel → \u001b[0m\u001b[1m${friend}\u001b[0m\u001b[2m …\u001b[0m`);
      msLogA(`\u001b[2m  ▸ connecting peer vertex-gv-${friend.toLowerCase()} …\u001b[0m`);
      ghostDeliver(friend, pld.name).then((res) => {
        if (!res.ok) {
          const r = res.reason;
          if (r === "self") {
            msLogErr(<>delivery blocked — that's <b>this session</b>. <span className="term-cmd">{friend}</span> is your own code.</>);
          } else if (r === "peer-unavailable") {
            msLogErr(<>delivery failed — <b>{friend}</b> isn't on the P2P cloud. They need a McCrack-COS session open with an account code — in a <b>separate browser, incognito, or another device</b> (two tabs in one browser share a single code, so only one can answer).</>);
          } else if (r === "local") {
            msLogErr(<>delivery failed — your GhostView peer isn't registered yet. wait a second, then use <span className="term-cmd">!probe {friend}</span>.</>);
          } else if (r === "network") {
            msLogErr(<>delivery failed — the signs are up: P2P cloud unreachable. check your connection.</>);
          } else {
            msLogErr(<>delivery timed out — <b>{friend}</b> didn't answer. retry, or <span className="term-cmd">!probe {friend}</span> for a live check.</>);
          }
          return;
        }
        msLogA(`\u001b[32m[+] ${pld.name} (${128 + pld.name.length % 80} KB) delivered to ${friend}`);
        msLogA(`\u001b[2m  [+] waiting for them to run it — remote session will open on its own\u001b[0m`);
        setMsSession({ friend, addr, id });
      });
      return;
    }
    if (head === "!probe") {
      const who = rest.trim();
      if (!who) { msLogErr(<>usage: <span className="term-cmd">!probe &lt;friend&gt;</span></>); return; }
      msLogA(`\u001b[2m[*] knocking peer vertex-gv-${who.toLowerCase()} …\u001b[0m`);
      ghostProbe(who).then((res) => {
        if (res.ok) {
          msLogA(`\u001b[32m[+] ${who} is ONLINE · channel open · ready to receive`);
        } else if (res.reason === "self") {
          msLogErr(<>no need — <span className="term-cmd">{who}</span> is this session.</>);
        } else if (res.reason === "local") {
          msLogErr(<>your GhostView peer isn't registered yet — wait a moment and retry.</>);
        } else if (res.reason === "network") {
          msLogErr(<>P2P cloud unreachable — check your connection.</>);
        } else {
          msLogErr(<>no answer — <b>{who}</b> is offline. they need a McCrack-COS session open with an account code, in a separate browser/incognito/device.</>);
        }
      });
      return;
    }
    if (head === "!disconnect") {
      if (!msSession) { msLogA("\u001b[33m[!] no active session to disconnect."); return; }
      ghostStop();
      pushMsFeed("SESSION ENDED — channel closed");
      ghostWinCloser?.();
      msLogA(`\u001b[31m[+] session ${msSession.id} killed · GhostView shut · trace wiped`);
      msLogA(`\u001b[2m[*] ${msSession.friend} restored — they never opened a thing on purpose.`);
      setMsSession(null);
      return;
    }
    if (head === "!session") {
      if (!msSession) { msLogA("\u001b[33m[!] no active session. open one with \u001b[1m!send <payload> <friend>\u001b[0m"); return; }
      msLogA(`\u001b[38;5;45m▸\u001b[0m session \u001b[1m${msSession.id}\u001b[0m · ${msSession.friend} · ${msSession.addr} · \u001b[32mlive\u001b[0m`);
      msLogA(`\u001b[2m    ghostview window: open ⟶  ❖ GhostView mirror (auto-opens on session start)`);
      msLogA(`\u001b[2m    hint: \u001b[0m\u001b[36m!disconnect\u001b[0m\u001b[2m ends the session, \u001b[0m\u001b[36m!session\u001b[0m re-shows this\u001b[0m`);
      return;
    }
    msLogErr(<>unknown metasploit command: <span className="term-cmd">{head}</span> — type <span className="term-cmd">!help</span></>);
  };

  const run = (raw: string) => {
    const cmd = raw.trim();
    if (!cmd) { p(<span className="term-in"><span className="term-prompt">{prompt}</span></span>); return; }
    p(<span className="term-in"><span className="term-prompt">{prompt}</span> <span className="term-cmd">{cmd}</span></span>);
    if (cmd === "help") {
      pa("\u001b[1m\u001b[38;5;45mMcCrack-COS Terminal\u001b[0m \u001b[2m— available commands\u001b[0m");
      pa("\u001b[2m──────────────────────────────────────────────\u001b[0m");
      for (const [usage, description] of TERM_HELP_ROWS) {
        pa(`  \u001b[36m${usage.padEnd(32)}\u001b[0m\u001b[2m${description}\u001b[0m`);
      }
      p("");
      return;
    }
    if (cmd === "clear") { setLines([]); setIntroVisible(false); return; }
    if (cmd.startsWith("echo ")) { p(<span className="term-out">{cmd.slice(5)}</span>); p(""); return; }
    if (cmd === "pwd") { p(<span className="term-out">{ready ? "~/Quick-Wallpaper-Picker" : "~"}</span>); p(""); return; }
    if (cmd === "ls") {
      p(<span className="term-out">README.md  assets/  package.json  src/  start.sh</span>);
      p("");
      return;
    }
    if (cmd === "cat README.md") {
      p(<span className="term-out"># Quick Wallpaper Picker</span>);
      p(<span className="term-out">Lightweight animated wallpaper picker for McCrack-COS.</span>);
      p(<span className="term-out">Run <span className="term-cmd">./start.sh</span> to install.</span>);
      p("");
      return;
    }
    if (cmd === "./start.sh") {
      if (installed) {
        p(<span className="term-out">Quick Wallpaper Picker is already installed.</span>);
        p(<span className="term-out">Press <span className="term-cmd">Alt+W</span> to open it.</span>);
        p("");
        return;
      }
      runInstall();
      return;
    }
    const cloneMatch = cmd.match(/^git\s+clone\s+(.+)$/);
    if (cloneMatch) {
      const url = cloneMatch[1];
      if (/Quick-Wall[p]aper-Picker\.git/.test(url)) {
        clonedRef.current = true;
        p(<span className="term-out">Cloning into <span className="term-cmd">'{WP_REPO_DIR}'</span>...</span>);
        p(<span className="term-out">remote: Enumerating objects: 24, done.</span>);
        p(<span className="term-out">remote: Counting objects: 100% (24/24), done.</span>);
        p(<span className="term-out">remote: Compressing objects: 100% (18/18), done.</span>);
        p(<span className="term-out">remote: Total 24 (delta 6), reused 0 (delta 0), pack-reused 0</span>);
        p(<span className="term-out">Receiving objects: 100% (24/24), 2.3 MiB | 5.1 MiB/s, done.</span>);
        p(<span className="term-out">Resolving deltas: 100% (6/6), done.</span>);
        p("");
      } else {
        p(<span className="term-error">fatal: repository <span className="term-cmd">{url}</span> not found.</span>);
        p("");
      }
      return;
    }
    const cdMatch = cmd.match(/^cd\s+(.+)$/);
    if (cdMatch) {
      const dir = cdMatch[1].replace(/\/+$/, "");
      if (dir === WP_REPO_DIR && !clonedRef.current) {
        p(<span className="term-error">cd: no such directory: <span className="term-cmd">{dir}</span> (did you clone it first?)</span>);
        p("");
        return;
      }
      if (dir === WP_REPO_DIR) {
        setReady(true);
        p(<span className="term-out">(now in <span className="term-cmd">~/Quick-Wallpaper-Picker</span>)</span>);
        if (installed) {
          p(<span className="term-out">Run <span className="term-cmd">./start.sh</span> or press <span className="term-cmd">Alt+W</span> to open it.</span>);
        } else {
          p(<span className="term-out">Run <span className="term-cmd">./start.sh</span> to install.</span>);
        }
        p("");
        return;
      }
      p(<span className="term-error">cd: no such directory: <span className="term-cmd">{dir}</span></span>);
      p("");
      return;
    }
    if (cmd === "settings" || cmd === "config" || cmd === "prefs") {
      setTab("settings");
      pa("\u001b[2mswitched to the settings tab\u001b[0m");
      p("");
      return;
    }

    if (cmd === "about" || cmd === "neofetch" || cmd === "status") {
      const uptime = formatUptime(Math.max(0, Math.round((Date.now() - openedAt.current) / 1000)));
      const bannerName = config.banner === CUSTOM_BANNER_ID ? "custom art" : (getBanner(config.banner)?.name ?? config.banner);
      const paletteName = palette.id === CUSTOM_PALETTE_ID ? "custom gradient" : palette.name;
      pa(`\u001b[1m\u001b[38;5;45m${fsociety ? "arch" : "vertex"}\u001b[0m\u001b[2m@\u001b[0m\u001b[1m\u001b[35m${fsociety ? "archlinux" : "vertex-os"}\u001b[0m`);
      pa("\u001b[2m──────────────────────────────\u001b[0m");
      const rows: [string, string][] = [
        ["OS", fsociety ? "Arch Linux (web)" : "McCrack-COS 1.0 (web)"],
        ["Host", fsociety ? "fsociety.tools" : "Browser Runtime"],
        ["Shell", fsociety ? "zsh 5.9 (arch)" : "zsh 5.9 (vertex)"],
        ["Terminal", fsociety ? "arch-term" : "vertex-term"],
        ["Toolkit", fsociety ? "fsociety.tool?full ✓" : "—"],
        ["Theme", `${paletteName} · ${config.fontSize}px · ${config.cursor}`],
        ["Banner", `${bannerName} (${config.bannerEnabled ? "on" : "off"})`],
        ["Font", config.font],
        ["Uptime", uptime],
        ["Locale", typeof navigator !== "undefined" ? navigator.language : "en-US"],
      ];
      for (const [key, value] of rows) pa(`  \u001b[36m${key.padEnd(10)}\u001b[0m${value}`);
      p("");
      return;
    }

    if (cmd === "ansi" || cmd === "colors") {
      pa("\u001b[1mANSI colors\u001b[0m");
      for (let group = 0; group < 2; group += 1) {
        const cells: string[] = [];
        for (let i = 0; i < 8; i += 1) {
          const code = group === 0 ? 40 + i : 100 + i;
          cells.push(`\u001b[${code}m ${String(code).padStart(3)} \u001b[0m`);
        }
        pa(`  ${cells.join(" ")}`);
      }
      pa("\u001b[1mStyles\u001b[0m  \u001b[1mbold\u001b[0m  \u001b[2mdim\u001b[0m  \u001b[3mitalic\u001b[0m  \u001b[4munderline\u001b[0m  \u001b[7minverse\u001b[0m");
      pa("  \u001b[38;5;208m256-color\u001b[0m  \u001b[38;2;255;105;180mtruecolor\u001b[0m");
      p("");
      return;
    }

    if (cmd === "banner") {
      pa("\u001b[1mStartup banner\u001b[0m");
      pa(`  active   \u001b[38;5;45m${config.banner}\u001b[0m (${config.bannerEnabled ? "on" : "off"})`);
      pa(`  styles   ${TERMINAL_BANNERS.map((banner) => banner.id).join(", ")}`);
      pa("\u001b[2m  usage    banner <id> · banner on · banner off · banner art · banner list · banner preview\u001b[0m");
      p("");
      return;
    }
    if (cmd === "banner list") {
      pa("\u001b[1mAvailable banners\u001b[0m");
      for (const banner of TERMINAL_BANNERS) {
        const marker = banner.id === config.banner ? "\u001b[38;5;45m●\u001b[0m" : "\u001b[2m○\u001b[0m";
        pa(`  ${marker} \u001b[1m${banner.id.padEnd(16)}\u001b[0m\u001b[2m${banner.hint}\u001b[0m`);
      }
      const customMarker = config.banner === CUSTOM_BANNER_ID ? "\u001b[38;5;45m●\u001b[0m" : "\u001b[2m○\u001b[0m";
      pa(`  ${customMarker} \u001b[1m${CUSTOM_BANNER_ID.padEnd(16)}\u001b[0m\u001b[2myour own ASCII art (edit in settings)\u001b[0m`);
      p("");
      return;
    }
    if (cmd === "banner on" || cmd === "banner off") {
      const enabled = cmd === "banner on";
      update({ bannerEnabled: enabled });
      if (enabled) { setIntroVisible(true); window.setTimeout(scrollToTop, 0); }
      pa(`startup banner \u001b[1m${enabled ? "enabled" : "disabled"}\u001b[0m`);
      p("");
      return;
    }
    if (cmd === "banner preview") {
      if (!config.bannerEnabled) update({ bannerEnabled: true });
      setIntroVisible(true);
      window.setTimeout(scrollToTop, 0);
      return;
    }
    if (cmd === "banner art" || cmd === "banner custom") {
      update({ banner: CUSTOM_BANNER_ID, bannerEnabled: true });
      setIntroVisible(true);
      pa("switched to \u001b[1mcustom\u001b[0m banner — paste your art under \u001b[36msettings\u001b[0m.");
      p("");
      return;
    }
    if (cmd.startsWith("banner ")) {
      const bannerId = cmd.slice(7).trim();
      if (bannerId === CUSTOM_BANNER_ID || getBanner(bannerId)) {
        update({ banner: bannerId, bannerEnabled: true });
        setIntroVisible(true);
        window.setTimeout(scrollToTop, 0);
        pa(`startup banner set to \u001b[38;5;45m${bannerId}\u001b[0m`);
        p("");
      } else {
        pa(`\u001b[31mbanner: unknown style '\u001b[1m${bannerId}\u001b[0m\u001b[31m' — try \u001b[36mbanner list\u001b[0m.`);
        p("");
      }
      return;
    }

    if (cmd === "theme" || cmd === "theme show") {
      pa("\u001b[1mTerminal theme\u001b[0m");
      const entries: [string, string][] = [
        ["bg", config.bg], ["text", config.text], ["accent", config.accent], ["prompt", config.prompt],
        ["font", config.font], ["fontSize", String(config.fontSize)], ["cursor", config.cursor],
        ["opacity", String(config.opacity)], ["scanlines", String(config.scanlines)], ["glow", String(config.glow)],
        ["wallpaper", config.wallpaper || "none"], ["palette", config.palette],
        ["banner", config.bannerEnabled ? config.banner : "off"],
      ];
      for (const [key, value] of entries) pa(`  \u001b[36m${key.padEnd(11)}\u001b[0m${value}`);
      pa("\u001b[2m  usage      theme set bg=#0b1020 accent=#7ee787 · theme reset\u001b[0m");
      p("");
      return;
    }
    if (cmd === "theme reset") {
      update({ ...DEFAULT_TERMINAL_CONFIG });
      setIntroVisible(true);
      pa("terminal theme \u001b[1mreset\u001b[0m to defaults.");
      p("");
      return;
    }
    if (cmd.startsWith("theme set")) {
      const tokens = cmd.slice(9).trim().split(/\s+/).filter(Boolean);
      if (!tokens.length) { pa("\u001b[31mtheme: expected key=value pairs\u001b[0m"); p(""); return; }
      const { next, applied, errors } = applyThemeTokens(config, tokens);
      if (applied.length) update(next);
      for (const entry of applied) pa(`  \u001b[32m✓\u001b[0m ${entry}`);
      for (const entry of errors) pa(`  \u001b[31m✗\u001b[0m ${entry} \u001b[2m(unknown key or invalid value)\u001b[0m`);
      p("");
      return;
    }

    if (cmd === "sudo install fsociety.tool?full" || cmd === "!sudo install fsociety.tool?full" || cmd === "sudo install fsociety" || cmd === "!sudo install fsociety" || /^!?sudo\s+install\s+fsociety\.tool/i.test(cmd)) {
      if (fsociety) {
        pa("\u001b[33m!sudo install: fsociety.tool?full is \u001b[1malready installed\u001b[0m\u001b[33m. revert with \u001b[1m!sudo uninstall fsociety\u001b[0m");
        p("");
        return;
      }
      const prevBanner = config.banner === "fsociety" ? "vertex-shadow" : config.banner;
      const stages: { ms: number; line: ReactNode }[] = [
        { ms: 300, line: <span className="term-out">!sudo install: fetching signature from fsociety.tools…</span> },
        { ms: 520, line: <span className="term-out">  ▸ channel   · encrypted · peer <span className="term-cmd">alice</span> · latency 42ms</span> },
        { ms: 480, line: <span className="term-out">  ▸ archive   · <span className="term-cmd">fsociety.tool?full</span> · <span className="term-dim">2.3 MB · sha256 41e7…9f1c</span></span> },
        { ms: 360, line: <span className="term-dim">  ▸ decode    · ████████████████████░░░░ 82%</span> },
        { ms: 420, line: <span className="term-success">  ▸ checksum  · ok — signature valid</span> },
        { ms: 560, line: <span className="term-out">  ▸ install   · rebranding shell → Arch Linux…</span> },
        { ms: 520, line: <span className="term-out">  ▸ install   · patching startup banner…</span> },
      ];
      let elapsed = 0;
      for (const stage of stages) {
        elapsed += stage.ms;
        window.setTimeout(() => p(stage.line), elapsed);
      }
      window.setTimeout(() => {
        update({ banner: "fsociety", bannerEnabled: true, fsociety: true });
        pa("");
        pa("\u001b[38;5;40mF S O C I E T Y   ·   i n s t a l l e d\u001b[0m");
        pa("");
        pa(`\u001b[32m✓\u001b[0m \u001b[1mfsociety.tool?full installed\u001b[0m — shell rebranded to \u001b[1m\u001b[38;5;45mArch Linux\u001b[0m, banner is now \u001b[1m\u001b[38;5;45mFSOCIETY\u001b[0m.`);
        pa("\u001b[32m✓\u001b[0m \u001b[1mtoolkit unlocked\u001b[0m — install a tool with \u001b[1m!sudo curl install NMAP\u001b[0m");
        pa("\u001b[2m    hello, friend. revert anytime with:  !sudo uninstall fsociety\u001b[0m");
        p("");
        onFsociety(true);
      }, elapsed);
      return;
    }

    if (cmd === "sudo install jarvis" || cmd === "!sudo install jarvis" || cmd === "sudo install JARVIS" || cmd === "!sudo install JARVIS" || /^!?sudo\s+install\s+jarvis$/i.test(cmd)) {
      if (jarvisInstalled) {
        pa("\u001b[33m!sudo install: JARVIS AI is \u001b[1malready installed\u001b[0m\u001b[33m. Try: \u001b[1mjarvis\u001b[0m to open it.");
        p("");
        return;
      }
      const stages: { ms: number; line: ReactNode }[] = [
        { ms: 200, line: <span className="term-out">!sudo install: initializing JARVIS core…</span> },
        { ms: 250, line: <span className="term-out">  ▸ neural matrix · calibrating…</span> },
        { ms: 250, line: <span className="term-out">  ▸ voice synthesis · connecting to Fish Audio…</span> },
        { ms: 250, line: <span className="term-out">  ▸ language model · linking to Groq API…</span> },
        { ms: 250, line: <span className="term-success">  ▸ JARVIS AI · ready</span> },
      ];
      let elapsed = 0;
      for (const stage of stages) {
        elapsed += stage.ms;
        window.setTimeout(() => p(stage.line), elapsed);
      }
      window.setTimeout(() => {
        if (setJarvisInstalled) setJarvisInstalled(true);
        if (onJarvisInstall) onJarvisInstall();
        pa("");
        pa("\u001b[38;5;51mJ A R V I S   A I   ·   i n s t a l l e d\u001b[0m");
        pa("");
        pa("\u001b[32m✓\u001b[0m JARVIS AI is now available. Type \u001b[1mjarvis\u001b[0m or open it from Start.");
        p("");
      }, elapsed);
      return;
    }

    if (cmd === "jarvis") {
      if (toggleApp) toggleApp("jarvis" as AppId);
      else (window as any).openJarvis?.();
      pa("\u001b[32mOpening JARVIS AI...\u001b[0m");
      p("");
      return;
    }

    if (cmd === "sudo uninstall fsociety" || cmd === "!sudo uninstall fsociety" || cmd === "sudo uninstall fsociety.tool?full" || cmd === "!sudo uninstall fsociety.tool?full") {
      if (!fsociety) {
        pa("\u001b[31m!sudo uninstall: fsociety.tool?full is not installed.\u001b[0m");
        p("");
        return;
      }
      const stages: { ms: number; line: ReactNode }[] = [
        { ms: 260, line: <span className="term-out">!sudo uninstall: wiping fsociety.tool?full…</span> },
        { ms: 340, line: <span className="term-dim">  ▸ purge     · ████████████████████░░░░ 100%</span> },
        { ms: 380, line: <span className="term-out">  ▸ remove    · /usr/share/fsociety …</span> },
        { ms: 320, line: <span className="term-out">  ▸ restore   · shell brand → McCrack-COS …</span> },
        { ms: 360, line: <span className="term-out">  ▸ restore   · startup banner → vertex-shadow …</span> },
      ];
      let elapsed = 0;
      for (const stage of stages) {
        elapsed += stage.ms;
        window.setTimeout(() => p(stage.line), elapsed);
      }
      window.setTimeout(() => {
        update({ banner: "vertex-shadow", bannerEnabled: true, fsociety: false, nmap: false, metasploit: false });
        pa("");
        pa("\u001b[31m✗\u001b[0m \u001b[1mfsociety.tool?full uninstalled\u001b[0m — shell rebranded back to \u001b[1mMcCrack-COS\u001b[0m.");
        pa("\u001b[2m    goodnight, friend. say hi with:  !sudo install fsociety.tool?full\u001b[0m");
        p("");
        onFsociety(false);
      }, elapsed);
      return;
    }

    if (/^!?sudo\s+curl\s+install\s+nmap$/i.test(cmd)) {
      if (!fsociety) {
        pa("\u001b[31m!sudo curl: this tool is locked. install the toolkit first:  \u001b[1m!sudo install fsociety.tool?full\u001b[0m");
        p("");
        return;
      }
      if (config.nmap) {
        pa("\u001b[33m!sudo curl: NMAP is already installed — just run \u001b[1mnmap &lt;target&gt;\u001b[0m");
        p("");
        return;
      }
      const stages: { ms: number; line: ReactNode }[] = [
        { ms: 200, line: <span className="term-out">!sudo curl install: resolving nmap package…</span> },
        { ms: 320, line: <span className="term-out">  ▸ repo      · fsociety.tools/nmap · <span className="term-dim">8.1 MB · sha256 7c2a…d04f</span></span> },
        { ms: 360, line: <span className="term-success">  ▸ verified  · package signature ok</span> },
        { ms: 420, line: <span className="term-out">  ▸ install   · /usr/share/nmap …</span> },
        { ms: 380, line: <span className="term-out">  ▸ services  · registering nmap, geo_tracker.py, IpConfig …</span> },
      ];
      let elapsed = 0;
      for (const stage of stages) {
        elapsed += stage.ms;
        window.setTimeout(() => p(stage.line), elapsed);
      }
      window.setTimeout(() => {
        update({ nmap: true });
        pa("");
        pa(`\u001b[32m✓\u001b[0m \u001b[1mNMAP installed\u001b[0m — recon tools unlocked:`);
        pa("     \u001b[36m!sudo curl py. geo_tracker.py target \u001b[0m\u001b[1m&lt;IP&gt;\u001b[0m\u001b[36m   ·   !sudo IpConfig\u001b[0m   \u001b[2m·   \u001b[0m\u001b[36mnmap &lt;target&gt;\u001b[0m");
        p("");
      }, elapsed);
      return;
    }

    if (/^!?sudo\s+curl\s+fetch\s+metasploit\.com\s+download$/i.test(cmd)) {
      if (!fsociety) {
        pa("\u001b[31m!sudo curl: this tool is locked. install the toolkit first:  \u001b[1m!sudo install fsociety.tool?full\u001b[0m");
        p("");
        return;
      }
      if (config.metasploit) {
        pa("\u001b[33m!sudo curl: metasploit is already installed — launch it with \u001b[1m!run metasploit\u001b[0m");
        p("");
        return;
      }
      const stages: { ms: number; line: ReactNode }[] = [
        { ms: 200, line: <span className="term-out">!sudo curl fetch: contacting metasploit.com…</span> },
        { ms: 360, line: <span className="term-out">  ▸ mirror   · https://downloads.metasploit.com/metasploit-framework …</span> },
        { ms: 420, line: <span className="term-out">  ▸ payload  · 247 MB · <span className="term-dim">sha256 91f3-a2c8-c41d-07be …</span></span> },
        { ms: 300, line: <span className="term-success">  ▸ verified · package signature ok</span> },
        { ms: 460, line: <span className="term-out">  ▸ unpack   · /opt/metasploit-framework …</span> },
        { ms: 380, line: <span className="term-out">  ▸ deps     · nmap, ipwhois, geo_tracker.py … ok</span> },
        { ms: 340, line: <span className="term-out">  ▸ link     · msfconsole → /usr/bin/msfconsole</span> },
      ];
      let elapsed = 0;
      for (const stage of stages) {
        elapsed += stage.ms;
        window.setTimeout(() => p(stage.line), elapsed);
      }
      window.setTimeout(() => {
        update({ metasploit: true });
        pa("");
        pa(`\u001b[32m✓\u001b[0m \u001b[1mMETASPLOIT installed\u001b[0m — launch the tool tab with  \u001b[1m!run metasploit\u001b[0m`);
        pa(`\u001b[2m    framework · v6.4.2 · console msfconsole · payloads on /opt/metasploit-framework\u001b[0m`);
        p("");
      }, elapsed);
      return;
    }

    if (/^!?run\s+metasploit$/i.test(cmd)) {
      if (!config.metasploit) {
        pa("\u001b[31m!run: metasploit is not installed. install it:  \u001b[1m!sudo curl fetch Metasploit.com download\u001b[0m");
        p("");
        return;
      }
      pa("\u001b[38;5;45m▸\u001b[0m !run \u001b[2m:: launching metasploit framework …\u001b[0m");
      window.setTimeout(() => {
        setMsLines((prev) => [
          ...prev,
          <span className="term-success" key="msboot">[+] msfconsole v6.4.2 — interactive session open. type <span className="term-cmd">!help</span> to begin.</span>,
        ]);
        setTab("metasploit");
      }, 620);
      return;
    }

    if (/^nmap(\s+|$)/i.test(cmd)) {
      if (!config.nmap) {
        pa("\u001b[31mnmap: command not found. install it:  \u001b[1m!sudo curl install NMAP\u001b[0m");
        p("");
        return;
      }
      const host = cmd.replace(/^nmap\s*/i, "").trim();
      if (!host) {
        pa("\u001b[31mnmap: expected a target.  usage: \u001b[1mnmap &lt;host&gt;\u001b[0m");
        p("");
        return;
      }
      const tick = (text: string, ms: number) => window.setTimeout(() => pa(text), ms);
      const seed = Array.from(host).reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) | 0, 7);
      const rnd = (n: number) => (Math.abs(seed) + n * 7919) % 997;
      const portPick = (i: number) => PORT_WITS[i % PORT_WITS.length];
      const openNow = 2 + (Math.abs(seed) % PORT_WITS.length);
      tick("Starting Nmap 7.95 ( https://nmap.org ) at " + new Date().toLocaleTimeString(), 120);
      tick(`\u001b[2mInitiating SYN Stealth Scan at \u001b[0m${new Date().toLocaleTimeString()}`, 420);
      tick("Scanning " + host + " [1000 ports]", 640);
      tick("Discovered open port 22/tcp on " + host, 980);
      for (let i = 0; i < openNow; i += 1) {
        const pIdx = i + 1;
        tick(`Discovered open port ${PORT_WITS[(pIdx * 7919) % PORT_WITS.length].split("/")[0]}/tcp on ${host}`, 1100 + i * 340);
      }
      window.setTimeout(() => {
        pa(`Nmap scan report for \u001b[1m${host}\u001b[0m`);
        pa("Host is up (latency " + (12 + (rnd(3) % 60)) + "ms).");
        pa("Not shown: " + (1000 - openNow - 1) + " closed tcp ports (reset)");
        pa("PORT      STATE  SERVICE");
        for (let i = 0; i < openNow + 1; i += 1) {
          const piece = portPick(rnd(i)).split("/");
          pa(`\u001b[36m${piece[0].padEnd(8)}\u001b[0m open   \u001b[1m${piece[1]}\u001b[0m`);
        }
        pa("MAC Address: (simulated) — host " + host.replace(/[.:]/g, "") + " " + new Date().toLocaleTimeString());
        pa("");
        pa(`\u001b[2mNmap done: 1 IP address (1 host up) scanned in ${(2.1 + (rnd(2) % 20) / 10).toFixed(2)} seconds\u001b[0m`);
        p("");
      }, 1300 + openNow * 340);
      return;
    }

    if (/^!?sudo\s+curl\s+py\.?\s+geo_tracker\.py\b/i.test(cmd)) {
      if (!fsociety || !config.nmap) {
        pa("\u001b[31mgeo_tracker.py: locked. install the toolkit + NMAP first:  \u001b[1m!sudo install fsociety.tool?full\u001b[0m  →  \u001b[1m!sudo curl install NMAP\u001b[0m");
        p("");
        return;
      }
      const argMatch = cmd.match(/\btarget\s+["']?([^"'\s]+)["']?$/i);
      const target = argMatch?.[1];
      if (!target) {
        pa("\u001b[31mgeo_tracker.py: expected a target.  usage: \u001b[1m!sudo curl py. geo_tracker.py target \u001b[0m\u001b[1m&lt;IP ADDRESS&gt;\u001b[0m");
        p("");
        return;
      }
      pa(`\u001b[38;5;45m▸\u001b[0m geo_tracker.py \u001b[2m:: arming on target \u001b[0m\u001b[1m${target}\u001b[0m \u001b[2m…\u001b[0m`);
      geoRecon({ target, print: pa }).then(() => p(""));
      return;
    }

    if (/^!?sudo\s+ipconfig$/i.test(cmd)) {
      if (!fsociety || !config.nmap) {
        pa("\u001b[31mIpConfig: locked. install the toolkit + NMAP first:  \u001b[1m!sudo install fsociety.tool?full\u001b[0m  →  \u001b[1m!sudo curl install NMAP\u001b[0m");
        p("");
        return;
      }
      pa("\u001b[38;5;45m▸\u001b[0m IpConfig \u001b[2m:: probing your network uplink …\u001b[0m");
      void ipConfigMe({ print: pa }).then(() => p(""));
      return;
    }

    if (cmd.startsWith("sudo proxylist:")) {
      const pieces = cmd.slice("sudo proxylist:".length).trim().split(/\s+/).filter(Boolean);
      const link = pieces[0] ?? "";
      let limit = 16;
      if (pieces[1]) {
        if (/^all$|^0$/i.test(pieces[1])) limit = Number.MAX_SAFE_INTEGER;
        else if (/^\d+$/.test(pieces[1])) limit = parseInt(pieces[1], 10);
      }
      if (!link) {
        p(<span className="term-error">sudo: proxylist: expected a source URL.</span>);
        p(<span className="term-error">usage: <span className="term-cmd">sudo proxylist:https://api.proxyscrape.com/v4/free-proxy-list/get?request=display_proxies&proxy_format=protocolipport&format=text</span></span>);
        p(<span className="term-error">options: append <span className="term-cmd">all</span> or a count (e.g. <span className="term-cmd">sudo proxylist:&lt;url&gt; all</span>) — see <span className="term-cmd">proxysources</span></span>);
        p("");
        return;
      }
      if (!/^https?:\/\//i.test(link)) {
        p(<span className="term-error">sudo: proxylist: invalid source '<span className="term-cmd">{link}</span>'.</span>);
        p("");
        return;
      }
      const geoOf = (value: unknown) => {
        if (value && typeof value === "object" && typeof (value as { country?: unknown }).country === "string") {
          return (value as { country: string }).country;
        }
        return undefined;
      };
      const tryHost = (s: string) => {
        const m = s.match(/^([a-z][a-z0-9+_-]*):\/\/([a-zA-Z0-9.-]+):(\d+)$/i);
        if (m) return { scheme: m[1].toLowerCase(), host: m[2].toLowerCase(), port: m[3] };
        const n = s.match(/^([a-zA-Z0-9.-]+):(\d+)$/);
        if (n) return { scheme: "http", host: n[1].toLowerCase(), port: n[2] };
        return null;
      };
      const parseProxies = (raw: string) => {
        const rows: { scheme: string; host: string; port: string; country?: string }[] = [];
        const add = (row: { scheme: string; host: string; port: string; country?: string } | null) => {
          if (row) rows.push(row);
        };
        const t = raw.trim();
        if (t.startsWith("[") || t.startsWith("{")) {
          try {
            const walk = (value: unknown) => {
              if (Array.isArray(value)) { value.forEach(walk); return; }
              if (value && typeof value === "object") {
                const obj = value as Record<string, unknown>;
                if (typeof obj.proxy === "string") {
                  add({ ...tryHost(obj.proxy), country: geoOf(obj.geolocation) } as { scheme: string; host: string; port: string; country?: string });
                  return;
                }
                if (typeof obj.ip === "string" && /^\d+$/.test(String(obj.port))) {
                  const proto = typeof obj.protocol === "string" ? obj.protocol.toLowerCase().replace(/[^a-z0-9+_-]/g, "") || "http" : "http";
                  add({ scheme: proto, host: obj.ip, port: String(obj.port), country: geoOf(obj.geolocation) });
                  return;
                }
                Object.keys(obj).forEach((key) => walk(obj[key]));
              }
            };
            walk(JSON.parse(t));
          } catch { /* not JSON, fall through to line parser */ }
        }
        if (!rows.length) {
          t.split(/\r?\n/).forEach((line) => {
            const s = line.trim();
            if (!s) return;
            if (s.startsWith("proxy,") || s.startsWith("PROXY,")) return;
            if (s.includes(",") && !s.includes("://")) {
              const cols = s.split(",");
              if (cols.length >= 4) {
                const base = tryHost(cols[0]);
                if (base) {
                  const proto = (cols[1] ?? "").toLowerCase().replace(/[^a-z0-9+_-]/g, "");
                  add({ ...base, scheme: proto && proto !== "http" ? proto : base.scheme });
                  return;
                }
              }
            }
            add(tryHost(s));
          });
        }
        return rows;
      };
      p(<span className="term-dim">sudo: scraping proxy source…</span>);
      window.setTimeout(async () => {
        let text = "";
        let viaRelay = false;
        let failed = false;
        try {
          text = await (await fetch(link)).text();
          if (text.trim().length < 3) throw new Error("empty body");
        } catch {
          try {
            viaRelay = true;
            text = await (await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(link)}`)).text();
            if (text.trim().length < 3) throw new Error("empty body");
          } catch {
            failed = true;
          }
        }
        if (failed) {
          p(<span className="term-error">sudo: proxylist: source unreachable — network/filter blocked the request.</span>);
          p(<span className="term-error">hint: run <span className="term-cmd">proxysources</span> for working feeds, or <span className="term-cmd">!sudo curl connectsourcelink:socks5://…</span></span>);
          p("");
          return;
        }
        const rows = parseProxies(text);
        if (rows.length) {
          pa(`\u001b[32m[+]\u001b[0m \u001b[1msource connected\u001b[0m \u001b[2m(${viaRelay ? "via relay" : "direct"})\u001b[0m`);
          pa(`\u001b[2m    ${link}\u001b[0m`);
          pa(`\u001b[32m[+]\u001b[0m ${rows.length} proxies loaded.`);
          pa("\u001b[2m──────────────────────────────────────────────\u001b[0m");
          const shown = rows.length > limit ? rows.slice(0, limit) : rows;
          shown.forEach((row, i) => {
            const ping = 18 + Math.round(Math.random() * 140);
            const geo = row.country ? `  \u001b[2m· ${row.country}\u001b[0m` : "";
            pa(`  \u001b[38;5;45m[${String(i + 1).padEnd(2)}]\u001b[0m ${row.scheme}://${row.host}:${row.port}${geo}  \u001b[32m${ping}ms\u001b[0m`);
          });
          if (rows.length > shown.length) pa(`  \u001b[2m… and ${rows.length - shown.length} more — add '${"all"}' to print the whole list\u001b[0m`);
          pa(`\u001b[32m[+]\u001b[0m \u001b[1m${rows.length}/${rows.length} free proxies ready\u001b[0m`);
        } else {
          p(<span className="term-error">sudo: proxylist: no parseable proxies in source.</span>);
        }
        p("");
      }, 420);
      return;
    }
    if (cmd.startsWith("!sudo curl connectsourcelink:")) {
      const target = cmd.slice("!sudo curl connectsourcelink:".length).trim();
      const match = target.match(/^([a-z][a-z0-9+_-]*):\/\/([a-zA-Z0-9.-]+):(\d+)\/?$/i);
      if (!target || !match) {
        p(<span className="term-error">!sudo curl: connectsourcelink: malformed source link.</span>);
        p(<span className="term-error">usage: <span className="term-cmd">!sudo curl connectsourcelink:socks5://172.86.88.139:1081</span></span>);
        p("");
        return;
      }
      const scheme = match[1].toLowerCase();
      const host = match[2].toLowerCase();
      const port = match[3];
      const rtt = 40 + Math.round(Math.random() * 180);
      const hexPort = parseInt(port, 10).toString(16).toUpperCase().padStart(4, "0");
      const stages: { ms: number; line: ReactNode }[] = [
        { ms: 420, line: <span className="term-out">resolving <span className="term-cmd">{host}</span>…</span> },
        { ms: 520, line: <span className="term-out">negotiating <span className="term-cmd">{scheme}</span> handshake with <span className="term-cmd">{host}:{port}</span>…</span> },
        { ms: 520, line: <span className="term-out"><span className="term-dim">[req]</span> 05 01 00 03 00 01 00 {hexPort}</span> },
        { ms: 620, line: <span className="term-success"><span className="term-dim">[rep]</span> 05 00 00 01 00 00 00 00 00 00</span> },
        { ms: 460, line: <span className="term-success">✓ {scheme}://{host}:{port} — channel established <span className="term-dim">({rtt} ms)</span></span> },
      ];
      let elapsed = 0;
      for (const stage of stages) {
        elapsed += stage.ms;
        window.setTimeout(() => p(stage.line), elapsed);
      }
      window.setTimeout(() => p(""), elapsed);
      return;
    }
    if (cmd === "proxysources" || cmd === "proxy sources" || cmd === "proxylist sources") {
      pa("\u001b[1m\u001b[38;5;45mProxy sources\u001b[0m \u001b[2m— public free-proxy feeds & raw links\u001b[0m");
      pa("\u001b[2m───────────────────────────────────────────────────────\u001b[0m");
      const feeds: [string, string][] = [
        ["proxifly · free-proxy-list (explore)", "https://github.com/proxifly/free-proxy-list/tree/main/proxies"],
        ["  ├ raw — all (text)", "https://raw.githubusercontent.com/proxifly/free-proxy-list/main/proxies/all/data.txt"],
        ["  ├ raw — socks5 (text)", "https://raw.githubusercontent.com/proxifly/free-proxy-list/main/proxies/protocols/socks5/data.txt"],
        ["  ├ raw — socks5 (json, big)", "https://raw.githubusercontent.com/proxifly/free-proxy-list/main/proxies/protocols/socks5/data.json"],
        ["  ├ raw — socks4 (text)", "https://raw.githubusercontent.com/proxifly/free-proxy-list/main/proxies/protocols/socks4/data.txt"],
        ["  ├ raw — http (text)", "https://raw.githubusercontent.com/proxifly/free-proxy-list/main/proxies/protocols/http/data.txt"],
        ["  └ raw — https (text)", "https://raw.githubusercontent.com/proxifly/free-proxy-list/main/proxies/protocols/https/data.txt"],
        ["proxyscrape v4 (text)", "https://api.proxyscrape.com/v4/free-proxy-list/get?request=display_proxies&proxy_format=protocolipport&format=text"],
        ["proxy-list.download (text)", "https://www.proxy-list.download/api/v1/get?type=socks5"],
        ["openproxylist (text)", "https://api.openproxylist.xyz/socks5.txt"],
        ["TheSpeedX PROXY-List (raw)", "https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/socks5.txt"],
      ];
      for (const [label, url] of feeds) {
        pa(`  \u001b[38;5;45m▸\u001b[0m \u001b[1m${label}\u001b[0m`);
        pa(`\u001b[2m      ${url}\u001b[0m`);
      }
      pa("\u001b[2m───────────────────────────────────────────────────────\u001b[0m");
      pa("\u001b[2m  load one:  \u001b[0m\u001b[1msudo proxylist:\u001b[0m\u001b[36m<url>\u001b[0m  \u001b[2m(add \u001b[0m\u001b[1mall\u001b[0m\u001b[2m for the whole list, or a count)\u001b[0m");
      p("");
      return;
    }

    p(<span className="term-error">zsh: command not found: <span className="term-cmd">{cmd.split(" ")[0]}</span></span>);
    p("");
  };

  return (
    <div
      className={`term-surface ${config.glass ? "term-glass" : ""} ${config.glow ? "term-glow" : ""} ${config.scanlines ? "term-scanlines" : ""} ${terminalHasWallpaper(config) ? "has-wallpaper" : ""}`}
      style={terminalCssVars(config)}
      data-cursor={config.cursor}
      onClick={() => inputRef.current?.focus()}
    >
      <div className="term-tabs">
        <button className={`term-tab ${tab === "terminal" ? "is-active" : ""}`} onClick={() => setTab("terminal")}>{fsociety ? "⌁ zsh — arch@archlinux" : "⌁ zsh — vertex@vertex-os"}</button>
        {config.metasploit && (
          <button className={`term-tab term-tab-ms ${tab === "metasploit" ? "is-active" : ""}`} onClick={() => setTab("metasploit")}>{"⚡ METASPLOIT TOOL"}</button>
        )}
        <button className={`term-tab ${tab === "settings" ? "is-active" : ""}`} onClick={() => setTab("settings")}>{"⚙ settings"}</button>
        <span className="term-tabs-grow" />
      </div>
      <div className="term-body">
        {tab === "terminal" && (
        <div className="term-output" ref={outRef}>
          {introVisible && (
            <div className="term-intro">
              {config.bannerEnabled && <TerminalBanner art={bannerArt} palette={palette} baseSize={bannerBase} fontKey={config.font} />}
              <div className="term-line"><span className="term-welcome-title">{fsociety ? "Arch Linux Terminal" : "McCrack-COS Terminal"}</span> <span className="term-dim">v1.0</span></div>
              <div className="term-line term-dim">{fsociety ? "zsh 5.9 · fsociety™ toolkit installed" : "zsh 5.9 · offline-first shell"} · {TERMINAL_BANNERS.length} banner styles</div>
              <div className="term-line">Type <span className="term-cmd">help</span> for commands, <span className="term-cmd">settings</span> to customize, <span className="term-cmd">theme</span> for colors.</div>
              <div className="term-line term-blank" />
            </div>
          )}
          {lines.map((line, i) => <div className="term-line" key={i}>{line}</div>)}
          <div className="term-line term-entry">
            <span className="term-prompt">{prompt}</span>
            <span className="term-space"> </span>
            <span className="term-input-wrap">
              <input
                ref={inputRef}
                className="term-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); e.stopPropagation(); run(input); setInput(""); setCaretX(0); }
                  else if (e.key === "ArrowLeft" || e.key === "ArrowRight" || e.key === "Home" || e.key === "End") window.setTimeout(() => setCaretTick((tick) => tick + 1), 0);
                }}
                onKeyUp={() => setCaretTick((tick) => tick + 1)}
                onSelect={() => setCaretTick((tick) => tick + 1)}
                onClick={(event) => { event.stopPropagation(); setCaretTick((tick) => tick + 1); }}
                spellCheck={false}
                autoComplete="off"
                autoFocus
                aria-label="Terminal input"
              />
              {config.cursor !== "bar" && (
                <span className="term-caret" data-cursor={config.cursor} style={{ left: `${caretX}px` }} aria-hidden="true" />
              )}
              <span className="term-measure" ref={measureRef} aria-hidden="true" />
            </span>
          </div>
        </div>
        )}
        {tab === "metasploit" && !config.metasploit && (
          <div className="term-output">
            <div className="term-line"><span className="term-error">metasploit tool is not installed</span> — install it with <span className="term-cmd">!sudo curl fetch Metasploit.com download</span></div>
          </div>
        )}
        {tab === "metasploit" && config.metasploit && (
          <div className="ms-tool" onClick={() => msInputRef.current?.focus()}>
            <TerminalBanner art={METASPLOIT_BANNER} palette={palette} baseSize={Math.round(Math.max(4, config.fontSize * 0.72))} fontKey={config.font} />
            <div className="ms-log">
              {msLines.map((line, i) => <div className="term-line" key={`m${i}`}>{line}</div>)}
            </div>
            {msSession && (
              <div className="ms-feed">
                <div className="ms-feed-head">
                  <span className="ms-live">●</span>
                  <span className="ms-feed-title">LIVE · {msSession.friend}@vertex-os</span>
                  <span className="ms-feed-meta">session {msSession.id} · {msSession.addr} · realtime</span>
                </div>
                <div className="ms-feed-body">
                  <div className="ms-feed-apps">
                    {(msFeedSnap.wins.length > 0 ? msFeedSnap.wins : [{ id: "…", title: "…" }]).map((w) => <div key={w.id} className={`ms-app ${msFeedSnap.active === w.id ? "is-focus" : ""}`}>{w.title}</div>)}
                  </div>
                  <div className="ms-feed-log">
                    <div className="ms-feed-line ms-tag">[+] live screen mirror — vertex-os surface only</div>
                    {msAct.map((a, i) => <div className="ms-feed-line" key={`a${i}`}>{a}</div>)}
                  </div>
                </div>
              </div>
            )}
            <div className="term-line term-entry">
              <span className="term-prompt term-prompt-ms">msf6 ▸</span>
              <span className="term-space"> </span>
              <span className="term-input-wrap">
                <input
                  ref={msInputRef}
                  className="term-input"
                  value={msInput}
                  onChange={(e) => setMsInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); e.stopPropagation(); runMs(msInput); setMsInput(""); } }}
                  spellCheck={false}
                  autoComplete="off"
                  autoFocus
                  aria-label="Metasploit tool input"
                />
              </span>
            </div>
          </div>
        )}
        {tab === "settings" && (
          <TerminalSettingsPanel config={config} update={update} onBack={() => setTab("terminal")} />
        )}
      </div>
    </div>
  );
}

type CalcToken = { type: "num" | "op" | "fun" | "lp" | "rp" | "post" | "var"; value: string };

function tokenizeCalc(expr: string): CalcToken[] {
  const tokens: CalcToken[] = [];
  const s = expr.toLowerCase();
  let i = 0;
  const isDigit = (c: string) => (c >= "0" && c <= "9") || c === ".";
  const isIdent = (c: string) => (c >= "a" && c <= "z") || c === "_";
  while (i < s.length) {
    const c = s[i];
    if (c === " ") { i += 1; continue; }
    if (isDigit(c)) {
      let j = i;
      while (j < s.length && isDigit(s[j])) j += 1;
      tokens.push({ type: "num", value: s.slice(i, j) });
      i = j;
      continue;
    }
    if (isIdent(c)) {
      let j = i;
      while (j < s.length && isIdent(s[j])) j += 1;
      const word = s.slice(i, j);
      const funs = ["sin", "cos", "tan", "asin", "acos", "atan", "log", "ln", "sqrt", "abs", "floor", "ceil", "round", "exp", "min", "max", "pow"];
      if (funs.includes(word)) tokens.push({ type: "fun", value: word });
      else if (word === "e" || word === "pi") tokens.push({ type: "var", value: word });
      else throw new Error("unknown ident");
      i = j;
      continue;
    }
    if (c === "(") { tokens.push({ type: "lp", value: "(" }); i += 1; continue; }
    if (c === ")") { tokens.push({ type: "rp", value: ")" }); i += 1; continue; }
    if (c === "!") { tokens.push({ type: "post", value: "!" }); i += 1; continue; }
    if (c === "%") { tokens.push({ type: "post", value: "%" }); i += 1; continue; }
    if ("+-*/^".includes(c)) {
      let op = c;
      if (c === "*" && s[i + 1] === "*") { op = "^"; i += 1; }
      tokens.push({ type: "op", value: op });
      i += 1;
      continue;
    }
    throw new Error("unknown char");
  }
  if (tokens.length && tokens[0].type === "op" && tokens[0].value !== "!" && tokens[0].value !== "%") {
    tokens.unshift({ type: "num", value: "0" });
  }
  const fixed: CalcToken[] = [];
  for (let k = 0; k < tokens.length; k += 1) {
    const tok = tokens[k];
    fixed.push(tok);
    const next = tokens[k + 1];
    if (next && (tok.type === "op" || tok.type === "rp" || tok.type === "post") && next.type === "op" && (next.value === "-" || next.value === "+")) {
      fixed.push({ type: "num", value: next.value === "-" ? "1" : "1" });
      fixed.push({ type: "op", value: next.value === "-" ? "*" : "*" });
      k += 1;
      const sign = next.value === "-" ? "-" : "+";
      fixed[fixed.length - 2] = { type: "num", value: sign + "1" };
      continue;
    }
    if (next && (tok.type === "num" || tok.type === "rp" || tok.type === "var" || tok.type === "post") && (next.type === "lp" || next.type === "fun")) {
      fixed.push({ type: "op", value: "*" });
    }
  }
  return fixed;
}

function applyCalcFn(name: string, args: number[]): number {
  const [a, b] = args;
  switch (name) {
    case "sin": return Math.sin(a);
    case "cos": return Math.cos(a);
    case "tan": return Math.tan(a);
    case "asin": return Math.asin(a);
    case "acos": return Math.acos(a);
    case "atan": return Math.atan(a);
    case "log": return Math.log10(a);
    case "ln": return Math.log(a);
    case "sqrt": return Math.sqrt(a);
    case "abs": return Math.abs(a);
    case "floor": return Math.floor(a);
    case "ceil": return Math.ceil(a);
    case "round": return Math.round(a);
    case "exp": return Math.exp(a);
    case "min": return Math.min(a, b ?? 0);
    case "max": return Math.max(a, b ?? 0);
    case "pow": return Math.pow(a, b ?? 1);
    default: throw new Error("unknown fn");
  }
}

function factorialCalc(n: number): number {
  if (!Number.isInteger(n) || n < 0) throw new Error("factorial");
  if (n > 170) throw new Error("overflow");
  let r = 1;
  for (let k = 2; k <= n; k += 1) r *= k;
  return r;
}

function throwDiv0(): never { throw new Error("div0"); }

export function evaluateCalc(expr: string): number {
  const tokens = tokenizeCalc(expr);
  const output: CalcToken[] = [];
  const stack: CalcToken[] = [];
  const prec: Record<string, number> = { "+": 2, "-": 2, "*": 3, "/": 3, "^": 5 };
  const rightAssoc = new Set(["^"]);
  for (const tok of tokens) {
    if (tok.type === "num" || tok.type === "var") { output.push(tok); continue; }
    if (tok.type === "fun") { stack.push(tok); continue; }
    if (tok.type === "op") {
      while (stack.length) {
        const top = stack[stack.length - 1];
        if (top.type !== "op") break;
        const higher = rightAssoc.has(tok.value) ? prec[top.value] > prec[tok.value] : prec[top.value] >= prec[tok.value];
        if (!higher) break;
        output.push(stack.pop() as CalcToken);
      }
      stack.push(tok);
      continue;
    }
    if (tok.type === "lp") { stack.push(tok); continue; }
    if (tok.type === "rp") {
      while (stack.length && stack[stack.length - 1].type !== "lp") output.push(stack.pop() as CalcToken);
      if (stack.length) stack.pop();
      if (stack.length && stack[stack.length - 1].type === "fun") output.push(stack.pop() as CalcToken);
      continue;
    }
    if (tok.type === "post") { output.push(tok); continue; }
  }
  while (stack.length) output.push(stack.pop() as CalcToken);
  const vals: number[] = [];
  for (const tok of output) {
    if (tok.type === "num") { vals.push(parseFloat(tok.value)); continue; }
    if (tok.type === "var") { vals.push(tok.value === "pi" ? Math.PI : Math.E); continue; }
    if (tok.type === "post") {
      const v = vals.pop();
      if (v === undefined) throw new Error("eval");
      vals.push(tok.value === "!" ? factorialCalc(v) : v / 100);
      continue;
    }
    if (tok.type === "fun") {
      const argc = (tok.value === "min" || tok.value === "max" || tok.value === "pow") ? 2 : 1;
      if (vals.length < argc) throw new Error("args");
      const args = vals.splice(vals.length - argc, argc);
      vals.push(applyCalcFn(tok.value, args));
      continue;
    }
    if (tok.type === "op") {
      const b = vals.pop();
      const a = vals.pop();
      if (a === undefined || b === undefined) throw new Error("eval");
      let r: number;
      if (tok.value === "+") r = a + b;
      else if (tok.value === "-") r = a - b;
      else if (tok.value === "*") r = a * b;
      else if (tok.value === "/") r = b === 0 ? throwDiv0() : a / b;
      else r = Math.pow(a, b);
      vals.push(r);
    }
  }
  if (vals.length !== 1) throw new Error("eval");
  const out = vals[0];
  if (!Number.isFinite(out)) throw new Error("nonfinite");
  return out;
}

function formatCalc(n: number): string {
  if (Object.is(n, -0)) n = 0;
  const abs = Math.abs(n);
  if (abs >= 1e15 || (abs !== 0 && abs < 1e-9)) return n.toExponential(8).replace(/(\.\d*?)0+e/, "$1e");
  let s = String(parseFloat(n.toPrecision(12)));
  if (s.length > 14) s = n.toExponential(6).replace(/(\.\d*?)0+e/, "$1e");
  return s;
}

const CALC_LAYOUT: { label: string; tone: "fn" | "op" | "num" | "ac" | "eq" | "mem"; action: string }[] = [
  { label: "MC", tone: "mem", action: "mc" },
  { label: "MR", tone: "mem", action: "mr" },
  { label: "M+", tone: "mem", action: "mplus" },
  { label: "M−", tone: "mem", action: "mminus" },
  { label: "( )", tone: "op", action: "paren" },
  { label: "%", tone: "fn", action: "append:%" },
  { label: "AC", tone: "ac", action: "clear" },
  { label: "⌫", tone: "fn", action: "back" },
  { label: "sin", tone: "fn", action: "append:sin(" },
  { label: "cos", tone: "fn", action: "append:cos(" },
  { label: "tan", tone: "fn", action: "append:tan(" },
  { label: "x²", tone: "fn", action: "append:^2" },
  { label: "√", tone: "fn", action: "append:sqrt(" },
  { label: "ln", tone: "fn", action: "append:ln(" },
  { label: "log", tone: "fn", action: "append:log(" },
  { label: "xʸ", tone: "fn", action: "append:^" },
  { label: "7", tone: "num", action: "append:7" },
  { label: "8", tone: "num", action: "append:8" },
  { label: "9", tone: "num", action: "append:9" },
  { label: "÷", tone: "op", action: "append:/" },
  { label: "π", tone: "fn", action: "append:π" },
  { label: "e", tone: "fn", action: "append:e" },
  { label: "4", tone: "num", action: "append:4" },
  { label: "5", tone: "num", action: "append:5" },
  { label: "6", tone: "num", action: "append:6" },
  { label: "×", tone: "op", action: "append:*" },
  { label: "±", tone: "fn", action: "neg" },
  { label: "n!", tone: "fn", action: "append:!" },
  { label: "1", tone: "num", action: "append:1" },
  { label: "2", tone: "num", action: "append:2" },
  { label: "3", tone: "num", action: "append:3" },
  { label: "−", tone: "op", action: "append:-" },
  { label: "0", tone: "num", action: "append:0" },
  { label: ".", tone: "num", action: "append:." },
  { label: "=", tone: "eq", action: "eq" },
  { label: "+", tone: "op", action: "append:+" },
];

function CalculatorSurface() {
  const [expr, setExpr] = useState("");
  const [result, setResult] = useState<string>("0");
  const [history, setHistory] = useState<{ expr: string; result: string }[]>([]);
  const [memory, setMemory] = useState(0);
  const [error, setError] = useState(false);

  const reduce = (s: string) => s.replace(/π/g, "pi").replace(/\s+/g, "");

  const append = (part: string) => {
    setError(false);
    setResult("0");
    setExpr((prev) => {
      if (part === ".") {
        const tail = (prev.match(/[0-9.]*$/) ?? [""])[0];
        if (prev === "" || tail.includes(".")) return prev;
      }
      if (["+", "-", "*", "/", "^"].includes(part) && /[+\-*/^]$/.test(prev)) return prev;
      const next = reduce(prev) + part;
      if (next.length > 64) return prev;
      return next;
    });
  };

  const press = (action: string) => {
    if (action.startsWith("append:")) { append(action.slice(7)); return; }
    switch (action) {
      case "clear":
        setExpr("");
        setResult("0");
        setError(false);
        break;
      case "back":
        setError(false);
        setResult("0");
        setExpr((prev) => prev.slice(0, -1));
        break;
      case "neg":
        setError(false);
        setExpr((prev) => {
          const m = prev.match(/^(.*?)([-+]?)([0-9]+(?:\.[0-9]*)?|\.\d+)$/);
          if (!m) return prev;
          const [, head, sign, tailNum] = m;
          return head + (sign === "-" ? "" : "-") + tailNum;
        });
        break;
      case "paren":
        setError(false);
        setResult("0");
        setExpr((prev) => {
          const open = (prev.match(/\(/g) ?? []).length;
          const close = (prev.match(/\)/g) ?? []).length;
          return open > close && !/[0-9.)]$/.test(prev) ? prev + ")" : prev + "(";
        });
        break;
      case "mc":
        setMemory(0);
        break;
      case "mr":
        append(formatCalc(memory));
        break;
      case "mplus":
        setMemory((m) => m + (error || expr ? parseFloat(result || "0") : parseFloat(result || "0")));
        break;
      case "mminus":
        setMemory((m) => m - parseFloat(result || "0"));
        break;
      case "eq": {
        if (!expr) return;
        try {
          const value = evaluateCalc(reduce(expr));
          const text = formatCalc(value);
          setResult(text);
          setHistory((h) => [...h.slice(-39), { expr, result: text }]);
          setExpr("");
          setError(false);
        } catch {
          setError(true);
          setResult("");
        }
        break;
      }
      default:
        break;
    }
  };

  const preview = useMemo(() => {
    const s = reduce(expr);
    if (!s) return null;
    try { return { ok: true as const, text: formatCalc(evaluateCalc(s)) }; }
    catch { return { ok: false as const, text: "" }; }
  }, [expr]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter") { e.preventDefault(); press("eq"); return; }
      if (e.key === "Backspace") { e.preventDefault(); press("back"); return; }
      if (e.key === "Escape") { e.preventDefault(); press("clear"); return; }
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (/^[0-9]$/.test(e.key)) { press("append:" + e.key); return; }
      const map: Record<string, string> = { "+": "append:+", "-": "append:-", "*": "append:*", "/": "append:/", ".": "append:.", "%": "append:%", "^": "append:^", "(": "paren", ")": "paren" };
      const act = map[e.key];
      if (act) { press(act); return; }
      if (e.key.toLowerCase() === "p") { press("append:π"); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expr, memory, result, error]);

  const visibleDisplay = error ? "Error" : expr || result;

  return (
    <div className="calc-surface" onClick={() => undefined}>
      <div className="calc-layout">
        <div className="calc-history">
          <span className="calc-history-title">HISTORY</span>
          {history.length === 0 ? <span className="calc-history-empty">Empty</span> : null}
          {history.slice().reverse().slice(0, 30).map((h, i) => (
            <button key={i} className="calc-history-item" onClick={() => { setExpr(h.expr); setResult("0"); }} title={t("calc.reuse")}>
              <span>{h.expr}</span>
              <em>{h.result}</em>
            </button>
          ))}
        </div>
        <div className="calc-main">
          <div className="calc-display">
            {memory !== 0 ? <span className="calc-mem">M</span> : null}
            <span className={`calc-result ${error ? "err" : ""}`}>{visibleDisplay}</span>
            {expr && !error ? (
              <span className={`calc-preview ${preview?.ok ? "" : "err"}`}>{preview?.ok ? `= ${preview.text}` : "…"}</span>
            ) : null}
          </div>
          <div className="calc-pad">
            {CALC_LAYOUT.map((btn) => (
              <button key={btn.action} className={`calc-btn ${btn.tone}`} onClick={() => press(btn.action)}>
                {btn.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

interface VTItem { id: string; title: string; author: string; views: number; seconds: number; verified?: boolean; published?: string; desc?: string; liveNow?: boolean; }

interface VTChannel { id: string; name: string; verified: boolean; thumb?: string; subLabel: string; handle?: string; }

const VT_CATS: { label: string; hint: string }[] = [
  { label: "Trending", hint: "" },
  { label: "Music", hint: "top music videos" },
  { label: "Gaming", hint: "gaming" },
  { label: "Movies", hint: "movie trailers" },
  { label: "News", hint: "breaking news today" },
  { label: "Shorts", hint: "shorts" },
  { label: "Live", hint: "live stream today" },
  { label: "Sports", hint: "sports highlights" },
  { label: "Education", hint: "documentaries" },
];
const VT_EMBEDS = ["https://www.youtube.com/embed", "https://www.youtube-nocookie.com/embed"];
const VT_MIRROR_NAMES = ["YouTube", "No-cookie"];
const VT_KINDS = ["all", "videos", "shorts", "channels"] as const;
type VTKind = (typeof VT_KINDS)[number];

// VerTube gets its catalogue from the Piped API (a YouTube front-end). Public
// Invidious/Piped instances disappear over time, so requests are raced against
// every host in this list and the first healthy answer wins.
const VT_API = [
  "https://pipedapi.ducks.party",
  "https://api.piped.private.coffee",
];
const VT_API_TIMEOUT = 9000;
const VT_API_CACHE_MS = 120000;

interface PipedStream {
  url?: string;
  type?: string;
  title?: string;
  thumbnail?: string;
  uploaderName?: string;
  uploaderUrl?: string;
  duration?: number;
  views?: number;
  uploaded?: number;
  uploadedDate?: string | null;
  uploaderVerified?: boolean;
  isShort?: boolean;
  shortDescription?: string | null;
}
interface PipedChannelRef {
  url?: string;
  type?: string;
  name?: string;
  thumbnail?: string;
  subscribers?: number;
  verified?: boolean;
  description?: string | null;
}
interface PipedSearchPage { items?: (PipedStream & PipedChannelRef)[] }
interface PipedChannelPage { relatedStreams?: PipedStream[] }

const vtCache = new Map<string, { at: number; data: unknown }>();

function vtVideoId(url?: string): string {
  const m = /(?:[?&]v=|\/shorts\/|\/embed\/|youtu\.be\/)([A-Za-z0-9_-]{6,})/.exec(url || "");
  return m ? m[1] : "";
}

function vtItem(v: PipedStream): VTItem {
  const dur = typeof v.duration === "number" ? v.duration : -1;
  const liveNow = dur < 0 && !v.isShort;
  return {
    id: vtVideoId(v.url),
    title: v.title || "Untitled",
    author: v.uploaderName || "Unknown",
    views: typeof v.views === "number" && v.views > 0 ? v.views : 0,
    seconds: liveNow ? 0 : Math.max(0, dur),
    verified: !!v.uploaderVerified,
    published: v.uploadedDate || "",
    desc: (v.shortDescription || "").replace(/\s+/g, " ").trim(),
    liveNow,
  };
}

function vtChannel(c: PipedChannelRef): VTChannel {
  return {
    id: (c.url || "").split("/channel/")[1] || "",
    name: c.name || "Channel",
    verified: !!c.verified,
    thumb: c.thumbnail || "",
    subLabel: c.subscribers && c.subscribers > 0 ? `${fmtCount(c.subscribers)} subscribers` : "",
    handle: "",
  };
}

async function vtApi<T>(
  path: string,
  pick: (data: unknown) => T | null,
  isEmpty: (value: T) => boolean,
): Promise<T | null> {
  const cached = vtCache.get(path);
  if (cached && Date.now() - cached.at < VT_API_CACHE_MS) return cached.data as T;

  return new Promise<T | null>((resolve) => {
    let best: T | null = null;
    let pending = VT_API.length;
    let settled = false;
    const finish = (value: T | null) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      if (value) vtCache.set(path, { at: Date.now(), data: value });
      resolve(value);
    };
    const timer = window.setTimeout(() => finish(best), VT_API_TIMEOUT + 500);

    for (const base of VT_API) {
      fetch(`${base}${path}`, {
        signal: AbortSignal.timeout(VT_API_TIMEOUT),
        headers: { Accept: "application/json" },
        cache: "no-store",
      })
        .then(async (res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data = (await res.json()) as unknown;
          if (data && typeof data === "object" && "error" in (data as Record<string, unknown>)) {
            throw new Error(String((data as Record<string, unknown>).error));
          }
          const picked = pick(data);
          if (picked === null) throw new Error("unusable payload");
          return picked;
        })
        .then((value) => {
          if (isEmpty(value)) {
            if (!best) best = value;
          } else {
            finish(value);
          }
        })
        .catch(() => { /* try the next instance */ })
        .finally(() => {
          pending -= 1;
          if (pending === 0) finish(best);
        });
    }
  });
}

function vtSearch(term: string, filter: "videos" | "channels" | "all"): Promise<PipedSearchPage | null> {
  const params = new URLSearchParams({ q: term, filter });
  return vtApi<PipedSearchPage>(
    `/search?${params.toString()}`,
    (data) => {
      const page = data as PipedSearchPage;
      return Array.isArray(page?.items) ? page : null;
    },
    (page) => (page.items?.length ?? 0) === 0,
  );
}

function vtTrending(): Promise<PipedStream[] | null> {
  return vtApi<PipedStream[]>(
    "/trending?region=US",
    (data) => (Array.isArray(data) ? (data as PipedStream[]) : null),
    (list) => list.length === 0,
  );
}

function vtChannelVideos(channelId: string): Promise<PipedChannelPage | null> {
  return vtApi<PipedChannelPage>(
    `/channel/${encodeURIComponent(channelId)}`,
    (data) => {
      const page = data as PipedChannelPage;
      return Array.isArray(page?.relatedStreams) ? page : null;
    },
    (page) => (page.relatedStreams?.length ?? 0) === 0,
  );
}

interface VTPL { id: string; name: string; items: VTItem[]; }

const VT_KEY_RECENTS = "vt-recents";
const VT_KEY_PLAYLISTS = "vt-playlists";
const VT_KEY_LATER = "vt-watchlater";
const VT_KEY_HISTORY = "vt-history";

function vtGet<T>(k: string, fb: T): T {
  try {
    const s = localStorage.getItem(k);
    return s ? (JSON.parse(s) as T) : fb;
  } catch {
    return fb;
  }
}
function vtSet(k: string, v: unknown) {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {
    return;
  }
}
function vtId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

let ytApiPromise: Promise<boolean> | null = null;
type YtPlayerCtor = new (el: HTMLElement, opts: Record<string, unknown>) => { destroy: () => void };
type YtWindow = { YT?: { Player?: unknown }; onYouTubeIframeAPIReady?: () => void };
const YT_API_SRC = "https://www.youtube.com/iframe_api";

function ytPlayerCtor(): YtPlayerCtor | null {
  const ctor = (window as unknown as YtWindow).YT?.Player;
  return typeof ctor === "function" ? (ctor as YtPlayerCtor) : null;
}

function ensureYtApi(): Promise<boolean> {
  if (ytPlayerCtor()) return Promise.resolve(true);
  if (ytApiPromise) return ytApiPromise;
  ytApiPromise = new Promise<boolean>((resolve) => {
    const win = window as unknown as YtWindow;
    let settled = false;
    let poll = 0;
    const done = (ok: boolean) => {
      if (settled) return;
      settled = true;
      window.clearInterval(poll);
      if (!ok) ytApiPromise = null;
      resolve(ok);
    };
    poll = window.setInterval(() => { if (ytPlayerCtor()) done(true); }, 120);
    window.setTimeout(() => done(ytPlayerCtor() !== null), 8000);
    win.onYouTubeIframeAPIReady = () => done(ytPlayerCtor() !== null);
    if (!document.querySelector(`script[src="${YT_API_SRC}"]`)) {
      const tag = document.createElement("script");
      tag.src = YT_API_SRC;
      tag.async = true;
      tag.onerror = () => done(false);
      document.head.appendChild(tag);
    }
  });
  return ytApiPromise;
}

function fmtDur(sec: number) {
  const s = Math.max(0, Math.floor(sec || 0));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}` : `${m}:${String(r).padStart(2, "0")}`;
}
function fmtViews(n: number) {
  if (!n) return "";
  return n >= 1e6 ? `${(n / 1e6).toFixed(1)}M views` : n >= 1e3 ? `${Math.round(n / 1e3)}K views` : `${n} views`;
}
function fmtCount(n: number) {
  return n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${Math.round(n / 1e3)}K` : `${n}`;
}

function VerTubeSurface() {
  const [tab, setTab] = useState<"home" | "search" | "library">("home");
  const [query, setQuery] = useState("");
  const [qSrc, setQSrc] = useState("");
  const [kind, setKind] = useState<VTKind>("all");
  const [cat, setCat] = useState("Trending");
  const [homeFeed, setHomeFeed] = useState<VTItem[]>([]);
  const [results, setResults] = useState<VTItem[]>([]);
  const [channels, setChannels] = useState<VTChannel[]>([]);
  const [listTitle, setListTitle] = useState("Results");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [playing, setPlaying] = useState<VTItem | null>(null);
  const [mirror, setMirror] = useState(0);
  const [recents, setRecents] = useState<string[]>(() => vtGet(VT_KEY_RECENTS, [] as string[]));
  const [playlists, setPlaylists] = useState<VTPL[]>(() => vtGet(VT_KEY_PLAYLISTS, [] as VTPL[]));
  const [watchLater, setWatchLater] = useState<VTItem[]>(() => vtGet(VT_KEY_LATER, [] as VTItem[]));
  const [history, setHistory] = useState<VTItem[]>(() => vtGet(VT_KEY_HISTORY, [] as VTItem[]));
  const [libTab, setLibTab] = useState<"playlists" | "later" | "history">("playlists");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [acMenu, setAcMenu] = useState<string | null>(null);
  const [newPlName, setNewPlName] = useState("");
  const [plExpand, setPlExpand] = useState<string | null>(null);
  const [queue, setQueue] = useState<VTItem[] | null>(null);
  const [queueTitle, setQueueTitle] = useState("");
  const playerHostRef = useRef<HTMLDivElement>(null);
  const ytPlayerRef = useRef<{ destroy: () => void } | null>(null);
  const videoSessionRef = useRef<MediaSession | null>(null);
  const advancedForRef = useRef("");

  const itemsFrom = (list: (PipedStream & PipedChannelRef)[] | undefined) =>
    (list || []).filter((v) => v.type !== "channel").map(vtItem).filter((v) => v.id);

  // Catalogue search through the Piped layer. `keep` narrows a feed (shorts,
  // livestreams) but never leaves the user with an empty page when the
  // narrower query happens to match nothing.
  async function searchVideos(term: string, keep?: (v: VTItem) => boolean) {
    const page = await vtSearch(term, "videos");
    const out = itemsFrom(page?.items);
    if (!keep) return out;
    const kept = out.filter(keep);
    return kept.length ? kept : out;
  }

  async function loadHome(category: string) {
    setLoading(true);
    setError("");
    setQueue(null);
    setQueueTitle("");
    try {
      let items: VTItem[] = [];
      try {
        if (category === "Trending") {
          items = itemsFrom((await vtTrending()) || []).filter((v) => v.views > 0 && (v.seconds > 0 || v.liveNow));
          if (items.length < 6) items = await searchVideos("trending videos right now");
        } else if (category === "Shorts") {
          items = await searchVideos("popular shorts", (v) => v.seconds > 0 && v.seconds <= 75);
        } else if (category === "Live") {
          items = (await searchVideos("live stream today", (v) => !!v.liveNow)).filter((v) => v.liveNow);
          if (items.length < 4) items = await searchVideos("live stream today");
        } else {
          items = await searchVideos(VT_CATS.find((c) => c.label === category)?.hint || category);
        }
      } catch {
        items = [];
      }
      setHomeFeed(items);
      if (!items.length) setError(`Couldn't load "${category}" feed right now. Try Search instead.`);
    } catch {
      setError("Couldn't load that feed — search still works.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadHome("Trending"); }, []);

  async function runSearch(term: string, k = kind) {
    const clean = term.trim() || qSrc;
    if (!clean) return;
    if (term.trim()) setQSrc(clean);
    markRecent(clean);
    setQueue(null);
    setQueueTitle("");
    setTab("search");
    setLoading(true);
    setError("");
    setListTitle(`Results for "${clean}"`);
    try {
      if (k === "channels") {
        const page = await vtSearch(clean, "channels");
        const out = (page?.items || []).filter((c) => c.type === "channel").map(vtChannel).filter((c) => c.id);
        setResults([]);
        setChannels(out);
        if (!page) setError("Couldn't load results. Try again in a bit.");
        else if (!out.length) setError("No channels found — try different wording.");
      } else {
        const [videoPage, channelPage] = await Promise.all([
          vtSearch(clean, "videos"),
          k === "all" ? vtSearch(clean, "channels") : Promise.resolve(null),
        ]);
        let out = itemsFrom(videoPage?.items);
        if (k === "shorts") {
          const shorts = out.filter((v) => v.seconds > 0 && v.seconds <= 75);
          if (shorts.length) out = shorts;
        }
        const chOut = (channelPage?.items || [])
          .filter((c) => c.type === "channel")
          .map(vtChannel)
          .filter((c) => c.id)
          .slice(0, 8);
        setResults(out);
        setChannels(chOut);
        if (!out.length && !chOut.length && !videoPage && !channelPage) {
          setError("Couldn't load results. Try again in a bit.");
        }
      }
    } catch {
      setError("Couldn't reach the video search — try again in a bit.");
      setResults([]);
      setChannels([]);
    } finally {
      setLoading(false);
    }
  }

  async function openChannel(ch: VTChannel) {
    setTab("search");
    setLoading(true);
    setError("");
    setQueue(null);
    setQueueTitle("");
    setListTitle(`Videos from ${ch.name}`);
    try {
      const page = await vtChannelVideos(ch.id);
      const out = itemsFrom(page?.relatedStreams);
      setResults(out);
      setChannels([]);
      if (!out.length) setError("No videos on this channel — try another.");
    } catch {
      setError("Couldn't load this channel — try again in a bit.");
    } finally {
      setLoading(false);
    }
  }

  const play = (v: VTItem) => {
    setPlaying(v);
    const h = [v, ...history.filter((x) => x.id !== v.id)].slice(0, 50);
    setHistory(h);
    vtSet(VT_KEY_HISTORY, h);
  };
  const markRecent = (term: string) => {
    const r = [term, ...recents.filter((x) => x !== term)].slice(0, 8);
    setRecents(r);
    vtSet(VT_KEY_RECENTS, r);
  };
  const clearRecents = () => {
    setRecents([]);
    vtSet(VT_KEY_RECENTS, []);
  };
  const toggleLater = (v: VTItem) => {
    const has = watchLater.some((x) => x.id === v.id);
    const l = has ? watchLater.filter((x) => x.id !== v.id) : [v, ...watchLater];
    setWatchLater(l);
    vtSet(VT_KEY_LATER, l);
  };
  const makePlaylist = (name: string) => {
    const n = name.trim();
    if (!n) return "";
    const pl: VTPL = { id: vtId(), name: n, items: [] };
    const list = [...playlists, pl];
    setPlaylists(list);
    vtSet(VT_KEY_PLAYLISTS, list);
    setNewPlName("");
    return pl.id;
  };
  const addToPlaylist = (v: VTItem, plId: string) => {
    const list = playlists.map((pl) => (pl.id === plId && !pl.items.some((x) => x.id === v.id) ? { ...pl, items: [...pl.items, v] } : pl));
    setPlaylists(list);
    vtSet(VT_KEY_PLAYLISTS, list);
    setAcMenu(null);
  };
  const createAndAdd = (v: VTItem) => {
    const id = makePlaylist(newPlName);
    if (id) addToPlaylist(v, id);
  };
  const removeFromPlaylist = (plId: string, vid: string) => {
    const list = playlists.map((pl) => (pl.id === plId ? { ...pl, items: pl.items.filter((x) => x.id !== vid) } : pl));
    setPlaylists(list);
    vtSet(VT_KEY_PLAYLISTS, list);
  };
  const deletePlaylist = (plId: string) => {
    const list = playlists.filter((pl) => pl.id !== plId);
    setPlaylists(list);
    vtSet(VT_KEY_PLAYLISTS, list);
    if (plExpand === plId) setPlExpand(null);
  };
  const removeHistory = (vid: string) => {
    const h = history.filter((x) => x.id !== vid);
    setHistory(h);
    vtSet(VT_KEY_HISTORY, h);
  };
  const clearHistory = () => {
    setHistory([]);
    vtSet(VT_KEY_HISTORY, []);
  };
  const clearLater = () => {
    setWatchLater([]);
    vtSet(VT_KEY_LATER, []);
  };

  const openTab = () => {
    if (!playing) return;
    window.open(`https://www.youtube.com/watch?v=${playing.id}`, "_blank");
  };
  const cycleMirror = () => setMirror((m) => (m + 1) % VT_EMBEDS.length);
  const stop = () => {
    setPlaying(null);
    setQueue(null);
    setQueueTitle("");
  };
  const playQueue = (list: VTItem[], title: string) => {
    if (!list.length) return;
    setQueue(list);
    setQueueTitle(title);
    play(list[0]);
  };

  const advanceToNext = () => {
    if (!queue || queue.length < 2) return;
    const now = playing?.id;
    if (!now) return;
    const idx = queue.findIndex((x) => x.id === now);
    if (idx >= 0 && idx < queue.length - 1) play(queue[idx + 1]);
  };

  useEffect(() => {
    if (!playing) return;
    const host = playerHostRef.current;
    if (!host) return;
    const videoId = playing.id;
    const mirrorHost = VT_EMBEDS[mirror];
    const hostUrl = mirrorHost.includes("nocookie") ? "https://www.youtube-nocookie.com" : "https://www.youtube.com";
    const allowAttr = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen";
    let cancelled = false;
    let mount: HTMLElement | null = null;
    const clearHost = () => {
      try { host.replaceChildren(); } catch { /* host already gone */ }
      mount = null;
    };
    const newMount = () => {
      clearHost();
      const el = document.createElement("div");
      el.className = "vertube-embed";
      host.appendChild(el);
      mount = el;
      return el;
    };
    const putFallback = () => {
      if (cancelled) return;
      const el = newMount();
      const f = document.createElement("iframe");
      f.className = "vertube-frame";
      f.src = `${mirrorHost}/${videoId}?autoplay=1&playsinline=1`;
      f.setAttribute("allow", allowAttr);
      f.setAttribute("allowfullscreen", "true");
      el.appendChild(f);
    };
    ensureYtApi().then((ok) => {
      if (cancelled) return;
      const Ctor = ok ? ytPlayerCtor() : null;
      if (!Ctor) {
        putFallback();
        return;
      }
      if (ytPlayerRef.current) {
        try { ytPlayerRef.current.destroy(); } catch { /* already torn down */ }
        ytPlayerRef.current = null;
      }
      const el = newMount();
      try {
        ytPlayerRef.current = new Ctor(el, {
          videoId,
          host: hostUrl,
          playerVars: { autoplay: 1, playsinline: 1 },
          events: {
            onStateChange: (e: unknown) => {
              if ((e as { data?: number }).data === 0) {
                const mark = `${videoId}-${mirror}`;
                if (advancedForRef.current === mark) return;
                advancedForRef.current = mark;
                advanceToNext();
              }
            },
          },
        });
      } catch {
        ytPlayerRef.current = null;
        putFallback();
        return;
      }
      let tries = 0;
      const applyAllow = () => {
        if (cancelled) return;
        const iframe = host.querySelector("iframe");
        if (iframe) {
          iframe.setAttribute("allow", allowAttr);
          iframe.setAttribute("allowfullscreen", "true");
        } else if (tries++ < 40) {
          setTimeout(applyAllow, 50);
        }
      };
      applyAllow();
    });
    return () => {
      cancelled = true;
      const player = ytPlayerRef.current;
      ytPlayerRef.current = null;
      if (player) {
        try { player.destroy(); } catch { /* iframe already detached */ }
      }
      if (mount) { try { mount.remove(); } catch { /* ignore */ } }
      clearHost();
    };
  }, [playing, mirror]);

  const videoPlayRef = useRef(playing);
  videoPlayRef.current = playing;

  useEffect(() => {
    if (!playing) {
      if (videoSessionRef.current) {
        if (getMediaSession() === videoSessionRef.current) setMediaSession(null);
        videoSessionRef.current = null;
      }
      return;
    }
    if (!videoSessionRef.current) {
      const session: MediaSession = {
        source: "video",
        get title() { return videoPlayRef.current?.title ?? ""; },
        get artist() { return videoPlayRef.current?.author ?? ""; },
        get artwork() {
          const v = videoPlayRef.current;
          return v ? `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg` : "";
        },
        get playing() { return true; },
        get progress() {
          const p = ytPlayerRef.current as unknown as { getCurrentTime?: () => number } | null;
          return p?.getCurrentTime?.() ?? 0;
        },
        get duration() {
          const p = ytPlayerRef.current as unknown as { getDuration?: () => number } | null;
          return p?.getDuration?.() ?? 0;
        },
        onToggle: () => {
          const p = ytPlayerRef.current as unknown as { getPlayerState?: () => number; pauseVideo?: () => void; playVideo?: () => void } | null;
          if (!p?.getPlayerState) return;
          if (p.getPlayerState() === 1) p.pauseVideo?.();
          else p.playVideo?.();
        },
        onClose: () => stop(),
      };
      videoSessionRef.current = session;
      setMediaSession(session);
    } else {
      notifyMediaSession();
    }
  }, [playing]);

  useEffect(() => () => {
    const session = videoSessionRef.current;
    if (session && getMediaSession() === session) setMediaSession(null);
    videoSessionRef.current = null;
  }, []);

  const listItems = queue ?? (tab === "search" ? results : homeFeed);
  const asideHidden = !playing;
  const plyId = playing?.id;
  const showResultsPage = listTitle !== "Results" || loading || results.length > 0 || channels.length > 0;
  const hasChannels = channels.length > 0;
  const hasResults = results.length > 0;
  const hasNothing = results.length === 0 && channels.length === 0;

  const metaLine = (v: VTItem) => (
    <span className="vertube-metab">
      <span className="vertube-author">{v.author}</span>
      {v.verified && <BadgeCheck size={13} className="vertube-verified" />}
      {v.views > 0 && <><span className="vertube-dot">·</span><span>{fmtViews(v.views)}</span></>}
      {v.published && <><span className="vertube-dot">·</span><span>{v.published}</span></>}
      {v.liveNow && <><span className="vertube-dot">·</span><span className="vertube-istext">Live</span></>}
    </span>
  );

  const thumbBadge = (v: VTItem) => v.liveNow ? <span className="vertube-live">LIVE</span> : <span className="vertube-dur">{fmtDur(v.seconds)}</span>;

  const videoRow = (v: VTItem, opts?: { onRemove?: () => void }) => {
    const isOn = plyId === v.id;
    const isOpen = expandedId === v.id;
    const inLater = watchLater.some((x) => x.id === v.id);
    return (
      <div key={v.id} className={`vertube-row ${isOn ? "on" : ""}`}>
        <div className="vertube-row-top">
          <button className="vertube-row-main" onClick={() => play(v)}>
            <span className="vertube-result-thumb">
              <img src={`https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`} alt="" loading="lazy" />
              {thumbBadge(v)}
            </span>
            <span className="vertube-result-meta">
              <strong>{v.title}</strong>
              {metaLine(v)}
              {v.desc && <span className={`vertube-result-desc ${isOpen ? "full" : "clamp"}`}>{v.desc}</span>}
            </span>
          </button>
          <span className="vertube-row-side">
            <button className="vertube-mini" onClick={() => setExpandedId(isOpen ? null : v.id)} aria-label="Show more"><ChevronDown size={16} className={isOpen ? "vertube-flip" : ""} /></button>
            <button className="vertube-mini" onClick={() => setAcMenu(acMenu === v.id ? null : v.id)} aria-label="Add to playlist"><Plus size={16} /></button>
            <button className={`vertube-mini ${inLater ? "on" : ""}`} onClick={() => toggleLater(v)} aria-label="Watch later"><Clock size={16} /></button>
            {opts?.onRemove && <button className="vertube-mini danger" onClick={() => opts.onRemove?.()} aria-label="Remove"><X size={16} /></button>}
          </span>
        </div>
        {acMenu === v.id && (
          <div className="vertube-plmenu">
            {playlists.map((pl) => (
              <button key={pl.id} onClick={() => addToPlaylist(v, pl.id)}><ListVideo size={13} /> {pl.name} ({pl.items.length})</button>
            ))}
            <span className="vertube-plmenu-new">
              <input value={newPlName} onChange={(e) => setNewPlName(e.target.value)} placeholder="New playlist name" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); createAndAdd(v); } }} />
              <button onClick={() => createAndAdd(v)}><Plus size={13} /> Create</button>
            </span>
          </div>
        )}
      </div>
    );
  };

  const resultsList = (items: VTItem[], onRemove?: (v: VTItem) => void) => (
    <div className="vertube-list-stack">
      {items.map((v) => videoRow(v, onRemove ? { onRemove: () => onRemove(v) } : undefined))}
    </div>
  );

  const libraryPage = (
    <div className="vertube-library">
      <div className="vertube-lib-tabs">
        <button className={`vertube-cat ${libTab === "playlists" ? "on" : ""}`} onClick={() => setLibTab("playlists")}>Playlists</button>
        <button className={`vertube-cat ${libTab === "later" ? "on" : ""}`} onClick={() => setLibTab("later")}>Watch later{watchLater.length > 0 ? ` (${watchLater.length})` : ""}</button>
        <button className={`vertube-cat ${libTab === "history" ? "on" : ""}`} onClick={() => setLibTab("history")}>History{history.length > 0 ? ` (${history.length})` : ""}</button>
      </div>

      {libTab === "playlists" && (
        <div className="vertube-pl-grid">
          <div className="vertube-pl-card vertube-pl-new">
            <input value={newPlName} onChange={(e) => setNewPlName(e.target.value)} placeholder="New playlist name" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); makePlaylist(newPlName); } }} />
            <button onClick={() => makePlaylist(newPlName)}><Plus size={14} /> Create playlist</button>
          </div>
          {playlists.map((pl) => (
            <div key={pl.id} className="vertube-pl-card">
              <div className="vertube-pl-head">
                <div className="vertube-pl-title">
                  <ListVideo size={16} className="vertube-verified" />
                  <strong>{pl.name}</strong>
                  <small>{pl.items.length} video{pl.items.length === 1 ? "" : "s"}</small>
                </div>
                <span className="vertube-pl-actions">
                  <button className="vertube-pl-play" disabled={pl.items.length === 0} onClick={() => playQueue(pl.items, pl.name)} aria-label={`Play ${pl.name}`}><Play size={14} fill="currentColor" /> Play</button>
                  <span className="vertube-row-side">
                    <button className="vertube-mini" onClick={() => setPlExpand(plExpand === pl.id ? null : pl.id)} aria-label="Expand playlist"><ChevronDown size={16} className={plExpand === pl.id ? "vertube-flip" : ""} /></button>
                    <button className="vertube-mini danger" onClick={() => deletePlaylist(pl.id)} aria-label="Delete playlist"><Trash2 size={15} /></button>
                  </span>
                </span>
              </div>
              {pl.items.length === 0 && <div className="vertube-empty">Empty — tap + on any video to add it.</div>}
              {plExpand === pl.id && pl.items.length > 0 && resultsList(pl.items, (v) => removeFromPlaylist(pl.id, v.id))}
            </div>
          ))}
        </div>
      )}

      {libTab === "later" && (
        <div className="vertube-lib-list">
          {watchLater.length === 0 ? <div className="vertube-empty">Nothing saved yet — tap the clock icon on any video.</div> : (
            <>
              <button className="vertube-clear" onClick={clearLater}><Minus size={13} /> Clear watch later</button>
              {resultsList(watchLater, (v) => toggleLater(v))}
            </>
          )}
        </div>
      )}

      {libTab === "history" && (
        <div className="vertube-lib-list">
          {history.length === 0 ? <div className="vertube-empty">Nothing watched yet — everything you play lands here.</div> : (
            <>
              <button className="vertube-clear" onClick={clearHistory}><Minus size={13} /> Clear history</button>
              {resultsList(history, (v) => removeHistory(v.id))}
            </>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="vertube-app">
      <header className="vertube-top">
        <div className="vertube-brand"><img src="https://www.youtube.com/s/desktop/af0a3c1e/img/favicon_144x144.png" alt="" />VER-TUBE</div>
        <form className="vertube-search" onSubmit={(e) => { e.preventDefault(); void runSearch(query); }}>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search videos or channels — no account needed" aria-label="Search videos or channels" />
          <button type="submit" aria-label="Search"><Search size={18} /></button>
        </form>
        <div className="vertube-mirror">
          <span>Player</span>
          <button onClick={cycleMirror} aria-label="Switch player mirror"><RotateCcw size={14} /> {VT_MIRROR_NAMES[mirror]}</button>
        </div>
      </header>

      <nav className="vertube-tabs">
        <button className={`vertube-tab ${tab === "home" && !playing ? "on" : ""}`} onClick={() => { setTab("home"); stop(); }}>Home</button>
        <button className={`vertube-tab ${tab === "search" && !playing ? "on" : ""}`} onClick={() => { setTab("search"); stop(); }}>Search</button>
        <button className={`vertube-tab ${tab === "library" && !playing ? "on" : ""}`} onClick={() => { setTab("library"); stop(); }}>Library</button>
        {playing && <button className="vertube-back" onClick={stop}><ArrowLeft size={14} /> Back</button>}
      </nav>

      <div className="vertube-body">
        <main className="vertube-stage">
          {playing ? (
            <>
              <div className="vertube-frame-wrap">
                <div className="vertube-frame" ref={playerHostRef} />
              </div>
              <div className="vertube-now">
                <strong className="vertube-now-title">{playing.title}{playing.liveNow && <span className="vertube-now-live">LIVE</span>}</strong>
                {metaLine(playing)}
                <div className="vertube-now-actions">
                  <button onClick={cycleMirror}><RotateCcw size={13} /> Switch player (if blocked)</button>
                  <button onClick={openTab}><ExternalLink size={13} /> Open in tab</button>
                </div>
              </div>
            </>
          ) : tab === "home" ? (
            loading && !homeFeed.length ? <div className="vertube-empty">Loading videos…</div> : (
              <>
                <div className="vertube-cats">
                  {VT_CATS.map((c) => <button key={c.label} className={`vertube-cat ${cat === c.label ? "on" : ""}`} onClick={() => { setCat(c.label); void loadHome(c.label); }}>{c.label}</button>)}
                </div>
                {error && <div className="vertube-error">{error}</div>}
                <div className="vertube-grid">
                  {homeFeed.map((v) => (
                    <button key={v.id} className="vertube-card" onClick={() => play(v)}>
                      <span className="vertube-card-thumb">
                        <img src={`https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`} alt="" loading="lazy" />
                        {thumbBadge(v)}
                      </span>
                      <strong>{v.title}</strong>
                      <span className="vertube-card-line">
                        <span>{v.author}</span>
                        {v.verified && <BadgeCheck size={12} className="vertube-verified" />}
                        {v.views > 0 && <><span className="vertube-dot">·</span><span>{fmtViews(v.views)}</span></>}
                      </span>
                    </button>
                  ))}
                </div>
              </>
            )
          ) : tab === "library" ? (
            libraryPage
          ) : showResultsPage ? (
            <>
              {!listTitle.startsWith("Videos from") && (
                <div className="vertube-cats vertube-filters">
                  {VT_KINDS.map((k) => (
                    <button key={k} className={`vertube-cat ${kind === k ? "on" : ""}`} onClick={() => { setKind(k); void runSearch(qSrc, k); }}>{k[0].toUpperCase() + k.slice(1)}</button>
                  ))}
                </div>
              )}
              {loading && <div className="vertube-empty">Loading…</div>}
              {!loading && error && <div className="vertube-error">{error}</div>}
              {!loading && error && qSrc && (
                <div className="vertube-fallback">
                  <button className="vertube-recent-chip" onClick={() => window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(qSrc)}`, "_blank", "noopener")}>
                    <ExternalLink size={12} /> Open these results on YouTube
                  </button>
                </div>
              )}
              {!loading && error === "" && hasChannels && (
                <div className="vertube-chans">
                  <div className="vertube-section">Channels</div>
                  {channels.map((ch) => (
                    <button key={ch.id} className="vertube-result-chan" onClick={() => void openChannel(ch)}>
                      {ch.thumb ? <img src={ch.thumb} alt="" loading="lazy" /> : <span className="vertube-chan-ph2">{(ch.name[0] || "?").toUpperCase()}</span>}
                      <span className="vertube-result-chan-meta">
                        <strong>{ch.name}{ch.verified && <BadgeCheck size={14} className="vertube-verified" />}</strong>
                        <small>{ch.handle || ch.name}{ch.subLabel ? ` · ${ch.subLabel}` : ""}</small>
                        <small className="vertube-nofollow">No following here — tap to watch their videos</small>
                      </span>
                      <span className="vertube-result-chan-open">Show videos <ChevronRight size={14} /></span>
                    </button>
                  ))}
                </div>
              )}
              {!loading && error === "" && hasResults && (
                <div className="vertube-results">
                  <div className="vertube-section">Videos</div>
                  {resultsList(results)}
                </div>
              )}
              {!loading && error === "" && hasNothing && (
                <div className="vertube-empty">No results for that — try different wording or a different type.</div>
              )}
            </>
          ) : (
            <div className="vertube-hero">
              <img src="https://www.youtube.com/s/desktop/af0a3c1e/img/favicon_144x144.png" alt="" />
              <h2>Search above, then pick a video — nothing plays by itself.</h2>
              <p className="vertube-hero-sub">Results appear full-width below as a list: channels on top, then videos. While something plays they move to the right as your line. Lives stream right in the player. No accounts here — your watch history, watch-later and playlists are saved on this device.</p>
              {recents.length > 0 && (
                <div className="vertube-recents">
                  <div className="vertube-section">Recent searches</div>
                  <div className="vertube-recent-chips">
                    {recents.map((r) => (
                      <button key={r} className="vertube-recent-chip" onClick={() => { setQuery(r); void runSearch(r); }}><Search size={12} /> {r}</button>
                    ))}
                    <button className="vertube-recent-chip clear" onClick={clearRecents}><X size={12} /> Clear</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>

        <aside className={`vertube-list ${asideHidden ? "hidden" : ""}`}>
          <div className="vertube-list-head">
            <div className="vertube-list-title">{queueTitle || (tab === "search" ? listTitle : "Up next")}</div>
            {listItems.length > 0 && <div className="vertube-rail-count">{listItems.length + channels.length}</div>}
          </div>
          {loading && <div className="vertube-empty">Loading…</div>}
          {!loading && error && <div className="vertube-error">{error}</div>}
          {!loading && !error && channels.length > 0 && (
            <div className="vertube-channels">
              {channels.map((ch) => (
                <button key={ch.id} className="vertube-chan" onClick={() => void openChannel(ch)}>
                  {ch.thumb ? <img src={ch.thumb} alt="" loading="lazy" /> : <span className="vertube-chan-ph">{(ch.name[0] || "?").toUpperCase()}</span>}
                  <span className="vertube-chan-meta">
                    <strong>{ch.name}{ch.verified && <BadgeCheck size={13} className="vertube-verified" />}</strong>
                    <small>{ch.handle || ch.name}{ch.subLabel ? ` · ${ch.subLabel}` : ""} — tap to watch</small>
                  </span>
                </button>
              ))}
            </div>
          )}
          {!loading && !error && !listItems.length && !channels.length && (
            <div className="vertube-empty">{tab === "search" ? "Results appear here — tap a video to play it." : "Tap a video to start watching."}</div>
          )}
          {!loading && listItems.map((v) => (
            <button key={v.id} className={`vertube-item ${plyId === v.id ? "on" : ""}`} onClick={() => play(v)}>
              <span className="vertube-thumb-wrap">
                <img className="vertube-thumb" src={`https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`} alt="" loading="lazy" />
                {thumbBadge(v)}
              </span>
              <span className="vertube-meta">
                <strong>{v.title}</strong>
                {metaLine(v)}
              </span>
            </button>
          ))}
        </aside>
      </div>
    </div>
  );
}

function renderWindowBody(id: AppId, settings: SystemSettings, updateSetting: (key: keyof SystemSettings | Partial<SystemSettings>, value?: boolean | string | TabHideImage[]) => void, faqOpen: number | null, setFaqOpen: (value: number | null) => void, lang: Lang, onLanguagePick: (language: Lang) => void, onPanic: () => void, onClose: (() => void) | null = null, onMinimize: (() => void) | null = null, onTrackChange: ((track: { name: string; artist: string; artwork: string } | null) => void) | null = null, translucent: boolean = false, onTranslucent: ((value: boolean) => void) | null = null, onApplyWallpaper: ((id: WallpaperId, target: "both" | "home" | "lock") => void) | null = null, appliedWallpaper: WallpaperId = "singularity", appliedLockWallpaper: WallpaperId = "singularity", onNotify: ((title: string, copy: string) => void) | null = null, wppInstalled: boolean = false, onInstallPicker: (() => void) | null = null, jarvisInstalled: boolean = false, onJarvisInstall: (() => void) | null = null, onFsociety: ((active: boolean) => void) | null = null, activeAccount: VertexAccount | null = null, onAvatarChange: ((avatar: string) => void) | null = null, onAccountChange: ((patch: { name?: string; email?: string }) => void) | null = null) {
  if (id === "settings") return <SettingsSurface settings={settings} updateSetting={updateSetting} faqOpen={faqOpen} setFaqOpen={setFaqOpen} lang={lang} onLanguagePick={onLanguagePick} onPanic={onPanic} avatar={activeAccount?.avatar} accountName={activeAccount?.name} accountEmail={activeAccount?.email} onAvatarChange={onAvatarChange ?? undefined} onAccountChange={onAccountChange ?? undefined} appliedWallpaper={appliedWallpaper} appliedLockWallpaper={appliedLockWallpaper} onApplyWallpaper={onApplyWallpaper ?? undefined} onNotify={onNotify ?? undefined} />;
  if (id === "terminal") return <div className="window-surface term-app-surface">          <TerminalSurface installed={wppInstalled} onInstalled={onInstallPicker ?? (() => {})} onFsociety={onFsociety ?? (() => {})} jarvisInstalled={jarvisInstalled} setJarvisInstalled={onJarvisInstall ?? (() => {})} onJarvisInstall={onJarvisInstall ?? (() => {})} toggleApp={undefined} /></div>;
  if (id === "translucenttb") return <div className="window-surface"><div className="surface-kicker">{t("surf.translucent.kicker")}</div><h2 className="surface-title">{t("surf.translucent.title")}</h2><p className="surface-copy">{t("surf.translucent.body")}</p><div className="settings-list"><SettingToggle label={t("surf.translucent.enable")} help={t("surf.translucent.help")} value={translucent} onChange={(value) => onTranslucent?.(value)} /></div></div>;
  if (id === "spicetify") return <iframe className="browser-frame" src={asset("apps/music/web/index.html")} title="McCrackify" allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; fullscreen" allowFullScreen />;
  const adRedir = settings.adblock && settings.adblockUrl.trim() ? settings.adblockUrl : null;
  if (id === "movies") return <iframe className="browser-frame" src={asset("apps/movies/index.html")} title="McCrackFlix" allow="autoplay; clipboard-write; fullscreen; encrypted-media; picture-in-picture" allowFullScreen />;
  if (id === "wallpaper-engine") return <div className="window-surface we-app-surface"><WallEngineApp appliedHome={appliedWallpaper} appliedLock={appliedLockWallpaper} onApplyWallpaper={onApplyWallpaper ?? (() => {})} notify={onNotify ?? undefined} /></div>;
  if (id === "browser") return adRedir
    ? <iframe className="browser-frame" src={adRedir} title="Browser redirect" allow="autoplay; clipboard-write; fullscreen" />
    : <BrowserSurface lang={lang} />;
  if (id === "calculator") return <div className="window-surface calc-app-surface"><CalculatorSurface /></div>;
  if (id === "pizza") return <iframe className="browser-frame" src={adRedir ?? "https://pizzaedition.com/"} title="Pizza edition" allow="autoplay; clipboard-write; camera; microphone; fullscreen" />;
  if (id === "roblox") return <ProxyUrlFrame url={adRedir ?? "https://73.ip.nowgg.fun/apps/a/19900/b.html"} title="Roblox" />;
  if (id === "messages") return <iframe className="browser-frame" src={asset("apps/messages/index.html")} title="McCrack Chat" allow="autoplay; clipboard-write; camera; microphone; fullscreen" allowFullScreen />;
  if (id === "verai") return <div className="window-surface verai-surface"><VerAiSurface /></div>;
  if (id === "jarvis") return <div className="window-surface verai-surface"><JarvisSurface onOpenApp={(appId) => { /* opening handled by parent */ }} /></div>;
  if (id === "vertube") return <iframe className="browser-frame" src={asset("apps/youtube/public/index.html")} title="McCrackTube" allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; fullscreen" allowFullScreen />;
  if (id === "ghostview") return <div className="window-surface gv-app-surface"><GhostViewSurface wallpaperResolve={wallImg} onStop={() => { onClose?.(); }} /></div>;
  if (id === "games") return <div className="window-surface ps5-app-surface"><Ps5EmulatorSurface surfaces={{ spotify: CinefySurface, verTube: VerTubeSurface }} /></div>;
  if (id === "minecraft") return <MinecraftLauncherSurface />;
  if (id === "rainmeter") return <RainmeterSurface />;
  if (id === "links") return <LinksApp />;
  if (id === "admin") return <AdminSurface />;
  if (id === "appmaker") return <div className="window-surface vs-app-surface"><VStudiosSurface /></div>;
  // Installed V-MARKET listings run inside their own McCrack-COS window.
  // Handle legacy custom apps
  if (typeof id === "string" && id.startsWith("custom_")) {
    try {
      const saved = localStorage.getItem("vertex-custom-apps");
      if (saved) {
        const customApps = JSON.parse(saved);
        const app = customApps.find((a: any) => a.id === id);
        if (app) {
          return <iframe className="browser-frame" src={app.url} title={app.name} allow="autoplay; clipboard-write; camera; microphone; fullscreen; gamepad; encrypted-media" />;
        }
      }
    } catch {}
  }
  return <div className="window-surface"><div className="surface-kicker">McCrack</div><h2 className="surface-title">surface</h2></div>;
}

function useMediaSession(): MediaSession | null {
  const [session, setSession] = useState<MediaSession | null>(() => getMediaSession());
  useEffect(() => subscribeMediaSession(() => setSession(getMediaSession())), []);
  return session;
}

function NowPlayingCard() {
  const session = useMediaSession();
  const [, tick] = useState(0);
  useEffect(() => {
    if (!session) return;
    const id = window.setInterval(() => tick((n) => (n + 1) % 1000), 500);
    return () => window.clearInterval(id);
  }, [session]);
  if (!session) return null;
  const dur = Number.isFinite(session.duration) && session.duration > 0 ? session.duration : 0;
  const prog = Number.isFinite(session.progress) && session.progress > 0 ? Math.min(session.progress, dur || session.progress) : 0;
  const pct = dur ? Math.min(100, (prog / dur) * 100) : 0;
  const fmt = (value: number) => {
    const total = Math.max(0, Math.floor(Number.isFinite(value) ? value : 0));
    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
  };
    return null;
}

const EAGLER_SINGLE = `${base}eaglercraft/index.html`;
const EAGLER_ARCHMC = `${base}eaglercraft/index.html?server=wss%3A%2F%2Fmc.arch.lol%2F`;
const MODPACK_WASM = `${base}eaglercraft-modpack/index.html`;
const EAGLER_112 = `${base}eaglercraft-1.12/index.html`;
const EAGLER_152 = `${base}eaglercraft-1.5/index.html`;
const MC_STORE_ICON = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTKxNUnlY6yNmkSbNQvrCsC_ijNVTFl463i6SO8b5jCo9LsAvicsF9PqTKZ&s=10";
const MC_TRAILER = "https://cdn.eaglercraft.ru/Official_Minecraft_Trailer.webm";
const MC_LOGO_SVG = "https://www.minecraft.net/content/dam/minecraftnet/games/minecraft/logos/Global-Header_MCCB-Logo_300x51.svg";
const MC_EAGTEK_ART = "https://store-images.s-microsoft.com/image/apps.29741.13774133678237924.b2fb64a6-d8b2-4e05-a188-b727d48563ed.f5bc1582-f67e-4ef4-8d8a-7aac86b324f9?w=562";

interface McInstall { id: number; name: string; version: "modpack" | "eagler112" | "eagler152"; variant: "ultimate-wasm" | "hd-sounds" | "release"; }

const MC_ARCH_REALM: McRealm = { name: "ArchMC", addr: "wss://mc.arch.lol/", verified: true, online: true, players: 731, votes: 0, tags: ["Multiplayer", "EaglercraftX"] };

function MinecraftLauncherSurface() {
  const [mode, setMode] = useState<"menu" | "eagler" | "archmc" | "modpack" | "eagler112" | "eagler152">("menu");
  const [modTitle, setModTitle] = useState("Modded");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState<"play" | "installations" | "newinstall">("play");
  const [splash, setSplash] = useState(true);
  const [splashPct, setSplashPct] = useState(0);
  const [splashMsg, setSplashMsg] = useState(0);
  const [view, setView] = useState<"home" | "eagler" | "archmc">("home");
  const [trPlaying, setTrPlaying] = useState(true);
  const [trMuted, setTrMuted] = useState(true);
  const [installs, setInstalls] = useState<McInstall[]>(() => storage.read<McInstall[]>("vertex-mc-installs", []));
  const [installName, setInstallName] = useState("");
  const [installError, setInstallError] = useState(false);
  const [installVersion, setInstallVersion] = useState<"modpack" | "eagler112" | "eagler152">("modpack");
  const [serverName, setServerName] = useState("ArchMC");
  const [serverAddr, setServerAddr] = useState<string | null>(null);
  const [realmQuery, setRealmQuery] = useState("");
  const [recentRealms, setRecentRealms] = useState<McRealm[]>(() => storage.read<McRealm[]>("vertex-mc-recent", []));
  const trailerRef = useRef<HTMLVideoElement>(null);
  const gameFrameRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const total = 2400 + Math.floor(Math.random() * 1601);
    const start = Date.now();
    const MSGS = ["minecraft.splash1", "minecraft.splash2", "minecraft.splash3", "minecraft.splash4"];
    const ticks = window.setInterval(() => {
      const elapsed = Date.now() - start;
      setSplashPct(Math.min(100, Math.round((elapsed / total) * 100)));
      setSplashMsg(Math.floor(elapsed / 1500) % MSGS.length);
    }, 100);
    const done = window.setTimeout(() => setSplash(false), total);
    return () => { window.clearInterval(ticks); window.clearTimeout(done); };
  }, []);

  const realmsFiltered = useMemo(() => {
    const q = realmQuery.trim().toLowerCase();
    if (!q) return MC_REALMS;
    return MC_REALMS.filter((realm) => realm.name.toLowerCase().includes(q) || realm.addr.toLowerCase().includes(q) || realm.tags.some((tag) => tag.toLowerCase().includes(q)));
  }, [realmQuery]);

  const launchRealm = (realm: McRealm) => {
    const next = [{ ...realm }, ...recentRealms.filter((r) => r.addr !== realm.addr)].slice(0, 6);
    setRecentRealms(next);
    storage.write("vertex-mc-recent", next);
    setServerName(realm.name);
    setServerAddr(realm.addr);
    setLoading(true);
    setMode("archmc");
  };

  const saveInstalls = (next: McInstall[]) => {
    setInstalls(next);
    storage.write("vertex-mc-installs", next);
  };
  const createInstall = () => {
    const clean = installName.trim();
    if (!clean) { setInstallError(true); return; }
    saveInstalls([...installs, { id: Date.now(), name: clean, version: installVersion, variant: installVersion === "eagler112" ? "hd-sounds" : installVersion === "eagler152" ? "release" : "ultimate-wasm" }]);
    setInstallName("");
    setInstallError(false);
    setPage("installations");
  };

  const toggleTrailerPlay = () => {
    const video = trailerRef.current;
    if (!video) return;
    if (video.paused) { void video.play(); setTrPlaying(true); } else { video.pause(); setTrPlaying(false); }
  };
  const toggleTrailerMute = () => {
    const video = trailerRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setTrMuted(video.muted);
  };
  const toggleTrailerFullscreen = () => {
    const video = trailerRef.current;
    if (!video) return;
    if (document.fullscreenElement) { void document.exitFullscreen(); } else { void video.requestFullscreen?.(); }
  };
  const toggleGameFullscreen = () => {
    const el = gameFrameRef.current;
    if (!el) return;
    if (document.fullscreenElement) { void document.exitFullscreen(); } else { void el.requestFullscreen?.(); }
  };

  if (mode === "eagler" || mode === "archmc" || mode === "modpack" || mode === "eagler112" || mode === "eagler152") {
    const title = mode === "eagler" ? "Eaglercraft 1.8.8 — Singleplayer" : mode === "eagler112" ? t("minecraft.eagler112Edition") : mode === "eagler152" ? t("minecraft.eagler152Edition") : mode === "modpack" ? `${modTitle} — Eaglercraft 1.6.4` : `${serverName} — Eaglercraft 1.8`;
    const src = mode === "eagler" ? EAGLER_SINGLE : mode === "eagler112" ? EAGLER_112 : mode === "eagler152" ? EAGLER_152 : mode === "modpack" ? MODPACK_WASM : serverAddr ? `${base}eaglercraft/index.html?server=${encodeURIComponent(serverAddr)}` : EAGLER_ARCHMC;
    return <div className="window-surface we-app-surface" ref={gameFrameRef}><div className="mc-bar">
      <button className="mc-back" onClick={() => { setLoading(true); setMode("menu"); }}>{t("minecraft.back")}</button>
      <span>{title}</span>
      <button className="mc-fs-btn" onClick={toggleGameFullscreen} aria-label={t("minecraft.fullscreen")}><Maximize size={14} /></button>
    </div>
      {loading ? <div className="mc-loading">{t("minecraft.loading")}</div> : null}
      <iframe className="browser-frame" src={src} key={`${mode}-${serverAddr ?? "default"}`} title={title} allow="autoplay; clipboard-write; camera; microphone; fullscreen; cross-origin-isolated" onLoad={() => setLoading(false)} />
    </div>;
  }

  if (splash) {
    const SPLASH_MSGS = ["minecraft.splash1", "minecraft.splash2", "minecraft.splash3", "minecraft.splash4"];
    return <div className="window-surface mc-surface"><div className="mc-splash">
      <img className="mc-splash-icon" src={MC_ICON} alt="Minecraft" />
      <img className="mc-splash-logo" src={MC_LOGO_SVG} alt="Minecraft" />
      <div className="mc-splash-title">{t("minecraft.launcher")}</div>
      <div className="mc-splash-status">{t(SPLASH_MSGS[splashMsg])}</div>
      <div className="mc-splash-track"><div className="mc-splash-fill" style={{ width: `${splashPct}%` }} /></div>
      <span className="mc-splash-pct">{splashPct}%</span>
      <span className="mc-splash-ver">Minecraft Launcher {t("minecraft.splashVer")} · EaglercraftX 1.8.8</span>
    </div></div>;
  }

  return <div className="window-surface mc-surface">
    {view === "eagler" ? <div className="mc-topbar">
      <img className="mc-logo-svg" src={MC_LOGO_SVG} alt="Minecraft" />
      <nav className="mc-tabs">
        <button className={page === "play" ? "active" : ""} onClick={() => setPage("play")}>{t("minecraft.tabPlay")}</button>
        <button className={page === "installations" ? "active" : ""} onClick={() => setPage("installations")}>{t("minecraft.tabInstallations")}</button>
      </nav>
    </div> : null}
    <div className="mc-store">
      <div className="mc-store-body">
        {page === "play" ? <>
          <nav className="mc-nav">
            <button className={view === "home" ? "active" : ""} onClick={() => { setView("home"); setPage("play"); }}><House size={22} strokeWidth={1.8} className="mc-nav-icon" />{t("minecraft.home")}</button>
            <button className={view === "eagler" ? "active" : ""} onClick={() => setView("eagler")}><img className="mc-nav-icon" src={MC_STORE_ICON} alt="" /><span className="mc-edition-name"><em>{t("minecraft.brandLine")}</em><b>{t("minecraft.eaglerLine")}</b></span></button>
            <button className={view === "archmc" ? "active" : ""} onClick={() => { setView("archmc"); setPage("play"); }}><img className="mc-nav-icon" src={MC_STORE_ICON} alt="" /><span className="mc-edition-name"><em>{t("minecraft.brandLine")}</em><b>{t("minecraft.archLine")}</b></span></button>
          </nav>
          <div className="mc-pane">
            {view === "home" ? <div className="mc-pane-home">
              <div className="mc-trailer">
                <video ref={trailerRef} src={MC_TRAILER} autoPlay muted loop playsInline onClick={toggleTrailerPlay} onLoadedMetadata={() => setTrPlaying(!(trailerRef.current?.paused ?? true))} onPlaying={() => setTrPlaying(true)} onPlay={() => setTrPlaying(true)} onPause={() => setTrPlaying(false)} />
                <div className="mc-video-bar">
                  <button className="mc-video-btn" onClick={toggleTrailerPlay} aria-label={trPlaying ? "Pause trailer" : "Play trailer"}>{trPlaying ? <Pause size={14} /> : <Play size={14} />}</button>
                  <button className="mc-video-btn" onClick={toggleTrailerMute} aria-label={trMuted ? "Unmute" : "Mute"}>{trMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}</button>
                  <span className="mc-video-spacer" />
                  <button className="mc-video-btn" onClick={toggleTrailerFullscreen} aria-label="Fullscreen"><Maximize size={14} /></button>
                </div>
              </div>
              <p className="mc-pane-copy">{t("minecraft.copy")}</p>
            </div> : null}
            {view === "eagler" ? <div className="mc-edition-pane art" style={{ backgroundImage: `url("${MC_EAGTEK_ART}")` }}>
              <h2 className="mc-edition-head"><em>{t("minecraft.brandLine")}</em><b>{t("minecraft.eaglerLine")}</b></h2>
              <button className="mc-play-btn" onClick={() => { setLoading(true); setMode("eagler"); }}><Play size={15} /> {t("minecraft.play")}</button>
            </div> : null}
            {view === "archmc" ? <div className="mc-archmc-wrap">
              <div className="mc-edition-pane art arch" style={{ backgroundImage: `url("${MC_EAGTEK_ART}")` }}>
                <h2 id="archmc-card-title" className="mc-edition-head"><em>{t("minecraft.brandLine")}</em><b className="archmc-title">{t("minecraft.archLine")}</b></h2>
                <button className="mc-play-btn" onClick={() => launchRealm(MC_ARCH_REALM)}><Play size={15} /> {t("minecraft.play")}</button>
              </div>
              <div className="mc-realms">
                <div className="mc-realms-head">
                  <h3>{t("minecraft.realms")}</h3>
                  <div className="mc-realm-search"><Search size={14} /><input placeholder={t("minecraft.searchRealms")} value={realmQuery} onChange={(event) => setRealmQuery(event.target.value)} /></div>
                </div>
                {recentRealms.length > 0 ? <div className="mc-recent-block">
                  <span className="mc-realms-label">{t("minecraft.recentRealms")}</span>
                  <div className="mc-realm-strip">{recentRealms.map((realm) => <RealmCard key={realm.addr} realm={realm} onPlay={() => launchRealm(realm)} />)}</div>
                </div> : <p className="mc-realms-hint">{t("minecraft.emptyRecent")}</p>}
                <span className="mc-realms-label">{t("minecraft.allRealms")}</span>
                {realmsFiltered.length === 0 ? <div className="mc-realms-empty"><Search size={22} /><span>{t("minecraft.noRealms")}</span></div> : <div className="mc-realm-grid">{realmsFiltered.map((realm) => <RealmCard key={realm.addr} realm={realm} onPlay={() => launchRealm(realm)} />)}</div>}
              </div>
            </div> : null}
          </div>
        </> : page === "installations" ? <div className="mc-installs">
          <div className="mc-install-header">
            <h3>{t("minecraft.installHeader")}</h3>
            <button className="mc-new-install-btn" onClick={() => { setInstallName(""); setInstallError(false); setPage("newinstall"); }}><Plus size={14} /> {t("minecraft.newInstall")}</button>
          </div>
          {installs.length === 0 ? <div className="mc-empty"><Package size={26} /><span>{t("minecraft.emptyInstalls")}</span></div> : <div className="mc-install-list">
            {installs.map((install) => <div className="mc-install-row" key={install.id}>
              <img className="mc-install-icon" src={MC_STORE_ICON} alt="" />
              <div className="mc-install-meta"><strong>{install.name}</strong><span>{install.version === "eagler112" ? t("minecraft.v112Version") : install.version === "eagler152" ? t("minecraft.v152Version") : t("minecraft.modpackVersion")} · {install.version === "eagler112" ? t("minecraft.variantHdSounds") : install.version === "eagler152" ? t("minecraft.variantRelease") : t("minecraft.variantUltimate")}</span></div>
              <button className="mc-row-play" onClick={() => { if (install.version === "eagler112") { setLoading(true); setMode("eagler112"); } else if (install.version === "eagler152") { setLoading(true); setMode("eagler152"); } else { setModTitle(install.name); setLoading(true); setMode("modpack"); } }}><Play size={13} /> {t("minecraft.play")}</button>
            </div>)}
          </div>}
        </div> : <div className="mc-new-install">
          <h3>{t("minecraft.newInstall")}</h3>
          <div className="mc-field">
            <label>{t("minecraft.installName")}</label>
            <input className={installError ? "mc-input error" : "mc-input"} placeholder={t("minecraft.installNamePh")} value={installName} onChange={(event) => { setInstallName(event.target.value); if (installError && event.target.value.trim()) setInstallError(false); }} />
            {installError ? <span className="mc-field-error">{t("minecraft.nameRequired")}</span> : null}
          </div>
          <div className="mc-field">
            <label>{t("minecraft.installVersion")}</label>
            <select className="mc-select" value={installVersion} onChange={(event) => setInstallVersion(event.target.value as "modpack" | "eagler112" | "eagler152")}>
              <option value="modpack">{t("minecraft.modpackVersion")}</option>
              <option value="eagler112">{t("minecraft.v112Version")}</option>
              <option value="eagler152">{t("minecraft.v152Version")}</option>
            </select>
          </div>
          <div className="mc-field">
            <label>{t("minecraft.modpackVariant")}</label>
            <select className="mc-select"><option>{installVersion === "eagler112" ? t("minecraft.variantHdSounds") : installVersion === "eagler152" ? t("minecraft.variantRelease") : t("minecraft.variantUltimate")}</option></select>
          </div>
          <div className="mc-form-actions">
            <button className="mc-cancel-btn" onClick={() => setPage("installations")}>{t("minecraft.cancel")}</button>
            <button className="mc-create-btn" onClick={() => createInstall()}>{t("minecraft.create")}</button>
          </div>
        </div>}
      </div>
    </div>
  </div>;
}

function RealmCard({ realm, onPlay }: { realm: McRealm; onPlay: () => void }) {
  const initial = realm.name.trim().charAt(0).toUpperCase() || "#";
  return <div className="mc-realm-card">
    <div className="mc-realm-icon">{initial}</div>
    <div className="mc-realm-info">
      <strong className="mc-realm-name">{realm.verified ? <BadgeCheck size={12} className="mc-realm-check" aria-label="Verified" /> : null}{realm.name}</strong>
      <span className="mc-realm-addr">{realm.addr}</span>
      <div className="mc-realm-tags">{realm.tags.slice(0, 4).map((tag) => <span className="mc-realm-chip" key={tag}>{tag}</span>)}</div>
    </div>
    <div className="mc-realm-side">
      <span className="mc-realm-meta"><span className={`mc-realm-dot ${realm.online ? "on" : "off"}`} />{realm.players > 0 ? `${realm.players} ${t("minecraft.online")}` : t("minecraft." + (realm.online ? "empty" : "offline"))}</span>
      <button className="mc-row-play" onClick={onPlay}><Play size={13} /> {t("minecraft.play")}</button>
    </div>
  </div>;
}

type RainmeterPosition = "center" | "top" | "top-left" | "top-right" | "middle-left" | "middle-right" | "bottom-left" | "bottom-center" | "bottom-right" | "free";
type RainmeterDateStyle = "mond" | "dot" | "long" | "short";
type RainmeterSkin = "mond" | "summit" | "default" | "bigsur";
type RainmeterSettings = {
  showClock: boolean;
  draggable: boolean;
  position: RainmeterPosition;
  marginH: number;
  marginV: number;
  scale: number;
  format24: boolean;
  dateFormat: RainmeterDateStyle;
  showSeconds: boolean;
  skin: RainmeterSkin;
  color: string;
  accent: string;
  posX: number;
  posY: number;
  darkThreshold: number;
  lightThreshold: number;
  autoTextColor: boolean;
  centerRegionPct: number;
};
const DEFAULT_RAINMETER: RainmeterSettings = {
  showClock: true,
  draggable: true,
  position: "center",
  marginH: 0,
  marginV: 0,
  scale: 1,
  format24: true,
  dateFormat: "mond",
  showSeconds: false,
  skin: "mond",
  color: "#f4f7fb",
  accent: "#fa7e00",
  posX: 50,
  posY: 42,
  darkThreshold: 35,
  lightThreshold: 70,
  autoTextColor: false,
  centerRegionPct: 30,
};
const RM_DATE_STYLES: RainmeterDateStyle[] = ["mond", "dot", "long", "short"];
const RM_SKINS: RainmeterSkin[] = ["mond", "summit", "default", "bigsur"];
const RM_POSITIONS: { value: RainmeterPosition; label: string }[] = [
  { value: "center", label: "Center" },
  { value: "top", label: "Top center" },
  { value: "top-left", label: "Top left" },
  { value: "top-right", label: "Top right" },
  { value: "middle-left", label: "Middle left" },
  { value: "middle-right", label: "Middle right" },
  { value: "bottom-left", label: "Bottom left" },
  { value: "bottom-center", label: "Bottom center" },
  { value: "bottom-right", label: "Bottom right" },
];

function RainmeterSurface() {
  const [cfg, setCfg] = useState<RainmeterSettings>(() => ({ ...DEFAULT_RAINMETER, ...storage.read<Partial<RainmeterSettings>>("rainmeter-config", {}) }));
  const [settingsTab, setSettingsTab] = useState<"general" | "appearance">("general");

  const save = (next: RainmeterSettings) => { setCfg(next); storage.write("rainmeter-config", next); window.dispatchEvent(new CustomEvent("rainmeter-config-updated")); };
  const set = <K extends keyof RainmeterSettings>(key: K, value: RainmeterSettings[K]) => save({ ...cfg, [key]: value });

  return <div className="window-surface rainmeter-surface">
    <div className="rainmeter-modal rainmeter-modal-full">
      <div className="rainmeter-modal-head">
        <div><span className="rainmeter-modal-kicker">RAINMETER</span><h2>Settings</h2></div>
      </div>
      <nav className="rainmeter-tabs">
        <button className={settingsTab === "general" ? "active" : ""} onClick={() => setSettingsTab("general")}><LayoutGrid size={14} /> General</button>
        <button className={settingsTab === "appearance" ? "active" : ""} onClick={() => setSettingsTab("appearance")}><Palette size={14} /> Appearance</button>
      </nav>
      <div className="rainmeter-modal-body">
        {settingsTab === "general" ? <>
          <div className="setting-group"><Cpu size={13} /> Widget</div>
          <SettingToggle label="Mond Clock" help="Show / hide the clock widget on this screen" value={cfg.showClock} onChange={(value) => set("showClock", value)} />
          <SettingToggle label="Draggable" help="Move the clock by dragging it around" value={cfg.draggable} onChange={(value) => set("draggable", value)} />
          <div className="setting-group"><LayoutGrid size={13} /> Layout</div>
          <div className="setting-row"><div><strong>Position</strong><small>Anchor point of the widget</small></div><select className="setting-select" value={cfg.position} onChange={(event) => set("position", event.target.value as RainmeterPosition)} aria-label="Position">{RM_POSITIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></div>
          <div className="setting-row"><div><strong>Horizontal margin</strong><small>Shifts the widget sideways (px)</small></div><input className="rainmeter-numeric" type="number" min={-500} max={500} value={cfg.marginH} onChange={(event) => set("marginH", Number(event.target.value))} aria-label="Horizontal margin" /></div>
          <div className="setting-row"><div><strong>Vertical margin</strong><small>Shifts the widget up / down (px)</small></div><input className="rainmeter-numeric" type="number" min={-500} max={500} value={cfg.marginV} onChange={(event) => set("marginV", Number(event.target.value))} aria-label="Vertical margin" /></div>
          <div className="setting-row setting-stack"><div><strong>Scale</strong><small>{`${Math.round(cfg.scale * 100)}%`} — size multiplier</small></div><input className="rainmeter-range" type="range" min={0.5} max={2} step={0.01} value={cfg.scale} onChange={(event) => set("scale", Number(event.target.value))} aria-label="Scale" /></div>
          <div className="setting-group"><CalendarClock size={13} /> Time &amp; Date</div>
          <SettingToggle label="24-hour format" help="Show 00–23 hours instead of AM / PM" value={cfg.format24} onChange={(value) => set("format24", value)} />
          <div className="setting-row"><div><strong>Date format</strong><small>How the date line is written</small></div><select className="setting-select" value={cfg.dateFormat} onChange={(event) => set("dateFormat", event.target.value as RainmeterDateStyle)} aria-label="Date format"><option value="mond">DD  Month,  YYYY.</option><option value="dot">DD.MM.YYYY</option><option value="long">DD Month, YYYY.</option><option value="short">DD Month</option></select></div>
          <SettingToggle label="Show seconds" help="Append live seconds to the time" value={cfg.showSeconds} onChange={(value) => set("showSeconds", value)} />
        </> : <>
          <div className="setting-group"><Palette size={13} /> Style</div>
          <p className="surface-copy">Pick the skin that shapes the clock layout.</p>
          <div className="rainmeter-style-grid">
            {(["mond", "summit", "default", "bigsur"] as const).map((skin) => <button key={skin} className={`rainmeter-style-card ${cfg.skin === skin ? "active" : ""}`} onClick={() => set("skin", skin)} aria-label={skin}>
              <span className={`rainmeter-style-preview rm-prev-${skin}`}><span className="rmp-day">Friday</span><span className="rmp-time">17:45</span>{skin !== "default" ? <span className="rmp-brand">{skin.toUpperCase()}</span> : null}</span>
              <strong className="rainmeter-style-name">{skin === "mond" ? "Mond" : skin === "summit" ? "Summit" : skin === "bigsur" ? "macOS 27" : "Default"}</strong>
              <span className="rainmeter-style-desc">{skin === "mond" ? "Two-tone featured clock" : skin === "summit" ? "Minimal & thin" : skin === "bigsur" ? "macOS 27 style clock" : "Plain classic clock"}</span>
            </button>)}
          </div>
          <div className="setting-group"><Palette size={13} /> Colors</div>
          <div className="setting-row setting-stack"><div><strong>Text color</strong><small>Color of the clock text</small></div><input className="rainmeter-color" type="color" value={cfg.color} onChange={(event) => set("color", event.target.value)} aria-label="Text color" /></div>
          <div className="setting-row setting-stack"><div><strong>Accent color</strong><small>Highlight color (Default bar, etc.)</small></div><input className="rainmeter-color" type="color" value={cfg.accent} onChange={(event) => set("accent", event.target.value)} aria-label="Accent color" /></div>
          <div className="setting-group"><Contrast size={13} /> Luminance Thresholds</div>
          <p className="surface-copy">The wallpaper center luminance limits used by the automatic text color.</p>
          <div className="setting-row setting-stack"><div><strong>Dark threshold</strong><small>{`${cfg.darkThreshold}%`} — below this, text turns light</small></div><div className="rm-input-pair"><input className="rainmeter-range" type="range" min={0} max={100} step={1} value={cfg.darkThreshold} onChange={(event) => set("darkThreshold", Number(event.target.value))} aria-label="Dark threshold slider" /><input className="rainmeter-numeric" type="number" min={0} max={100} step={1} value={cfg.darkThreshold} onChange={(event) => set("darkThreshold", Math.min(100, Math.max(0, Number(event.target.value) || 0)))} aria-label="Dark threshold (type a number)" /></div></div>
          <div className="setting-row setting-stack"><div><strong>Light threshold</strong><small>{`${cfg.lightThreshold}%`} — above this, text turns dark</small></div><div className="rm-input-pair"><input className="rainmeter-range" type="range" min={0} max={100} step={1} value={cfg.lightThreshold} onChange={(event) => set("lightThreshold", Number(event.target.value))} aria-label="Light threshold slider" /><input className="rainmeter-numeric" type="number" min={0} max={100} step={1} value={cfg.lightThreshold} onChange={(event) => set("lightThreshold", Math.min(100, Math.max(0, Number(event.target.value) || 0)))} aria-label="Light threshold (type a number)" /></div></div>
          <div className="setting-group"><Sparkles size={13} /> Automatic color</div>
          <SettingToggle label="Automatic text color" help="Rainmeter analyzes the center of the current wallpaper" value={cfg.autoTextColor} onChange={(value) => set("autoTextColor", value)} />
          <div className="setting-row setting-stack"><div><strong>Center region %</strong><small>{`${cfg.centerRegionPct}%`} — percentage of the wallpaper width &amp; height analyzed around the center</small></div><div className="rm-input-pair"><input className="rainmeter-range" type="range" min={5} max={100} step={1} value={cfg.centerRegionPct} onChange={(event) => set("centerRegionPct", Number(event.target.value))} aria-label="Center region percent slider" /><input className="rainmeter-numeric" type="number" min={5} max={100} step={1} value={cfg.centerRegionPct} onChange={(event) => set("centerRegionPct", Math.min(100, Math.max(5, Number(event.target.value) || 5)))} aria-label="Center region percent (type a number)" /></div></div>
        </>}
      </div>
    </div>
  </div>;
}

type SettingsTabId = "home" | "personalization" | "account" | "system" | "colors" | "language" | "privacy" | "about";

const SETTINGS_TABS: { id: SettingsTabId; label: string; icon: LucideIcon }[] = [
  { id: "home", label: "Home", icon: House },
  { id: "personalization", label: "Personalization", icon: Paintbrush },
  { id: "account", label: "Account", icon: User },
  { id: "system", label: "System", icon: Cpu },
  { id: "colors", label: "Color mode", icon: SunMoon },
  { id: "language", label: "Language & region", icon: Languages },
  { id: "privacy", label: "Privacy & security", icon: ShieldBan },
  { id: "about", label: "About", icon: Info },
];

const SETTINGS_SEARCH: { tab: SettingsTabId; label: string; hint: string }[] = [
  { tab: "home", label: "Device name", hint: "Rename this device" },
  { tab: "home", label: "Current wallpaper", hint: "Wallpaper in use and reset to default" },
  { tab: "home", label: "Language", hint: "Change the OS language / idiom" },
  { tab: "home", label: "Color mode", hint: "Bright (light) or black (dark)" },
  { tab: "personalization", label: "Wallpaper", hint: "Desktop background and lock screen" },
  { tab: "personalization", label: "Wallpaper Engine", hint: "Animated backgrounds, workshop and installed wallpapers" },
  { tab: "personalization", label: "Reset to default wallpaper", hint: "Restore the McCrack Studios wallpaper" },
  { tab: "account", label: "Account name", hint: "The name shown on this device" },
  { tab: "account", label: "Email address", hint: "The Gmail you are signed in with" },
  { tab: "account", label: "Profile picture", hint: "Change your avatar" },
  { tab: "account", label: "Password", hint: "Lock screen password" },
  { tab: "system", label: "Performance", hint: "Optimization, fast boot, idle lock" },
  { tab: "system", label: "System style", hint: "Switch between McCrack-COS and macOS looks" },
  { tab: "system", label: "Text style", hint: "Change the font used across McCrack-COS" },
  { tab: "colors", label: "Color mode", hint: "Bright or black theme" },
  { tab: "language", label: "Language & region", hint: "Idiom and formatting" },
  { tab: "privacy", label: "Cloak", hint: "Disguise the browser tab" },
  { tab: "privacy", label: "Adblock", hint: "Redirect ads to another page" },
  { tab: "privacy", label: "Panic key", hint: "Instantly hide McCrack-COS" },
  { tab: "about", label: "About McCrack-COS", hint: "Version and FAQ" },
  { tab: "about", label: "FAQ", hint: "Common questions" },
];

const FONT_STYLES: { id: string; label: string; note: string; family: string }[] = [
  { id: "vertex", label: "McCrack", note: "Orbitron · Space Grotesk", family: '"Orbitron", "Space Grotesk", sans-serif' },
  { id: "minecraft", label: "Minecraft", note: "Blocky pixel", family: '"Minecraftia", "Courier New", monospace' },
  { id: "aquatico", label: "Aquatico", note: "Rounded techy", family: '"Aquatico", sans-serif' },
  { id: "anurati", label: "Anurati", note: "Wide caps display", family: '"Anurati", sans-serif' },
  { id: "quicksand", label: "Quicksand", note: "Soft geometric", family: '"Quicksand", sans-serif' },
  { id: "hero", label: "Hero", note: "Bold poster", family: '"Hero Bold", "Hero Light", sans-serif' },
  { id: "electroharmonix", label: "Electroharmonix", note: "Retro electro", family: '"electroharmonix", sans-serif' },
  { id: "chicago", label: "Chicago", note: "Classic Mac", family: '"Chicago", "Courier New", monospace' },
  { id: "nexa", label: "Nexa", note: "Modern sans", family: '"Nexa", sans-serif' },
  { id: "jetbrains", label: "JetBrains Mono", note: "Coding mono", family: '"JetBrains Mono", monospace' },
  { id: "sfpro", label: "SF Pro", note: "Apple system", family: '"SF Pro Display", -apple-system, sans-serif' },
  { id: "tuesday", label: "Tuesday Night", note: "Handwritten", family: '"Tuesday Night", cursive' },
];

function SettingsSurface({ settings, updateSetting, faqOpen, setFaqOpen, lang, onLanguagePick, onPanic, avatar, accountName, accountEmail, onAvatarChange, onAccountChange, appliedWallpaper, appliedLockWallpaper, onApplyWallpaper, onNotify }: {
  settings: SystemSettings;
    updateSetting: (key: keyof SystemSettings | Partial<SystemSettings>, value?: boolean | string | TabHideImage[]) => void;
  faqOpen: number | null;
  setFaqOpen: (value: number | null) => void;
  lang: Lang;
  onLanguagePick: (language: Lang) => void;
  onPanic: () => void;
  avatar?: string;
  accountName?: string;
  accountEmail?: string;
  onAvatarChange?: (avatar: string) => void;
  onAccountChange?: (patch: { name?: string; email?: string }) => void;
  appliedWallpaper: WallpaperId;
  appliedLockWallpaper: WallpaperId;
  onApplyWallpaper?: (id: WallpaperId, target: "both" | "home" | "lock") => void;
  onNotify?: (title: string, copy: string) => void;
}) {
  const faqs = [
    [t("set.faq1q"), t("set.faq1a")],
    [t("set.faq2q"), t("set.faq2a")],
  ];
  const [tab, setTab] = useState<SettingsTabId>("home");
  const [query, setQuery] = useState("");
  const [nameDraft, setNameDraft] = useState(accountName ?? "");
  const [emailDraft, setEmailDraft] = useState(accountEmail ?? "");
  const [deviceDraft, setDeviceDraft] = useState(settings.deviceName);
  const [passwordDraft, setPasswordDraft] = useState("");
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [blankNotice, setBlankNotice] = useState<string | null>(null);
  const [tabHideNotice, setTabHideNotice] = useState<string | null>(null);
  const [tabHidePreview, setTabHidePreview] = useState(false);
  const [offlineBusy, setOfflineBusy] = useState(false);
  const [offlineNote, setOfflineNote] = useState<string | null>(null);
  const hasPassword = Boolean(storage.read<string>(PASSWORD_KEY, ""));

  const applySystemStyle = (style: SystemStyle) => {
    if (settings.systemStyle === style) return;
    const prompt = style === "macos"
      ? "Switch to the macOS style? McCrack-COS will restart and return you to the sign-in screen."
      : "Switch back to the default McCrack-COS style? McCrack-COS will restart and return you to the sign-in screen.";
    if (typeof window !== "undefined" && !window.confirm(prompt)) return;
    updateSetting("systemStyle", style);
    if (style === "macos") {
      onApplyWallpaper?.("macos-default", "home");
      onApplyWallpaper?.("macos-lock", "lock");
    } else {
      onApplyWallpaper?.(SEASON_WALLPAPER, "both");
    }
    window.setTimeout(() => window.location.reload(), 220);
  };

  useEffect(() => { setNameDraft(accountName ?? ""); }, [accountName]);
  useEffect(() => { setEmailDraft(accountEmail ?? ""); }, [accountEmail]);
  useEffect(() => { setDeviceDraft(settings.deviceName); }, [settings.deviceName]);

  const currentHome = wallpapers.find((w) => w.id === appliedWallpaper);
  const currentLock = wallpapers.find((w) => w.id === appliedLockWallpaper);
  const wallThumb = (id: string) => (id === "vertex-studio" ? asset("images/vertex-studios-thumb.svg") : wallImg(id));
  const avatarNode = avatar ? <AvatarGlyph value={avatar} name={accountName ?? "?"} size={40} /> : <span>{(accountName ?? "?").slice(0, 1).toUpperCase()}</span>;

  const saveProfile = () => {
    const patch: { name?: string; email?: string } = {};
    const name = nameDraft.trim();
    const email = emailDraft.trim();
    if (name && name !== (accountName ?? "")) patch.name = name;
    if (email !== (accountEmail ?? "")) patch.email = email;
    if (!Object.keys(patch).length) { onNotify?.("Nothing to save", "Your account details are already up to date."); return; }
    onAccountChange?.(patch);
    onNotify?.("Account updated", "Your name and email were saved.");
  };
  const saveDevice = () => {
    const name = deviceDraft.trim();
    if (!name) { onNotify?.("Device name required", "Enter a name for this device."); return; }
    updateSetting("deviceName", name);
    onNotify?.("Device renamed", `This device is now called "${name}".`);
  };
  const resetWallpaper = (target: "both" | "home" | "lock") => { onApplyWallpaper?.("vertex-studio", target); };
  const results = query.trim() ? SETTINGS_SEARCH.filter((entry) => `${entry.label} ${entry.hint}`.toLowerCase().includes(query.trim().toLowerCase())) : [];
  const openBlankTab = () => {
    const cloak = settings.cloak === "custom"
      ? { title: settings.cloakName || CLOAKS.none.title, icon: settings.cloakIcon || CLOAKS.none.icon }
      : (CLOAKS[settings.cloak] ?? CLOAKS.none);
    const title = String(cloak.title).replace(/["\\]/g, "");
    const icon = String(cloak.icon).replace(/["\\]/g, "");
    const src = encodeURI(location.href);
    const win = window.open("about:blank", "_blank");
    if (!win) { setBlankNotice("Popup blocked — allow popups for this site, then try again."); return; }
    setBlankNotice(null);
    const doc = win.document;
    doc.open();
    doc.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title><link rel="icon" href="${icon}"><style>html,body{margin:0;height:100%;overflow:hidden}iframe{display:block;width:100vw;height:100vh;border:0}</style></head><body><iframe src="${src}" allow="autoplay; clipboard-write; camera; microphone; fullscreen"></iframe></body></html>`);
    doc.close();
    win.focus();
  };
  const downloadOfflineHtml = async () => {
    setOfflineBusy(true);
    setOfflineNote(null);
    try {
      if (location.protocol === "file:") {
        setOfflineNote("You're already running the offline copy.");
        return;
      }
      // Vite dev servers fall back to the (almost empty) dev index.html for unknown paths —
      // that stub is only a few KB and loads /src/main.tsx, so reject it instead of downloading a blank file.
      const isStub = (t: string) => t.length < 100_000 || t.includes("/src/main.tsx") || t.includes("@vite/client");
      const bust = `?v=${Date.now()}`;
      const bases = Array.from(new Set<string>([
        import.meta.env.BASE_URL,
        "/",
        new URL(".", location.href).pathname,
      ])).map((b) => (b.endsWith("/") ? b : `${b}/`));
      // Try the same-origin copies first (fast, always current), each with a cache-busting query so a
      // stale cached 404 can't win. If none work, fall back to a cross-origin raw GitHub mirror — it is
      // served with CORS * and lives on a different origin, so this site's own service worker / cache
      // can never intercept it. That makes the download work even when a stale SW is blocking the local file.
      const urls = [
        ...bases.map((b) => new URL(`single/index.html${bust}`, location.origin + b).href),
        `https://cdn.jsdelivr.net/gh/Patrickmango49/McCrackOSV3@main/single/index.html${bust}`,
        `https://raw.githubusercontent.com/Patrickmango49/McCrackOSV3/main/single/index.html${bust}`,
      ];
      let html: string | null = null;
      for (const u of urls) {
        try {
          const res = await fetch(u, { cache: "reload", credentials: "omit" });
          if (!res.ok) continue;
          const t = await res.text();
          if (isStub(t)) continue;
          html = t;
          break;
        } catch { /* try the next URL */ }
      }
      if (html === null) {
        // Fetch probes all failed (blocked network / CORS). Fall back to the browser's own download
        // of the same-origin copy, which is not subject to fetch/CORS rules.
        const a = document.createElement("a");
        a.href = new URL("single/index.html", location.origin + bases[0]).href;
        a.download = "vertex-os.html";
        document.body.appendChild(a);
        a.click();
        a.remove();
        setOfflineNote("Download started using the browser directly. If the file looks empty, hard-refresh (Ctrl+Shift+R) and try again.");
        return;
      }
      const blob = new Blob([html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "vertex-os.html";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setOfflineNote("Saved — open vertex-os.html anywhere, no internet needed.");
    } catch {
      setOfflineNote("Couldn't grab the offline copy. Check your connection, then hard-refresh (Ctrl+Shift+R) and try again.");
    } finally {
      setOfflineBusy(false);
    }
  };
  const renderPane = () => {
    switch (tab) {
      case "home":
        return <>
          <h2>Home</h2>
          <p className="win-settings-sub">A snapshot of this device and your account.</p>
          <section className="win-settings-card">
            <div className="win-settings-userbig">
              <span className={`win-settings-avatar lg ${avatar ? "has-img" : ""}`}>{avatar ? <AvatarGlyph value={avatar} name={accountName ?? "?"} size={56} /> : <span>{(accountName ?? "?").slice(0, 1).toUpperCase()}</span>}</span>
              <div><strong>{accountName ?? "Not signed in"}</strong><span>{accountEmail || "No email set"}</span></div>
              <button className="outline-button" onClick={() => setTab("account")}>Manage account</button>
            </div>
          </section>
          <section className="win-settings-card">
            <div className="win-settings-row">
              <div><strong>Device name</strong><small>The name McCrack-COS shows for this device</small></div>
              <div className="win-settings-inline">
                <input className="setting-input" value={deviceDraft} onChange={(event) => setDeviceDraft(event.target.value)} aria-label="Device name" />
                <button className="outline-button" onClick={saveDevice}>Rename</button>
              </div>
            </div>
            <div className="win-settings-row">
              <div><strong>Current wallpaper</strong><small>{currentHome?.name ?? appliedWallpaper} · {currentHome?.meta ?? "Custom"}</small></div>
              <div className="win-settings-inline">
                <button className="outline-button" onClick={() => resetWallpaper("home")}><RotateCcw size={13} /> Default</button>
                <button className="outline-button" onClick={() => setTab("personalization")}>Change</button>
              </div>
            </div>
            <div className="win-settings-row">
              <div><strong>Language</strong><small>Your idiom across the whole system</small></div>
              <select className="setting-select" value={lang} onChange={(event) => onLanguagePick(event.target.value as Lang)} aria-label="Language">{LANGS.map((option) => <option key={option.code} value={option.code}>{option.native}</option>)}</select>
            </div>
            <div className="win-settings-row">
              <div><strong>Color mode</strong><small>Bright or black appearance</small></div>
              <div className="win-seg" role="group" aria-label="Color mode">
                <button className={settings.colorMode === "light" ? "active" : ""} onClick={() => updateSetting("colorMode", "light")}>Bright</button>
                <button className={settings.colorMode === "dark" ? "active" : ""} onClick={() => updateSetting("colorMode", "dark")}>Black</button>
              </div>
            </div>
          </section>
          {lang !== LANG && <div className="setting-action-row"><button className="outline-button" onClick={() => location.reload()}>{t("set.reload")}</button><span>{t("set.restartNote")}</span></div>}
        </>;
      case "personalization":
        return <>
          <h2>Personalization</h2>
          <p className="win-settings-sub">Pick your desktop background and lock screen wallpaper.</p>
          <section className="win-settings-card">
            <div className="win-settings-wp-hero">
              <span className="win-settings-wp-preview">{wallThumb(appliedWallpaper) ? <img src={wallThumb(appliedWallpaper) as string} alt="" /> : <span className="win-settings-wp-fallback">{currentHome?.name ?? "Wallpaper"}</span>}</span>
              <div>
                <strong>{currentHome?.name ?? appliedWallpaper}</strong>
                <small>{currentHome?.meta ?? "Custom wallpaper"}</small>
                <p className="win-settings-sub">Lock screen: {currentLock?.name ?? appliedLockWallpaper}</p>
              </div>
            </div>
            <div className="win-settings-inline wrap">
              <button className="outline-button" onClick={() => resetWallpaper("home")}><RotateCcw size={13} /> Reset desktop to default</button>
              <button className="outline-button" onClick={() => resetWallpaper("lock")}><RotateCcw size={13} /> Reset lock to default</button>
              <button className="outline-button" onClick={() => resetWallpaper("both")}><RotateCcw size={13} /> Reset both</button>
            </div>
          </section>
          <section className="win-settings-card">
            <div className="setting-group"><Palette size={13} /> Built-in wallpapers</div>
            <div className="win-settings-wp-grid">
              {wallpapers.map((wall) => (
                <button key={wall.id} className={`win-settings-wp ${appliedWallpaper === wall.id ? "active" : ""}`} onClick={() => onApplyWallpaper?.(wall.id, "home")} title={wall.name} aria-label={wall.name}>
                  {wallThumb(wall.id) ? <img src={wallThumb(wall.id) as string} alt="" /> : <span className="win-settings-wp-fallback">{wall.name}</span>}
                  <span>{wall.name}</span>
                </button>
              ))}
            </div>
          </section>
          <section className="win-settings-card settings-wall-engine-card">
            <div className="setting-group"><Image size={13} /> Wallpaper Engine</div>
            <p className="win-settings-sub">Browse animated scenes, manage your installed wallpapers, and apply a background to your desktop or lock screen.</p>
            <WallEngineApp appliedHome={appliedWallpaper} appliedLock={appliedLockWallpaper} onApplyWallpaper={onApplyWallpaper ?? (() => {})} notify={onNotify ?? undefined} embedded />
          </section>
        </>;
      case "account":
        return <>
          <h2>Account</h2>
          <p className="win-settings-sub">Your profile on this device.</p>
          <section className="win-settings-card">
            <div className="win-settings-userbig">
              <span className={`win-settings-avatar lg ${avatar ? "has-img" : ""}`}>{avatar ? <AvatarGlyph value={avatar} name={accountName ?? "?"} size={56} /> : <span>{(accountName ?? "?").slice(0, 1).toUpperCase()}</span>}</span>
              <div><strong>{accountName ?? "Not signed in"}</strong><span>{accountEmail || "No email set"}</span></div>
            </div>
            <div className="win-settings-row setting-stack">
              <div><strong>Full name</strong><small>Shown on the lock screen and start menu</small></div>
              <input className="setting-input" value={nameDraft} onChange={(event) => setNameDraft(event.target.value)} placeholder="Your name" aria-label="Account name" />
            </div>
            <div className="win-settings-row setting-stack">
              <div><strong>Email address</strong><small>The Gmail you are signed in with</small></div>
              <input className="setting-input setting-url" type="email" value={emailDraft} onChange={(event) => setEmailDraft(event.target.value)} placeholder="you@gmail.com" aria-label="Email address" />
            </div>
            <div className="setting-action-row"><button className="outline-button" onClick={saveProfile}>Save changes</button><span>Updates your name and email.</span></div>
          </section>
          {onAvatarChange && <section className="win-settings-card">
            <div className="setting-group"><Image size={13} /> Profile picture</div>
            <div className="profile-avatar-row settings-avatar-row">
              <span className={`profile-avatar-preview sm ${avatar ? "has-img" : ""}`}>{avatar ? <AvatarGlyph value={avatar} name={accountName ?? "?"} size={56} /> : <span className="profile-avatar-glyph">{(accountName ?? "?").slice(0, 1).toUpperCase()}</span>}</span>
              <label className="profile-avatar-upload"><Image size={14} /> Upload picture or GIF
                <input type="file" accept="image/*,.gif" onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (!file || !onAvatarChange) return;
                  void avatarFromFile(file).then(onAvatarChange);
                }} />
              </label>

            </div>
          </section>}
          <section className="win-settings-card">
            <div className="setting-group"><LockKeyhole size={13} /> {t("set.groupSecurity")}</div>
            <div className="setting-row setting-stack"><div><strong>{t("set.passwordLabel")}</strong><small>{t("set.passwordHelp")}</small></div><input className="setting-input" type="password" placeholder={t("set.passwordPlaceholder")} value={passwordDraft} onChange={(event) => { setPasswordDraft(event.target.value); setPasswordSaved(false); }} aria-label={t("set.passwordLabel")} /></div>
            <div className="setting-action-row"><button className="outline-button" onClick={() => { window.dispatchEvent(new CustomEvent("vertex-set-password", { detail: passwordDraft.trim() })); setPasswordSaved(true); setPasswordDraft(""); }}>{t("set.passwordSave")}</button><span>{passwordSaved ? t("set.passwordSaved") : (hasPassword ? t("set.passwordSet") : t("set.passwordNone"))}</span></div>
          </section>
        </>;
      case "system":
        return <>
          <h2>System</h2>
          <p className="win-settings-sub">Device details and performance options.</p>
          <section className="win-settings-card">
            <div className="setting-group"><Monitor size={13} /> System style</div>
            <p className="win-settings-note">Choose the overall look of McCrack-COS. Switching restarts the system and returns you to the sign-in screen.</p>
            <div className="win-settings-choice">
              <button className={`win-settings-choice-card ${settings.systemStyle !== "macos" ? "active" : ""}`} onClick={() => applySystemStyle("vertex")}><span className="win-settings-choice-swatch vertex" /><strong>McCrack-COS</strong><small>Default windows, dock and accent</small></button>
              <button className={`win-settings-choice-card ${settings.systemStyle === "macos" ? "active" : ""}`} onClick={() => applySystemStyle("macos")}><span className="win-settings-choice-swatch macos" /><strong>macOS 27 · Golden Gate</strong><small>Apple-style menu bar, windows and wallpaper</small></button>
            </div>
          </section>
          <section className="win-settings-card">
            <div className="win-settings-row">
              <div><strong>Device name</strong><small>Shown in Config and the sign-in flow</small></div>
              <div className="win-settings-inline">
                <input className="setting-input" value={deviceDraft} onChange={(event) => setDeviceDraft(event.target.value)} aria-label="Device name" />
                <button className="outline-button" onClick={saveDevice}>Rename</button>
              </div>
            </div>
          </section>
          <section className="win-settings-card">
            <div className="setting-group"><Palette size={13} /> Text style</div>
            <p className="win-settings-note">Change the font McCrack-COS uses everywhere. Pick the look you like best.</p>
            <div className="win-settings-fontgrid">
              {FONT_STYLES.map((font) => (
                <button key={font.id} type="button" className={`win-settings-font ${settings.fontStyle === font.id ? "active" : ""}`} onClick={() => updateSetting("fontStyle", font.id)}>
                  <span className="win-settings-font-sample" style={{ fontFamily: font.family }}>Aa</span>
                  <span className="win-settings-font-meta"><strong>{font.label}</strong><small>{font.note}</small></span>
                </button>
              ))}
            </div>
          </section>
          <section className="win-settings-card">
            <div className="setting-group"><Cpu size={13} /> {t("set.groupPerf")}</div>
            <SettingToggle label={t("set.optLabel")} help={t("set.optHelp")} value={settings.optimized} onChange={(value) => updateSetting("optimized", value)} />
            <SettingToggle label={t("set.fastBootLabel")} help={t("set.fastBootHelp")} value={settings.fastBoot} onChange={(value) => updateSetting("fastBoot", value)} />
            <SettingToggle label={t("set.idleLabel")} help={t("set.idleHelp")} value={settings.idleLock} onChange={(value) => updateSetting("idleLock", value)} />
            <SettingToggle label={t("set.confirmLabel")} help={t("set.confirmHelp")} value={settings.confirm} onChange={(value) => updateSetting("confirm", value)} />
          </section>
        </>;
      case "colors":
        return <>
          <h2>Color mode</h2>
          <p className="win-settings-sub">Choose how McCrack-COS looks. Black is the classic dark theme, Bright is a light theme.</p>
          <section className="win-settings-card">
            <div className="win-settings-choice">
              <button className={`win-settings-choice-card ${settings.colorMode === "dark" ? "active" : ""}`} onClick={() => updateSetting("colorMode", "dark")}><span className="win-settings-choice-swatch dark" /><strong>Black</strong><small>Dark surfaces, glowing accents</small></button>
              <button className={`win-settings-choice-card ${settings.colorMode === "light" ? "active" : ""}`} onClick={() => updateSetting("colorMode", "light")}><span className="win-settings-choice-swatch light" /><strong>Bright</strong><small>Light surfaces, dark text</small></button>
            </div>
          </section>
        </>;
      case "language":
        return <>
          <h2>Language &amp; region</h2>
          <p className="win-settings-sub">Pick the idiom McCrack-COS uses across windows.</p>
          <section className="win-settings-card">
            <div className="win-settings-row">
              <div><strong>{t("set.appLangLabel")}</strong><small>{t("set.appLangHelp")}</small></div>
              <select className="setting-select" value={lang} onChange={(event) => onLanguagePick(event.target.value as Lang)} aria-label={t("set.appLangLabel")}>{LANGS.map((option) => <option key={option.code} value={option.code}>{option.native}</option>)}</select>
            </div>
            {lang !== LANG && <div className="setting-action-row"><button className="outline-button" onClick={() => location.reload()}>{t("set.reload")}</button><span>{t("set.restartNote")}</span></div>}
          </section>
        </>;
      case "privacy":
        return <>
          <h2>Privacy &amp; security</h2>
          <p className="win-settings-sub">Disguise the tab, block ads, and hide everything fast.</p>
          <section className="win-settings-card">
            <div className="setting-group"><LockKeyhole size={13} /> {t("set.groupCloak")}</div>
            <div className="setting-row"><div><strong>{t("set.cloakLabel")}</strong><small>{t("set.cloakHelp")}</small></div><select className="setting-select" value={settings.cloak} onChange={(event) => updateSetting("cloak", event.target.value)} aria-label={t("set.cloakLabel")}><option value="none">{t("set.cloakNone")}</option><option value="google">{t("set.cloakGoogle")}</option><option value="classroom">{t("set.cloakClassroom")}</option><option value="custom">{t("set.cloakCustom")}</option></select></div>
            {settings.cloak === "custom" && <div className="setting-row setting-stack"><div><strong>{t("set.customNameLabel")}</strong><small>{t("set.cloakHelp")}</small></div><input className="setting-input" value={settings.cloakName} placeholder="McCrack-COS" onChange={(event) => updateSetting("cloakName", event.target.value)} aria-label={t("set.customNameLabel")} /></div>}
            {settings.cloak === "custom" && <div className="setting-row setting-stack"><div><strong>{t("set.customIconLabel")}</strong><small>{t("set.cloakHelp")}</small></div><input className="setting-input setting-url" type="text" value={settings.cloakIcon} placeholder="https://example.com/logo.png" onChange={(event) => updateSetting("cloakIcon", event.target.value)} aria-label={t("set.customIconLabel")} /></div>}
            <div className="setting-action-row"><button className="outline-button" onClick={openBlankTab}>Open in about:blank</button><span>Runs the OS in a new tab — the URL bar shows only <b>about:blank</b>. Close the original tab after.</span></div>
            {blankNotice && <p className="term-error">{blankNotice}</p>}
          </section>
          <section className="win-settings-card">
            <div className="setting-group"><EyeOff size={13} /> Tab Hiding</div>
            <SettingToggle label="Blur overlay" help="Show a fake image when this tab loses focus, then restore McCrack-COS when you come back." value={settings.tabHide} onChange={(value) => updateSetting("tabHide", value)} />
            {settings.tabHide && <>
              <div className="setting-row"><div><strong>Overlay picture</strong><small>What shows while you are away.</small></div><select className="setting-select" value={settings.tabHideImage} onChange={(event) => updateSetting("tabHideImage", event.target.value)} aria-label="Overlay picture">{settings.tabHideImages.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
              <div className="setting-action-row"><label className="outline-button" style={{ cursor: "pointer" }}><ImagePlus size={13} /> Add custom image<input type="file" accept="image/*,.gif" style={{ display: "none" }} onChange={async (event) => { const file = event.target.files?.[0]; event.target.value = ""; if (!file) return; try { const src = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(reader.error); reader.readAsDataURL(file); }); const id = `custom-${Date.now()}`; updateSetting({ tabHideImages: [...settings.tabHideImages, { id, name: file.name, src }], tabHideImage: id }); setTabHideNotice("Custom image added."); } catch { setTabHideNotice("Could not read that image."); } }} /></label><span>Use any picture or GIF as your tab-hiding screen.</span></div>
              {settings.tabHideImages.some((item) => item.id.startsWith("custom-")) && <div className="setting-row"><div><strong>Remove custom</strong><small>Delete a custom picture you added.</small></div><button className="outline-button" onClick={() => { const custom = settings.tabHideImages.filter((item) => item.id.startsWith("custom-")); if (!custom.length) return; const id = window.prompt(`Remove which custom image?\n${custom.map((item) => item.name).join("\n")}`); const match = custom.find((item) => item.name === id) ?? custom.find((item) => item.id === id); if (!match) return; const nextImages = settings.tabHideImages.filter((item) => item.id !== match.id); updateSetting(settings.tabHideImage === match.id ? { tabHideImages: nextImages, tabHideImage: nextImages[0]?.id ?? "" } : { tabHideImages: nextImages }); setTabHideNotice("Custom image removed."); }}>Remove image</button></div>}
              {tabHideNotice && <p className="term-error">{tabHideNotice}</p>}
              <div className="setting-action-row"><button className="outline-button" onClick={() => { setTabHideNotice(null); setTabHidePreview(true); window.setTimeout(() => setTabHidePreview(false), 4000); }}>Preview overlay</button><span>Shows the overlay for 4 seconds so you can see it.</span></div>
            </>}
          </section>
          <section className="win-settings-card">
            <div className="setting-group"><MonitorCog size={13} /> {t("set.groupShortcut")}</div>
            <div className="setting-row"><div><strong>{t("set.panicKeyLabel")}</strong><small>{t("set.panicKeyHelp")}</small></div><input className="setting-input" value={settings.panicKey} maxLength={1} onChange={(event) => updateSetting("panicKey", event.target.value)} aria-label={t("set.panicKeyLabel")} /></div>
            <div className="setting-row setting-stack"><div><strong>{t("set.panicSiteLabel")}</strong><small>{t("set.panicSiteHelp")}</small></div><input className="setting-input setting-url" type="url" value={settings.panicUrl} placeholder="https://classroom.google.com/" onChange={(event) => updateSetting("panicUrl", event.target.value)} aria-label={t("set.panicSiteLabel")} /></div>
            <div className="setting-action-row"><button className="outline-button" onClick={onPanic}>{t("set.testPanic")}</button><span>{t("set.opensHere")}</span></div>
          </section>
          <section className="win-settings-card">
            <div className="setting-group"><ShieldBan size={13} /> {t("set.groupAdblock")}</div>
            <SettingToggle label={t("set.adblockLabel")} help={t("set.adblockHelp")} value={settings.adblock} onChange={(value) => updateSetting("adblock", value)} />
            {settings.adblock && <div className="setting-row setting-stack"><div><strong>{t("set.adblockTargetLabel")}</strong><small>{t("set.adblockTargetHelp")}</small></div><input className="setting-input setting-url" type="url" value={settings.adblockUrl} placeholder="https://hideout-now.lovable.app/" onChange={(event) => updateSetting("adblockUrl", event.target.value)} aria-label={t("set.adblockTargetLabel")} /></div>}
          </section>
          <section className="win-settings-card">
            <div className="setting-group"><FileDown size={13} /> Offline copy</div>
            <div className="setting-action-row"><button className="outline-button" onClick={() => void downloadOfflineHtml()} disabled={offlineBusy}>{offlineBusy ? "Working…" : "Download as HTML file"}</button><span>Saves the whole OS into one HTML file you can open directly, no browser tab or internet needed.</span></div>
            {offlineNote && <p className="term-error">{offlineNote}</p>}
          </section>
        </>;
      case "about":
        return <>
          <h2>About</h2>
          <p className="win-settings-sub">McCrack-COS {VERTEX_VERSION} · {settings.deviceName}</p>
          <section className="win-settings-card">
            <div className="win-settings-row"><div><strong>Version</strong><small>McCrack-COS build</small></div><span className="win-settings-badge">v{VERTEX_VERSION}</span></div>
            <div className="win-settings-row"><div><strong>Device</strong><small>This machine</small></div><span className="win-settings-badge">{settings.deviceName}</span></div>
            <div className="win-settings-row"><div><strong>Account</strong><small>Signed in</small></div><span className="win-settings-badge">{accountName ?? "—"}</span></div>
          </section>
          <section className="win-settings-card">
            <button className="setting-row" onClick={() => setFaqOpen(faqOpen === 0 ? null : 0)}><div><strong><CircleHelp size={14} /> {t("set.faqButton")}</strong><small>{t("set.faqHelp")}</small></div><ChevronDown size={16} /></button>
            {faqOpen !== null && <div className="faq-list">{faqs.map(([question, answer], index) => <div className="faq-item" key={question}><button onClick={() => setFaqOpen(faqOpen === index ? null : index)}>{question}<ChevronDown size={15} /></button>{faqOpen === index && <div className="faq-answer">{answer}</div>}</div>)}</div>}
          </section>
        </>;
      default:
        return null;
    }
  };

  return (
    <div className="window-surface win-settings">
      <header className="win-settings-top">
        <div className="win-settings-user">
          <span className={`win-settings-avatar ${avatar ? "has-img" : ""}`}>{avatarNode}</span>
          <div><strong>{accountName ?? "Not signed in"}</strong><span>{accountEmail || "No email set"}</span></div>
        </div>
        <label className="win-settings-search">
          <Search size={15} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search settings" aria-label="Search settings" />
        </label>
      </header>
      <div className="win-settings-body">
        <nav className="win-settings-nav" aria-label="Settings sections">
          {SETTINGS_TABS.map((item) => {
            const Icon = item.icon;
            return <button key={item.id} className={tab === item.id && !query.trim() ? "active" : ""} onClick={() => { setQuery(""); setTab(item.id); }}><Icon size={17} /> {item.label}</button>;
          })}
        </nav>
        <div className="win-settings-pane">
          {query.trim() ? (
            <>
              <h2>Search</h2>
              <p className="win-settings-sub">{results.length} result{results.length === 1 ? "" : "s"} for “{query}”</p>
              {results.length ? results.map((entry, index) => (
                <button key={`${entry.tab}-${index}`} className="win-settings-result" onClick={() => { setTab(entry.tab); setQuery(""); }}>
                  <strong>{entry.label}</strong><small>{entry.hint}</small>
                </button>
              )) : <p className="win-settings-sub">No settings match your search.</p>}
            </>
          ) : renderPane()}
        </div>
      </div>
      {settings.tabHide && tabHidePreview && (() => {
        const img = settings.tabHideImages.find((item) => item.id === settings.tabHideImage) ?? settings.tabHideImages[0];
        if (!img) return null;
        if (img.src === "black" || img.src === "white") return <div className="tab-hide-overlay" style={{ background: img.src === "black" ? "#000" : "#fff" }} aria-hidden="true" />;
        return <div className="tab-hide-overlay" aria-hidden="true"><img src={img.src} alt="" /></div>;
      })()}
    </div>
  );
}

const TUNG_API = "https://kidsprepnest.org";
type TungTrack = { id?: string; title?: string; artist?: string; artwork?: string; duration?: number; src?: string };
function ttHash(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) { h ^= id.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function mapTungTracks(tracks: TungTrack[] | undefined): CinefyTrack[] {
  return (tracks ?? []).filter((t): t is TungTrack & { id: string; title: string; artist: string; artwork: string } => Boolean(t.id && t.title && t.artist && t.artwork)).map((t) => ({
    trackId: -(100000 + (ttHash(String(t.id)) % 1000000)),
    trackName: String(t.title),
    artistName: String(t.artist),
    collectionName: "Tung Tung · Full Songs",
    artworkUrl100: String(t.artwork),
    previewUrl: "",
    trackViewUrl: "",
    primaryGenreName: "Full Length",
    fullUrl: t.src ? (t.src.startsWith("http") ? t.src : `${TUNG_API}${t.src}`) : `${TUNG_API}/api/music/stream?id=${encodeURIComponent(String(t.id))}`,
  }));
}
function TrackArt({ track, size }: { track: CinefyTrack; size?: number }) {
  const style = size ? { width: size, height: size } : undefined;
  if (track.artworkUrl100 && track.artworkUrl100.startsWith("http")) {
    return <img src={track.artworkUrl100} alt="" style={style} />;
  }
  const initials = (track.trackName || "·").split(/[^a-zA-Z0-9]+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  return <span className="cinefy-art-fallback" style={{ ...style, background: track.color || "linear-gradient(135deg,#1db954,#0b84ff)" }}>{initials}</span>;
}

function EqBars({ playing, small }: { playing?: boolean; small?: boolean }) {
  return <span className={`cinefy-eq ${small ? "small" : ""} ${playing ? "on" : ""}`} aria-hidden="true">
    <span /><span /><span /><span /><span />
  </span>;
}

function CinefySurface({ onClose, onMinimize, onTrackChange }: { onClose: () => void; onMinimize: () => void; onTrackChange: (track: { name: string; artist: string; artwork: string } | null) => void }) {
  const [tab, setTab] = useState<SpicetifyTab>("home");
  const [query, setQuery] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [tracks, setTracks] = useState<CinefyTrack[]>([]);
  const [homeTracks, setHomeTracks] = useState<CinefyTrack[]>([]);
  const [selected, setSelected] = useState<CinefyTrack | null>(null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(30);
  const [volume, setVolume] = useState<number>(() => {
    const saved = storage.read<number>("cinefy-volume", 0.82);
    return Number.isFinite(saved) ? Math.min(1, Math.max(0, saved)) : 0.82;
  });
  const [muted, setMuted] = useState<boolean>(() => Boolean(storage.read("cinefy-muted", false)));
  const [favorites, setFavorites] = useState<number[]>(() => storage.read("cinefy-favorites", []));
  const [trackCache, setTrackCache] = useState<TrackCache>(() => storage.read("cinefy-track-cache", {}));
  const [searchSource, setSearchSource] = useState<"tt" | "itunes" | "archive">("tt");
  const [repeat, setRepeat] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [fullToast, setFullToast] = useState<string | null>(null);
  const fullToastTimer = useRef(0);
  const [playlists, setPlaylists] = useState<Playlist[]>(() => storage.read("cinefy-playlists", []));
  const [activePlaylistId, setActivePlaylistId] = useState<number | null>(null);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [showNewPlaylist, setShowNewPlaylist] = useState(false);
  const [notif, setNotif] = useState<{ track: CinefyTrack } | null>(null);
  const [lyrics, setLyrics] = useState<LyricLine[]>([]);
  const [lyricsSynced, setLyricsSynced] = useState(false);
  const [lyricsFull, setLyricsFull] = useState(false);
  const [lyricOffset, setLyricOffset] = useState(0);
  const lyricsListRef = useRef<HTMLDivElement | null>(null);
  const lyricLineRefs = useRef<(HTMLParagraphElement | null)[]>([]);
  const userScrollRef = useRef(false);
  const userScrollTimer = useRef(0);
  const [addMenuFor, setAddMenuFor] = useState<number | null>(null);
  const [installed, setInstalled] = useState<string[]>(() => storage.read("cinefy-market-installs", []));
  const [hazy, setHazy] = useState<HazyConfig>(() => ({ ...DEFAULT_HAZY, ...storage.read("cinefy-hazy-config", {}) }));
  const [hazyDraft, setHazyDraft] = useState<HazyConfig>(() => ({ ...DEFAULT_HAZY, ...storage.read("cinefy-hazy-config", {}) }));
  const [marketQuery, setMarketQuery] = useState("");
  const [marketCategory, setMarketCategory] = useState<MarketCategory>("themes");
  const [activeTheme, setActiveTheme] = useState<"default" | "hazy" | "starry-nights">(() => storage.read("cinefy-active-theme", "default"));
  const [splash, setSplash] = useState(true);
  const [splashPhase, setSplashPhase] = useState<"reveal" | "loading" | "done">("reveal");
  const [splashProgress, setSplashProgress] = useState(0);
  const [splashLine, setSplashLine] = useState(0);
  const splashLoadMs = useRef(900 + Math.random() * 400);
  const onTrackChangeRef = useRef(onTrackChange);
  onTrackChangeRef.current = onTrackChange;
  useEffect(() => () => { onTrackChangeRef.current(null); }, []);
  function skipSplash() { setSplash(false); }
  const starField = useMemo(() => {
    const area = typeof window !== "undefined" ? window.innerWidth * window.innerHeight : 1400 * 860;
    const count = Math.max(120, Math.min(320, Math.round(area / 4000)));
    return Array.from({ length: count }, () => ({
      left: Math.random() * 98,
      top: Math.random() * 98,
      size: Math.random() < 0.5 ? 1 : 2,
      opacity: 0.5 + Math.random() * 0.5,
      twinkle: Math.floor(Math.random() * 4) + 1,
      delay: Math.random() * 5,
    }));
  }, []);
  const audioRef = useRef<HTMLAudioElement>(null);
  const musicSessionRef = useRef<MediaSession | null>(null);
  const notifTimer = useRef<number>(0);

  const hazyActive = activeTheme === "hazy" && hazy.enabled && installed.includes("hazy-astromations");
  const starryActive = activeTheme === "starry-nights" && installed.includes("starry-nights");
  const blyActive = installed.includes("beautiful-lyrics");
  const sonicActive = installed.includes("sonic-dancing");
  const hazyFeature = MARKETPLACE_ITEMS[0];
  const installedItems = useMemo(() => MARKETPLACE_ITEMS.filter((item) => installed.includes(item.id)), [installed]);
  const marketList = useMemo(() => {
    const inCategory = MARKETPLACE_ITEMS.filter((item) => item.category === marketCategory);
    const q = marketQuery.trim().toLowerCase();
    if (!q) return inCategory;
    return inCategory.filter((item) => item.name.toLowerCase().includes(q) || item.by.toLowerCase().includes(q) || item.desc.toLowerCase().includes(q));
  }, [marketCategory, marketQuery]);

  function isThemeActive(id: string) {
    return (id === "hazy-astromations" && activeTheme === "hazy") || (id === "starry-nights" && activeTheme === "starry-nights");
  }

  function applyTheme(id: string) {
    const next = id === "starry-nights" ? "starry-nights" : "hazy";
    setActiveTheme(next);
    storage.write("cinefy-active-theme", next);
  }

  function useDefaultTheme() {
    setActiveTheme("default");
    storage.write("cinefy-active-theme", "default");
  }

  function updateHazyDraft(patch: Partial<HazyConfig>) {
    setHazyDraft((current) => ({ ...current, ...patch }));
  }

  function applyHazy() {
    setHazy(hazyDraft);
    storage.write("cinefy-hazy-config", hazyDraft);
    setActiveTheme("hazy");
    storage.write("cinefy-active-theme", "hazy");
  }

  function resetHazy() {
    const next = { ...DEFAULT_HAZY };
    setHazyDraft(next);
    setHazy(next);
    storage.write("cinefy-hazy-config", next);
  }

  function toggleInstalled(id: string) {
    if (installed.includes(id) && isThemeActive(id)) useDefaultTheme();
    setInstalled((current) => {
      const has = current.includes(id);
      const next = has ? current.filter((item) => item !== id) : [...current, id];
      storage.write("cinefy-market-installs", next);
      return next;
    });
  }

  function cacheTracks(list: CinefyTrack[]) {
    setTrackCache((prev) => {
      const next = { ...prev };
      for (const t of list) next[t.trackId] = t;
      storage.write("cinefy-track-cache", next);
      return next;
    });
  }

  async function searchTracks(term: string) {
    const cleanTerm = term.trim();
    if (!cleanTerm) return;
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ term: cleanTerm, media: "music", entity: "song", limit: "30" });
      const response = await fetch(`https://itunes.apple.com/search?${params.toString()}`);
      if (!response.ok) throw new Error("Music search unavailable");
      const data = await response.json() as { results?: Partial<CinefyTrack>[] };
      const nextTracks = (data.results ?? []).filter((track): track is CinefyTrack => Boolean(
        track.trackId && track.trackName && track.artistName && track.previewUrl && track.artworkUrl100,
      ));
      setTracks(nextTracks);
      cacheTracks(nextTracks);
      if (!nextTracks.length) setError(t("sp.noResults"));
    } catch {
      setError(t("sp.relayError"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    async function loadHome() {
      try {
        const ttRes = await fetch(`${TUNG_API}/api/music/search?q=${encodeURIComponent("top hits")}`);
        if (ttRes.ok) {
          const tt = await ttRes.json() as { tracks?: unknown };
          const list = mapTungTracks(tt.tracks as TungTrack[] | undefined);
          if (list.length) { setHomeTracks(list); cacheTracks(list); return; }
        }
      } catch { /* fall back to iTunes */ }
      try {
        const params = new URLSearchParams({ term: "top hits 2025", media: "music", entity: "song", limit: "20" });
        const response = await fetch(`https://itunes.apple.com/search?${params.toString()}`);
        const data = await response.json() as { results?: Partial<CinefyTrack>[] };
        const list = (data.results ?? []).filter((t): t is CinefyTrack => Boolean(t.trackId && t.trackName && t.artistName && t.previewUrl && t.artworkUrl100));
        setHomeTracks(list);
        cacheTracks(list);
      } catch { /* home silently fails */ }
    }
    void loadHome();
  }, []);

  function archiveIdHash(id: string): number {
    let h = 0;
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
    return h;
  }

  async function searchFull(term: string) {
    const cleanTerm = term.trim();
    if (!cleanTerm) return;
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      params.set("q", `${cleanTerm} AND mediatype:audio`);
      params.append("fl[]", "identifier");
      params.append("fl[]", "title");
      params.append("fl[]", "creator");
      params.set("rows", "4");
      params.set("output", "json");
      const response = await fetch(`https://archive.org/advancedsearch.php?${params.toString()}`);
      if (!response.ok) throw new Error("Full-length search unavailable");
      const data = await response.json() as { response?: { docs?: { identifier?: string; title?: string; creator?: string }[] } };
      const docs = (data.response?.docs ?? []).slice(0, 6).filter((d) => d.identifier && d.title);
      const out: CinefyTrack[] = [];
      for (const doc of docs) {
        try {
          const id = doc.identifier!;
          const meta = await (await fetch(`https://archive.org/metadata/${encodeURIComponent(id)}`)).json() as {
            files?: { name?: string; format?: string; length?: string | number }[];
            metadata?: { creator?: string; title?: string };
          };
          const mp3s = (meta.files ?? []).filter((f) => (f.format ?? "").toLowerCase().includes("mp3") && !/\.(mp3\.zip|tar)/i.test(f.name ?? ""));
          const song = mp3s.find((f) => Number(f.length) > 300000) || mp3s[0];
          if (!song?.name) continue;
          const imgs = (meta.files ?? []).filter((f) => /\.(jpe?g|png)$/i.test(f.name ?? "") && !/^(__ia|_)/.test(f.name ?? "") && !/(spectrogram|thumb)/i.test(f.name ?? ""));
          const img = imgs.sort((a, b) => (b.name ?? "").length - (a.name ?? "").length)[0];
          const enc = (name: string | undefined) => (name ?? "").split("/").map((p) => encodeURIComponent(p)).join("/");
          const name = song.name.replace(/\.mp3$/i, "").replace(/[_]+/g, " ").trim();
          const parts = name.split(" - ");
          const trackName = parts.length > 1 ? parts.slice(1).join(" - ") : name;
          const artistName = (parts.length > 1 ? parts[0] : meta.metadata?.creator || doc.creator) || "Open Library";
          out.push({
            trackId: archiveIdHash(id),
            trackName,
            artistName,
            collectionName: doc.title || "Full Length",
            artworkUrl100: img ? `https://archive.org/download/${enc(id)}/${enc(img.name)}` : `https://picsum.photos/seed/${id}/600/600`,
            previewUrl: "",
            trackViewUrl: `https://archive.org/details/${id}`,
            primaryGenreName: "Full Length",
            fullUrl: `https://archive.org/download/${enc(id)}/${enc(song.name)}`,
          });
        } catch { /* skip unreachable item */ }
      }
      setTracks(out);
      cacheTracks(out);
      if (!out.length) setError(t("sp.noResults"));
    } catch {
      setError(t("sp.relayError"));
    } finally {
      setLoading(false);
    }
  }

  async function searchTung(term: string) {
    const cleanTerm = term.trim();
    if (!cleanTerm) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${TUNG_API}/api/music/search?q=${encodeURIComponent(cleanTerm)}`);
      if (!response.ok) throw new Error("Music search unavailable");
      const data = await response.json() as { tracks?: unknown };
      const out = mapTungTracks(data.tracks as TungTrack[] | undefined);
      setTracks(out);
      cacheTracks(out);
      if (!out.length) setError(t("sp.noResults"));
    } catch {
      setError(t("sp.relayError"));
    } finally {
      setLoading(false);
    }
  }

  function runSearch(term: string) {
    if (searchSource === "tt") void searchTung(term);
    else if (searchSource === "archive") void searchFull(term);
    else void searchTracks(term);
  }

  function flashFull(msg: string) {
    window.clearTimeout(fullToastTimer.current);
    setFullToast(msg);
    fullToastTimer.current = window.setTimeout(() => setFullToast(null), 5200);
  }

  async function archiveMirror(artist: string, title: string): Promise<{ url: string; art?: string; name: string } | null> {
    const tToks = normTags(title).split(" ").filter(Boolean);
    const aToks = normTags(artist).split(" ").filter(Boolean);
    const queries = [`"${artist}" "${title}" AND mediatype:audio`, `"${title}" "${artist}"`, `"${title}"`];
    for (const q of queries) {
      try {
        const params = new URLSearchParams();
        params.set("q", q);
        params.append("fl[]", "identifier");
        params.append("fl[]", "title");
        params.append("fl[]", "creator");
        params.set("rows", "6");
        params.set("output", "json");
        const response = await fetch(`https://archive.org/advancedsearch.php?${params.toString()}`);
        if (!response.ok) continue;
        const data = await response.json() as { response?: { docs?: { identifier?: string; title?: string; creator?: string }[] } };
        const docs = (data.response?.docs ?? []).filter((d) => d.identifier);
        if (!docs.length) continue;
        for (const doc of docs.slice(0, 6)) {
          try {
            const id = doc.identifier!;
            const meta = await (await fetch(`https://archive.org/metadata/${encodeURIComponent(id)}`)).json() as {
              files?: { name?: string; format?: string; length?: string | number }[];
              metadata?: { title?: string; creator?: string };
            };
            const mp3s = (meta.files ?? []).filter((f) => (f.format ?? "").toLowerCase().includes("mp3") && !/\.(mp3\.zip|tar)/i.test(f.name ?? ""));
            const mp3 = mp3s.find((f) => Number(f.length) > 300000) || mp3s[0];
            if (!mp3?.name) continue;
            const normalized = normTags(`${doc.title} ${meta.metadata?.title || ""} ${mp3.name}`);
            const creatorNorm = normTags(`${doc.creator || ""} ${meta.metadata?.creator || ""}`);
            let score = 0;
            for (const t of tToks) if (normalized.includes(t)) score += 2;
            for (const a of aToks) if (normalized.includes(a) || creatorNorm.includes(a)) score += 1;
            if (score < 3) continue;
            const enc = (name: string | undefined) => (name ?? "").split("/").map((p) => encodeURIComponent(p)).join("/");
            const imgs = (meta.files ?? []).filter((f) => /\.(jpe?g|png)$/i.test(f.name ?? "") && !/^(__ia|_)/.test(f.name ?? "") && !/(spectrogram|thumb)/i.test(f.name ?? ""));
            const img = imgs.sort((a, b) => (b.name ?? "").length - (a.name ?? "").length)[0];
            const name = mp3.name.replace(/\.mp3$/i, "").replace(/[_]+/g, " ").trim();
            return { url: `https://archive.org/download/${enc(id)}/${enc(mp3.name)}`, art: img ? `https://archive.org/download/${enc(id)}/${enc(img.name)}` : undefined, name };
          } catch { /* skip item */ }
        }
      } catch { /* next query */ }
    }
    return null;
  }

  function normTags(value: string | undefined) {
    return (value || "").toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
  }

  function pickVideo(list: { videoId?: string; title?: string; author?: string; viewCount?: number }[], tToks: string[], aToks: string[]) {
    let best: { videoId: string; title: string; author?: string } | null = null;
    let bestScore = 0;
    for (const v of list) {
      if (!v?.videoId) continue;
      const tn = normTags(v.title);
      const an = normTags(v.author);
      let score = 0;
      for (const t of tToks) if (tn.includes(t)) score += 2;
      for (const a of aToks) if (tn.includes(a) || an.includes(a)) score += 1;
      if (tn.includes(normTags(`${tToks.join(" ")}`))) score += 3;
      if (/official|original|audio|mp3/i.test(tn)) score += 2;
      if (/lyric/i.test(tn)) score += 2;
      if (/cover|reaction|remix|mix|sped.?up|slowed|karaoke|instrumental|tribute|parody|just a|but it'?s/i.test(tn)) score -= 8;
      if (score > bestScore) { bestScore = score; best = { videoId: v.videoId, title: v.title || "", author: v.author }; }
    }
    return bestScore >= 2 ? best : null;
  }

  async function audioValid(url: string): Promise<boolean> {
    try {
      const res = await fetch(url);
      const ct = (res.headers.get("content-type") || "").toLowerCase();
      if (!res.ok || ct && (ct.includes("html") || ct.includes("text/"))) return false;
      const reader = res.body?.getReader();
      if (!reader) return ct.includes("audio") || ct.includes("octet");
      const first = await reader.read();
      reader.cancel().catch(() => {});
      const head = first.value || new Uint8Array(0);
      return head.length > 1 && head[0] !== 0x3c;
    } catch { return false; }
  }

  async function ytExtract(artist: string, title: string): Promise<{ url: string; art: string; name: string } | null> {
    const query = `${artist} ${title} song`;
    const tToks = normTags(title).split(" ").filter(Boolean);
    const aToks = normTags(artist).split(" ").filter(Boolean);
    const cacheKey = `cinefy-full:${(artist + "|" + title).toLowerCase()}`;
    try {
      const cachedRaw = sessionStorage.getItem(cacheKey);
      if (cachedRaw) {
        const cached = JSON.parse(cachedRaw) as { url?: string; art?: string; name?: string; t?: number };
        if (cached?.url && cached.t && Date.now() - cached.t < 20 * 60 * 1000) return cached as { url: string; art: string; name: string };
      }
      let hit: { videoId: string; title: string } | null = null;
      for (const inst of ["invidious.f5.si", "yewtu.be"]) {
        try {
          const ac = new AbortController();
          const timer = window.setTimeout(() => ac.abort(), 8000);
          const searchRes = await fetch(`https://${inst}/api/v1/search?q=${encodeURIComponent(query)}&type=video&fields=videoId,title,author,viewCount`, { signal: ac.signal });
          window.clearTimeout(timer);
          if (!searchRes.ok) continue;
          const list = await searchRes.json() as { videoId?: string; title?: string; author?: string; viewCount?: number }[];
          hit = pickVideo(list, tToks, aToks);
          if (hit) break;
        } catch { /* try next instance */ }
      }
      if (!hit) return null;
      const vid = hit.videoId;
      const songName = (hit.title || title).replace(/\s*\(official( audio| video)?( ly[^)]*)?\)\s*$/i, "").trim() || title;
      const rel = (u: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`;
      for (let attempt = 0; attempt < 1; attempt++) {
        try {
          const convertRes = await fetch(rel(`https://loader.to/ajax/download.php?format=mp3&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${vid}`)}`));
          const conv = (await convertRes.json()) as { id?: string };
          if (!conv?.id) continue;
          let dl: string | undefined;
          for (let i = 0; i < 12; i++) {
            await new Promise((r) => setTimeout(r, 1500));
            const progRes = await fetch(rel(`https://loader.to/ajax/progress.php?id=${encodeURIComponent(conv.id)}`));
            const prog = (await progRes.json()) as { success?: number; download_url?: string; progress?: number };
            if (prog?.download_url) { dl = prog.download_url; break; }
            if (prog?.success === 0 && (prog.progress ?? 0) >= 120) break;
          }
          if (!dl) continue;
          const url = rel(dl);
          if (await audioValid(url)) {
            const full: { url: string; art: string; name: string } = { url, art: `https://i.ytimg.com/vi/${vid}/maxresdefault.jpg`, name: songName };
            try { sessionStorage.setItem(cacheKey, JSON.stringify({ ...full, t: Date.now() })); } catch { /* storage full */ }
            return full;
          }
        } catch { /* one bad token; retry fresh */ }
      }
    } catch { /* youtube extractor down */ }
    return null;
  }

  async function resolveFull(track: CinefyTrack) {
    if (!track || track.fullUrl) return;
    const artist = (track.artistName ?? "").trim();
    const title = (track.trackName ?? "").trim();
    if (!artist || !title) return;
    let fullUrl: string | undefined;
    let art: string | undefined;
    let found: string | undefined;
    try {
      const apiRes = await fetch(`/api/song?artist=${encodeURIComponent(artist)}&title=${encodeURIComponent(title)}`, { headers: { Accept: "application/json" } });
      if (apiRes.ok) {
        const json = await apiRes.json() as { url?: string; art?: string };
        if (json.url) { fullUrl = json.url; art = json.art; found = "server"; }
      }
    } catch { /* server API not deployed yet */ }
    if (!fullUrl) {
      const mirror = await archiveMirror(artist, title);
      if (mirror?.url) { fullUrl = mirror.url; art = mirror.art; found = mirror.name || "open library"; }
    }
    if (!fullUrl) {
      const yt = await ytExtract(artist, title);
      if (yt?.url) { fullUrl = yt.url; art = yt.art; found = `YouTube · ${yt.name}`; }
    }
    if (fullUrl) {
      const patched: CinefyTrack = { ...track, fullUrl, artworkUrl100: art || track.artworkUrl100 || "", primaryGenreName: "Full Length" };
      cacheTracks([patched]);
      setSelected((prev) => (prev && prev.trackId === track.trackId ? { ...prev, fullUrl, artworkUrl100: art || prev.artworkUrl100 || "", primaryGenreName: "Full Length" } : prev));
      const a = audioRef.current;
      if (a && a.dataset.trackId === String(track.trackId)) {
        a.dataset.trackId = "";
        a.src = fullUrl;
        a.currentTime = 0;
        setProgress(0);
        setDuration(0);
        a.load();
        setPlaying(true);
        void a.play().catch(() => setPlaying(false));
      }
      flashFull(found ? `Full version unlocked — ${found}` : "Full version unlocked");
    } else {
      flashFull("No full version found right now — playing the 30s preview");
    }
  }

  useEffect(() => {
    if (addMenuFor === null) return;
    const handler = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest("[data-add-menu]") || target.closest("[data-add-toggle]")) return;
      setAddMenuFor(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [addMenuFor]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = muted ? 0 : volume;
    if (selected && audio.dataset.trackId !== String(selected.trackId)) {
      audio.dataset.trackId = String(selected.trackId);
      audio.src = selected.fullUrl || selected.previewUrl || "";
      audio.currentTime = 0;
      setProgress(0);
      setDuration(0);
      audio.load();
    }
    if (playing) {
      void audio.play().catch(() => {
        if (audio.paused) setPlaying(false);
      });
    } else {
      audio.pause();
    }
  }, [selected, playing, volume, muted]);

  useEffect(() => { storage.write("cinefy-volume", volume); }, [volume]);
  useEffect(() => { storage.write("cinefy-muted", muted); }, [muted]);

  useEffect(() => {
    if (!selected) { setLyrics([]); setLyricsFull(false); return; }
    let cancelled = false;
    const artist = selected.artistName;
    const title = selected.trackName;
    async function loadLyrics() {
      try {
        const response = await fetch(`https://lrclib.net/api/get?artist_name=${encodeURIComponent(artist)}&track_name=${encodeURIComponent(title)}`);
        if (response.ok) {
          const data = await response.json() as { syncedLyrics?: string };
          if (data.syncedLyrics) {
            const parsed = parseLrc(data.syncedLyrics);
            if (parsed.length && !cancelled) { setLyrics(parsed); setLyricsSynced(true); return; }
          }
        }
      } catch { /* fall through to plain lyrics */ }
      try {
        const response = await fetch(`https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`);
        if (!response.ok) throw new Error("Lyrics unavailable");
        const data = await response.json() as { lyrics?: string };
        const lines = (data.lyrics ?? "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
        if (!cancelled) { setLyrics(estimateLyricTimes(lines.length ? lines : previewLyrics(artist, title), 30)); setLyricsSynced(false); }
      } catch {
        if (!cancelled) { setLyrics(estimateLyricTimes(previewLyrics(artist, title), 30)); setLyricsSynced(false); }
      }
    }
    void loadLyrics();
    return () => { cancelled = true; };
  }, [selected]);

  useEffect(() => {
    if (!selected) return;
    const saved = Number(window.localStorage.getItem(`vine-lyric-offset:${selected.trackId}`) ?? 0);
    setLyricOffset(Number.isFinite(saved) ? saved : 0);
  }, [selected]);

  useEffect(() => {
    if (!selected) return;
    window.localStorage.setItem(`vine-lyric-offset:${selected.trackId}`, String(lyricOffset));
  }, [lyricOffset, selected]);

  const lyricIndex = useMemo(() => {
    if (!lyrics.length) return -1;
    let index = 0;
    for (let i = 0; i < lyrics.length; i++) {
      if (lyrics[i].time - lyricOffset <= progress) index = i;
    }
    return index;
  }, [progress, lyrics, lyricOffset]);

  const lineProgress = useMemo(() => {
    if (lyricIndex < 0 || lyricIndex >= lyrics.length) return 0;
    const start = lyrics[lyricIndex].time - lyricOffset;
    const end = lyricIndex + 1 < lyrics.length ? lyrics[lyricIndex + 1].time - lyricOffset : (duration > 0 ? duration : start + 8);
    const span = Math.max(0.5, end - start);
    return Math.max(0, Math.min(1, (progress - start) / span));
  }, [progress, lyricIndex, lyrics, duration, lyricOffset]);

  useEffect(() => {
    if (lyricsFull) return;
    if (userScrollRef.current) return;
    const el = lyricLineRefs.current[lyricIndex];
    if (el && lyricsListRef.current) lyricsListRef.current.scrollTo({ top: Math.max(0, el.offsetTop - 140), behavior: "smooth" });
  }, [lyricIndex, lyricsFull]);

  function markUserScroll() {
    userScrollRef.current = true;
    window.clearTimeout(userScrollTimer.current);
    userScrollTimer.current = window.setTimeout(() => { userScrollRef.current = false; }, 2500);
  }

  useEffect(() => () => window.clearTimeout(userScrollTimer.current), []);

  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    const tick = () => {
      const audio = audioRef.current;
      if (audio && !audio.paused) setProgress(audio.currentTime);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing]);

  const musicSelRef = useRef(selected);
  const musicPlayRef = useRef(playing);
  musicSelRef.current = selected;
  musicPlayRef.current = playing;
  const musicVolumeRef = useRef(volume);
  const musicMutedRef = useRef(muted);
  musicVolumeRef.current = volume;
  musicMutedRef.current = muted;
  const stepTrackRef = useRef(stepTrack);
  stepTrackRef.current = stepTrack;

  useEffect(() => {
    if (!selected) {
      if (musicSessionRef.current) {
        if (getMediaSession() === musicSessionRef.current) setMediaSession(null);
        musicSessionRef.current = null;
      }
      return;
    }
    if (!musicSessionRef.current) {
      const session: MediaSession = {
        source: "music",
        get title() { return musicSelRef.current?.trackName ?? ""; },
        get artist() { return musicSelRef.current?.artistName ?? ""; },
        get artwork() { return musicSelRef.current?.artworkUrl100 || ""; },
        get playing() { return musicPlayRef.current; },
        get progress() { return audioRef.current?.currentTime ?? 0; },
        get duration() { return audioRef.current?.duration ?? 0; },
        get volume() { return musicVolumeRef.current; },
        get muted() { return musicMutedRef.current; },
        onToggle: () => setPlaying((prev) => !prev),
        onSeek: (time: number) => {
          const audio = audioRef.current;
          if (audio) { audio.currentTime = time; setProgress(time); }
        },
        onNext: () => stepTrackRef.current(1),
        onPrev: () => stepTrackRef.current(-1),
        onSetVolume: (v: number) => setVolume(Math.min(1, Math.max(0, v))),
        onToggleMute: () => setMuted((m) => !m),
        onClose: () => { setPlaying(false); setSelected(null); onTrackChange(null); },
      };
      musicSessionRef.current = session;
      setMediaSession(session);
    } else {
      notifyMediaSession();
    }
  }, [selected, playing, volume, muted]);

  useEffect(() => () => {
    const session = musicSessionRef.current;
    if (session && getMediaSession() === session) setMediaSession(null);
    musicSessionRef.current = null;
  }, []);

  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    const ms = navigator.mediaSession;
    if (!selected) { try { ms.metadata = null; ms.playbackState = "none"; } catch { /* noop */ } return; }
    try {
      ms.metadata = new MediaMetadata({
        title: selected.trackName,
        artist: selected.artistName,
        album: selected.primaryGenreName || "Spicetify",
        artwork: selected.artworkUrl100 ? [{ src: selected.artworkUrl100 }] : [],
      });
    } catch { /* noop */ }
    const handlers: Array<[MediaSessionAction, MediaSessionActionHandler]> = [
      ["play", () => setPlaying(true)],
      ["pause", () => setPlaying(false)],
      ["previoustrack", () => stepTrackRef.current(-1)],
      ["nexttrack", () => stepTrackRef.current(1)],
      ["seekto", (details) => {
        const audio = audioRef.current;
        if (audio && typeof details.seekTime === "number") { audio.currentTime = details.seekTime; setProgress(details.seekTime); }
      }],
    ];
    for (const [action, handler] of handlers) { try { ms.setActionHandler(action, handler); } catch { /* unsupported action */ } }
    return () => { for (const [action] of handlers) { try { ms.setActionHandler(action, null); } catch { /* noop */ } } };
  }, [selected]);

  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    try { navigator.mediaSession.playbackState = playing ? "playing" : "paused"; } catch { /* noop */ }
  }, [playing]);

  function previewLyrics(artist: string, title: string): string[] {
    const words = title.replace(/[^a-zA-Z0-9 ]/g, "").trim().split(/\s+/).filter(Boolean).slice(0, 4).join(" ");
    const theme = words || "this one";
    return [
      "I remember how it starts,",
      "soft and slow, right from the top.",
      `We carry "${theme}" in our hearts,`,
      "turn it up and let it drop.",
      "",
      "Ooh, we don't need to overthink it,",
      "let the rhythm pull you through.",
      `Sing it loud, the way you think it,`,
      "every note belongs to you.",
      "",
      `${theme} — one more time,`,
      "seconds left before the end,",
      "then we'll press it and rewind,",
      "hear it play all over again.",
    ];
  }

  useEffect(() => {
    if (!splash) return;
    if (splashPhase === "reveal") {
      const reveal = window.setTimeout(() => setSplashPhase("loading"), 550);
      return () => window.clearTimeout(reveal);
    }
    if (splashPhase === "loading") {
      const lineTimer = window.setInterval(() => setSplashLine((l) => (l + 1) % SPLASH_LINES.length), 850);
      const bar = window.setInterval(() => setSplashProgress((p) => {
        const next = p + (50 / splashLoadMs.current) * 100;
        if (next >= 100) { window.clearInterval(bar); window.clearInterval(lineTimer); return 100; }
        return next;
      }), 50);
      return () => { window.clearInterval(bar); window.clearInterval(lineTimer); };
    }
    if (splashPhase === "done") {
      const done = window.setTimeout(() => setSplash(false), 380);
      return () => window.clearTimeout(done);
    }
    return undefined;
  }, [splash, splashPhase]);

  useEffect(() => {
    if (splash && splashPhase === "loading" && splashProgress >= 100) setSplashPhase("done");
  }, [splash, splashPhase, splashProgress]);

  useEffect(() => {
    if (!splash) return;
    const failsafe = window.setTimeout(() => { setSplashProgress(100); setSplashPhase("done"); }, 2600);
    return () => window.clearTimeout(failsafe);
  }, [splash]);

  function showNotification(track: CinefyTrack) {
    window.clearTimeout(notifTimer.current);
    setNotif({ track });
    notifTimer.current = window.setTimeout(() => setNotif(null), 5000);
  }

  function selectTrack(track: CinefyTrack) {
    if (selected?.trackId === track.trackId) {
      setPlaying(true);
      const audio = audioRef.current;
      if (audio) {
        audio.dataset.trackId = "";
        audio.currentTime = 0;
        setProgress(0);
        void audio.play().catch(() => setPlaying(false));
      }
      setTab("nowplaying");
      return;
    }
    setSelected(track);
    setPlaying(true);
    setTab("nowplaying");
    onTrackChange({ name: track.trackName, artist: track.artistName, artwork: track.artworkUrl100 });
    showNotification(track);
    if (!track.fullUrl) void resolveFull(track);
  }

  function stepTrack(direction: 1 | -1) {
    let list: CinefyTrack[] = [];
    if (tab === "liked") list = getLikedTracks();
    else if (tab === "playlist") list = getPlaylistTracks();
    else if (tab === "home") list = selected?.fullUrl ? FULL_LIBRARY : (tracks.length ? tracks : homeTracks);
    else list = tracks.length ? tracks : homeTracks;
    if (!list.length || !selected) return;
    if (shuffle && list.length > 1) {
      const idx = list.findIndex((t) => t.trackId === selected.trackId);
      let next = Math.floor(Math.random() * list.length);
      if (next === idx) next = (next + 1) % list.length;
      selectTrack(list[next]);
      return;
    }
    const idx = list.findIndex((t) => t.trackId === selected.trackId);
    const next = (idx + direction + list.length) % list.length;
    selectTrack(list[next]);
  }

  function handleEnded() {
    const audio = audioRef.current;
    if (repeat) {
      if (audio) {
        audio.currentTime = 0;
        setProgress(0);
        void audio.play().catch(() => setPlaying(false));
      }
      return;
    }
    stepTrack(1);
  }

  function toggleFavorite(track: CinefyTrack) {
    setFavorites((current) => {
      const next = current.includes(track.trackId) ? current.filter((id) => id !== track.trackId) : [...current, track.trackId];
      storage.write("cinefy-favorites", next);
      return next;
    });
  }

  function getLikedTracks(): CinefyTrack[] {
    return favorites.map((id) => trackCache[id]).filter((t): t is CinefyTrack => Boolean(t));
  }

  function getPlaylistTracks(): CinefyTrack[] {
    const pl = playlists.find((p) => p.id === activePlaylistId);
    if (!pl) return [];
    return pl.trackIds.map((id) => trackCache[id]).filter((t): t is CinefyTrack => Boolean(t));
  }

  function addToPlaylist(playlistId: number, track: CinefyTrack) {
    setPlaylists((current) => {
      const next = current.map((p) => p.id === playlistId && !p.trackIds.includes(track.trackId) ? { ...p, trackIds: [...p.trackIds, track.trackId] } : p);
      storage.write("cinefy-playlists", next);
      return next;
    });
  }

  function removeFromPlaylist(playlistId: number, trackId: number) {
    setPlaylists((current) => {
      const next = current.map((p) => p.id === playlistId ? { ...p, trackIds: p.trackIds.filter((id) => id !== trackId) } : p);
      storage.write("cinefy-playlists", next);
      return next;
    });
  }

  function createPlaylist() {
    if (!newPlaylistName.trim()) return;
    const id = Date.now();
    const next = [...playlists, { id, name: newPlaylistName.trim(), trackIds: [] }];
    setPlaylists(next);
    storage.write("cinefy-playlists", next);
    setNewPlaylistName("");
    setShowNewPlaylist(false);
    setActivePlaylistId(id);
    setTab("playlist");
  }

  function deletePlaylist(id: number) {
    const next = playlists.filter((p) => p.id !== id);
    setPlaylists(next);
    storage.write("cinefy-playlists", next);
    if (activePlaylistId === id) { setActivePlaylistId(null); setTab("home"); }
  }

  function formatSeconds(value: number) {
    const total = Math.max(0, Math.floor(value));
    if (!Number.isFinite(total)) return "0:00";
    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
  }

  function TrackRow({ track, index, showRemove }: { track: CinefyTrack; index: number; showRemove?: { playlistId: number } }) {
    const isActive = selected?.trackId === track.trackId;
    return <div className={`cinefy-track ${isActive ? "active" : ""}`}>
      <button className="cinefy-track-main" onClick={() => selectTrack(track)}><TrackArt track={track} size={40} /><span className="cinefy-track-index">{isActive && playing ? <EqBars playing /> : String(index + 1).padStart(2, "0")}</span><span className="cinefy-track-copy"><span className="cinefy-track-titleline"><strong>{track.trackName}</strong><span className={`cinefy-tag ${track.fullUrl ? "full" : "preview"}`}>{track.fullUrl ? "FULL" : "30s"}</span></span><small>{track.artistName}</small></span></button>
      <span className="cinefy-genre">{track.primaryGenreName || ""}</span>
      <span className="cinefy-track-actions">
        {showRemove ? <button className="cinefy-favorite" onClick={() => removeFromPlaylist(showRemove!.playlistId, track.trackId)} aria-label={t("sp.removeFromPlaylist")}>✕</button> : <>
          <button className={`cinefy-favorite ${favorites.includes(track.trackId) ? "saved" : ""}`} onClick={() => toggleFavorite(track)} aria-label={favorites.includes(track.trackId) ? t("sp.removeFavorite") : t("sp.saveFavorite")}>{favorites.includes(track.trackId) ? "♥" : "♡"}</button>
          <span className="cinefy-add-wrap">
            <button className={`cinefy-add-playlist ${addMenuFor === track.trackId ? "open" : ""}`} data-add-toggle onClick={(e) => { e.stopPropagation(); setAddMenuFor(addMenuFor === track.trackId ? null : track.trackId); }} aria-label={t("sp.addToPlaylist")}>+</button>
            {addMenuFor === track.trackId && <div className="cinefy-add-menu" data-add-menu onClick={(e) => e.stopPropagation()}>
              <div className="cinefy-add-menu-title">{t("sp.addToPlaylist")}</div>
              {playlists.length === 0 && <div className="cinefy-add-empty">{t("sp.noPlaylists")}</div>}
              {playlists.map((pl) => <button key={pl.id} className="cinefy-add-menu-item" onClick={() => { addToPlaylist(pl.id, track); setAddMenuFor(null); }}>♫ <span>{pl.name}</span></button>)}
            </div>}
          </span>
        </>}
      </span>
    </div>;
  }

  function TrackList({ list, showRemove }: { list: CinefyTrack[]; showRemove?: { playlistId: number } }) {
    return <div className="cinefy-track-list">{list.map((track, i) => <TrackRow key={track.trackId} track={track} index={i + 1} showRemove={showRemove} />)}</div>;
  }

  return <div className={`cinefy-surface cinefy-app ${hazyActive ? "hazy-app" : ""} ${starryActive ? "starry-night" : ""}`}>
    {splash && <div className={`cinefy-splash ${splashPhase}`} data-testid="cinefy-splash" aria-label="Spicetify loading" onClick={skipSplash}>
      <img className="cinefy-splash-logo" src={asset("images/spicetify-splash.png")} alt="Spicetify" />
      <div className="cinefy-splash-load">
        <div className="cinefy-splash-bar"><span style={{ width: `${splashProgress}%` }} /></div>
        <div className="cinefy-splash-line" key={splashLine}>{SPLASH_LINES[splashLine % SPLASH_LINES.length]}</div>
      </div>
      <button type="button" className="cinefy-splash-skip" onClick={(e) => { e.stopPropagation(); skipSplash(); }}>Skip intro →</button>
    </div>}
    <audio ref={audioRef} onTimeUpdate={(event) => setProgress(event.currentTarget.currentTime)} onLoadedMetadata={(event) => setDuration(event.currentTarget.duration || (selected?.fullUrl ? 0 : 30))} onEnded={handleEnded} onError={() => {
    const a = audioRef.current;
    if (a && selected && selected.fullUrl && (a.src || "").includes(selected.fullUrl)) {
      const stale = selected;
      try { sessionStorage.removeItem(`cinefy-full:${(stale.artistName + "|" + stale.trackName).toLowerCase()}`); } catch { /* ignore */ }
      a.dataset.trackId = "";
      setSelected((prev) => (prev && prev.fullUrl ? { ...prev, fullUrl: undefined } : prev));
      flashFull("Full stream hiccuped — retrying…");
      window.setTimeout(() => { void resolveFull({ ...stale, fullUrl: undefined }); }, 500);
    }
  }} />
    {hazyActive && <HazyLayer config={hazy} />}
    {starryActive && <div className="cinefy-theme-starry" data-testid="starry-layer" aria-hidden="true">
      {starField.map((s, i) => <span key={i} className={`starry-star twinkle${s.twinkle}`} style={{ left: `${s.left}%`, top: `${s.top}%`, width: s.size, height: s.size, opacity: s.opacity, animationDelay: `${s.delay}s` }} />)}
      <div className="starry-shoot">
        <span className="shootingstar" />
        <span className="shootingstar" />
        <span className="shootingstar" />
        <span className="shootingstar" />
        <span className="shootingstar" />
        <span className="shootingstar" />
        <span className="shootingstar" />
        <span className="shootingstar" />
        <span className="shootingstar" />
        <span className="shootingstar" />
      </div>
    </div>}

    <div className="cinefy-body">
      <nav className="cinefy-sidebar">
        <div className="cinefy-sidebar-brand"><img className="cinefy-logo" src={asset("images/spicetify.ico")} alt="" /><span>Spicetify</span></div>
        <button className={`cinefy-nav ${tab === "home" ? "active" : ""}`} onClick={() => setTab("home")}><LayoutGrid size={18} /> {t("sp.home")}</button>
        <button className={`cinefy-nav ${tab === "search" ? "active" : ""}`} onClick={() => setTab("search")}><Compass size={18} /> {t("sp.search")}</button>
        <button className={`cinefy-nav ${tab === "marketplace" ? "active" : ""}`} onClick={() => setTab("marketplace")} data-testid="button-market-nav"><img className="cinefy-nav-logo" src={asset("images/marketplace-logo.svg")} alt="" /> {t("sp.marketplace")}</button>
        {installed.includes("hazy-astromations") && <button className={`cinefy-nav ${tab === "hazy" ? "active" : ""}`} onClick={() => setTab("hazy")}><Settings2 size={18} /> {t("sp.hazySettings")}</button>}
        <div className="cinefy-lib-header"><span>{t("sp.yourLibrary")}</span><button className="cinefy-lib-add" onClick={() => setShowNewPlaylist(!showNewPlaylist)} aria-label={t("sp.createPlaylistAria")}>+</button></div>
        {showNewPlaylist && <div className="cinefy-new-playlist">
          <input value={newPlaylistName} onChange={(e) => setNewPlaylistName(e.target.value)} placeholder={t("sp.playlistName")} onKeyDown={(e) => { if (e.key === "Enter") createPlaylist(); }} />
          <button className="cinefy-pl-create" onClick={createPlaylist}>{t("sp.create")}</button>
        </div>}
        <button className={`cinefy-nav cinefy-lib-item ${tab === "liked" ? "active" : ""}`} onClick={() => setTab("liked")}><div className="cinefy-lib-icon liked-icon">♥</div><div><strong>{t("sp.likedSongs")}</strong><small>{tp("sp.songsCount", favorites.length)}</small></div></button>
        {playlists.map((pl) => <button key={pl.id} className={`cinefy-nav cinefy-lib-item ${tab === "playlist" && activePlaylistId === pl.id ? "active" : ""}`} onClick={() => { setActivePlaylistId(pl.id); setTab("playlist"); }}><div className="cinefy-lib-icon">♫</div><div><strong>{pl.name}</strong><small>{tp("sp.songsCount", pl.trackIds.length)}</small></div></button>)}
      </nav>

      <main className="cinefy-main">
        <header className="cinefy-header">
          <div className="cinefy-header-left">
            {tab !== "home" && <button className="cinefy-back" onClick={() => setTab("home")}>←</button>}
            {tab === "search" && <form className="cinefy-search cinefy-search-bar" onSubmit={(e) => { e.preventDefault(); void runSearch(searchQuery); }}>
              <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder={t("sp.searchPlaceholder")} aria-label="Search music" autoFocus />
            </form>}
            {tab === "marketplace" && <form className="cinefy-search cinefy-search-bar" onSubmit={(e) => e.preventDefault()}>
              <input value={marketQuery} onChange={(e) => setMarketQuery(e.target.value)} placeholder={t("sp.marketSearch")} aria-label="Search marketplace" autoFocus />
            </form>}
            {tab === "home" && <h2 className="cinefy-page-title">{t("sp.goodEvening")}</h2>}
            {tab === "liked" && <h2 className="cinefy-page-title">♥ {t("sp.likedSongs")}</h2>}
            {tab === "playlist" && <h2 className="cinefy-page-title">{playlists.find((p) => p.id === activePlaylistId)?.name || t("sp.playlist")}</h2>}
            {tab === "marketplace" && <h2 className="cinefy-page-title"><img className="cinefy-nav-logo cinefy-page-logo" src={asset("images/marketplace-logo.svg")} alt="" />{t("sp.marketplace")}</h2>}
            {tab === "hazy" && <h2 className="cinefy-page-title"><Sparkles size={20} className="cinefy-hazy-title-icon" /> {t("sp.hazySettings")}</h2>}
            {tab === "nowplaying" && <h2 className="cinefy-page-title"><Music2 size={20} /> {t("sp.nowPlaying")}</h2>}
          </div>
        </header>

        <div className="cinefy-content">
          {tab === "home" && <section>
            <div className="cinefy-hero">
              <div className="cinefy-hero-copy">
                <span className="cinefy-hero-kicker"><EqBars playing={Boolean(playing && selected?.fullUrl)} small /> FULL LENGTH · UNLIMITED</span>
                <h2>{t("sp.goodEvening")}</h2>
                <p>No 30-second cuts. Every track in the Full Length library plays start to finish — songs, not samples.</p>
              </div>
              <button className="cinefy-hero-play" onClick={() => { const first = selected?.fullUrl ? selected : FULL_LIBRARY[0]; selectTrack(first); }} aria-label="Play full length library"><Play size={26} fill="currentColor" /></button>
            </div>

            <div className="cinefy-section-heading"><h3>Full Length Library</h3><span>{tp("sp.songsCount", FULL_LIBRARY.length)}</span></div>
            <div className="cinefy-shelf">
              {FULL_LIBRARY.map((track) => {
                const isActive = selected?.trackId === track.trackId;
                return <button key={track.trackId} className={`cinefy-shelf-card ${isActive ? "on" : ""}`} onClick={() => selectTrack(track)}>
                  <span className="cinefy-shelf-art"><TrackArt track={track} /><span className="cinefy-shelf-play">{playing && isActive ? <EqBars playing /> : <Play size={20} fill="currentColor" />}</span><span className="cinefy-tag full">FULL</span></span>
                  <strong>{track.trackName}</strong>
                  <small>{track.artistName}</small>
                </button>;
              })}
            </div>

            <div className="cinefy-section-heading"><h3>{t("sp.topHits")}</h3></div>
            {homeTracks.length ? <TrackList list={homeTracks} /> : <div className="cinefy-empty">{t("sp.loading")}</div>}
          </section>}

          {tab === "search" && <section>
            {!searchQuery && <div className="cinefy-search-categories">
              {["Lo-fi", "Hip Hop", "Pop", "Rock", "R&B", "Jazz", "Classical", "Electronic", "Anime", "K-Pop"].map((genre) => <button key={genre} className="cinefy-genre-card" onClick={() => { setSearchQuery(genre); runSearch(genre); }}>{genre}</button>)}
            </div>}
            {searchQuery && <>
              <div className="cinefy-section-heading"><h3>{tf("sp.results", { q: searchQuery })}</h3><span>{tp("sp.songsCount", tracks.length)}</span></div>
              {error && <div className="cinefy-empty">{error}</div>}
              {loading && <div className="cinefy-empty">{t("sp.searching")}</div>}
              {!loading && !error && tracks.length > 0 && <TrackList list={tracks} />}
            </>}
          </section>}

          {tab === "liked" && <section>
            {favorites.length === 0 && <div className="cinefy-empty">{t("sp.likedEmpty")}</div>}
            {favorites.length > 0 && <TrackList list={getLikedTracks()} />}
          </section>}

          {tab === "playlist" && activePlaylistId && <section>
            {(() => { const pl = playlists.find((p) => p.id === activePlaylistId); if (!pl) return null; const plTracks = getPlaylistTracks(); return <>
              <div className="cinefy-playlist-hero">
                <button className="cinefy-play-all" onClick={() => { if (plTracks.length) selectTrack(plTracks[0]); }} aria-label={tf("sp.playAria", { name: pl.name })}><Play size={22} fill="currentColor" /></button>
                <div className="cinefy-playlist-hero-info">
                  <h3>{pl.name}</h3>
                  <span>{tp("sp.songsCount", plTracks.length)}</span>
                  <div className="cinefy-playlist-hero-actions"><button className="cinefy-delete-pl" onClick={() => deletePlaylist(pl.id)}>{t("sp.deletePlaylist")}</button></div>
                </div>
              </div>
              {plTracks.length === 0 && <div className="cinefy-empty">{t("sp.playlistEmpty")}</div>}
              {plTracks.length > 0 && <TrackList list={plTracks} showRemove={{ playlistId: pl.id }} />}
            </>; })()}
          </section>}

          {tab === "marketplace" && <section className="cinefy-market">
            <div className="cinefy-market-installed">
              <div className="cinefy-section-heading"><h3>{t("sp.installed")}</h3><span>{tp("sp.installedCount", installedItems.length)}</span></div>
              {installedItems.length === 0
                ? <div className="cinefy-market-empty">{t("sp.nothingInstalled")}</div>
                : <div className="cinefy-market-strip">{installedItems.map((item) => <div className="cinefy-market-chip" key={item.id}>
                    <span className="cinefy-market-tile" style={{ background: item.color }}>{item.art ? <img className="cinefy-market-tile-art" src={asset(item.art)} alt={item.name} loading="lazy" /> : item.glyph === "theme" ? <Palette size={15} /> : item.glyph === "extension" ? <Puzzle size={15} /> : item.glyph === "snippet" ? <Code2 size={15} /> : <Rocket size={15} />}</span>
                    <span className="cinefy-market-chip-name">{item.name}</span>
                    {item.id === "hazy-astromations" && <button className="cinefy-chip-open" onClick={() => setTab("hazy")} aria-label={t("sp.hazySettings")}>{t("sp.open")}</button>}
                    <button className="cinefy-chip-remove" onClick={() => toggleInstalled(item.id)} aria-label={tf("sp.uninstallAria", { name: item.name })}>✕</button>
                  </div>)}</div>}
            </div>

            <div className="cinefy-market-featured">
              <span className="cinefy-market-featured-tile" style={{ background: hazyFeature.color }}>{hazyFeature.art ? <img className="cinefy-market-tile-art" src={asset(hazyFeature.art)} alt={hazyFeature.name} loading="lazy" /> : <Sparkles size={30} />}</span>
              <div className="cinefy-market-featured-info">
                <span className="cinefy-market-featured-kicker">{t("sp.featuredTheme")}</span>
                <h3>{hazyFeature.name}</h3>
                <p>{hazyFeature.desc}</p>
                <span className="cinefy-market-meta">{tf("sp.byLine", { by: hazyFeature.by, version: hazyFeature.version })}</span>
              </div>
              <button className={`cinefy-market-cta ${isThemeActive(hazyFeature.id) ? "active-theme" : installed.includes(hazyFeature.id) ? "installed" : ""}`} onClick={() => toggleInstalled(hazyFeature.id)} data-testid="button-install-hazy">{installed.includes(hazyFeature.id) ? <><Check size={15} /> {isThemeActive(hazyFeature.id) ? t("sp.active") : t("sp.installedState")}</> : <><Download size={15} /> {t("sp.install")}</>}</button>
            </div>

            <div className="cinefy-market-cats">{(["extensions", "themes", "snippets"] as MarketCategory[]).map((cat) => <button key={cat} className={`cinefy-market-cat ${marketCategory === cat ? "active" : ""}`} onClick={() => setMarketCategory(cat)} data-testid={`button-market-cat-${cat}`}>{t(`market.cat.${cat}`)}</button>)}</div>

            {marketList.length === 0 && <div className="cinefy-empty">{tf("sp.noMatch", { category: marketCategory })}</div>}
            <div className="cinefy-market-grid">{marketList.map((item) => {
              const isHazy = item.id === "hazy-astromations";
              const isInstalled = installed.includes(item.id);
              return <div className="cinefy-market-card" key={item.id}>
                <span className="cinefy-market-tile cinefy-market-tile-card" style={{ background: item.color }}>{item.art ? <img className="cinefy-market-tile-art" src={asset(item.art)} alt={item.name} loading="lazy" /> : isHazy ? <Sparkles size={20} /> : item.glyph === "theme" ? <Palette size={20} /> : item.glyph === "extension" ? <Puzzle size={20} /> : item.glyph === "snippet" ? <Code2 size={20} /> : <Rocket size={20} />}</span>
                <div className="cinefy-market-card-main">
                  <strong>{item.name}</strong>
                  <span className="cinefy-market-meta">{tf("sp.byLine", { by: item.by, version: item.version })}</span>
                  <p>{item.desc}</p>
                </div>
                <div className="cinefy-market-card-actions">
                  {isInstalled && isHazy && <button className="cinefy-chip-open" onClick={() => setTab("hazy")}>{t("sp.hazySettings")}</button>}
                  {isInstalled && (isHazy || item.id === "starry-nights") && (isThemeActive(item.id)
                    ? <span className="cinefy-theme-active">{t("sp.active")}</span>
                    : <button className="cinefy-theme-apply" onClick={() => applyTheme(item.id)} data-testid={`button-apply-${item.id}`}>{t("sp.apply")}</button>)}
                  <button className={`cinefy-market-install ${isInstalled ? "installed" : ""}`} onClick={() => toggleInstalled(item.id)} data-testid={`button-market-item-${item.id}`}>{isInstalled ? t("sp.uninstall") : t("sp.install")}</button>
                </div>
              </div>;
            })}</div>
          </section>}

          {tab === "hazy" && <section>
            <div className="cinefy-hazy-layout">
              <div className="cinefy-hazy-preview"><HazyLayer config={hazyDraft} />{!hazyDraft.enabled && <div className="cinefy-hazy-disabled">{t("sp.hazyOff")}</div>}<span className="cinefy-hazy-preview-label">{hazyDraft.custom && hazyDraft.url.trim() !== "" ? t("sp.customLabel") : t("sp.hazyLabel")}</span></div>
              <div className="cinefy-hazy-form">
                <SettingToggle label={t("sp.hazyBg")} help={t("sp.hazyBgHelp")} value={hazyDraft.enabled} onChange={(v) => updateHazyDraft({ enabled: v })} />
                <SettingToggle label={t("sp.hazyCustom")} help={t("sp.hazyCustomHelp")} value={hazyDraft.custom} onChange={(v) => updateHazyDraft({ custom: v })} />
                {hazyDraft.custom && <div className="cinefy-hazy-url"><input value={hazyDraft.url} onChange={(e) => updateHazyDraft({ url: e.target.value })} placeholder={t("sp.pasteUrl")} aria-label="Background image or GIF URL" data-testid="input-hazy-url" /><button className="cinefy-pl-create" onClick={() => updateHazyDraft({ url: hazyDraft.url.trim() })}>Preview</button></div>}
                <SettingToggle label={t("sp.hazyColor")} help={t("sp.hazyColorHelp")} value={hazyDraft.colorOn} onChange={(v) => updateHazyDraft({ colorOn: v })} />
                {hazyDraft.colorOn && <div className="cinefy-hazy-color">
                  <input type="color" value={hazyDraft.color} onChange={(e) => updateHazyDraft({ color: e.target.value })} aria-label="Background color" data-testid="input-hazy-color" />
                  <label className="cinefy-slider-row"><span>{t("sp.tint")} <strong>{Math.round(hazyDraft.tint * 100)}%</strong></span><input type="range" min="0" max="0.9" step="0.01" value={hazyDraft.tint} onChange={(e) => updateHazyDraft({ tint: Number(e.target.value) })} aria-label="Tint strength" /></label>
                </div>}
                <label className="cinefy-slider-row"><span>{t("sp.zoom")} <strong>{Math.round((hazyDraft.size ?? 1) * 100)}%</strong></span><input type="range" min="0.5" max="3" step="0.05" value={hazyDraft.size ?? 1} onChange={(e) => updateHazyDraft({ size: Number(e.target.value) })} aria-label="Background image size" data-testid="slider-hazy-size" /></label>
                {([
                  { key: "blur", label: t("sp.blur"), min: 0, max: 24, step: 1, unit: "px", value: hazyDraft.blur, set: (v: number) => updateHazyDraft({ blur: v }) },
                  { key: "contrast", label: t("sp.contrast"), min: 0, max: 200, step: 1, unit: "%", value: hazyDraft.contrast, set: (v: number) => updateHazyDraft({ contrast: v }) },
                  { key: "saturation", label: t("sp.saturation"), min: 0, max: 200, step: 1, unit: "%", value: hazyDraft.saturation, set: (v: number) => updateHazyDraft({ saturation: v }) },
                  { key: "brightness", label: t("sp.brightness"), min: 0, max: 200, step: 1, unit: "%", value: hazyDraft.brightness, set: (v: number) => updateHazyDraft({ brightness: v }) },
                ] as { key: "blur" | "contrast" | "saturation" | "brightness"; label: string; min: number; max: number; step: number; unit: string; value: number; set: (v: number) => void }[]).map((slider) => <label className="cinefy-slider-row" key={slider.key}><span>{slider.label} <strong>{slider.value}{slider.unit}</strong></span><input type="range" min={slider.min} max={slider.max} step={slider.step} value={slider.value} onChange={(e) => slider.set(Number(e.target.value))} data-testid={`slider-hazy-${slider.key}`} aria-label={`Hazy ${slider.label}`} /></label>)}
                <div className="cinefy-hazy-actions">
                  <button className="cinefy-hazy-btn" onClick={resetHazy} aria-label="Reset Hazy settings" data-testid="button-hazy-reset"><RotateCcw size={14} /> {t("sp.refresh")}</button>
                  <button className="cinefy-hazy-btn primary" onClick={applyHazy} aria-label="Apply Hazy background" data-testid="button-hazy-apply"><Check size={15} /> {t("sp.apply")}</button>
                  <button className="cinefy-hazy-btn" onClick={() => setTab("home")} aria-label="Close Hazy settings" data-testid="button-hazy-close"><X size={14} /> {t("sp.close")}</button>
                </div>
              </div>
            </div>
          </section>}
        {tab === "nowplaying" && <section className="cinefy-now-area">
            {selected && <div className="cinefy-now-bg" style={selected.artworkUrl100 ? { backgroundImage: `url(${selected.artworkUrl100.replace("100x100", "600x600")})` } : { background: selected.color || "linear-gradient(135deg, #1db954, #0b84ff)" }} />}
            {selected ? <div className="cinefy-nowplaying">
              <div className="cinefy-nowplaying-top">
                {!blyActive && lyrics.length > 0 && <span className={`cinefy-lyrics-sync ${lyricsSynced ? "synced" : "estimate"}`}>{lyricsSynced ? t("sp.lyricsSynced") : t("sp.lyricsEstimate")}</span>}
                <button className="cinefy-nowplaying-exit" onClick={() => setTab("home")} aria-label={t("appMenu.back")}><ArrowLeft size={16} /> {t("appMenu.back")}</button>
              </div>
              <div className={`cinefy-nowplaying-art ${playing ? "spin" : ""}`}><TrackArt track={selected} /></div>
              <div className="cinefy-nowplaying-info">
                <div className="cinefy-nowplaying-tags"><span className={`cinefy-tag ${selected.fullUrl ? "full" : "preview"}`}>{selected.fullUrl ? "FULL LENGTH" : "30s PREVIEW"}</span>{playing && <EqBars playing />}</div>
                <h3>{selected.trackName}</h3>
                <span className="cinefy-nowplaying-artist">{selected.artistName} · {selected.collectionName || selected.primaryGenreName}</span>
                <div className={`cinefy-nowplaying-progress ${sonicActive ? "sonic-dance" : ""}`}><span>{formatSeconds(progress)}</span><input type="range" min="0" max={duration || 30} step="0.1" value={Math.min(progress, duration || 30)} onChange={(e) => { const v = Number(e.target.value); setProgress(v); if (audioRef.current) audioRef.current.currentTime = v; }} aria-label={t("sp.progress")} /><span>{formatSeconds(duration)}</span></div>
                <div className="cinefy-nowplaying-controls">
                  <button className={`cinefy-aux ${shuffle ? "on" : ""}`} onClick={() => setShuffle((v) => !v)} aria-label="Shuffle"><Shuffle size={16} /></button>
                  <button className="cinefy-sidebtn" onClick={() => stepTrack(-1)} aria-label={t("sp.prevSong")}><ArrowLeft size={22} /></button>
                  <button className="cinefy-nowplaying-play" onClick={() => setPlaying((v) => !v)} aria-label={playing ? t("sp.pause") : t("sp.play")}>{playing ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}</button>
                  <button className="cinefy-sidebtn" onClick={() => stepTrack(1)} aria-label={t("sp.nextSong")}><ArrowRight size={22} /></button>
                  <button className={`cinefy-aux ${repeat ? "on" : ""}`} onClick={() => setRepeat((v) => !v)} aria-label="Repeat"><Repeat size={16} /></button>
                </div>
              </div>
              {blyActive
                ? <BeautifulLyricsPanel key={selected.trackId} track={selected} lines={lyrics} lyricIndex={lyricIndex} lineProgress={lineProgress} playing={playing} progress={progress} duration={duration || 30} timeNow={formatSeconds(progress)} timeTotal={formatSeconds(duration)} synced={lyricsSynced} offset={lyricOffset} onOffset={setLyricOffset} onSyncNow={() => { if (lyricIndex >= 0 && lyrics[lyricIndex]) setLyricOffset(Math.round((lyrics[lyricIndex].time - progress) * 100) / 100); }} strings={{ title: t("sp.lyrics"), noLyrics: t("sp.noLyrics"), full: t("sp.lyricsFull"), collapse: t("sp.lyricsCollapse"), synced: t("sp.lyricsSynced"), estimate: t("sp.lyricsEstimate"), syncNow: t("sp.lyricsSyncNow") }} />
                : <div className="cinefy-lyrics-panel">
                <div className="cinefy-lyrics-head">
                  <div className="cinefy-lyrics-title">{t("sp.lyrics")}</div>
                  {!lyricsSynced && lyrics.length > 0 && playing && lyricIndex >= 0 && <div className="cinefy-lyrics-now">{formatSeconds(lyrics[lyricIndex].time)}</div>}
                  {lyrics.length > 0 && <button className="cinefy-lyrics-toggle" onClick={() => setLyricsFull((v) => !v)} aria-label={lyricsFull ? t("sp.lyricsCollapse") : t("sp.lyricsFull")}>{lyricsFull ? t("sp.lyricsCollapse") : t("sp.lyricsFull")}</button>}
                </div>
                {lyrics.length === 0
                  ? <div className="cinefy-lyrics-empty">{t("sp.noLyrics")}</div>
                  : <div className={`cinefy-lyrics-list ${lyricsFull ? "full" : "clip"}`} ref={lyricsListRef} onWheel={markUserScroll} onPointerDown={markUserScroll} onTouchStart={markUserScroll}>{lyrics.map((line, i) => { const live = i === lyricIndex && playing; return <p key={i} ref={(el) => { lyricLineRefs.current[i] = el; }} className={live ? "active" : ""}>{renderLyricText(line, live, lineProgress)}{live && <span className="cinefy-lyric-bar"><span style={{ width: `${lineProgress * 100}%` }} /></span>}</p>; })}</div>}
              </div>}
            </div> : <div className="cinefy-empty">{t("sp.pickSong")}</div>}
          </section>}
        </div>
      </main>
    </div>

    {tab !== "nowplaying" && <footer className={`cinefy-player ${sonicActive ? "sonic-dance" : ""}`}>
      <button className="cinefy-player-track" onClick={() => selected && setTab("nowplaying")} aria-label={t("sp.nowPlaying")}>{selected && <><TrackArt track={selected} size={40} /><div><strong>{selected.trackName}<span className={`cinefy-tag mini ${selected.fullUrl ? "full" : "preview"}`}>{selected.fullUrl ? "FULL" : "30s"}</span></strong><span>{selected.artistName}</span></div></>}{selected && playing && <EqBars playing small />}<ChevronUp size={13} className="cinefy-player-track-open" /></button>
      <div className="cinefy-controls">
        <button title="Shuffle" className={`cinefy-aux ${shuffle ? "on" : ""}`} onClick={() => setShuffle((v) => !v)} aria-label="Shuffle"><Shuffle size={15} /></button>
        <button onClick={() => stepTrack(-1)} aria-label={t("sp.prevSong")}><ArrowLeft size={16} /></button>
        <button className="cinefy-play" onClick={() => selected && setPlaying((v) => !v)} aria-label={playing ? t("sp.pause") : t("sp.play")}>{playing ? <Pause size={15} fill="currentColor" /> : <Play size={15} fill="currentColor" />}</button>
        <button onClick={() => stepTrack(1)} aria-label={t("sp.nextSong")}><ArrowRight size={16} /></button>
        <button title="Repeat" className={`cinefy-aux ${repeat ? "on" : ""}`} onClick={() => setRepeat((v) => !v)} aria-label="Repeat"><Repeat size={15} /></button>
      </div>
      <div className="cinefy-progress"><span>{formatSeconds(progress)}</span><input type="range" min="0" max={duration || 30} step="0.1" value={Math.min(progress, duration || 30)} onChange={(e) => { const v = Number(e.target.value); setProgress(v); if (audioRef.current) audioRef.current.currentTime = v; }} aria-label={t("sp.progress")} /><span>{formatSeconds(duration)}</span></div>
      <label className="cinefy-volume"><Volume2 size={14} /><input type="range" min="0" max="1" step="0.01" value={volume} onChange={(e) => setVolume(Number(e.target.value))} aria-label={t("sp.volume")} /></label>
    </footer>}

    {notif && <div className="cinefy-notif" onClick={() => setNotif(null)}>
      <div className="cinefy-notif-kicker">{t("sp.nowPlaying")}</div>
      <div className="cinefy-notif-body"><img className="cinefy-notif-art" src={notif.track.artworkUrl100} alt="" /><div className="cinefy-notif-info"><strong>{notif.track.trackName}</strong><span>{notif.track.artistName}</span></div></div>
      <div className="cinefy-notif-controls"><button onClick={(e) => { e.stopPropagation(); setPlaying(false); }} aria-label={t("sp.pause")}>⏸</button><button onClick={(e) => { e.stopPropagation(); setPlaying(true); }} aria-label={t("sp.resume")}>▶</button></div>
    </div>}

    {fullToast && <div className="cinefy-fulltoast" onClick={() => setFullToast(null)}><Check size={13} /> <span>{fullToast}</span></div>}
  </div>;
}

function HazyLayer({ config }: { config: HazyConfig }) {
  const filter = `blur(${config.blur}px) contrast(${config.contrast}%) saturate(${config.saturation}%) brightness(${config.brightness}%)`;
  return <div className="hazy-layer" style={{ filter }} aria-hidden="true">
    <div className="hazy-layer-base" />
    {config.custom && config.url.trim() !== "" && <img className="hazy-layer-img" src={config.url} style={{ transform: `scale(${config.size ?? 1})` }} alt="" />}
    {config.colorOn && <div className="hazy-layer-tint" style={{ background: config.color, opacity: config.tint }} />}
  </div>;
}

function SettingToggle({ label, help, value, onChange }: { label: string; help: string; value: boolean; onChange: (value: boolean) => void }) {
  return <label className="setting-row"><div><strong>{label}</strong><small>{help}</small></div><span className="switch"><input type="checkbox" checked={value} onChange={(event) => onChange(event.target.checked)} /><span className="switch-track" /></span></label>;
}

function InfoModal({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  return <div className={`info-modal ${open ? "open" : ""}`} onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}><div className="modal-card"><header className="modal-header"><h2>{title}</h2><button className="icon-close" onClick={onClose} aria-label="Close dialog"><X size={19} /></button></header>{children}</div></div>;
}

function Stars({ value }: { value: number }) {
  const count = Math.round(value);
  return <span className="we-stars-row" aria-label={`${value.toFixed(1)} / 5`}>{[0, 1, 2, 3, 4].map((i) => <span key={i} className={i < count ? "on" : ""}>★</span>)}</span>;
}

const WE_CARD_GRADS: Record<string, string> = {
  Anime: "radial-gradient(120% 120% at 20% 0%, #2b1b4d 0%, #0a0f1d 65%)",
  Space: "radial-gradient(120% 120% at 20% 0%, #0b2a3a 0%, #070b16 65%)",
  Animals: "radial-gradient(120% 120% at 20% 0%, #1f3a2a 0%, #0a0f1a 65%)",
  City: "radial-gradient(120% 120% at 20% 0%, #1d2f45 0%, #0a0f18 65%)",
  Bizarre: "radial-gradient(120% 120% at 20% 0%, #3a1a3a 0%, #0b0b14 65%)",
  Scenery: "radial-gradient(120% 120% at 20% 0%, #16384d 0%, #0a0f19 65%)",
  Cinematic: "radial-gradient(120% 120% at 20% 0%, #3a1f2b 0%, #0b0b14 65%)",
  Minimal: "radial-gradient(120% 120% at 20% 0%, #1d2433 0%, #0a0e16 65%)",
  Abstract: "radial-gradient(120% 120% at 20% 0%, #2a1d4d 0%, #080b15 65%)",
  Utility: "radial-gradient(120% 120% at 20% 0%, #23402f 0%, #0a0f1a 65%)",
  Gaming: "radial-gradient(120% 120% at 20% 0%, #1d2b4d 0%, #070c18 65%)",
  Synthwave: "radial-gradient(120% 120% at 20% 0%, #40144a 0%, #0a0816 65%)",
  Dark: "radial-gradient(120% 120% at 20% 0%, #241423 0%, #08080e 65%)",
};

function WeCard({ entry, applied, onOpen, installed, onDownload, onApply, onUninstall }: { entry: WallEngineEntry; applied: boolean; onOpen: () => void; installed: boolean; onDownload?: () => void; onApply?: () => void; onUninstall?: () => void }) {
  const [hover, setHover] = useState(false);
  const showVideo = Boolean(entry.video) && !PERF.low && hover;
  return <div className="we-card" onClick={onOpen} role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === "Enter") onOpen(); }} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} data-testid={`we-card-${entry.id}`}>
    <div className={`we-card-thumb ${applied ? "applied" : ""}`}>{showVideo
      ? <video src={pvSrc(entry.video, entry.videoLow)} muted loop playsInline preload="metadata" autoPlay />
      : entry.video
        ? <div className="we-card-thumb placeholder" style={{ background: WE_CARD_GRADS[entry.category] ?? WE_CARD_GRADS.Dark }}><span>{CATEGORY_ICONS[entry.category] ?? "·"}</span></div>
        : <img src={entry.image} alt={entry.name} />}{applied ? <span className="we-applied-badge">{t("we.inUse")}</span> : null}</div>
    <div className="we-card-info"><strong>{entry.name}</strong><span>{entry.category} · {entry.resolution}</span><span className="we-card-author"><BadgeCheck size={11} /> {WE_AUTHOR.name}</span></div>
    <div className="we-card-actions">{installed
      ? <><button className="we-btn mini" onClick={(event) => { event.stopPropagation(); onApply?.(); }}>{applied ? t("we.inUse") : t("we.apply")}</button>{onUninstall ? <button className="we-btn mini danger" onClick={(event) => { event.stopPropagation(); onUninstall(); }}>{t("we.uninstall")}</button> : null}</>
      : <button className="we-btn mini" onClick={(event) => { event.stopPropagation(); onDownload?.(); }}><Download size={11} /> {t("we.download")}</button>}</div>
  </div>;
}

function AppMakerSurface() {
  const [apps, setApps] = useState<Array<{ id: string; name: string; icon: string; url: string; type: "website" | "game" }>>(() => {
    try {
      const saved = localStorage.getItem("vertex-custom-apps");
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("");
  const [url, setUrl] = useState("");
  const [type, setType] = useState<"website" | "game">("website");

  const saveApps = (next: typeof apps) => {
    setApps(next);
    try { localStorage.setItem("vertex-custom-apps", JSON.stringify(next)); } catch {}
  };

  const createApp = () => {
    if (!name.trim() || !url.trim()) return;
    const id = `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newApp = { id, name: name.trim(), icon: icon.trim() || asset("images/links.svg"), url: url.trim(), type };
    saveApps([...apps, newApp]);
    setName(""); setIcon(""); setUrl("");
    // Dispatch event to add to app list
    window.dispatchEvent(new CustomEvent("vertex-add-custom-app", { detail: newApp }));
  };

  const deleteApp = (id: string) => {
    saveApps(apps.filter(a => a.id !== id));
  };

  return (
    <div className="window-surface" style={{ padding: "20px", overflow: "auto" }}>
      <div className="surface-kicker">APP MAKER</div>
      <h2 className="surface-title">Create Custom Apps</h2>
      <p className="surface-copy">Make your own apps with custom logos. Paste any website URL to embed it.</p>
      
      <div style={{ marginTop: "20px", display: "flex", flexDirection: "column", gap: "12px", maxWidth: "400px" }}>
        <input 
          value={name} 
          onChange={(e) => setName(e.target.value)} 
          placeholder="App name (e.g., Pizza Edition)" 
          style={{ padding: "8px", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.2)", background: "rgba(0,0,0,0.3)", color: "white" }}
        />
        <input 
          value={icon} 
          onChange={(e) => setIcon(e.target.value)} 
          placeholder="Logo URL (optional)" 
          style={{ padding: "8px", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.2)", background: "rgba(0,0,0,0.3)", color: "white" }}
        />
        <input 
          value={url} 
          onChange={(e) => setUrl(e.target.value)} 
          placeholder="Website URL (e.g., https://pizzaedition.com/)" 
          style={{ padding: "8px", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.2)", background: "rgba(0,0,0,0.3)", color: "white" }}
        />
        <select 
          value={type} 
          onChange={(e) => setType(e.target.value as "website" | "game")}
          style={{ padding: "8px", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.2)", background: "rgba(0,0,0,0.3)", color: "white" }}
        >
          <option value="website">Website (Embed)</option>
          <option value="game">Unblocked Game</option>
        </select>
        <button 
          onClick={createApp}
          style={{ padding: "10px", borderRadius: "6px", border: "none", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", color: "white", cursor: "pointer" }}
        >
          Create App
        </button>
      </div>

      <div style={{ marginTop: "30px" }}>
        <h3 style={{ marginBottom: "15px" }}>Your Custom Apps</h3>
        {apps.length === 0 ? (
          <p style={{ opacity: 0.6 }}>No custom apps yet</p>
        ) : (
          <div style={{ display: "grid", gap: "10px" }}>
            {apps.map(app => (
              <div key={app.id} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px", background: "rgba(255,255,255,0.05)", borderRadius: "8px" }}>
                <img src={app.icon} alt="" style={{ width: "32px", height: "32px", borderRadius: "6px" }} onError={(e) => { (e.target as HTMLImageElement).src = asset("images/links.svg"); }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: "600" }}>{app.name}</div>
                  <div style={{ fontSize: "12px", opacity: 0.7 }}>{app.url}</div>
                </div>
                <button onClick={() => deleteApp(app.id)} style={{ padding: "6px 12px", borderRadius: "4px", border: "none", background: "#ff4757", color: "white", cursor: "pointer" }}>Delete</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function WeApplyModal({ entry, onClose, onConfirm }: { entry: WallEngineEntry; onClose: () => void; onConfirm: (target: ApplyTarget) => void }) {
  const [target, setTarget] = useState<ApplyTarget>("both");
  return <div className="we-apply" data-testid="we-apply-modal" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="we-apply-card">
      <button className="we-showcase-close" onClick={onClose} aria-label="Close"><X size={16} /></button>
      <div className="we-apply-preview">{entry.video ? <video src={pvSrc(entry.video, entry.videoLow)} autoPlay muted loop playsInline preload="metadata" /> : <img src={entry.image} alt={entry.name} />}</div>
      <div className="we-apply-body">
        <h3>{entry.name}</h3>
        <p>{t("we.applyAsk")}</p>
        <div className="we-seg">{(["both", "home", "lock"] as const).map((opt) => <button key={opt} className={target === opt ? "active" : ""} onClick={() => setTarget(opt)}>{opt === "home" ? t("wm.home") : opt === "lock" ? t("wm.lock") : t("wm.both")}</button>)}</div>
        <div className="we-apply-actions">
          <button className="we-btn" onClick={onClose}>{t("we.cancel")}</button>
          <button className="we-btn primary" onClick={() => onConfirm(target)}>{t("we.apply")}</button>
        </div>
      </div>
    </div>
  </div>;
}

function WallEngineApp({ appliedHome, appliedLock, onApplyWallpaper, notify, embedded = false }: { appliedHome: WallpaperId; appliedLock: WallpaperId; onApplyWallpaper: (id: WallpaperId, target: "both" | "home" | "lock") => void; notify?: (title: string, copy: string) => void; embedded?: boolean }) {
  const [tab, setTab] = useState<"installed" | "discover" | "workshop">("discover");
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [applyEntry, setApplyEntry] = useState<WallEngineEntry | null>(null);
  const [loading, setLoading] = useState(!embedded);
  const [loadPct, setLoadPct] = useState(0);
  const [loadLine, setLoadLine] = useState(0);
  const [installed, setInstalled] = useState<string[]>(() => (storage.read<string[]>("vertex-we-installed", [])).filter((id) => id !== "we-sonic"));
  const [category, setCategory] = useState<string>("all");
  const [ratings, setRatings] = useState<Record<string, number>>(() => storage.read<Record<string, number>>("vertex-we-ratings", {}));
  const [votes, setVotes] = useState<Record<string, number>>(() => storage.read<Record<string, number>>("vertex-we-votes", {}));
  const [propsDraft, setPropsDraft] = useState<{ brightness: number; volume: number; position: string; rate: number }>({ brightness: 1, volume: 1, position: "center", rate: 1 });
  useEffect(() => { storage.write("vertex-we-installed", installed); }, [installed]);
  useEffect(() => { storage.write("vertex-we-ratings", ratings); }, [ratings]);
  useEffect(() => { storage.write("vertex-we-votes", votes); }, [votes]);
  const weLoadLines = [t("we.loadPhrase1"), t("we.loadPhrase2"), t("we.loadPhrase3"), t("we.loadPhrase4"), t("we.loadPhrase5"), t("we.loadPhrase6")];
  useEffect(() => {
    if (embedded) { setLoading(false); return; }
    const total = 5400;
    const start = performance.now();
    const tick = window.setInterval(() => {
      const elapsed = performance.now() - start;
      const pct = Math.min(100, Math.round((elapsed / total) * 100));
      setLoadPct(pct);
      setLoadLine(Math.min(weLoadLines.length - 1, Math.floor((elapsed / total) * weLoadLines.length * 1.2)));
      if (elapsed >= total) setLoading(false);
    }, 60);
    return () => window.clearInterval(tick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [embedded]);

  const install = (id: string) => setInstalled((prev) => (prev.includes(id) ? prev : [...prev, id]));
  const uninstall = (id: string) => { setInstalled((prev) => prev.filter((x) => x !== id)); setOpenId((o) => (o === id ? null : o)); };
  const entryOf = (id: string | null) => (id ? wallEngineEntries.find((e) => e.id === id) : undefined);
  const isApplied = (id: WallpaperId) => appliedHome === id || appliedLock === id;
  const q = query.trim().toLowerCase();
  const match = (e: WallEngineEntry) => (!q || e.name.toLowerCase().includes(q) || e.category.toLowerCase().includes(q) || entryTags(e).some((tag) => tag.toLowerCase().includes(q)));

  const fullStars = (e: WallEngineEntry) => {
    const user = ratings[e.id];
    const total = votes[e.id] ?? 0;
    const avg = user !== undefined ? user : e.stars;
    return { avg, user: user ?? null, total };
  };

  const categories = ["all", ...Array.from(new Set(wallEngineEntries.map((e) => e.category)))];
  const counts: Record<string, number> = { all: wallEngineEntries.length };
  for (const e of wallEngineEntries) counts[e.category] = (counts[e.category] ?? 0) + 1;

  const open = entryOf(openId);
  const installedView = wallEngineEntries.filter((e) => installed.includes(e.id) && (category === "all" || e.category === category) && match(e));
  const workshopView = wallEngineEntries.filter((e) => (category === "all" || e.category === category) && match(e));
  const activeCat = tab === "discover" ? "all" : category;
  const recentView = WE_RECENT.map((id) => entryOf(id)).filter((e): e is WallEngineEntry => Boolean(e)).filter((e) => activeCat === "all" || e.category === activeCat);
  const popularView = WE_POPULAR.map((id) => entryOf(id)).filter((e): e is WallEngineEntry => Boolean(e)).filter((e) => activeCat === "all" || e.category === activeCat);

  const openProps = () => {
    if (open) setPropsDraft({ brightness: 1, volume: 1, position: "center", rate: 1 });
  };

  const rate = (id: string, n: number) => {
    setRatings((r) => {
      const current = r[id];
      if (current === n) {
        setVotes((v) => ({ ...v, [id]: Math.max(0, (v[id] ?? 0) - 1) }));
        const next = { ...r };
        delete next[id];
        return next;
      }
      if (current === undefined) setVotes((v) => ({ ...v, [id]: (v[id] ?? 0) + 1 }));
      return { ...r, [id]: n };
    });
  };

  const renderProps = () => (
    <div className="we-props" data-testid="we-props">
      <h4 className="we-props-title">{t("we.props")}</h4>
      <label className="we-prop"><span>{t("we.brightness")}</span><input type="range" min="0.2" max="1.8" step="0.05" value={propsDraft.brightness} onChange={(e) => setPropsDraft((p) => ({ ...p, brightness: Number(e.target.value) }))} /><em>{Math.round(propsDraft.brightness * 100)}%</em></label>
      <label className="we-prop"><span>{t("we.volume")}</span><input type="range" min="0" max="1" step="0.01" value={propsDraft.volume} onChange={(e) => setPropsDraft((p) => ({ ...p, volume: Number(e.target.value) }))} /><em>{Math.round(propsDraft.volume * 100)}%</em></label>
      <label className="we-prop"><span>{t("we.position")}</span>
        <div className="we-pos-seg">
          {(["left", "center", "right"] as const).map((pos) => <button key={pos} className={propsDraft.position === pos ? "active" : ""} onClick={() => setPropsDraft((p) => ({ ...p, position: pos }))}>{t(`we.pos.${pos}`)}</button>)}
        </div></label>
      <label className="we-prop"><span>{t("we.rate")}</span><input type="range" min="0.25" max="2" step="0.25" value={propsDraft.rate} onChange={(e) => setPropsDraft((p) => ({ ...p, rate: Number(e.target.value) }))} /><em>{propsDraft.rate.toFixed(2)}x</em></label>
      <div className="we-prop-actions">
        <button className="we-btn" onClick={() => open && setPropsDraft({ brightness: 1, volume: 1, position: "center", rate: 1 })}>{t("we.cancel")}</button>
        <button className="we-btn primary" onClick={() => { const p = propsDraft; const vids = Array.from(document.querySelectorAll<HTMLVideoElement>(".we-showcase-preview video,.we-apply-preview video")); for (const v of vids) { v.style.filter = `brightness(${p.brightness})`; v.volume = p.volume; v.playbackRate = p.rate; v.style.objectPosition = p.position === "left" ? "left center" : p.position === "right" ? "right center" : "center center"; } notify?.(t("we.propsApplied"), t("we.propsAppliedCopy")); }}>{t("we.apply")}</button>
      </div>
    </div>
  );

  return (
    <div className={`we-app-wrap${embedded ? " we-app-embedded" : ""}`}>
      {loading ? <div className="we-loading" data-testid="we-loading">
        <div className="we-load-bg" aria-hidden="true">
          <span className="we-load-orb we-load-orb-a" />
          <span className="we-load-orb we-load-orb-b" />
          <span className="we-load-orb we-load-orb-c" />
          <div className="we-load-grid" />
          <div className="we-load-tiles">
            <span className="we-load-tile" />
            <span className="we-load-tile" />
            <span className="we-load-tile" />
            <span className="we-load-tile" />
            <span className="we-load-tile" />
            <span className="we-load-tile" />
          </div>
        </div>
        <div className="we-load-core">
          <div className="we-load-ring">
            <span className="we-load-halo" />
            <span className="we-load-ring-dash" />
            <img className="we-load-icon" src={asset("images/wallpaper-engine.gif")} alt="" />
          </div>
          <div className="we-load-brand">
            <span className="we-load-kicker">{t("surf.wallpaperEngine.kicker")}</span>
            <h2 className="we-load-title">{t("surf.wallpaperEngine.title")}</h2>
          </div>
          <div className="we-load-bar">
            <span className="we-load-bar-fill" style={{ width: `${loadPct}%` }} />
            <span className="we-load-bar-shine" />
          </div>
          <div className="we-load-row">
            <span className="we-load-status"><em>{weLoadLines[loadLine]}</em></span>
            <span className="we-load-pct">{loadPct}%</span>
          </div>
        </div>
      </div> : null}
      <div className="we-app">
        <div className="we-tabs">
          {(["installed", "discover", "workshop"] as const).map((key) => <button key={key} className={`we-tab ${tab === key ? "active" : ""}`} onClick={() => setTab(key)}>{t(`we.${key}`)}</button>)}
        </div>
        <div className="we-main">
          {tab === "workshop" ? <aside className="we-cats" data-testid="we-cats">
            <div className="we-cats-head">{t("we.catsTitle")}</div>
            {categories.map((cat) => (
              <button key={cat} className={`we-cat ${category === cat ? "active" : ""}`} onClick={() => setCategory(cat)}>
                <span className="we-cat-ic">{cat === "all" ? "▦" : CATEGORY_ICONS[cat] ?? "·"}</span>
                <span className="we-cat-name">{cat === "all" ? t("we.all") : cat}</span>
                <span className="we-cat-count">{counts[cat] ?? 0}</span>
              </button>
            ))}
          </aside> : null}
          <div className="we-content">
            {tab === "installed" ? <>
              <div className="we-search"><Search size={14} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("we.searchInstalled")} aria-label={t("we.searchInstalled")} data-testid="input-we-search" /></div>
              {installedView.length === 0 ? <div className="we-empty">{t("we.noneInstalled")}</div> : <div className="we-grid">{installedView.map((e) => <WeCard key={e.id} entry={e} applied={isApplied(e.id)} installed onOpen={() => setOpenId(e.id)} onApply={() => setApplyEntry(e)} onUninstall={() => uninstall(e.id)} />)}</div>}
            </> : tab === "discover" ? <>
<section className="we-section"><h3 className="we-section-title">{t("we.recent")}</h3><div className="we-grid">{recentView.map((e) => <WeCard key={e.id} entry={e} applied={isApplied(e.id)} installed={installed.includes(e.id)} onOpen={() => setOpenId(e.id)} onDownload={() => install(e.id)} />)}</div></section>
            <div className="we-divider" />
            <section className="we-section"><h3 className="we-section-title">{t("we.popular")} <span className="we-fire">🔥</span></h3><div className="we-grid">{popularView.map((e) => <WeCard key={e.id} entry={e} applied={isApplied(e.id)} installed={installed.includes(e.id)} onOpen={() => setOpenId(e.id)} onDownload={() => install(e.id)} />)}</div></section>
            </> : <>
              <div className="we-search"><Search size={14} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("we.searchWorkshop")} aria-label={t("we.searchWorkshop")} data-testid="input-we-search" /></div>
              {workshopView.length === 0 ? <div className="we-empty">{t("we.noneCats")}</div> : <div className="we-grid">{workshopView.map((e) => <WeCard key={e.id} entry={e} applied={isApplied(e.id)} installed={installed.includes(e.id)} onOpen={() => setOpenId(e.id)} onDownload={() => install(e.id)} />)}</div>}
            </>}
          </div>
          {open ? <aside className="we-showcase" data-testid="we-showcase">
            <button className="we-showcase-close" onClick={() => setOpenId(null)} aria-label="Close showcase"><X size={16} /></button>
            <div className="we-showcase-preview">{open.video ? <video src={pvSrc(open.video, open.videoLow)} autoPlay muted={propsDraft.volume === 0} loop playsInline preload="metadata" style={{ filter: `brightness(${propsDraft.brightness})`, objectPosition: propsDraft.position === "left" ? "left center" : propsDraft.position === "right" ? "right center" : "center center" }} /> : <img src={open.image} alt={open.name} style={{ filter: `brightness(${propsDraft.brightness})` }} />}</div>
            <div className="we-showcase-meta">
              <h3>{t("we.titleLabel")}: {open.name}</h3>
              <p className="we-showcase-author"><BadgeCheck size={14} /> {t("we.author")}: {WE_AUTHOR.name} {WE_AUTHOR.verified ? <span className="we-verified">{t("we.verified")}</span> : null}</p>
              <p className="we-showcase-tags">{t("we.type")}: {open.video ? t("we.typeVideo") : t("we.typeImage")} ({resolvedSize(open)})</p>
              <p className="we-showcase-tags">{t("we.tags")}: {entryTags(open).join(" · ")}</p>
              <div className="we-rating-info"><Stars value={fullStars(open).avg} /><span>{fullStars(open).avg.toFixed(1)}</span><em>({fullStars(open).total} {t("we.votes")})</em></div>
              <div className="we-rate-row">
                <span className="we-rate-label">{t("we.rateNow")}</span>
                <div className="we-rate-stars">{[1, 2, 3, 4, 5].map((n) => <button key={n} className={fullStars(open).user !== null && (fullStars(open).user ?? 0) >= n ? "on" : ""} onClick={() => rate(open.id, n)} aria-label={`Rate ${n} ${n === 1 ? "star" : "stars"}`}>{n <= (fullStars(open).user ?? 0) ? "★" : "☆"}</button>)}</div>
              </div>
              <div className="we-showcase-actions">
                {installed.includes(open.id)
                  ? <><button className="we-btn danger" onClick={() => uninstall(open.id)}>{t("we.uninstall")}</button><button className="we-btn primary" onClick={() => setApplyEntry(open)}>{isApplied(open.id) ? t("we.inUse") : t("we.apply")}</button></>
                  : <button className="we-btn primary" onClick={() => install(open.id)}><Download size={14} /> {t("we.download")}</button>}
              </div>
              {renderProps()}
            </div>
          </aside> : null}
        </div>
      </div>
      {applyEntry ? <WeApplyModal entry={applyEntry} onClose={() => setApplyEntry(null)} onConfirm={(target) => { onApplyWallpaper(applyEntry.id, target); setApplyEntry(null); }} /> : null}
    </div>
  );
}

export default App;
