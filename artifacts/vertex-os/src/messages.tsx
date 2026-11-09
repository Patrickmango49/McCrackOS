import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  adminOwnerActive,
  loadUserProfile,
  saveProfilePage as netSaveProfilePage,
  answerCall,
  callsReady,
  connect,
  disconnect,
  endCall,
  getLocalStream,
  getMediaConn,
  isOnline,
  isContact,
  onNet,
  placeCall,
  prepareMessagesDirectory,
  reconnectNow,
  createGroup as netCreateGroup,
  decideContactRequest,
  decideGroupInvitation,
  deleteMessage as netDeleteMessage,
  editMessage as netEditMessage,
  groupKey,
  markMessagesRead,
  sendMedia as netSendMedia,
  sendContactRequest,
  sendText as netSendText,
  setProfile as netSetProfile,
  unsendMessage as netUnsendMessage,
  messagesBackendConfigured,
  authSignIn,
  authSignUp,
  authSignOut,
  loadMyProfileRow,
  setRole as netSetRole,
  setVerified as netSetVerified,
  setEffects as netSetEffects,
  persistRole as netPersistRole,
  persistVerified as netPersistVerified,
  persistEffects as netPersistEffects,
  persistBadges as netPersistBadges,
  changeUsername as netChangeUsername,
  followUser,
  unfollowUser,
  loadFollowList,
  type NetGroup,
  type NetUserPage,
  type NetFollowUser,
  type NetRequest,
  type NetProfile,
  type NetStatus,
} from "./vertexnet";
import { assetUrl } from "./asset-map";

const base = import.meta.env.BASE_URL.endsWith("/") ? import.meta.env.BASE_URL : `${import.meta.env.BASE_URL}/`;
const SITE_LOGO = assetUrl(base, new Date().getMonth() === 9 ? "vertex-hub-logo-halloween.png" : "vertex-hub-logo.png");

const PROF_KEY = "vertex-msgs-profile-v2";
const DMS_KEY = "vertex-msgs-dms-v3";
const SEEN_KEY = "vertex-msgs-seen-v3";
const REG_KEY = "vertex-msgs-usernames-v1";
const CUSTOMS_KEY = "vertex-msgs-customs-v1";
const ACTIVE_KEY = "vertex-msgs-active-v1";

type Status = "online" | "idle" | "offline";
type Role = "user" | "moderator" | "owner";
type AvSource = { kind: "preset"; id: number } | { kind: "custom"; data: string };

interface Profile {
  username: string;
  name: string;
  avatar: AvSource;
  status: Status;
  role?: Role;
  verified?: boolean;
  effects?: string[];
  badges?: string[] | null;
  bio?: string;
  banner?: string;
  joinedAt?: number;
}

interface MediaItem {
  kind: "image" | "video";
  url: string;
  name: string;
}

interface Msg {
  id: string;
  from: string;
  text: string;
  at: number;
  media?: MediaItem;
  pending?: boolean;
  failed?: boolean;
  edited?: boolean;
  deleted?: boolean;
  seen?: boolean;
  seenAt?: number;
  readByMe?: boolean;
}

interface RosterUser {
  username: string;
  name: string;
  preset: number;
  system?: boolean;
  verified?: boolean;
  effects?: string[];
  badges?: string[] | null;
  live?: boolean;
  status?: Status;
  avatar?: AvSource;
  group?: boolean;
  members?: string[];
  role?: Role;
  bio?: string;
  banner?: string;
  joinedAt?: number;
  contacts?: number;
  groups?: number;
}

interface CallState {
  peer: string;
  kind: "voice" | "video";
  stage: "connecting" | "active";
  incoming: boolean;
  startedAt: number;
  muted: boolean;
  camOff: boolean;
}

const PRESETS: { a: string; b: string; glyph: string }[] = [
  { a: "#ff9a9e", b: "#fad0c4", glyph: "🌸" },
  { a: "#a18cd1", b: "#fbc2eb", glyph: "🐸" },
  { a: "#84fab0", b: "#8fd3f4", glyph: "🚀" },
  { a: "#f6d365", b: "#fda085", glyph: "🍊" },
  { a: "#a1c4fd", b: "#c2e9fb", glyph: "🌊" },
  { a: "#fbc2eb", b: "#fed6e3", glyph: "💖" },
  { a: "#43cea2", b: "#185a9d", glyph: "🍕" },
  { a: "#ffecd2", b: "#fcb69f", glyph: "🌙" },
  { a: "#fddb92", b: "#d1fdff", glyph: "✨" },
  { a: "#cfd9df", b: "#e2ebf0", glyph: "🐻" },
  { a: "#f093fb", b: "#f5576c", glyph: "⚡" },
  { a: "#5ee7df", b: "#b490ca", glyph: "🛸" },
];

const hashPreset = (u: string) => [...u].reduce((s, ch) => (s * 31 + (ch.codePointAt(0) ?? 0)) >>> 0, 0) % PRESETS.length;
const nameCap = (u: string) => u.replace(/^[a-z]/, (c) => c.toUpperCase());
const fmtJoin = (ts: number) => {
  const d = new Date(ts);
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
};
const fmtJoinLong = (ts: number) => {
  const d = new Date(ts);
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  return `Joined ${months[d.getMonth()]} ${d.getFullYear()}`;
};

const EFFECTS: { id: string; label: string }[] = [
  { id: "moving-name", label: "Moving name" },
  { id: "glow", label: "Glow" },
];
const nameFxClass = (effects?: string[]) => {
  if (!effects || effects.length === 0) return "";
  const cls: string[] = [];
  if (effects.includes("moving-name")) cls.push("msgs-name-moving");
  if (effects.includes("glow")) cls.push("msgs-name-glow");
  return cls.length ? ` ${cls.join(" ")}` : "";
};

type BadgeId = "owner" | "admin" | "dev" | "mod" | "experimental" | "lab" | "verified";
const BADGES: { id: BadgeId; label: string; cls: string; title: string }[] = [
  { id: "owner", label: "OWNER", cls: "msgs-role-owner", title: "Owner" },
  { id: "admin", label: "ADMIN", cls: "msgs-role-admin", title: "Administrator" },
  { id: "dev", label: "DEVELOPER", cls: "msgs-role-dev", title: "Developer" },
  { id: "mod", label: "MOD", cls: "msgs-role-mod", title: "Moderator" },
  { id: "experimental", label: "EXPERIMENTAL", cls: "msgs-role-experimental", title: "Experimental Features Lab" },
  { id: "lab", label: "LAB", cls: "msgs-role-lab", title: "McCrack Lab" },
  { id: "verified", label: "Verified", cls: "", title: "Verified" },
];
const ALL_BADGE_IDS = BADGES.map((b) => b.id);

const defaultBadges = (o: { role?: Role; special?: boolean; verified?: boolean }): BadgeId[] => {
  const ids: BadgeId[] = [];
  if (o.special) ids.push("mod", "admin", "dev");
  if (o.role === "owner") ids.push("owner");
  else if (o.role === "moderator" && !o.special) ids.push("mod");
  if (o.role === "owner") ids.push("experimental", "lab");
  if (o.verified) ids.push("verified");
  return ids;
};

const LAB_KEY = "vertex-lab-v1";
type LabState = { anim: boolean; cozy: boolean; redesign: boolean; compact: boolean };
const DEFAULT_LAB: LabState = { anim: false, cozy: false, redesign: false, compact: false };
const readLab = (): LabState => {
  try {
    const r = localStorage.getItem(LAB_KEY);
    if (!r) return { ...DEFAULT_LAB };
    return { ...DEFAULT_LAB, ...(JSON.parse(r) as Partial<LabState>) };
  } catch {
    return { ...DEFAULT_LAB };
  }
};

const SYSTEM_USER: RosterUser = { username: "McCrack", name: "McCrack", preset: -1, system: true, verified: true };

const toNetProfile = (p: Profile): NetProfile => ({
  username: p.username,
  name: p.name,
  status: p.status,
  avatarKind: p.avatar.kind === "preset" ? "preset" : "custom",
  avatarId: p.avatar.kind === "preset" ? p.avatar.id : 0,
  ...(p.avatar.kind === "custom" && p.avatar.data ? { avatarData: p.avatar.data } : {}),
  role: p.role,
  verified: p.verified,
  effects: p.effects,
  badges: p.badges,
});

const fromNetProfile = (n: NetProfile): RosterUser => ({
  username: n.username,
  name: n.name || nameCap(n.username),
  preset: n.avatarKind === "custom" ? hashPreset(n.username) : n.avatarId,
  live: n.status !== "offline",
  status: n.status,
  role: n.role,
  verified: n.verified,
  effects: n.effects,
  badges: n.badges,
  ...(n.avatarKind === "custom" && n.avatarData ? { avatar: { kind: "custom" as const, data: n.avatarData } } : {}),
});

const read = <T,>(k: string, d: T): T => {
  try {
    const r = localStorage.getItem(k);
    return r ? (JSON.parse(r) as T) : d;
  } catch {
    return d;
  }
};

const write = (k: string, v: unknown) => {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {
    /* noop */
  }
};

const PAGE_KEY = "vertex-msgs-page-v1";
interface PageOverride { bio?: string; banner?: string; avatar?: AvSource; joinedAt?: number | null; role?: Role; verified?: boolean; effects?: string[]; badges?: string[] | null; }
const readPageOverrides = (): Record<string, PageOverride> => read<Record<string, PageOverride>>(PAGE_KEY, {});
const pageOverrideFor = (username: string): PageOverride | undefined => readPageOverrides()[username.trim().toLowerCase()];
const writePageOverride = (username: string, data: PageOverride) => {
  const all = readPageOverrides();
  all[username.trim().toLowerCase()] = { ...all[username.trim().toLowerCase()], ...data };
  write(PAGE_KEY, all);
};

const regRead = (): string[] => {
  try {
    const r = localStorage.getItem(REG_KEY);
    const parsed = r ? (JSON.parse(r) as string[]) : [];
    return Array.isArray(parsed) ? parsed.map((x) => x.toLowerCase()) : [];
  } catch {
    return [];
  }
};

const regAdd = (u: string) => {
  try {
    const l = regRead();
    const v = u.trim().toLowerCase();
    if (!v || l.includes(v)) return;
    localStorage.setItem(REG_KEY, JSON.stringify([...l, v]));
  } catch {
    /* noop */
  }
};

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

const fmtTime = (ms: number) =>
  new Date(ms).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

const dayLabel = (ms: number) => {
  const d = new Date(ms);
  const t = new Date();
  const same = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  const y = new Date(t);
  y.setDate(t.getDate() - 1);
  if (same(d, t)) return "Today";
  if (same(d, y)) return "Yesterday";
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
};

const shortDate = (ms: number) =>
  new Date(ms).toLocaleDateString([], { month: "short", day: "numeric" });

function seedDms(now: number): Record<string, Msg[]> {
  return {
    McCrack: [{ id: "sys-welcome", from: "McCrack", text: "Welcome to Messages! Hope you enjoy the app!", at: now }],
  };
}

function initialState() {
  const now = Date.now();
  const profile = read<Profile | null>(PROF_KEY, null);
  if (profile) regAdd(profile.username);
  const dms = read<Record<string, Msg[]>>(DMS_KEY, seedDms(now));
  // Migrate the old built-in system conversation without losing its history.
  const legacySystemChat = (dms as Record<string, Msg[]>).Vertex;
  if (legacySystemChat && !dms.McCrack) {
    dms.McCrack = legacySystemChat;
    delete (dms as Record<string, Msg[]>).Vertex;
    write(DMS_KEY, dms);
  }
  const savedActive = read<string | null>(ACTIVE_KEY, null);
  return {
    profile,
    dms,
    seen: read<Record<string, number>>(SEEN_KEY, {}),
    active: savedActive === "Vertex" ? "McCrack" : savedActive,
  };
}

function RoleBadge({ role, compact = false }: { role?: Role; compact?: boolean }) {
  if (!role || role === "user") return null;
  const owner = role === "owner";
  return (
    <span className={`msgs-role msgs-role-${role}${compact ? " msgs-role-compact" : ""}`} title={owner ? "Owner" : "Moderator"}>
      <svg viewBox="0 0 24 24" width={compact ? 10 : 12} height={compact ? 10 : 12} aria-hidden="true">
        {owner ? (
          <path d="M3 8l4 3 5-6 5 6 4-3-2 11H5L3 8z" fill="currentColor" />
        ) : (
          <path d="M12 2l7 3v6c0 4.5-3 8-7 9-4-1-7-4.5-7-9V5l7-3z" fill="currentColor" />
        )}
      </svg>
      {!compact && <span>{owner ? "OWNER" : "MOD"}</span>}
    </span>
  );
}

function VerifiedBadge({ size = 15 }: { size?: number }) {
  return (
    <span className="msgs-verified" style={{ width: size, height: size }}>
      <svg viewBox="0 0 24 24" fill="none" width={Math.round(size * 0.62)} height={Math.round(size * 0.62)}>
        <path d="M6.5 12.6l3.4 3.4 7.6-8" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

const badgeChip = (id: BadgeId, keyPrefix = "") => {
  const meta = BADGES.find((b) => b.id === id);
  if (!meta) return null;
  const key = `${keyPrefix}${id}`;
  if (id === "verified") return <span key={key} className="msgs-profile-verifiedchip"><VerifiedBadge size={14} />Verified</span>;
  return <span key={key} className={`msgs-role ${meta.cls}`} title={meta.title}>{meta.label}</span>;
};

const renderBadges = (ids: BadgeId[], keyPrefix = "") => ids.map((id) => badgeChip(id, keyPrefix));

function initialsFor(username: string): string {
  const clean = (username ?? "").replace(/[^a-zA-Z0-9]+/g, " ").trim();
  if (!clean) return "?";
  const parts = clean.split(/\s+/);
  const raw = parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : clean.slice(0, 2);
  return raw.toUpperCase();
}

function GlyphAvatar({ src, size, username, verified, status, statusSize, className }: {
  src: AvSource;
  size: number;
  username: string;
  verified?: boolean;
  status?: Status;
  statusSize?: number;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const isPreset = src.kind === "preset" && src.id >= 0;
  const preset = isPreset ? PRESETS[src.id] : null;
  const imgSrc = src.kind === "custom" ? src.data : SITE_LOGO;
  const showImage = !isPreset && !!imgSrc && !failed;
  return (
    <span className={`msgs-avatar ${className ?? ""}`} style={{ width: size, height: size, fontSize: Math.round(size * 0.46) }}>
      {isPreset ? (
        <span className="msgs-avatar-preset" style={{ background: `linear-gradient(135deg, ${preset!.a}, ${preset!.b})` }}>
          {preset!.glyph}
        </span>
      ) : showImage ? (
        <img className="msgs-avatar-img" src={imgSrc} alt={username} onError={() => setFailed(true)} />
      ) : (
        <span className="msgs-avatar-fallback">{initialsFor(username)}</span>
      )}
      {verified && <VerifiedBadge />}
      {status && <span className={`msgs-status-dot msgs-status-${status}`} style={statusSize ? { width: statusSize, height: statusSize } : undefined} />}
    </span>
  );
}

function rosterAvatar(user: { username: string; system?: boolean; preset: number }): AvSource {
  if (user.system) return { kind: "custom", data: SITE_LOGO };
  return { kind: "preset", id: user.preset };
}

const systemUser = (username: string): RosterUser | undefined =>
  username.toLowerCase() === "vertex" ? SYSTEM_USER : undefined;

const isTakenName = (u: string, current?: string | null, live: string[] = []) => {
  const v = u.trim().toLowerCase();
  if (!v) return false;
  if (current && v === current.toLowerCase()) return false;
  if (v === "vertex") return true;
  return live.includes(v) || regRead().includes(v);
};

const MAX_IMAGE_BYTES = 8_000_000;
const MAX_VIDEO_BYTES = 40_000_000;

function processFile(f: File, onErr: (m: string) => void): Promise<{ kind: "image" | "video"; blob: Blob; name: string } | null> {
  return new Promise((resolve) => {
    const isVideo = /^video\//i.test(f.type);
    if (!/^image\/(png|jpe?g|webp|gif)$/i.test(f.type) && !/^video\/(mp4|webm|quicktime|mov|x-matroska)$/i.test(f.type)) {
      onErr("Only images or videos are supported.");
      resolve(null);
      return;
    }
    if (isVideo) {
      if (f.size > MAX_VIDEO_BYTES) {
        onErr("That video is too large (max 40 MB).");
        resolve(null);
        return;
      }
      resolve({ kind: "video", blob: f, name: f.name || "clip.mp4" });
      return;
    }
    if (f.size > MAX_IMAGE_BYTES) {
      onErr("That image is too large (max 8 MB).");
      resolve(null);
      return;
    }
    const fr = new FileReader();
    fr.onerror = () => {
      onErr("Couldn't read that file.");
      resolve(null);
    };
    fr.onload = () => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement("canvas");
        const max = 1600;
        const sc = Math.min(1, max / Math.max(img.width, img.height));
        c.width = Math.max(1, Math.round(img.width * sc));
        c.height = Math.max(1, Math.round(img.height * sc));
        const ctx = c.getContext("2d");
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(img, 0, 0, c.width, c.height);
        c.toBlob((b) => (b ? resolve({ kind: "image", blob: b, name: f.name || "photo.jpg" }) : resolve(null)), "image/jpeg", 0.85);
      };
      img.onerror = () => {
        onErr("Couldn't decode that image.");
        resolve(null);
      };
      img.src = fr.result as string;
    };
    fr.readAsDataURL(f);
  });
}

interface RequestItem {
  username: string;
  at: number;
}

const AUTH_CSS = `
.msgs-auth{text-align:center}
.msgs-auth-brand{display:flex;flex-direction:column;align-items:center;gap:8px;margin-bottom:4px}
.msgs-auth-brand img{width:52px;height:52px;object-fit:contain}
.msgs-auth-tabs{display:flex;gap:6px;background:rgba(255,255,255,.07);border-radius:12px;padding:4px;margin:8px 0 16px}
.msgs-auth-tabs button{flex:1;border:0;background:transparent;color:inherit;opacity:.6;font-weight:600;padding:9px 8px;border-radius:9px;cursor:pointer;font-size:13px}
.msgs-auth-tabs button.on{background:rgba(255,255,255,.16);opacity:1}
.msgs-auth-form{display:flex;flex-direction:column;gap:12px;text-align:left}
.msgs-auth-form label{display:flex;flex-direction:column;gap:6px;font-size:12px;font-weight:600;opacity:.85}
.msgs-auth-form input{width:100%;padding:11px 12px;border-radius:11px;border:1px solid rgba(255,255,255,.16);background:rgba(0,0,0,.25);color:inherit;font-size:14px;outline:none;box-sizing:border-box}
.msgs-auth-form input:focus{border-color:#3b82f6}
.msgs-auth-pass{position:relative;display:flex;align-items:center}
.msgs-auth-pass button{position:absolute;right:8px;border:0;background:transparent;color:inherit;opacity:.6;font-size:12px;cursor:pointer;font-weight:600}
.msgs-auth-note{font-size:12px;opacity:.9;margin:0;color:#7dd3fc}
.msgs-auth-foot{margin:14px 0 0;font-size:12.5px;opacity:.75}
.msgs-auth-foot button{border:0;background:transparent;color:#60a5fa;font-weight:700;cursor:pointer;font-size:12.5px}
`;

function AuthModal({ onDone, live }: { onDone: (p: Profile) => void; live: string[] }) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [awaitProfile, setAwaitProfile] = useState(false);
  const [pendingName, setPendingName] = useState("");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setErr(null);
    setNote(null);
    const name = username.trim().toLowerCase();
    if (!/^[a-z0-9_]{2,16}$/.test(name)) {
      setErr("Use 2-16 letters, numbers or underscores.");
      return;
    }
    if (password.length < 6) {
      setErr("Password must be at least 6 characters.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "signup") {
        const res = await authSignUp(name, password);
        if (!res.ok) {
          if (res.needsConfirm) {
            setNote(res.error ?? "Confirm your account, then sign in.");
            setMode("signin");
          } else {
            setErr(res.error ?? "Could not create your account.");
          }
          return;
        }
        setPendingName(name);
        setAwaitProfile(true);
        return;
      }
      const res = await authSignIn(name, password);
      if (!res.ok) {
        setErr(res.error ?? "Could not sign in.");
        return;
      }
      const row = await loadMyProfileRow();
      if (row) {
        onDone({
          username: row.username,
          name: row.name || nameCap(row.username),
          avatar: { kind: "preset", id: row.avatarKind === "custom" ? hashPreset(row.username) : row.avatarId },
          status: row.status,
          role: row.role,
        });
      } else {
        setPendingName(name);
        setAwaitProfile(true);
      }
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  if (awaitProfile) return <SetupModal onDone={onDone} live={live} initialUsername={pendingName} />;

  return (
    <div className="msgs-modal-overlay">
      <div className="msgs-setup msgs-auth">
        <style>{AUTH_CSS}</style>
        <div className="msgs-auth-brand">
          <img src={SITE_LOGO} alt="McCrack" />
          <h2 className="msgs-setup-h">MESSAGES</h2>
          <h3 className="msgs-setup-sub">Sign in to chat with real accounts</h3>
        </div>
        <div className="msgs-auth-tabs">
          <button type="button" className={mode === "signin" ? "on" : ""} onClick={() => { setMode("signin"); setErr(null); setNote(null); }}>Sign in</button>
          <button type="button" className={mode === "signup" ? "on" : ""} onClick={() => { setMode("signup"); setErr(null); setNote(null); }}>Create account</button>
        </div>
        <form className="msgs-auth-form" onSubmit={submit}>
          <label>
            <span>Username</span>
            <input type="text" autoComplete="username" value={username} maxLength={16} onChange={(e) => { setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, "")); setErr(null); }} placeholder="username" autoFocus />
          </label>
          <label>
            <span>Password</span>
            <div className="msgs-auth-pass">
              <input
                type={showPass ? "text" : "password"}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setErr(null); }}
                placeholder="At least 6 characters"
              />
              <button type="button" onClick={() => setShowPass((v) => !v)}>{showPass ? "Hide" : "Show"}</button>
            </div>
          </label>
          {note && <p className="msgs-auth-note">{note}</p>}
          {err && <p className="msgs-setup-err">{err}</p>}
          <button type="submit" className="msgs-setup-next" disabled={busy}>
            {busy ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
          </button>
        </form>
        <p className="msgs-auth-foot">
          {mode === "signup" ? "Already have an account? " : "New to Messages? "}
          <button type="button" onClick={() => { setMode(mode === "signup" ? "signin" : "signup"); setErr(null); setNote(null); }}>
            {mode === "signup" ? "Sign in" : "Create account"}
          </button>
        </p>
      </div>
    </div>
  );
}

function SetupModal({ onDone, live, initialUsername }: { onDone: (p: Profile) => void; live: string[]; initialUsername?: string }) {
  const [step, setStep] = useState(0);
  const [avatar, setAvatar] = useState<AvSource>({ kind: "preset", id: 7 });
  const [username, setUsername] = useState(initialUsername ?? "");
  const [status, setStatus] = useState<Status>("online");
  const [usernameErr, setUsernameErr] = useState<string | null>(null);
  const [avatarErr, setAvatarErr] = useState<string | null>(null);
  const [shake, setShake] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const validateUsername = (u: string): string | null => {
    if (!/^[a-zA-Z0-9_]{2,16}$/.test(u)) return "Use 2-16 letters, numbers or underscores.";
    if (isTakenName(u, null, live)) return "That username is already taken.";
    return null;
  };

  const roll = () => {
    const chars = "abcdefghkmnpqrstuvwxyz23456789";
    let u = "";
    let guard = 0;
    do {
      const a = chars[Math.floor(Math.random() * chars.length)];
      const b = chars[Math.floor(Math.random() * chars.length)];
      const n = String(10 + Math.floor(Math.random() * 90));
      u = `${a}${b}${n}`;
      guard += 1;
    } while (isTakenName(u, null, live) && guard < 60);
    setUsername(u);
    setUsernameErr(null);
  };

  const onFile = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!/^image\/(png|jpe?g|webp|gif)$/i.test(f.type)) {
      setAvatarErr("Only images are supported.");
      return;
    }
    setAvatarErr(null);
    processFile(f, (m) => setAvatarErr(m)).then((media) => {
      if (!media) return;
      const fr = new FileReader();
      fr.onload = () => setAvatar({ kind: "custom", data: fr.result as string });
      fr.readAsDataURL(media.blob);
    });
  };

  const failStep = () => {
    setShake((s) => s + 1);
    setTimeout(() => setShake(0), 450);
  };

  const next = () => {
    if (step === 1 && !initialUsername) {
      const err = validateUsername(username);
      if (err) {
        setUsernameErr(err);
        failStep();
        return;
      }
    }
    if (step === 2) {
      const p: Profile = { username, name: username, avatar, status };
      regAdd(username);
      write(PROF_KEY, p);
      onDone(p);
      return;
    }
    setStep((s) => s + 1);
  };

  return (
    <div className="msgs-modal-overlay">
      <div className={`msgs-setup ${shake ? "msgs-shake" : ""}`}>
        <div className="msgs-setup-dots">
          {[0, 1, 2].map((i) => (
            <span key={i} className={i === step ? "on" : ""} />
          ))}
        </div>
        <div className="msgs-step-anim" key={step}>
          {step === 0 && (
            <>
              <div className="msgs-setup-preview">
                <GlyphAvatar src={avatar} size={54} username={username || "you"} status={status} statusSize={13} />
              </div>
              <h2 className="msgs-setup-h">SETUP PROFILE</h2>
              <h3 className="msgs-setup-sub">Choose your profile picture</h3>
              <div className="msgs-setup-grid">
                {PRESETS.map((p, i) => (
                  <button
                    key={i}
                    type="button"
                    className={`msgs-preset ${avatar.kind === "preset" && avatar.id === i ? "sel" : ""}`}
                    style={{ background: `linear-gradient(135deg, ${p.a}, ${p.b})` }}
                    onClick={() => {
                      setAvatar({ kind: "preset", id: i });
                      setAvatarErr(null);
                    }}
                  >
                    <span>{p.glyph}</span>
                  </button>
                ))}
              </div>
              <button type="button" className="msgs-setup-upload" onClick={() => fileRef.current?.click()}>
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 16V4m0 0l-4 4m4-4l4 4" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M4 15v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4" strokeLinecap="round" />
                </svg>
                Upload photo
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                style={{ display: "none" }}
                onChange={onFile}
              />
              {avatarErr && <p className="msgs-setup-err">{avatarErr}</p>}
            </>
          )}
          {step === 1 && (
            <>
              <div className="msgs-setup-preview">
                <GlyphAvatar src={avatar} size={54} username={username || "you"} status={status} statusSize={13} />
              </div>
              <h2 className="msgs-setup-h">SETUP PROFILE</h2>
              <h3 className="msgs-setup-sub">{initialUsername ? "Your username" : "Pick your username"}</h3>
              <p className="msgs-setup-tip">{initialUsername ? "This is the name you log in with." : "Roll a unique one or type your own. Taken names can't be reused."}</p>
              <div className={`msgs-setup-user ${usernameErr ? "msgs-setup-user-err" : ""}`}>
                <span className="msgs-at">@</span>
                <input
                  value={username}
                  maxLength={16}
                  autoFocus
                  readOnly={Boolean(initialUsername)}
                  spellCheck={false}
                  onChange={(e) => {
                    setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""));
                    setUsernameErr(null);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && next()}
                  placeholder="username"
                />
                {!initialUsername && (
                  <button type="button" className="msgs-roll" onClick={roll} title="Roll a unique username">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 12a9 9 0 1 1-2.64-6.36" strokeLinecap="round" />
                      <path d="M21 3v6h-6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Roll
                  </button>
                )}
              </div>
              {usernameErr ? (
                <p className="msgs-setup-err">{usernameErr}</p>
              ) : initialUsername ? (
                <p className="msgs-setup-ok">@{username} — this is your login name</p>
              ) : (
                username && <p className="msgs-setup-ok">@{username} is available</p>
              )}
            </>
          )}
          {step === 2 && (
            <>
              <div className="msgs-setup-preview">
                <GlyphAvatar src={avatar} size={54} username={username} status={status} statusSize={13} />
              </div>
              <h2 className="msgs-setup-h">SETUP PROFILE</h2>
              <h3 className="msgs-setup-sub">How do you want to appear?</h3>
              <div className="msgs-setup-statuses">
                {(
                  [
                    ["online", "#34c759"],
                    ["idle", "#ffcc00"],
                    ["offline", "#8e8e93"],
                  ] as [Status, string][]
                ).map(([s, color]) => (
                  <button
                    key={s}
                    type="button"
                    className={`msgs-setup-status ${status === s ? "sel" : ""}`}
                    onClick={() => setStatus(s)}
                  >
                    <span className="msgs-status-dot-glow" style={{ background: color }} />
                    <span style={{ textTransform: "capitalize" }}>{s}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        <div className="msgs-setup-actions">
          {step > 0 ? (
            <button type="button" className="msgs-setup-back" onClick={() => setStep((s) => s - 1)}>
              Back
            </button>
          ) : (
            <span />
          )}
          <button type="button" className="msgs-setup-next" onClick={next}>
            {step === 2 ? "Start chatting" : "Continue"}
          </button>
        </div>
      </div>
    </div>
  );
}

function NewChatModal({ people, me, onPick, onCreate, onClose }: {
  people: RosterUser[];
  me: string;
  onPick: (username: string) => void;
  onCreate?: (username: string) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const needle = q.trim().toLowerCase();
  const candidates = people
    .filter((r) => r.username.toLowerCase() !== me)
    .filter((r) => !needle || r.name.toLowerCase().includes(needle) || r.username.toLowerCase().includes(needle))
    .sort((a, b) => a.name.localeCompare(b.name));
  const notFound = needle !== "" && candidates.length === 0;
  return (
    <div className="msgs-modal-overlay" onClick={onClose}>
      <div className="msgs-newchat" onClick={(e) => e.stopPropagation()}>
        <div className="msgs-newchat-head">
          <h3>New message</h3>
          <button type="button" className="msgs-close-x" onClick={onClose}>✕</button>
        </div>
        <div className="msgs-search msgs-search-wide">
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search Messages users"
          />
        </div>
        <div className="msgs-newchat-list">
          {candidates.map((r) => (
            <button
              key={r.username}
              type="button"
              className="msgs-newchat-row"
              onClick={() => onPick(r.username)}
            >
              <GlyphAvatar src={r.avatar ?? { kind: "preset", id: r.preset }} size={42} username={r.username} status={r.status ?? "offline"} />
              <span className="msgs-newchat-meta">
                <span className="msgs-newchat-name">{r.name}</span>
                <span className="msgs-newchat-user">@{r.username}</span>
              </span>
            </button>
          ))}
          {notFound && onCreate ? (
            <button type="button" className="msgs-newchat-row msgs-newchat-create" onClick={() => onCreate(needle)}>
              <span className="msgs-newchat-meta">
                <span className="msgs-newchat-name">Message</span>
                <span className="msgs-newchat-user">@{needle}</span>
              </span>
            </button>
          ) : notFound ? (
            <p className="msgs-newchat-empty">No Messages users match @{needle}.</p>
          ) : (
            candidates.length === 0 && <p className="msgs-newchat-empty">No other Messages users yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function CreateGroupModal({ people, onCreate, onClose }: {
  people: RosterUser[];
  onCreate: (title: string, usernames: string[]) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  return (
    <div className="msgs-modal-overlay" onClick={onClose}>
      <div className="msgs-newchat msgs-group-modal" onClick={(e) => e.stopPropagation()}>
        <div className="msgs-newchat-head">
          <h3>New group chat</h3>
          <button type="button" className="msgs-close-x" onClick={onClose}>✕</button>
        </div>
        <input className="msgs-input msgs-group-title" autoFocus maxLength={64} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Group name" />
        <div className="msgs-newchat-list">
          {people.map((person) => {
            const checked = selected.includes(person.username);
            return (
              <button key={person.username} type="button" className="msgs-newchat-row" onClick={() => setSelected((xs) => checked ? xs.filter((x) => x !== person.username) : [...xs, person.username])}>
                <GlyphAvatar src={person.avatar ?? { kind: "preset", id: person.preset }} size={40} username={person.username} />
                <span className="msgs-newchat-meta"><span className="msgs-newchat-name">{person.name}</span><span className="msgs-newchat-user">@{person.username}</span></span>
                <span className={`msgs-group-check ${checked ? "on" : ""}`}>{checked ? "✓" : ""}</span>
              </button>
            );
          })}
          {people.length === 0 && <p className="msgs-newchat-empty">Add and accept at least one contact first.</p>}
        </div>
        <div className="msgs-group-footer">
          <span>{selected.length} selected</span>
          <button type="button" className="msgs-add-btn" disabled={!title.trim() || selected.length === 0} onClick={() => onCreate(title, selected)}>Create group</button>
        </div>
      </div>
    </div>
  );
}

// A camera track only counts as "live" when it came from a real device. The
// canvas placeholder track that getLocalStream() adds when the camera is blocked
// has no deviceId, so it must never be rendered as if it were a person.
const hasLiveCamera = (stream: MediaStream | null | undefined): boolean =>
  !!stream && stream.getVideoTracks().some((t) => t.readyState === "live" && Boolean(t.getSettings().deviceId));

// A track that arrived from the peer is judged on the receiver's own state: a
// remote track reports no deviceId, so asking for one would hide their video.
const hasRemoteVideo = (stream: MediaStream | null | undefined): boolean =>
  !!stream && stream.getVideoTracks().some((t) => t.readyState === "live" && t.enabled);

// Autoplay can be refused before the first user gesture, which leaves the video
// black even though srcObject is set, so every play is retried on interaction.
const safePlay = (el: HTMLVideoElement | null) => {
  if (!el || !el.srcObject || !el.paused) return;
  el.play().catch(() => { /* retried by the gesture listener below */ });
};

function CallOverlay({ call, onEnd, onActive, resolve }: {
  call: CallState;
  onEnd: () => void;
  onActive: () => void;
  resolve: (u: string) => RosterUser;
}) {
  const [tick, setTick] = useState(0);
  const [muted, setMuted] = useState(call.muted);
  const [camOff, setCamOff] = useState(call.camOff);
  const [local, setLocal] = useState<MediaStream | null>(null);
  const [remote, setRemote] = useState<MediaStream | null>(null);
  const [screen, setScreen] = useState<MediaStream | null>(null);
  const [screenErr, setScreenErr] = useState<string | null>(null);
  const [denied, setDenied] = useState(false);
  const [waitErr, setWaitErr] = useState<string | null>(null);
  const [remoteSlow, setRemoteSlow] = useState(false);
  const [camErr, setCamErr] = useState<string | null>(null);
  const [mediaRev, setMediaRev] = useState(0);
  const [accepted, setAccepted] = useState(!call.incoming);
  const localRef = useRef<MediaStream | null>(null);
  const pendingAcquire = useRef<Promise<MediaStream | null> | null>(null);
  const localVid = useRef<HTMLVideoElement | null>(null);
  const localVidStage = useRef<HTMLVideoElement | null>(null);
  const remoteVid = useRef<HTMLVideoElement | null>(null);
  const remoteAud = useRef<HTMLAudioElement | null>(null);
  const dialed = useRef(false);
  const alive = useRef(true);
  const wired = useRef<WeakSet<object>>(new WeakSet());
  const originalVideo = useRef<MediaStreamTrack | null>(null);
  const screenRef = useRef<MediaStream | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ dx: number; dy: number; ox: number; oy: number } | null>(null);
  const pipSizeRef = useRef(96);
  const [pipAt, setPipAt] = useState<{ x: number; y: number } | null>(null);
  const [me] = useState<Profile | null>(() => read<Profile | null>(PROF_KEY, null));

  const user = resolve(call.peer);
  const live = call.stage === "active";
  const ringing = call.incoming && !accepted;
  // Tracks can be added or unmuted long after the stream event fires, so the
  // camera flags are re-read on every bump of `mediaRev` instead of once.
  const remoteLive = live && hasRemoteVideo(remote);
  const selfLive = !!screen || (hasLiveCamera(local) && !camOff);
  const selfName = me?.name || me?.username || "You";
  const selfAvatar = me?.avatar ?? rosterAvatar({ username: selfName, preset: hashPreset(selfName) });
  const peerAvatar = rosterAvatar({ username: user.username, system: !!user.system, preset: user.preset });
  // Ringing video calls mirror WhatsApp: you check your own framing full screen
  // while the caller sits in the corner, then the roles swap once you answer.
  const bigIsSelf = ringing && call.kind === "video";
  const selfStream = screen ?? local;

  const bumpMedia = useCallback(() => setMediaRev((n) => n + 1), []);

  // Any track that arrives, mutes or ends after the call started has to trigger
  // a repaint, otherwise a camera that switches on late shows an empty tile.
  const watchStream = useCallback((stream: MediaStream | null) => {
    if (!stream) return;
    stream.addEventListener("addtrack", bumpMedia);
    stream.addEventListener("removetrack", bumpMedia);
    for (const track of stream.getTracks()) {
      track.addEventListener("unmute", bumpMedia);
      track.addEventListener("mute", bumpMedia);
      track.addEventListener("ended", bumpMedia);
    }
  }, [bumpMedia]);

  const bindVideo = useCallback((el: HTMLVideoElement | null, stream: MediaStream | null) => {
    if (!el) return;
    if (el.srcObject !== stream) el.srcObject = stream;
    if (stream) safePlay(el);
  }, []);

  const setLocalVideo = useCallback((el: HTMLVideoElement | null) => {
    localVid.current = el;
    bindVideo(el, selfStream);
  }, [bindVideo, selfStream]);

  const setLocalVideoStage = useCallback((el: HTMLVideoElement | null) => {
    localVidStage.current = el;
    bindVideo(el, selfStream);
  }, [bindVideo, selfStream]);

  const setRemoteVideo = useCallback((el: HTMLVideoElement | null) => {
    remoteVid.current = el;
    bindVideo(el, remote);
  }, [bindVideo, remote]);


  useEffect(() => {
    if (!live && !ringing) return;
    const t = setInterval(() => {
      setTick((x) => x + 1);
      // PeerJS keeps the stream it received on the connection, so this catches a
      // stream that arrived while nobody was listening for the event yet.
      const conn = getMediaConn(call.peer);
      const received = conn?.remoteStream;
      if (received && received.getTracks().length) {
        setRemote((prev) => (prev === received ? prev : received));
      }
    }, 1000);
    return () => clearInterval(t);
  }, [live, ringing, call.peer]);

  useEffect(() => {
    // Only the caller waits for an answer; an incoming ring never times out here.
    if (call.stage === "active" || waitErr || call.incoming) return;
    const t = setTimeout(() => setWaitErr("No answer yet. Check that they are online and try again."), 35_000);
    return () => clearTimeout(t);
  }, [call.stage, waitErr, call.incoming]);

  useEffect(() => {
    if (call.kind !== "video" || !live || remoteLive) {
      setRemoteSlow(false);
      return;
    }
    const t = setTimeout(() => setRemoteSlow(true), 8_000);
    return () => clearTimeout(t);
  }, [call.kind, live, remoteLive, mediaRev]);

  const dur = live ? Math.max(0, Math.floor((Date.now() - call.startedAt) / 1000)) : 0;
  const durStr = `${String(Math.floor(dur / 60)).padStart(2, "0")}:${String(dur % 60).padStart(2, "0")}`;

  const acquire = useCallback(async (): Promise<MediaStream | null> => {
    if (localRef.current) return localRef.current;
    // Answering while the permission prompt is still open used to fire a second
    // getUserMedia, which left two cameras running and the preview on the wrong
    // one. Everyone shares the same request instead.
    if (pendingAcquire.current) return pendingAcquire.current;
    const request = (async () => {
      try {
        const s = await getLocalStream(call.kind);
        if (!alive.current) {
          s.getTracks().forEach((t) => t.stop());
          return null;
        }
        localRef.current = s;
        setLocal(s);
        setCamOff(!hasLiveCamera(s));
        setDenied(false);
        watchStream(s);
        return s;
      } catch {
        setDenied(true);
        return null;
      } finally {
        pendingAcquire.current = null;
      }
    })();
    pendingAcquire.current = request;
    return request;
  }, [call.kind, watchStream]);

  // Both sides of the call need the same handlers, and the answering side needs
  // them before the answer is sent, otherwise the first media event is missed.
  const wire = useCallback((conn: ReturnType<typeof getMediaConn>) => {
    if (!conn || wired.current.has(conn)) return;
    wired.current.add(conn);
    conn.on("stream", (st: MediaStream) => {
      watchStream(st);
      setRemote(st);
      onActive();
    });
    const pc = conn.peerConnection;
    pc?.addEventListener("track", (ev) => {
      const stream = ev.streams[0];
      if (stream) {
        watchStream(stream);
        setRemote(stream);
      } else {
        setRemote((prev) => {
          const next = prev ?? new MediaStream();
          if (!next.getTracks().includes(ev.track)) next.addTrack(ev.track);
          return next;
        });
      }
      bumpMedia();
      onActive();
    });
  }, [bumpMedia, onActive, watchStream]);

  useEffect(() => {
    if (call.incoming || dialed.current) return;
    dialed.current = true;
    void (async () => {
      const s = await acquire();
      if (!s) return;
      try {
        const conn = await placeCall(call.peer, call.kind, s);
        wire(conn);
      } catch {
        setWaitErr(`@${user.name} didn't pick up.`);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [call.incoming, call.peer, call.kind]);

  // Ring with your own camera already up so the person being called can check
  // their framing before they pick up, the way WhatsApp does.
  useEffect(() => {
    if (call.kind !== "video" || accepted || localRef.current) return;
    void acquire();
  }, [call.kind, accepted, acquire, denied]);

  useEffect(() => {
    if (!call.incoming) return;
    wire(getMediaConn(call.peer));
  }, [call.incoming, call.peer, wire]);

  useEffect(() => {
    if (remote && remoteAud.current) remoteAud.current.srcObject = remote;
  }, [remote, accepted]);

  useEffect(() => {
    const retry = () => {
      for (const el of [remoteVid.current, localVid.current, localVidStage.current]) safePlay(el);
    };
    window.addEventListener("pointerdown", retry, true);
    window.addEventListener("keydown", retry, true);
    document.addEventListener("visibilitychange", retry);
    return () => {
      window.removeEventListener("pointerdown", retry, true);
      window.removeEventListener("keydown", retry, true);
      document.removeEventListener("visibilitychange", retry);
    };
  }, []);

  useEffect(() => {
    localRef.current?.getAudioTracks().forEach((t) => {
      t.enabled = !muted;
    });
  }, [muted, local]);

  useEffect(() => {
    localRef.current?.getVideoTracks().forEach((t) => {
      // Canvas placeholder tracks keep the video sender negotiated for screen share.
      t.enabled = !t.getSettings().deviceId || !camOff;
    });
  }, [camOff, local]);

  const stopScreenShare = useCallback(async () => {
    const conn = getMediaConn(call.peer);
    const replacement = originalVideo.current;
    const sender = conn?.peerConnection?.getSenders().find((item) => item.track?.kind === "video");
    try { if (sender && replacement) await sender.replaceTrack(replacement); } catch { /* the call may have ended */ }
    screenRef.current?.getTracks().forEach((track) => track.stop());
    screenRef.current = null;
    originalVideo.current = null;
    setScreen(null);
    setScreenErr(null);
    if (localRef.current) setLocal(localRef.current);
  }, [call.peer]);

  const startScreenShare = async () => {
    setScreenErr(null);
    try {
      const conn = getMediaConn(call.peer);
      const sender = conn?.peerConnection?.getSenders().find((item) => item.track?.kind === "video");
      if (!sender) throw new Error("Screen sharing is available in video calls. Start a video call first.");
      const display = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      const track = display.getVideoTracks()[0];
      if (!track) throw new Error("No screen was selected.");
      originalVideo.current = sender.track;
      await sender.replaceTrack(track);
      screenRef.current = display;
      setScreen(display);
      setLocal(new MediaStream([...(localRef.current?.getAudioTracks() ?? []), track]));
      track.onended = () => { void stopScreenShare(); };
    } catch (error) {
      setScreenErr(error instanceof Error ? error.message : "Could not share your screen.");
    }
  };

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      screenRef.current?.getTracks().forEach((t) => t.stop());
      screenRef.current = null;
      localRef.current?.getTracks().forEach((t) => t.stop());
      localRef.current = null;
      endCall(call.peer);
    };
  }, [call.peer]);

  const accept = async () => {
    const s = await acquire();
    if (!s) return;
    const conn = answerCall(call.peer, s);
    if (!conn) {
      setWaitErr("That call already ended.");
      return;
    }
    wire(conn);
    setAccepted(true);
  };

  // A blocked camera used to leave the caller stuck on an avatar for the whole
  // call. The new track replaces the placeholder on the live connection, which
  // needs no renegotiation, so both sides see each other right away.
  const startCamera = async () => {
    setCamErr(null);
    try {
      const cam = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
      const track = cam.getVideoTracks()[0];
      if (!track) throw new Error("No camera was found on this device.");
      const base = localRef.current ?? new MediaStream();
      if (!base.getAudioTracks().length) {
        try {
          const mic = await navigator.mediaDevices.getUserMedia({ audio: true });
          mic.getAudioTracks().forEach((t) => base.addTrack(t));
        } catch { /* carry on with video only */ }
      }
      const next = new MediaStream([...base.getAudioTracks(), track]);
      for (const old of base.getVideoTracks()) if (old !== track) old.stop();
      localRef.current = next;
      setLocal(next);
      setCamOff(false);
      setDenied(false);
      watchStream(next);
      const conn = getMediaConn(call.peer);
      const sender = conn?.peerConnection?.getSenders().find((item) => item.track?.kind === "video");
      if (sender) await sender.replaceTrack(track);
      else conn?.peerConnection?.addTrack(track, next);
      safePlay(localVid.current);
      safePlay(localVidStage.current);
    } catch (error) {
      setCamErr(error instanceof Error ? error.message : "Could not start the camera.");
    }
  };

  const hangUp = () => {
    endCall(call.peer);
    onEnd();
  };

  // WhatsApp-style draggable self view. The pip is 96px in CSS; JS only needs it
  // to clamp the drag inside the stage.
  const placePip = (px: number, py: number) => {
    const stage = stageRef.current;
    if (!stage) return;
    const size = pipSizeRef.current;
    const maxX = Math.max(8, stage.clientWidth - size - 8);
    const maxY = Math.max(8, stage.clientHeight - size - 8);
    setPipAt({ x: Math.min(Math.max(px, 8), maxX), y: Math.min(Math.max(py, 8), maxY) });
  };

  const onPipDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    const stage = stageRef.current;
    if (!stage) return;
    const box = event.currentTarget.getBoundingClientRect();
    const stageBox = stage.getBoundingClientRect();
    pipSizeRef.current = box.width || 96;
    setPipAt(pipAt ?? { x: Math.max(8, stage.clientWidth - box.width - 12), y: 12 });
    dragRef.current = {
      dx: event.clientX - box.left,
      dy: event.clientY - box.top,
      ox: stageBox.left,
      oy: stageBox.top,
    };
    try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* pointer already gone */ }
    event.preventDefault();
  };

  const onPipMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    placePip(event.clientX - drag.ox - drag.dx, event.clientY - drag.oy - drag.dy);
  };

  const onPipUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    dragRef.current = null;
    try { event.currentTarget.releasePointerCapture(event.pointerId); } catch { /* nothing captured */ }
  };

  const statusText = waitErr ?? (ringing ? `Incoming ${call.kind} call` : live ? durStr : "Calling…");

  // A person who is not sending video gets a labelled tile instead of a bare
  // avatar, so a camera that is off never looks like a broken call.
  const peerNote = ringing
    ? "Incoming video call"
    : remoteSlow
      ? "Their camera is still connecting…"
      : live
        ? "Camera is off"
        : "Calling…";
  const peerTile = (
    <div className={`msgs-video-tile${remoteLive ? " off" : ""}`}>
      <GlyphAvatar src={peerAvatar} size={live ? 72 : 96} username={user.username} verified={!!user.verified} />
      <span className="msgs-video-tile-name">{user.name}</span>
      <span className="msgs-video-tile-note">{peerNote}</span>
    </div>
  );

  const stageError = waitErr ? (
    <div className="msgs-cam-err">
      <span>{waitErr}</span>
      <button type="button" onClick={hangUp}>Close</button>
    </div>
  ) : null;

  const endIcon = (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
      <path d="M12 9c-2.7 0-5.2.9-7.3 2.4-.6.4-.7 1.2-.2 1.8l1.4 1.6c.4.5 1 .7 1.6.5l2-.6c.6-.2 1-.8 1-1.4v-2c1-.2 2-.3 3-.3s2 .1 3 .3v2c0 .6.4 1.2 1 1.4l2 .6c.6.2 1.2 0 1.6-.5l1.4-1.6c.5-.6.4-1.4-.2-1.8A12.5 12.5 0 0 0 12 9z" />
    </svg>
  );

  const micBtn = (
    <button type="button" className={`msgs-call-btn ${muted ? "off" : ""}`} onClick={() => setMuted((v) => !v)}>
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.9">
        <path d="M12 16a5 5 0 0 0 5-5V7a5 5 0 0 0-10 0v4a5 5 0 0 0 5 5z" strokeLinejoin="round" />
        {muted && <path d="M4 4l16 16" strokeLinecap="round" />}
        <path d="M19 11a7 7 0 0 1-7 7v0a0 0 1 0-1-2.29M5 11a7 7 0 0 0 .6 2.85" strokeLinecap="round" />
      </svg>
    </button>
  );

  const camBtn = (
    <button type="button" className={`msgs-call-btn ${camOff ? "off" : ""}`} onClick={() => setCamOff((v) => !v)}>
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.9">
        <rect x="3" y="6" width="13" height="12" rx="2.5" />
        <path d="M16 10l5-3v10l-5-3" strokeLinejoin="round" />
        {camOff && <path d="M4 4l16 16" strokeLinecap="round" />}
      </svg>
    </button>
  );

  const ringControls = (
    <div className="msgs-call-controls">
      <button type="button" className="msgs-call-btn end" onClick={hangUp}>{endIcon}</button>
      <button type="button" className="msgs-call-btn accept" onClick={() => void accept()}>{endIcon}</button>
    </div>
  );

  const liveControls = (
    <div className="msgs-call-controls">
      {micBtn}
      {call.kind === "video" && camBtn}
      {call.kind === "video" && (
        <button type="button" className={`msgs-call-btn ${screen ? "off" : ""}`} title={screen ? "Stop sharing" : "Share screen"} onClick={() => screen ? void stopScreenShare() : void startScreenShare()}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.9"><rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4m-3-9 3-3 3 3m-3-3v7" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
      )}
      <button type="button" className="msgs-call-btn end" onClick={hangUp}>{endIcon}</button>
    </div>
  );

  const camGlyph = (
    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.9">
      <rect x="3" y="6" width="13" height="12" rx="2.5" />
      <path d="M16 10l5-3v10l-5-3" strokeLinejoin="round" />
    </svg>
  );

  // Why the self view is not a live picture, plus the one button that fixes it.
  const selfFallback = selfLive ? null : denied ? (
    <button type="button" className="msgs-cam-start" onClick={() => void acquire()} title="Camera or mic is blocked. Allow access for this site in your browser, then retry.">
      {camGlyph}
      <span>Retry</span>
    </button>
  ) : camErr ? (
    <button type="button" className="msgs-cam-start" onClick={() => void startCamera()} title={camErr}>
      {camGlyph}
      <span>Retry</span>
    </button>
  ) : !local ? (
    <>
      <GlyphAvatar src={selfAvatar} size={40} username={selfName} />
      <span className="msgs-pip-wait">Starting your camera…</span>
    </>
  ) : (
    <button type="button" className="msgs-cam-start" onClick={() => void startCamera()} title="Turn your camera on">
      {camGlyph}
      <span>Start</span>
    </button>
  );

  const selfPip = (
    <div
      className={`msgs-call-pip self${selfLive ? " live" : " idle"}`}
      style={pipAt ? { left: pipAt.x, top: pipAt.y, right: "auto" } : undefined}
      onPointerDown={onPipDown}
      onPointerMove={onPipMove}
      onPointerUp={onPipUp}
      onPointerCancel={onPipUp}
      title="Drag to move your camera"
    >
      <video ref={setLocalVideo} className={`msgs-pip-video${selfLive ? " on" : ""}`} autoPlay playsInline muted draggable={false} />
      <div className={`msgs-pip-fallback${selfLive ? " off" : ""}`}>{selfFallback}</div>
      <span className="msgs-pip-tag">{screen ? "Your screen" : "You"}</span>
    </div>
  );

  const peerPip = (
    <div className={`msgs-call-pip peer${bigIsSelf ? " on" : ""}`}>
      <GlyphAvatar src={peerAvatar} size={38} username={user.username} verified={!!user.verified} />
      <span className="msgs-pip-tag">{user.name}</span>
    </div>
  );

  // Incoming call before it is answered: show an Apple-style notification at the
  // top of the screen and keep the real accept()/hangUp() signalling intact.
  if (ringing) {
    return createPortal(
      <div className="msgs-banner msgs-banner--call">
        <GlyphAvatar src={peerAvatar} size={44} username={user.username} verified={!!user.verified} />
        <div className="msgs-banner-body">
          <span className="msgs-banner-name">{user.name}</span>
          <span className="msgs-banner-sub">{call.kind === "video" ? "Incoming video call…" : "Incoming call…"}</span>
        </div>
        <div className="msgs-banner-actions">
          <button type="button" className="msgs-banner-btn msgs-banner-btn--decline" title="Decline" onClick={hangUp}>✕</button>
          <button type="button" className="msgs-banner-btn msgs-banner-btn--accept" title="Answer" onClick={() => void accept()}>{call.kind === "video" ? "🎥" : "📞"}</button>
        </div>
      </div>,
      document.body,
    );
  }

  return (
    <div className="msgs-call-overlay">
      <div className={`msgs-call-card ${call.kind === "video" ? "video" : ""}`}>
        <audio ref={remoteAud} autoPlay />
        {call.kind === "video" ? (
          <>
            <div ref={stageRef} className={`msgs-call-stage ${remoteLive && !bigIsSelf ? "has-cam" : "no-cam"}`}>
              <video
                ref={setRemoteVideo}
                className={`msgs-cam-video${remoteLive && !bigIsSelf ? " on" : ""}`}
                autoPlay
                playsInline
                draggable={false}
              />
              <video
                ref={setLocalVideoStage}
                className={`msgs-cam-video self${bigIsSelf && selfLive ? " on" : ""}`}
                autoPlay
                playsInline
                muted
                draggable={false}
              />
              {bigIsSelf ? peerPip : <>{peerTile}{selfPip}</>}
              {stageError}
            </div>
            <div className="msgs-call-meta">
              <span className="msgs-call-name">{user.name}</span>
              <span className="msgs-call-state">{screen ? "Sharing your screen" : camOff ? `${statusText} · your camera is off` : statusText}</span>
              {camErr && <span className="msgs-call-screen-error">{camErr}</span>}
              {screenErr && <span className="msgs-call-screen-error">{screenErr}</span>}
            </div>
            {ringing ? ringControls : liveControls}
          </>
        ) : (
          <>
            <div className="msgs-call-avatar-wrap">
              <GlyphAvatar src={peerAvatar} size={120} username={user.username} verified={!!user.verified} />
              <span className="msgs-call-ring" />
              <span className="msgs-call-ring r2" />
            </div>
            <div className="msgs-call-meta">
              <span className="msgs-call-name">{user.name}</span>
              <span className="msgs-call-state">{statusText}</span>
            </div>
            {ringing ? ringControls : liveControls}
          </>
        )}
      </div>
    </div>
  );
}

function fmtBig(n: number): string {
  const v = Number.isFinite(n) ? Math.max(0, n) : 0;
  if (v < 1000) return String(Math.floor(v));
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(v).replace(/\.0$/, "");
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("That image could not be loaded."));
    img.src = url;
  });
}

async function cropToRatio(dataUrl: string, ratio: number): Promise<string> {
  try {
    const img = await loadImage(dataUrl);
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    if (!w || !h) return dataUrl;
    let cw = w;
    let ch = h;
    const target = w / h;
    if (Math.abs(target - ratio) > 0.02) {
      if (target > ratio) cw = Math.max(1, Math.round(h * ratio));
      else ch = Math.max(1, Math.round(w / ratio));
    }
    const sx = Math.round((w - cw) / 2);
    const sy = Math.round((h - ch) / 2);
    const canvas = document.createElement("canvas");
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext("2d");
    if (!ctx) return dataUrl;
    ctx.drawImage(img, sx, sy, cw, ch, 0, 0, cw, ch);
    return canvas.toDataURL("image/jpeg", 0.85);
  } catch {
    return dataUrl;
  }
}

function InfoModal({ title, lines, onClose }: { title: string; lines: string[]; onClose: () => void }) {
  return (
    <div className="msgs-info-overlay" onClick={onClose}>
      <div className="msgs-info-card" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={title}>
        <header className="msgs-info-head">
          <h3>{title}</h3>
          <button type="button" className="msgs-info-close" onClick={onClose} aria-label="Close">✕</button>
        </header>
        <ul>
          {lines.map((line) => <li key={line}>{line}</li>)}
        </ul>
      </div>
    </div>
  );
}

function SwitchButton({ on, onToggle, label }: { on: boolean; onToggle: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      className={`msgs-settings-switch${on ? " on" : ""}`}
      onClick={onToggle}
    >
      <span className="msgs-settings-knob" />
    </button>
  );
}

function SettingsPanel({ profile, notifOn, onNotif, enterSends, onEnterSends, onBack, onOpenProfile, onEditProfile, onSignOut, onInfo, isOwner, onLab }: {
  profile: Profile;
  notifOn: boolean;
  onNotif: (v: boolean) => void;
  enterSends: boolean;
  onEnterSends: (v: boolean) => void;
  onBack: () => void;
  onOpenProfile: () => void;
  onEditProfile: () => void;
  onSignOut: () => void;
  onInfo: (title: string, lines: string[]) => void;
  isOwner: boolean;
  onLab: () => void;
}) {
  return (
    <div className="msgs-panel msgs-settings">
      <header className="msgs-panel-head">
        <button type="button" className="msgs-panel-back" onClick={onBack} aria-label="Back">‹</button>
        <span className="msgs-panel-title">Settings</span>
      </header>
      <div className="msgs-panel-scroll msgs-settings-body">
        <button type="button" className="msgs-settings-account" onClick={onOpenProfile}>
          <GlyphAvatar src={profile.avatar} size={58} username={profile.username} verified={profile.verified} status={profile.status} statusSize={16} />
          <span className="msgs-settings-account-meta">
            <span className={`msgs-settings-name${nameFxClass(profile.effects)}`}>
              {profile.name}
              <RoleBadge role={profile.role} />
              {profile.verified && <VerifiedBadge />}
            </span>
            <small>@{profile.username}</small>
          </span>
          <span className="msgs-settings-arrow">›</span>
        </button>

        <div className="msgs-settings-group">
          <div className="msgs-settings-label">Account</div>
          <div className="msgs-settings-section">
            <button type="button" className="msgs-settings-row" onClick={onEditProfile}>
              <span className="msgs-settings-icon">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.9"><circle cx="12" cy="8" r="4" /><path d="M4 20v-1a8 8 0 0 1 16 0v1" strokeLinecap="round" /></svg>
              </span>
              <span className="msgs-settings-row-meta">
                <strong>Edit profile</strong>
                <small>Name, avatar, banner and bio</small>
              </span>
              <span className="msgs-settings-arrow">›</span>
            </button>
          </div>
        </div>

        {isOwner && (
          <div className="msgs-settings-group">
            <div className="msgs-settings-label">Experimental</div>
            <div className="msgs-settings-section">
              <button type="button" className="msgs-settings-row" onClick={onLab}>
                <span className="msgs-settings-icon msgs-settings-icon-lab">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.9"><path d="M9 3h6M10 3v5.1L4.6 17a3 3 0 0 0 2.6 4.5h9.6a3 3 0 0 0 2.6-4.5L14 8.1V3" strokeLinecap="round" strokeLinejoin="round" /><path d="M7.2 14h9.6" strokeLinecap="round" /></svg>
                </span>
                <span className="msgs-settings-row-meta">
                  <strong>Experimental Features Lab</strong>
                  <small>Hidden prototypes, badges & unreleased features</small>
                </span>
                <span className="msgs-settings-arrow">›</span>
              </button>
            </div>
          </div>
        )}

        <div className="msgs-settings-group">
          <div className="msgs-settings-label">App</div>
          <div className="msgs-settings-section">
            <div className="msgs-settings-row">
              <span className="msgs-settings-icon">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.9"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" strokeLinecap="round" /></svg>
              </span>
              <span className="msgs-settings-row-meta">
                <strong>Notifications</strong>
                <small>Alert when a new message arrives</small>
              </span>
              <SwitchButton on={notifOn} onToggle={() => onNotif(!notifOn)} label="Message notifications" />
            </div>
            <div className="msgs-settings-row">
              <span className="msgs-settings-icon">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.9"><rect x="2" y="6" width="20" height="12" rx="2" /><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M6 14h.01M10 14h.01M14 14h4" strokeLinecap="round" /></svg>
              </span>
              <span className="msgs-settings-row-meta">
                <strong>Enter to send</strong>
                <small>Shift+Enter makes a new line</small>
              </span>
              <SwitchButton on={enterSends} onToggle={() => onEnterSends(!enterSends)} label="Enter to send" />
            </div>
            <button type="button" className="msgs-settings-row" onClick={() => onInfo("Privacy", [
              "Your profile is public in Messages: your name, @username, bio and banner.",
              "Only accepted contacts can message you directly.",
              "Anyone else can send you a contact request, or you can request them.",
              "Followers and following are public, like on TikTok or Roblox.",
            ])}>
              <span className="msgs-settings-icon">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.9"><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" strokeLinecap="round" /></svg>
              </span>
              <span className="msgs-settings-row-meta">
                <strong>Privacy</strong>
                <small>Who can reach you and what is visible</small>
              </span>
              <span className="msgs-settings-arrow">›</span>
            </button>
            <button type="button" className="msgs-settings-row" onClick={() => onInfo("Appearance", [
              "Messages follows the McCrack OS dark theme.",
              "The orange accent matches the McCrack OS brand (#ff5a1f).",
            ])}>
              <span className="msgs-settings-icon">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.9"><circle cx="12" cy="12" r="4" /><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4" strokeLinecap="round" /></svg>
              </span>
              <span className="msgs-settings-row-meta">
                <strong>Appearance</strong>
                <small>Dark theme with an orange accent</small>
              </span>
              <span className="msgs-settings-arrow">›</span>
            </button>
          </div>
        </div>

        <div className="msgs-settings-group">
          <div className="msgs-settings-label">Support</div>
          <div className="msgs-settings-section">
            <button type="button" className="msgs-settings-row" onClick={() => onInfo("Help", [
              "Open a profile from People or from any chat header to follow or message someone.",
              "Message an @username — the other person gets a contact request they can accept or decline.",
              "Unreleased and beta features are listed in the profile's Beta section.",
              "Group chats work from the sidebar's new-group button.",
            ])}>
              <span className="msgs-settings-icon">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.9"><circle cx="12" cy="12" r="9" /><path d="M9.4 9a2.6 2.6 0 0 1 5.1.8c0 1.7-2.5 2.2-2.5 3.7" strokeLinecap="round" /><path d="M12 17h.01" strokeLinecap="round" /></svg>
              </span>
              <span className="msgs-settings-row-meta">
                <strong>Help</strong>
                <small>How Messages works</small>
              </span>
              <span className="msgs-settings-arrow">›</span>
            </button>
            <button type="button" className="msgs-settings-row" onClick={() => onInfo("About", [
              "Messages 1.0 — part of McCrack OS.",
              "Built with React, Vite and Supabase.",
              "Fully open source.",
            ])}>
              <span className="msgs-settings-icon">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.9"><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" strokeLinecap="round" /></svg>
              </span>
              <span className="msgs-settings-row-meta">
                <strong>About</strong>
                <small>Version and credits</small>
              </span>
              <span className="msgs-settings-arrow">›</span>
            </button>
          </div>
        </div>

        <div className="msgs-settings-group">
          <div className="msgs-settings-label">Session</div>
          <div className="msgs-settings-section">
            <button type="button" className="msgs-settings-row msgs-settings-danger" onClick={onSignOut}>
              <span className="msgs-settings-icon">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.9"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5M21 12H9" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </span>
              <span className="msgs-settings-row-meta">
                <strong>Log out</strong>
                <small>Sign out of this device</small>
              </span>
              <span className="msgs-settings-arrow">›</span>
            </button>
          </div>
        </div>

        <p className="msgs-settings-version">Messages 1.0 · built for McCrack OS</p>
      </div>
    </div>
  );
}

function LabPanel({ adminOwner, isOwner, badges, effects, lab, onLab, onToggleBadge, onToggleEffect, onReset, onBack }: {
  adminOwner: boolean;
  isOwner: boolean;
  badges: BadgeId[];
  effects: string[];
  lab: LabState;
  onLab: (k: keyof LabState) => void;
  onToggleBadge: (id: BadgeId) => void;
  onToggleEffect: (id: string) => void;
  onReset: () => void;
  onBack: () => void;
}) {
  const [tab, setTab] = useState<"badges" | "chat" | "layout" | "about">("badges");
  const rows: { key: keyof LabState; title: string; sub: string; icon: ReactNode }[] = [
    {
      key: "anim",
      title: "Bubble slam animation",
      sub: "New messages spring in with a bounce",
      icon: <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.9"><path d="M21 12a9 9 0 1 1-9-9" strokeLinecap="round" /><path d="M12 6v6l4 2" strokeLinecap="round" strokeLinejoin="round" /></svg>,
    },
    {
      key: "cozy",
      title: "Cozy bubbles",
      sub: "Bigger, softer message bubbles",
      icon: <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.9"><path d="M21 11.5a8.5 8.5 0 0 1-12.4 7.5L3 20l1-5.6A8.5 8.5 0 1 1 21 11.5Z" strokeLinejoin="round" /></svg>,
    },
    {
      key: "redesign",
      title: "Next-gen redesign",
      sub: "Preview the upcoming chat window UI",
      icon: <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.9"><circle cx="12" cy="12" r="9" /><path d="M12 3v18M12 12l8-1.5M12 12l-8-1.5" strokeLinecap="round" /></svg>,
    },
    {
      key: "compact",
      title: "Compact sidebar",
      sub: "Tighter rows in the chat list",
      icon: <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.9"><path d="M4 7h16M4 12h16M4 17h10" strokeLinecap="round" /></svg>,
    },
  ];
  const switchRow = (r: (typeof rows)[number]) => (
    <div className="msgs-settings-row" key={r.key}>
      <span className="msgs-settings-icon">{r.icon}</span>
      <span className="msgs-settings-row-meta">
        <strong>{r.title}</strong>
        <small>{r.sub}</small>
      </span>
      <SwitchButton on={lab[r.key]} onToggle={() => onLab(r.key)} label={r.title} />
    </div>
  );
  const badgeSwitchRow = (id: BadgeId) => {
    const meta = BADGES.find((b) => b.id === id);
    if (!meta) return null;
    return (
      <div className="msgs-settings-row" key={id}>
        <span className="msgs-settings-icon msgs-settings-badge-icon">{badgeChip(id)}</span>
        <span className="msgs-settings-row-meta">
          <strong>{meta.title}</strong>
          <small>{id === "verified" ? "Blue checkmark on your profile" : `Shown to everyone as "${meta.label}"`}</small>
        </span>
        <SwitchButton on={badges.includes(id)} onToggle={() => onToggleBadge(id)} label={meta.title} />
      </div>
    );
  };
  return (
    <div className="msgs-panel msgs-settings">
      <header className="msgs-panel-head">
        <button type="button" className="msgs-panel-back" onClick={onBack} aria-label="Back">‹</button>
        <span className="msgs-panel-title">Experimental Features Lab</span>
        <span className="msgs-role msgs-role-experimental" title="Experimental Features Lab">EXPERIMENTAL</span>
        <span className="msgs-role msgs-role-lab" title="McCrack Lab">LAB</span>
      </header>
      <div className="msgs-panel-scroll msgs-settings-body">
        <div className="msgs-lab-tabs" role="tablist">
          <button type="button" role="tab" aria-selected={tab === "badges"} className={`msgs-profile-tab${tab === "badges" ? " on" : ""}`} onClick={() => setTab("badges")}>Badges</button>
          <button type="button" role="tab" aria-selected={tab === "chat"} className={`msgs-profile-tab${tab === "chat" ? " on" : ""}`} onClick={() => setTab("chat")}>Chat</button>
          <button type="button" role="tab" aria-selected={tab === "layout"} className={`msgs-profile-tab${tab === "layout" ? " on" : ""}`} onClick={() => setTab("layout")}>Layout</button>
          <button type="button" role="tab" aria-selected={tab === "about"} className={`msgs-profile-tab${tab === "about" ? " on" : ""}`} onClick={() => setTab("about")}>About</button>
        </div>

        {tab === "badges" && (
          <>
            <div className="msgs-lab-preview">
              <span className="msgs-lab-preview-av">🧪</span>
              <span className="msgs-lab-preview-meta">
                <span className={`msgs-lab-preview-name${nameFxClass(effects)}`}>Lab preview</span>
                <span className="msgs-profile-badges msgs-lab-preview-badges">{badges.length ? renderBadges(badges, "pv-") : <span className="msgs-role msgs-role-none" title="No badges">NO BADGES</span>}</span>
              </span>
            </div>
            <div className="msgs-settings-group">
              <div className="msgs-settings-label">Your badges · all of them, each a real toggle</div>
              <div className="msgs-settings-section">
                {ALL_BADGE_IDS.map(badgeSwitchRow)}
              </div>
            </div>
            <div className="msgs-settings-group">
              <div className="msgs-settings-label">Name effects</div>
              <div className="msgs-settings-section">
                <div className="msgs-settings-row">
                  <span className="msgs-settings-icon">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.9"><circle cx="12" cy="12" r="4" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1" strokeLinecap="round" /></svg>
                  </span>
                  <span className="msgs-settings-row-meta">
                    <strong>Glow name</strong>
                    <small>Blue glow behind your name</small>
                  </span>
                  <SwitchButton on={effects.includes("glow")} onToggle={() => onToggleEffect("glow")} label="Glow" />
                </div>
                <div className="msgs-settings-row">
                  <span className="msgs-settings-icon">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.9"><path d="M3 18l4-9 3.5 6 2.5-4L18 18H3Z" strokeLinejoin="round" /><path d="M16 6h5M18.5 3.5v5" strokeLinecap="round" /></svg>
                  </span>
                  <span className="msgs-settings-row-meta">
                    <strong>Moving name</strong>
                    <small>Animated gradient on your name</small>
                  </span>
                  <SwitchButton on={effects.includes("moving-name")} onToggle={() => onToggleEffect("moving-name")} label="Moving name" />
                </div>
              </div>
            </div>
            <p className="msgs-lab-note">Every badge here is a real switch: turning one off hides it from everyone else. Changes save straight to your database profile.</p>
          </>
        )}

        {tab === "chat" && (
          <>
            <div className="msgs-settings-group">
              <div className="msgs-settings-label">Chat experiments</div>
              <div className="msgs-settings-section">{rows.slice(0, 2).map(switchRow)}</div>
            </div>
            <p className="msgs-lab-note">These toggles apply to the live chat instantly so you can judge them with real messages.</p>
          </>
        )}

        {tab === "layout" && (
          <>
            <div className="msgs-settings-group">
              <div className="msgs-settings-label">Layout experiments</div>
              <div className="msgs-settings-section">{rows.slice(2).map(switchRow)}</div>
            </div>
            <p className="msgs-lab-note">The redesign preview restyles the whole Messages window while keeping every feature intact.</p>
          </>
        )}

        {tab === "about" && (
          <>
            <div className="msgs-settings-group">
              <div className="msgs-settings-label">About the Lab</div>
              <div className="msgs-settings-section">
                <div className="msgs-lab-about">
                  <h4>Hidden features, real switches.</h4>
                  <p>The Lab is a hidden settings page for admins. Toggles here change the real Messages UI so you can preview unfinished features before they ship.</p>
                  <p><strong>Access:</strong> {adminOwner ? "Local Control Panel session active — admin tools unlocked." : isOwner ? "Your Messages account is the Database Owner — admin tools unlocked." : "Not an owner — toggles only preview locally for you."}</p>
                  <p><strong>EXPERIMENTAL / LAB badges:</strong> shown on the Owner's profile for everyone to see.</p>
                </div>
              </div>
            </div>
            <div className="msgs-settings-group">
              <div className="msgs-settings-label">Danger zone</div>
              <div className="msgs-settings-section">
                <button type="button" className="msgs-settings-row msgs-settings-danger" onClick={onReset}>
                  <span className="msgs-settings-icon">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.9"><path d="M3 12a9 9 0 1 0 3-6.7L3 8" strokeLinecap="round" strokeLinejoin="round" /><path d="M3 4v4h4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </span>
                  <span className="msgs-settings-row-meta">
                    <strong>Reset all Lab settings</strong>
                    <small>Turn every experimental toggle off</small>
                  </span>
                  <span className="msgs-settings-arrow">›</span>
                </button>
              </div>
            </div>
            <p className="msgs-settings-version">Experimental Features Lab · McCrack OS internal</p>
          </>
        )}
      </div>
    </div>
  );
}

function EditProfilePanel({ profile, adminOwner, onBack, onSave }: {
  profile: Profile;
  adminOwner: boolean;
  onBack: () => void;
  onSave: (p: Profile) => void;
}) {
  const [avatar, setAvatar] = useState<AvSource>(profile.avatar);
  const [displayName, setDisplayName] = useState(profile.name);
  const [status, setStatus] = useState<Status>(profile.status);
  const [username, setUsername] = useState(profile.username);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [bio, setBio] = useState(profile.bio ?? "");
  const [banner, setBanner] = useState(profile.banner ?? "");
  const fileRef = useRef<HTMLInputElement>(null);
  const bannerRef = useRef<HTMLInputElement>(null);

  const onFile = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!/^image\/(png|jpe?g|webp|gif)$/i.test(f.type)) {
      setErr("Only images are supported.");
      return;
    }
    void (async () => {
      setErr(null);
      const media = await processFile(f, setErr);
      if (!media) return;
      const fr = new FileReader();
      fr.onload = () => {
        void cropToRatio(fr.result as string, 1).then((squared) => setAvatar({ kind: "custom", data: squared }));
      };
      fr.readAsDataURL(media.blob);
    })();
  };

  const onBanner = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!/^image\/(png|jpe?g|webp|gif)$/i.test(f.type)) {
      setErr("Only images are supported.");
      return;
    }
    void (async () => {
      setErr(null);
      const media = await processFile(f, setErr);
      if (!media) return;
      const fr = new FileReader();
      fr.onload = () => {
        void cropToRatio(fr.result as string, 3).then((wide) => setBanner(wide));
      };
      fr.readAsDataURL(media.blob);
    })();
  };

  const save = () => {
    const next: Profile = { ...profile, name: displayName.trim().slice(0, 64) || profile.username, avatar, status, bio, banner };
    onSave(next);
    writePageOverride(profile.username, { bio, banner, avatar, joinedAt: profile.joinedAt ?? Date.now(), role: profile.role, verified: profile.verified, effects: profile.effects });
    void netSaveProfilePage(bio, banner).catch(() => { /* columns may not be migrated yet */ });
    setOk("Profile updated.");
  };

  const changeName = async () => {
    const next = username.trim().toLowerCase();
    if (next === profile.username.toLowerCase()) return;
    if (!/^[a-z0-9_]{2,16}$/.test(next)) {
      setErr("Usernames are 2-16 letters, numbers or underscores.");
      return;
    }
    if (next === "vertex") {
      setErr("That username is reserved.");
      return;
    }
    setBusy(true);
    setErr(null);
    setOk(null);
    const res = await netChangeUsername(next);
    setBusy(false);
    if (!res.ok) {
      setErr(res.error ?? "Could not change your username.");
      return;
    }
    onSave({ ...profile, username: next, name: displayName.trim() || next, avatar, status });
    setOk(`Username changed to @${next}.`);
  };

  return (
    <div className="msgs-panel msgs-edit">
      <header className="msgs-panel-head">
        <button type="button" className="msgs-panel-back" onClick={onBack} aria-label="Back">‹</button>
        <span className="msgs-panel-title">Edit profile</span>
      </header>
      <div className="msgs-panel-scroll msgs-edit-body">
        <div className="msgs-edit-avhead">
          <GlyphAvatar src={avatar} size={64} username={profile.username} verified={profile.verified} status={status} statusSize={17} />
          <div>
            <div className={`msgs-edit-name${nameFxClass(profile.effects)}`}>
              {displayName.trim() || profile.username}
              <RoleBadge role={profile.role} />
              {profile.verified && <VerifiedBadge />}
            </div>
            <div className="msgs-edit-handle">@{profile.username}</div>
          </div>
        </div>

        <label className="msgs-edit-label">Display name</label>
        <input className="msgs-edit-input" value={displayName} maxLength={40} placeholder="Display name" onChange={(e) => setDisplayName(e.target.value)} />

        <label className="msgs-edit-label">Username (this is how you log in)</label>
        <div className="msgs-edit-uname">
          <span className="msgs-at">@</span>
          <input className="msgs-edit-input" value={username} maxLength={16} onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, "").toLowerCase())} />
          <button type="button" className="msgs-edit-secondary" disabled={busy || username.trim().toLowerCase() === profile.username.toLowerCase()} onClick={() => void changeName()}>Change</button>
        </div>

        <label className="msgs-edit-label">Avatar</label>
        <div className="msgs-edit-grid">
          {PRESETS.map((p, i) => (
            <button key={i} type="button" className={`msgs-edit-preset ${avatar.kind === "preset" && avatar.id === i ? "on" : ""}`} style={{ background: `linear-gradient(135deg, ${p.a}, ${p.b})` }} onClick={() => setAvatar({ kind: "preset", id: i })}>
              {p.glyph}
            </button>
          ))}
        </div>
        <div className="msgs-edit-upload">
          <button type="button" className="msgs-edit-secondary" onClick={() => fileRef.current?.click()}>Upload a photo</button>
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" style={{ display: "none" }} onChange={onFile} />
          {avatar.kind === "custom" && <span className="msgs-edit-preview"><img src={avatar.data} alt="avatar" /></span>}
        </div>

        <label className="msgs-edit-label">Banner</label>
        <div className={`msgs-edit-banner${banner ? "" : " empty"}`} style={banner ? { backgroundImage: `url(${banner})` } : undefined}>
          {!banner && <span>No banner yet</span>}
        </div>
        <div className="msgs-edit-banner-btns">
          <button type="button" className="msgs-edit-secondary" onClick={() => bannerRef.current?.click()}>Upload banner</button>
          {banner && <button type="button" className="msgs-edit-secondary" onClick={() => setBanner("")}>Remove</button>}
        </div>
        <input ref={bannerRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" style={{ display: "none" }} onChange={onBanner} />

        <label className="msgs-edit-label">About me</label>
        <textarea className="msgs-edit-input msgs-edit-bio" value={bio} maxLength={280} placeholder="Tell people about yourself..." onChange={(e) => setBio(e.target.value)} />

        <label className="msgs-edit-label">Status</label>
        <div className="msgs-edit-statuses">
          {(["online", "idle", "offline"] as Status[]).map((s) => (
            <button key={s} type="button" className={`msgs-edit-status ${status === s ? "on" : ""}`} onClick={() => setStatus(s)}>
              <span className={`msgs-status-dot msgs-status-${s}`} />
              <span style={{ textTransform: "capitalize" }}>{s}</span>
            </button>
          ))}
        </div>

        {adminOwner && (
          <>
            <label className="msgs-edit-label">Unreleased — only you</label>
            <div className="msgs-edit-statuses">
              {EFFECTS.map((fx) => {
                const on = (profile.effects ?? []).includes(fx.id);
                return (
                  <button
                    key={fx.id}
                    type="button"
                    className={`msgs-edit-status ${on ? "on" : ""}`}
                    onClick={() => onSave({ ...profile, effects: on ? (profile.effects ?? []).filter((x) => x !== fx.id) : [...(profile.effects ?? []), fx.id] })}
                  >
                    {fx.label}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {err && <p className="msgs-setup-err">{err}</p>}
        {ok && <p className="msgs-setup-ok">{ok}</p>}

        <div className="msgs-edit-actions">
          <button type="button" className="msgs-profile-btn" onClick={onBack}>Cancel</button>
          <button type="button" className="msgs-profile-btn primary" onClick={save}>Save</button>
        </div>
      </div>
    </div>
  );
}

function ProfilePanel({ user, isSelf, isContact, pending, adminOwner, isOwner, contactsList, onBack, onChat, onEdit, onSettings, onOpenUser, onToggleEffect, onToggleVerified }: {
  user: RosterUser;
  isSelf: boolean;
  isContact: boolean;
  pending: boolean;
  adminOwner: boolean;
  isOwner: boolean;
  contactsList: RosterUser[];
  onBack: () => void;
  onChat: () => void;
  onEdit: () => void;
  onSettings: () => void;
  onOpenUser: (u: RosterUser) => void;
  onToggleEffect: (username: string, effects: string[]) => void;
  onToggleVerified: (username: string, verified: boolean) => void;
}) {
  const [page, setPage] = useState<NetUserPage | null>(null);
  const [tab, setTab] = useState<"about" | "followers" | "following" | "contacts">("about");
  const [lists, setLists] = useState<{ followers: NetFollowUser[] | null; following: NetFollowUser[] | null }>({ followers: null, following: null });
  const [follow, setFollow] = useState<{ followers: number; following: number; isFollowing: boolean }>({ followers: 0, following: 0, isFollowing: false });
  const [followBusy, setFollowBusy] = useState(false);
  const [q, setQ] = useState("");
  useEffect(() => {
    if ((tab !== "followers" && tab !== "following") || lists[tab] !== null) return;
    let alive = true;
    void loadFollowList(user.username, tab).then((rows) => { if (alive) setLists((s) => ({ ...s, [tab]: rows })); }).catch(() => { if (alive) setLists((s) => ({ ...s, [tab]: [] })); });
    return () => { alive = false; };
  }, [tab, lists, user.username]);
  const ov = pageOverrideFor(user.username);
  useEffect(() => {
    let alive = true;
    void loadUserProfile(user.username).then((p) => { if (alive && p) { setPage(p); setFollow({ followers: p.followers ?? 0, following: p.following ?? 0, isFollowing: p.isFollowing ?? false }); } }).catch(() => { /* migration not applied yet */ });
    return () => { alive = false; };
  }, [user.username]);
  const special = user.username === "vertex-os" || (isSelf && (adminOwner || isOwner));
  const verified = Boolean(user.verified) || Boolean(page?.verified) || Boolean(ov?.verified) || special;
  const role: Role | undefined = special ? "owner" : page?.role ?? ov?.role ?? user.role;
  const effects = special ? ["moving-name", "glow"] : (page?.effects && page.effects.length ? page.effects : ov?.effects && ov.effects.length ? ov.effects : user.effects);
  const storedBadges: BadgeId[] | null = page?.badges && page.badges.length ? (page.badges as BadgeId[]) : user.badges && user.badges.length ? (user.badges as BadgeId[]) : null;
  const pageAvatar: AvSource | null = page ? (page.avatarKind === "custom" && page.avatarData ? { kind: "custom", data: page.avatarData } : { kind: "preset", id: page.avatarId }) : null;
  const avatar = ov?.avatar ?? pageAvatar ?? user.avatar ?? { kind: "preset" as const, id: user.preset };
  const statusLine = isSelf ? "This is you" : user.system ? "Official account" : page?.status ?? user.status ?? "offline";
  const banner = page?.banner || ov?.banner || user.banner || "";
  const bio = page?.bio || ov?.bio || user.bio || "";
  const joinedAt = page?.joinedAt ?? ov?.joinedAt ?? user.joinedAt ?? null;
  const toggleFollow = async () => {
    if (isSelf || followBusy) return;
    const prior = follow;
    const optimist = prior.isFollowing
      ? { followers: Math.max(0, prior.followers - 1), following: prior.following, isFollowing: false }
      : { followers: prior.followers + 1, following: prior.following, isFollowing: true };
    setFollow(optimist);
    setFollowBusy(true);
    try {
      const next = optimist.isFollowing ? await followUser(user.username) : await unfollowUser(user.username);
      setFollow({ followers: next.followers, following: next.following, isFollowing: next.isFollowing });
    } catch {
      setFollow(prior);
    }
    setFollowBusy(false);
  };
  const followRows: RosterUser[] = (tab === "followers" || tab === "following" ? lists[tab] ?? [] : [])
    .filter((u) => u.username.toLowerCase().includes(q.toLowerCase()) || u.name.toLowerCase().includes(q.toLowerCase()))
    .map((u) => ({ username: u.username, name: u.name, preset: hashPreset(u.username), avatar: u.avatarData ? { kind: "custom" as const, data: u.avatarData } : { kind: "preset" as const, id: u.avatarId } }));
  const contactRows: RosterUser[] = contactsList.filter((c) => (c.name?.toLowerCase() ?? "").includes(q.toLowerCase()) || c.username.toLowerCase().includes(q.toLowerCase()));
  const betaItems: string[] = [
    role === "owner" ? "Owner" : role === "moderator" ? "Moderator" : "User",
    ...(verified ? ["Verified"] : []),
    ...(effects ?? []).map((e) => EFFECTS.find((x) => x.id === e)?.label ?? e),
  ];
  const browseRow = (u: RosterUser) => (
    <button key={u.username} type="button" className="msgs-profile-browse-row" onClick={() => onOpenUser(u)}>
      <GlyphAvatar src={u.avatar ?? { kind: "preset", id: u.preset }} size={38} username={u.username} />
      <span className="msgs-profile-list-info">
        <strong>{u.name}</strong>
        <span>@{u.username}</span>
      </span>
    </button>
  );
  const contactBtn = (c: RosterUser) => (
    <button key={c.username} type="button" className="msgs-profile-contact" onClick={() => onOpenUser(c)}>
      <GlyphAvatar src={c.avatar ?? { kind: "preset", id: c.preset }} size={38} username={c.username} />
      <span className="msgs-profile-list-info">
        <strong>{c.name}</strong>
        <span>@{c.username}</span>
      </span>
    </button>
  );
  return (
    <div className="msgs-panel msgs-profile-panel">
      <header className="msgs-panel-head">
        <button type="button" className="msgs-panel-back" onClick={onBack} aria-label="Back">‹</button>
        <span className="msgs-panel-title">{isSelf ? "Your profile" : special ? "McCrack-OS official" : `@${user.username}`}</span>
      </header>
      <div className="msgs-panel-scroll">
        <div className={`msgs-profile-cover${banner ? "" : " default"}`} style={banner ? { backgroundImage: `url(${banner})` } : undefined}>
          <span className="msgs-profile-cover-shade" />
        </div>
        <div className="msgs-profile-main">
          <div className="msgs-profile-header">
            <div className="msgs-profile-header-av">
              <GlyphAvatar src={avatar} size={96} username={user.username} verified={verified} status={user.status ?? "offline"} statusSize={22} className="msgs-avatar-ring" />
            </div>
            <div className="msgs-profile-header-info">
              <div className={`msgs-profile-name${nameFxClass(effects)}`}>{user.name}</div>
              <div className="msgs-profile-badges">
                {storedBadges
                  ? renderBadges(storedBadges)
                  : (<>
                      {special && <><span className="msgs-role msgs-role-mod" title="Moderator">MOD</span><span className="msgs-role msgs-role-admin" title="Admin">ADMIN</span><span className="msgs-role msgs-role-dev" title="Developer">DEV</span></>}
                      <RoleBadge role={role} />
                      {role === "owner" && <><span className="msgs-role msgs-role-experimental" title="Experimental Features Lab">EXPERIMENTAL</span><span className="msgs-role msgs-role-lab" title="McCrack Lab">LAB</span></>}
                      {verified && <span className="msgs-profile-verifiedchip"><VerifiedBadge size={14} />Verified</span>}
                    </>)}
              </div>
              <div className="msgs-profile-user">@{user.username}</div>
              <div className="msgs-profile-meta">
                <span className={`msgs-status-dot msgs-status-${user.status ?? "offline"}`} />
                <span className="msgs-profile-state">{statusLine}</span>
                {joinedAt ? <><span className="msgs-profile-dot">·</span><span>{fmtJoinLong(joinedAt)}</span></> : null}
              </div>
              {bio && <p className="msgs-profile-bio">{bio}</p>}
            </div>
          </div>

          <div className="msgs-profile-actions">
            {isSelf ? (
              <>
                <button type="button" className="msgs-profile-btn primary" onClick={onEdit}>Edit profile</button>
                <button type="button" className="msgs-profile-btn" onClick={onSettings}>Settings</button>
              </>
            ) : (
              <>
                <button type="button" className={`msgs-profile-btn primary${follow.isFollowing ? " on" : ""}`} onClick={toggleFollow} disabled={followBusy || isSelf}>
                  {follow.isFollowing ? "Following" : "Follow"}
                </button>
                <button type="button" className="msgs-profile-btn" onClick={onChat}>{isContact ? "Chat" : "Message"}</button>
                {!isContact && pending && <span className="msgs-profile-pending">Request pending</span>}
              </>
            )}
          </div>

          <div className="msgs-profile-stats">
            <button type="button" className={`msgs-profile-stat${tab === "followers" ? " on" : ""}`} onClick={() => setTab("followers")} aria-label="Followers">
              <strong>{fmtBig(follow.followers)}</strong>
              <span>Followers</span>
            </button>
            <button type="button" className={`msgs-profile-stat${tab === "following" ? " on" : ""}`} onClick={() => setTab("following")} aria-label="Following">
              <strong>{fmtBig(follow.following)}</strong>
              <span>Following</span>
            </button>
            <button type="button" className={`msgs-profile-stat${tab === "contacts" ? " on" : ""}`} onClick={() => setTab("contacts")} aria-label="Contacts">
              <strong>{contactsList.length}</strong>
              <span>Contacts</span>
            </button>
          </div>

          <div className="msgs-profile-tabs" role="tablist">
            <button type="button" role="tab" aria-selected={tab === "about"} className={`msgs-profile-tab${tab === "about" ? " on" : ""}`} onClick={() => setTab("about")}>About</button>
            <button type="button" role="tab" aria-selected={tab === "followers"} className={`msgs-profile-tab${tab === "followers" ? " on" : ""}`} onClick={() => setTab("followers")}>Followers</button>
            <button type="button" role="tab" aria-selected={tab === "following"} className={`msgs-profile-tab${tab === "following" ? " on" : ""}`} onClick={() => setTab("following")}>Following</button>
            <button type="button" role="tab" aria-selected={tab === "contacts"} className={`msgs-profile-tab${tab === "contacts" ? " on" : ""}`} onClick={() => setTab("contacts")}>Contacts</button>
          </div>

          {tab === "about" && (
            <>
              <section className="msgs-profile-card msgs-profile-sec">
                <h4>About</h4>
                <p className="msgs-profile-about-text">{bio || "No description yet."}</p>
              </section>

              <section className="msgs-profile-card msgs-profile-sec">
                <h4>Contacts</h4>
                {contactsList.length === 0 ? (
                  <p className="msgs-profile-empty">No contacts yet.</p>
                ) : (
                  <>
                    {contactsList.slice(0, 5).map(contactBtn)}
                    {contactsList.length > 5 && (
                      <button type="button" className="msgs-profile-seeall" onClick={() => setTab("contacts")}>See all ({contactsList.length})</button>
                    )}
                  </>
                )}
              </section>

              <section className="msgs-profile-card msgs-profile-sec">
                <h4>Unreleased · Beta {isOwner && <span className="msgs-profile-beta-note">admins only</span>}</h4>
                <div className="msgs-profile-beta-chips">
                  {betaItems.map((item) => <span key={item} className="msgs-profile-beta-chip">{item}</span>)}
                </div>
                {isOwner && (
                  <div className="msgs-profile-beta-tools">
                    <button type="button" className={`msgs-profile-beta-tool${verified ? " on" : ""}`} onClick={() => onToggleVerified(user.username, !verified)}>
                      {verified ? "Verified ✓" : "Mark verified"}
                    </button>
                    {EFFECTS.map((fx) => {
                      const on = (effects ?? []).includes(fx.id);
                      return (
                        <button key={fx.id} type="button" className={`msgs-profile-beta-tool${on ? " on" : ""}`} onClick={() => onToggleEffect(user.username, on ? (effects ?? []).filter((x) => x !== fx.id) : [...(effects ?? []), fx.id])}>
                          {fx.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>
            </>
          )}

          {(tab === "followers" || tab === "following") && (
            <div className="msgs-profile-listcard">
              <div className="msgs-profile-browse-search">
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" strokeLinecap="round" /></svg>
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${tab}`} />
              </div>
              <div className="msgs-profile-browse">
                {lists[tab] === null ? (
                  <div className="msgs-profile-empty">Loading…</div>
                ) : followRows.length === 0 ? (
                  <div className="msgs-profile-empty">No {tab === "followers" ? "followers" : "following"} to show.</div>
                ) : (
                  followRows.map(browseRow)
                )}
              </div>
            </div>
          )}

          {tab === "contacts" && (
            <div className="msgs-profile-listcard">
              <div className="msgs-profile-browse-search">
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" strokeLinecap="round" /></svg>
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search contacts" />
              </div>
              <div className="msgs-profile-browse">
                {contactRows.length === 0 ? (
                  <div className="msgs-profile-empty">{contactsList.length === 0 ? "No contacts yet." : "No matching contacts."}</div>
                ) : (
                  contactRows.map(browseRow)
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function MessagesSurface() {
  const [state] = useState(initialState);
  const [profile, setProfile] = useState<Profile | null>(state.profile);
  const [dms, setDms] = useState<Record<string, Msg[]>>(state.dms);
  const [seen, setSeen] = useState<Record<string, number>>(state.seen);
  const [active, setActive] = useState<string | null>(() => state.active && (state.dms[state.active] || state.active.startsWith("group:")) ? state.active : (state.dms.McCrack ? "McCrack" : null));
  const [tab, setTab] = useState<"chats" | "people">("chats");
  const [query, setQuery] = useState("");
  const [statusMenu, setStatusMenu] = useState(false);
  const [roleMenu, setRoleMenu] = useState(false);
  const [profileView, setProfileView] = useState<{ user: RosterUser; isSelf: boolean } | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [notifOn, setNotifOn] = useState(true);
  const [enterSends, setEnterSends] = useState(true);
  const [info, setInfo] = useState<{ title: string; lines: string[] } | null>(null);
  const [labOpen, setLabOpen] = useState(false);
  const [lab, setLab] = useState<LabState>(readLab);
  const adminOwner = adminOwnerActive();
  const isOwner = profile?.role === "owner" || adminOwner;
  const labClass = [lab.anim ? "msgs-lab-anim" : "", lab.cozy ? "msgs-lab-cozy" : "", lab.redesign ? "msgs-lab-redesign" : "", lab.compact ? "msgs-lab-compact" : ""].filter(Boolean).join(" ");
  const toggleLab = (k: keyof LabState) => setLab((s) => {
    const n = { ...s, [k]: !s[k] };
    try { localStorage.setItem(LAB_KEY, JSON.stringify(n)); } catch { /* noop */ }
    return n;
  });
  const resetLab = () => {
    setLab({ ...DEFAULT_LAB });
    try { localStorage.removeItem(LAB_KEY); } catch { /* noop */ }
    setToast("Lab settings reset.");
  };
  const defaultBadgesForSelf = (): BadgeId[] => {
    const owner = profile?.role === "owner" || adminOwner;
    const ids: BadgeId[] = [];
    if (owner || adminOwner) ids.push("owner", "admin", "dev", "mod");
    if (owner) ids.push("experimental", "lab");
    if (profile?.verified) ids.push("verified");
    return ids;
  };
  const activeBadges: BadgeId[] = profile?.badges ? (profile.badges as BadgeId[]) : defaultBadgesForSelf();
  const applyBadges = async (username: string, badges: BadgeId[]) => {
    try {
      await netPersistBadges(username, badges);
      setProfile((p) => (p && p.username.toLowerCase() === username.toLowerCase() ? { ...p, badges } : p));
      setProfileView((v) => (v && v.user.username === username ? { ...v, user: { ...v.user, badges } } : v));
      setToast("Badges updated — visible to everyone.");
    } catch {
      setProfile((p) => (p && p.username.toLowerCase() === username.toLowerCase() ? { ...p, badges } : p));
      setProfileView((v) => (v && v.user.username === username ? { ...v, user: { ...v.user, badges } } : v));
      setToast("Couldn't save badges to the database — re-run the owner SQL so the badges column exists.");
    }
  };
  const toggleBadge = (id: BadgeId) => {
    if (!profile) return;
    const next = activeBadges.includes(id) ? activeBadges.filter((x) => x !== id) : [...activeBadges, id];
    void applyBadges(profile.username, next);
  };

  useEffect(() => {
    if (!adminOwner || profile) return;
    setProfile({
      username: "vertex-os",
      name: "McCrack-OS",
      avatar: { kind: "custom", data: SITE_LOGO },
      status: "online",
      role: "owner",
      verified: true,
      effects: ["moving-name", "glow"],
      bio: "Official McCrack-OS administrator account.",
      joinedAt: Date.now(),
    });
  }, [adminOwner, profile]);
  const [newChat, setNewChat] = useState(false);
  const [newGroup, setNewGroup] = useState(false);
  const [draft, setDraft] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [call, setCall] = useState<CallState | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [addName, setAddName] = useState("");
  const [addErr, setAddErr] = useState<string | null>(null);
  const [customs, setCustoms] = useState<Record<string, RosterUser>>(() => read<Record<string, RosterUser>>(CUSTOMS_KEY, {}));
  const [people, setPeople] = useState<RosterUser[]>([]);
  const [contacts, setContacts] = useState<string[]>([]);
  const [requests, setRequests] = useState<NetRequest[]>([]);
  const [groups, setGroups] = useState<NetGroup[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [net, setNet] = useState<NetStatus>("offline");
  const [netNote, setNetNote] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ user: string; kind: "voice" | "video" | "text"; text: string } | null>(null);
  const attachRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const readPending = useRef(new Set<string>());
  const lastWakeRef = useRef(0);
  const activeRef = useRef<string | null>(active);
  activeRef.current = active;
  const noticeTimer = useRef(0);

  const getUser = useCallback(
    (u: string): RosterUser | undefined => {
      const v = u.toLowerCase();
      if (v.startsWith("group:")) {
        const group = groups.find((item) => groupKey(item.id) === v);
        return group ? { username: v, name: group.title, preset: hashPreset(v), group: true, members: group.members } : { username: v, name: "Group chat", preset: hashPreset(v), group: true };
      }
      return systemUser(v) ?? people.find((p) => p.username === v) ?? customs[v];
    },
    [people, customs, groups],
  );

  const saveCustom = (contact: RosterUser) => {
    setCustoms((c) => {
      const nx = { ...c, [contact.username]: contact };
      write(CUSTOMS_KEY, nx);
      return nx;
    });
  };

  const signOut = async () => {
    await authSignOut();
    try { localStorage.removeItem(PROF_KEY); } catch { /* noop */ }
    setProfile(null);
    setActive(null);
    setPeople([]);
    setRoleMenu(false);
    setProfileView(null);
    setSettingsOpen(false);
    setEditOpen(false);
    setLabOpen(false);
  };

  const openSelfProfile = () => {
    if (!profile) return;
    setProfileView({
      user: { username: profile.username, name: profile.name, avatar: profile.avatar, preset: hashPreset(profile.username), verified: profile.verified, role: profile.role, effects: profile.effects, status: profile.status, bio: profile.bio, banner: profile.banner, joinedAt: profile.joinedAt },
      isSelf: true,
    });
  };

  const openProfile = (u: RosterUser) => {
    setProfileView({ user: u, isSelf: Boolean(profile && u.username === profile.username.toLowerCase()) });
  };

  const contactsList = useMemo(
    () =>
      contacts
        .map((c) => getUser(c))
        .filter((x): x is RosterUser => Boolean(x && !x.system && !x.group))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [contacts, getUser],
  );

  const applyRole = async (username: string, role: Role) => {
    setRoleMenu(false);
    try {
      await netSetRole(username, role);
      setPeople((ps) => ps.map((p) => (p.username === username ? { ...p, role } : p)));
      setToast(role === "user" ? `Removed @${username}'s badge` : `@${username} is now ${role === "owner" ? "Owner" : "Moderator"}`);
    } catch (e) {
      if (adminOwner) {
        try {
          await netPersistRole(username, role);
          setPeople((ps) => ps.map((p) => (p.username === username ? { ...p, role } : p)));
          setToast(role === "user" ? `Removed @${username}'s badge` : `@${username} is now ${role === "owner" ? "Owner" : "Moderator"}`);
        } catch {
          setPeople((ps) => ps.map((p) => (p.username === username ? { ...p, role } : p)));
          setToast(`Couldn't save to the database — your account isn't an Owner yet. Run the owner SQL in Supabase first.`);
        }
      } else {
        setToast(e instanceof Error ? e.message : "Could not update that role.");
      }
    }
  };

  const applyVerified = async (username: string, verified: boolean) => {
    try {
      await netSetVerified(username, verified);
      setPeople((ps) => ps.map((p) => (p.username === username ? { ...p, verified } : p)));
      setProfile((p) => (p && p.username.toLowerCase() === username.toLowerCase() ? { ...p, verified } : p));
      setProfileView((v) => (v && v.user.username === username ? { ...v, user: { ...v.user, verified } } : v));
      setToast(verified ? `Verified @${username}` : `Removed verification from @${username}`);
    } catch (e) {
      if (adminOwner) {
        try {
          await netPersistVerified(username, verified);
          setPeople((ps) => ps.map((p) => (p.username === username ? { ...p, verified } : p)));
          setProfile((p) => (p && p.username.toLowerCase() === username.toLowerCase() ? { ...p, verified } : p));
          setProfileView((v) => (v && v.user.username === username ? { ...v, user: { ...v.user, verified } } : v));
          setToast(verified ? `Verified @${username}` : `Removed verification from @${username}`);
        } catch {
          setPeople((ps) => ps.map((p) => (p.username === username ? { ...p, verified } : p)));
          setProfile((p) => (p && p.username.toLowerCase() === username.toLowerCase() ? { ...p, verified } : p));
          setProfileView((v) => (v && v.user.username === username ? { ...v, user: { ...v.user, verified } } : v));
          setToast(`Couldn't save to the database — your account isn't an Owner yet. Run the owner SQL in Supabase first.`);
        }
      } else {
        setToast(e instanceof Error ? e.message : "Could not update verification.");
      }
    }
  };

  const applyEffects = async (username: string, effects: string[]) => {
    try {
      await netSetEffects(username, effects);
      setPeople((ps) => ps.map((p) => (p.username === username ? { ...p, effects } : p)));
      setProfile((p) => (p && p.username.toLowerCase() === username.toLowerCase() ? { ...p, effects } : p));
      setProfileView((v) => (v && v.user.username === username ? { ...v, user: { ...v.user, effects } } : v));
      setToast("Effects updated.");
    } catch (e) {
      if (adminOwner) {
        try {
          await netPersistEffects(username, effects);
          setPeople((ps) => ps.map((p) => (p.username === username ? { ...p, effects } : p)));
          setProfile((p) => (p && p.username.toLowerCase() === username.toLowerCase() ? { ...p, effects } : p));
          setProfileView((v) => (v && v.user.username === username ? { ...v, user: { ...v.user, effects } } : v));
          setToast("Effects updated.");
        } catch {
          setPeople((ps) => ps.map((p) => (p.username === username ? { ...p, effects } : p)));
          setProfileView((v) => (v && v.user.username === username ? { ...v, user: { ...v.user, effects } } : v));
          setToast(`Couldn't save to the database — your account isn't an Owner yet. Run the owner SQL in Supabase first.`);
        }
      } else {
        setToast(e instanceof Error ? e.message : "Could not update effects.");
      }
    }
  };

  const toggleEffect = (username: string, id: string) => {
    const current = people.find((p) => p.username === username)?.effects ?? [];
    const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
    void applyEffects(username, next);
  };

  useEffect(() => {
    if (dms.McCrack && dms.McCrack[0]) {
      const last = dms.McCrack[dms.McCrack.length - 1];
      const t = new Date(last.at);
      const today = new Date();
      if (t.getFullYear() !== today.getFullYear() || t.getMonth() !== today.getMonth() || t.getDate() !== today.getDate()) {
        const w: Msg = { id: `sys-w-${uid()}`, from: "McCrack", text: "Welcome to Messages! Hope you enjoy the app!", at: Date.now() };
        setDms((d) => ({ ...d, McCrack: [w] }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!active && dms.McCrack) setActive("McCrack");
    else if (active && !active.startsWith("group:") && !dms[active] && dms.McCrack) setActive("McCrack");
  }, [active, dms]);

  useEffect(() => { write(ACTIVE_KEY, active); }, [active]);

  useEffect(() => {
    if (!profile) return;
    setNet(messagesBackendConfigured ? "connecting" : "offline");
    setNetNote(messagesBackendConfigured ? null : "Messages needs a free Supabase project. Follow MESSAGES_SETUP.md to connect it.");
    connect(profile.username);
    return () => disconnect();
  }, [profile?.username]);

  // Any blip (tab in the background, wifi sleep, a dropped call) used to latch the app
  // into a permanent "offline" that only a refresh could clear. Wake and heal instead.
  useEffect(() => {
    const wake = () => {
      if (net === "online" && callsReady()) return;
      if (Date.now() - lastWakeRef.current < 10000) return;
      lastWakeRef.current = Date.now();
      reconnectNow();
    };
    const onVisible = () => { if (document.visibilityState === "visible") wake(); };
    window.addEventListener("online", wake);
    window.addEventListener("offline", wake);
    window.addEventListener("focus", onVisible);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("online", wake);
      window.removeEventListener("offline", wake);
      window.removeEventListener("focus", onVisible);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [net]);

  useEffect(() => {
    if (!profile) void prepareMessagesDirectory();
  }, [profile]);

  useEffect(() => {
    if (profile) netSetProfile(toNetProfile(profile));
  }, [profile]);

  // Pull the server-authoritative role / verified / effects for my own account,
  // since the locally cached profile does not store them.
  useEffect(() => {
    if (!profile) return;
    let alive = true;
    void loadMyProfileRow().then((row) => {
      if (!alive || !row) return;
      setProfile((p) => (p ? { ...p, role: row.role ?? p.role, verified: row.verified, effects: row.effects, avatar: row.avatarKind === "custom" && row.avatarData ? { kind: "custom", data: row.avatarData } : row.avatarKind === "preset" ? { kind: "preset", id: row.avatarId } : p.avatar } : p));
    });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.username]);

  useEffect(() => {
    write(DMS_KEY, dms);
  }, [dms]);
  useEffect(() => {
    write(SEEN_KEY, seen);
  }, [seen]);
  useEffect(() => {
    write(CUSTOMS_KEY, customs);
  }, [customs]);
  useEffect(() => {
    if (profile) write(PROF_KEY, profile);
  }, [profile]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "instant" as ScrollBehavior });
  }, [active, dms]);

  const flash = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 2600);
  };

  const openChat = (u: string) => {
    setActive(u);
    setSeen((s) => ({ ...s, [u]: Date.now() }));
  };

  const pushMsg = (u: string, msg: Msg) => {
    setDms((d) => {
      const thread = d[u] ?? [];
      const existing = thread.findIndex((m) => m.id === msg.id);
      const next = existing >= 0
        ? thread.map((m, i) => (i === existing ? { ...m, ...msg, pending: false, failed: false } : m))
        : [...thread, msg];
      next.sort((a, b) => a.at - b.at);
      return { ...d, [u]: next };
    });
  };

  const patchMsg = (u: string, id: string, patch: Partial<Msg>) => {
    setDms((d) => ({ ...d, [u]: (d[u] ?? []).map((m) => (m.id === id ? { ...m, ...patch } : m)) }));
  };

  useEffect(() => {
    if (!active) return;
    const unread = (dms[active] ?? []).filter((m) => m.from !== "me" && !m.readByMe && !readPending.current.has(m.id));
    if (!unread.length) return;
    const ids = unread.map((m) => m.id);
    ids.forEach((id) => readPending.current.add(id));
    void markMessagesRead(ids).then(() => {
      setDms((current) => ({ ...current, [active]: (current[active] ?? []).map((m) => ids.includes(m.id) ? { ...m, readByMe: true } : m) }));
    }).catch(() => { /* a transient network failure can retry when the chat changes */ }).finally(() => ids.forEach((id) => readPending.current.delete(id)));
  }, [active, dms]);

  useEffect(() =>
    onNet((e) => {
      switch (e.t) {
        case "status":
          setNet(e.status);
          setNetNote(e.detail ?? null);
          break;
        case "presence":
          setPeople((current) => {
            const statusByUser = new Map(e.users.map((u) => [u.username, u.status]));
            return current.map((u) => ({ ...u, status: statusByUser.get(u.username) ?? "offline", live: statusByUser.get(u.username) !== undefined && statusByUser.get(u.username) !== "offline" }));
          });
          break;
        case "directory":
          setPeople(
            e.users
              .filter((u) => u.username !== profile?.username.toLowerCase())
              .map(fromNetProfile)
              .sort((a, b) => a.name.localeCompare(b.name)),
          );
          break;
        case "message":
          pushMsg(e.message.peer, {
            id: e.message.id,
            from: e.message.from,
            text: e.message.text,
            at: e.message.at,
            edited: e.message.edited,
            deleted: e.message.deleted,
            seen: e.message.seen,
            seenAt: e.message.seenAt,
            readByMe: e.message.readByMe,
            ...(e.message.media ? { media: e.message.media } : {}),
          });
          if (e.message.from !== "me" && e.message.peer !== activeRef.current && notifOn) {
            setNotice({ user: e.message.peer, kind: "text", text: e.message.text || "Sent an attachment" });
          }
          break;
        case "message-removed":
          setDms((current) => Object.fromEntries(Object.entries(current).map(([key, thread]) => [key, thread.filter((m) => m.id !== e.id)])));
          break;
        case "message-seen":
          setDms((current) => Object.fromEntries(Object.entries(current).map(([key, thread]) => [key, thread.map((m) => m.id === e.id ? { ...m, seen: true, seenAt: e.at } : m)])));
          break;
        case "connections":
          setContacts(e.contacts);
          setRequests(e.requests.filter((request) => request.kind === "group" || !e.contacts.includes(request.username)));
          setGroups(e.groups);
          setDms((current) => {
            const next = { ...current };
            for (const group of e.groups) next[groupKey(group.id)] ??= [];
            return next;
          });
          break;
        case "incoming-call":
          setCall((c) => c ?? { peer: e.from, kind: e.kind, stage: "connecting", incoming: true, startedAt: Date.now(), muted: false, camOff: false });
          break;
        case "call-ended":
          setCall((c) => (c && c.peer === e.from ? null : c));
          break;
        default:
          break;
      }
    }),
    [profile?.username, notifOn],
  );

  useEffect(() => {
    if (!notice || notice.kind !== "text") return;
    window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setNotice(null), 5200);
    return () => window.clearTimeout(noticeTimer.current);
  }, [notice]);

  const send = () => {
    const text = draft.trim();
    if (!active || active === "McCrack" || !text) return;
    const id = uid();
    pushMsg(active, { id, from: "me", text, at: Date.now(), pending: true });
    setDraft("");
    const who = active;
    void netSendText(who, id, text)
      .then(() => patchMsg(who, id, { pending: false }))
      .catch((error: unknown) => {
        patchMsg(who, id, { pending: false, failed: true });
        flash(error instanceof Error ? error.message : `Couldn't send that to @${who}.`);
      });
  };

  const sendMedia = async (f: File) => {
    const media = await processFile(f, (m) => flash(m));
    if (!media || !active || active === "McCrack") return;
    const id = uid();
    const who = active;
    pushMsg(who, { id, from: "me", text: draft.trim(), at: Date.now(), pending: true, media: { kind: media.kind, url: URL.createObjectURL(media.blob), name: media.name } });
    setDraft("");
    void netSendMedia(who, id, media.blob, media.kind, media.name, draft.trim())
      .then(() => patchMsg(who, id, { pending: false }))
      .catch((error: unknown) => {
        patchMsg(who, id, { pending: false, failed: true });
        flash(error instanceof Error ? error.message : `Couldn't send that to @${who}.`);
      });
  };

  const onAttach = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) void sendMedia(f);
    e.target.value = "";
  };

  const startCall = (peer: string, kind: "voice" | "video") => {
    if (active === "McCrack") return;
    if (!callsReady()) {
      reconnectNow();
      flash("Calls are reconnecting — try again in a moment.");
      return;
    }
    if (!isOnline(peer)) {
      reconnectNow();
      flash(`@${peer} isn't online right now.`);
      return;
    }
    setCall({ peer, kind, stage: "connecting", incoming: false, startedAt: Date.now(), muted: false, camOff: false });
  };

  const startChat = (u: string) => {
    const v = u.trim().toLowerCase();
    setNewChat(false);
    if (v === "vertex" || contacts.includes(v) || isContact(v)) {
      if (!getUser(v)) saveCustom({ username: v, name: nameCap(v), preset: hashPreset(v) });
      setDms((d) => (d[v] ? d : { ...d, [v]: [] }));
      openChat(v);
      return;
    }
    void sendContactRequest(v).then((result) => {
      flash(result === "accepted" ? `@${v} is already a contact.` : `Contact request sent to @${v}. They need to accept before you can chat.`);
    }).catch((error: unknown) => flash(error instanceof Error ? error.message : "Could not send that contact request."));
  };

  const addByUsername = () => {
    const v = addName.trim().toLowerCase();
    if (!v) return;
    if (profile && v === profile.username.toLowerCase()) {
      setAddErr("That's you!");
      return;
    }
    setAddErr(null);
    setAddName("");
    startChat(v);
  };

  const acceptRequest = async (request: NetRequest) => {
    try {
      if (request.kind === "group" && request.groupId) {
        await decideGroupInvitation(request.id, request.groupId, true);
        const key = groupKey(request.groupId);
        setDms((d) => d[key] ? d : { ...d, [key]: [] });
        openChat(key);
        flash(`You joined ${request.name}.`);
      } else {
        await decideContactRequest(request.id, true);
        setDms((d) => d[request.username] ? d : { ...d, [request.username]: [] });
        flash(`You and @${request.username} are contacts now.`);
      }
    } catch (error) { flash(error instanceof Error ? error.message : "Could not accept that request."); }
  };

  const declineRequest = async (request: NetRequest) => {
    try {
      if (request.kind === "group" && request.groupId) await decideGroupInvitation(request.id, request.groupId, false);
      else await decideContactRequest(request.id, false);
      flash(request.kind === "group" ? `Declined the invitation to ${request.name}.` : `Declined @${request.username}'s request.`);
    }
    catch (error) { flash(error instanceof Error ? error.message : "Could not decline that request."); }
  };

  const createGroupChat = async (title: string, usernames: string[]) => {
    try {
      const group = await netCreateGroup(title, usernames);
      const key = groupKey(group.id);
      setGroups((items) => [...items.filter((item) => item.id !== group.id), group]);
      setDms((d) => d[key] ? d : { ...d, [key]: [] });
      setNewGroup(false);
      openChat(key);
      flash(`Created ${group.title}.`);
    } catch (error) { flash(error instanceof Error ? error.message : "Could not create that group."); }
  };

  const saveEdit = async (message: Msg) => {
    if (!active || !editDraft.trim()) return;
    try {
      await netEditMessage(message.id, editDraft);
      patchMsg(active, message.id, { text: editDraft.trim(), edited: true });
      setEditingId(null);
      setEditDraft("");
    } catch (error) { flash(error instanceof Error ? error.message : "Could not edit that message."); }
  };

  const unsend = async (message: Msg) => {
    if (!active) return;
    try {
      await netUnsendMessage(message.id);
      patchMsg(active, message.id, { text: "", media: undefined, deleted: true });
    } catch (error) { flash(error instanceof Error ? error.message : "Could not unsend that message."); }
  };

  const removeMessage = async (message: Msg) => {
    if (!active) return;
    try {
      await netDeleteMessage(message.id);
      setDms((d) => ({ ...d, [active]: (d[active] ?? []).filter((m) => m.id !== message.id) }));
    } catch (error) { flash(error instanceof Error ? error.message : "Could not delete that message."); }
  };

  const chatKeys = useMemo(() => Object.keys(dms), [dms]);

  const chatList = useMemo(() => {
    return chatKeys
      .map((u) => {
        const last = dms[u][dms[u].length - 1];
        const sys = u === "McCrack";
        const unread = dms[u].filter((m) => m.from !== "me" && m.at > (seen[u] ?? 0)).length;
        return { u, sys, last, unread };
      })
      .filter((r) => {
        if (!query) return true;
        const ru = getUser(r.u);
        const name = ru ? ru.name : r.u;
        return name.toLowerCase().includes(query.toLowerCase()) || r.u.toLowerCase().includes(query.toLowerCase());
      })
      .sort((a, b) => {
        if (a.sys !== b.sys) return a.sys ? -1 : 1;
        return (b.last?.at ?? 0) - (a.last?.at ?? 0);
      });
  }, [chatKeys, dms, query, seen]);

  const activeUser = active ? getUser(active) ?? (active === "McCrack"
    ? SYSTEM_USER
    : active.startsWith("group:")
      ? { username: active, name: "Group chat", preset: hashPreset(active), group: true }
      : { username: active, name: nameCap(active), preset: hashPreset(active) }) : undefined;
  const activeMsgs = active ? dms[active] ?? [] : [];

  if (!profile) {
    if (adminOwner) return <div className="msgs-surface" />;
    return <AuthModal live={people.map((p) => p.username)} onDone={(p) => setProfile(p)} />;
  }

  return (
    <div className={`msgs-app${labClass ? ` ${labClass}` : ""}`}>
      {(netNote || net !== "online") && (
        <div className="msgs-net-note">
          <span>{messagesBackendConfigured
            ? netNote ?? (net === "connecting" ? "Connecting to the Messages server…" : "Disconnected — retrying automatically.")
            : "Messages needs a free Supabase project. Follow MESSAGES_SETUP.md to connect this app."}</span>
          {net !== "online" && <button type="button" className="msgs-net-retry" onClick={() => { lastWakeRef.current = Date.now(); reconnectNow(); }}>Reconnect now</button>}
        </div>
      )}
      <div className="msgs-shell">
        <aside className="msgs-sidebar">
          <div className="msgs-sidebar-head">
            <h1 className="msgs-logo">Messages</h1>
            <button type="button" className="msgs-compose-btn" title="New group chat" onClick={() => setNewGroup(true)}>
              <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="9" cy="8" r="3"/><path d="M3 20v-1a6 6 0 0 1 12 0v1M17 8h5m-2.5-2.5v5" strokeLinecap="round"/>
              </svg>
            </button>
            <button type="button" className="msgs-compose-btn" title="New message" onClick={() => setNewChat(true)}>
              <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M12 5v14M5 12h14" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <div className="msgs-me">
            <button type="button" className="msgs-me-open" onClick={openSelfProfile} title="View your profile">
              <GlyphAvatar src={profile.avatar} size={46} username={profile.username} status={profile.status} statusSize={15} />
              <div className="msgs-me-meta">
                <span className="msgs-me-name">{profile.name}</span>
                <span className="msgs-me-user">@{profile.username}</span>
              </div>
            </button>
            <button
              type="button"
              className="msgs-status-chip"
              onClick={(e) => {
                e.stopPropagation();
                setStatusMenu((v) => !v);
              }}
            >
              <i className={`msgs-status-dot msgs-status-${profile.status}`} />
              <span style={{ textTransform: "capitalize" }}>{profile.status}</span>
              <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.4">
                <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <div className="msgs-me-actions">
              <button type="button" className="msgs-signout" title="Settings" onClick={() => setSettingsOpen(true)}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
              </button>
            </div>
            {statusMenu && (
              <>
                <div className="msgs-ghost-overlay" onClick={() => setStatusMenu(false)} />
                <div className="msgs-status-menu">
                  {(["online", "idle", "offline"] as Status[]).map((s) => (
                    <button
                      key={s}
                      type="button"
                      className={profile.status === s ? "sel" : ""}
                      onClick={() => {
                        setProfile({ ...profile, status: s });
                        setStatusMenu(false);
                      }}
                    >
                      <span className={`msgs-status-dot msgs-status-${s}`} />
                      <span style={{ textTransform: "capitalize" }}>{s}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="msgs-search">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
            </svg>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search conversations"
            />
          </div>

          <div className="msgs-segmented">
            <button type="button" className={tab === "chats" ? "on" : ""} onClick={() => setTab("chats")}>
              Chats
            </button>
            <button type="button" className={tab === "people" ? "on" : ""} onClick={() => setTab("people")}>
              People{requests.filter((r) => r.direction === "incoming").length ? ` · ${requests.filter((r) => r.direction === "incoming").length}` : people.length > 0 ? ` · ${people.length}` : ""}
            </button>
          </div>

          <div className="msgs-conv-list">
            {tab === "people" && (
              <div className="msgs-addrow">
                <span className="msgs-at">@</span>
                <input
                  value={addName}
                  onChange={(e) => {
                    setAddName(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""));
                    setAddErr(null);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && addByUsername()}
                  maxLength={16}
                  spellCheck={false}
                  placeholder="Message by username"
                />
                <button type="button" className="msgs-add-btn" onClick={addByUsername}>Go</button>
              </div>
            )}
            {addErr && tab === "people" && <p className="msgs-setup-err msgs-add-err">{addErr}</p>}
            {tab === "people" && requests.some((request) => request.direction === "incoming") && (
              <div className="msgs-req-sent">
                <div className="msgs-req-sent-title">Contact requests</div>
                {requests.filter((request) => request.direction === "incoming").map((request) => (
                  <div key={request.id} className="msgs-contact-request">
                    <div><strong>{request.kind === "group" ? request.name : request.name}</strong><span>{request.kind === "group" ? `Group invite · from @${request.username}` : `@${request.username} wants to chat`}</span></div>
                    <button type="button" className="msgs-request-accept" title="Accept" onClick={() => void acceptRequest(request)}>✓</button>
                    <button type="button" className="msgs-request-decline" title="Decline" onClick={() => void declineRequest(request)}>×</button>
                  </div>
                ))}
              </div>
            )}
            {tab === "people" && people.length > 0 && (
              <div className="msgs-req-sent">
                <div className="msgs-req-sent-title">Messages users</div>
                {people.map((p) => (
                  <div key={p.username} className="msgs-person-row">
                    <button type="button" className="msgs-req-row msgs-newchat-row" onClick={() => contacts.includes(p.username) ? startChat(p.username) : void startChat(p.username)}>
                      <GlyphAvatar src={p.avatar ?? { kind: "preset", id: p.preset }} size={40} username={p.username} status={p.status ?? "offline"} />
                      <span className="msgs-row-meta"><span className="msgs-row-name">{p.name}<RoleBadge role={p.role} compact />{p.verified && <VerifiedBadge size={13} />}</span><span className="msgs-row-preview">@{p.username} · {p.status ?? "offline"}</span></span>
                    </button>
                    <button type="button" className="msgs-person-action ghost" onClick={() => openProfile(p)}>Profile</button>
                    {contacts.includes(p.username) ? <button type="button" className="msgs-person-action" onClick={() => startChat(p.username)}>Chat</button> : requests.some((r) => r.kind === "contact" && r.username === p.username) ? <span className="msgs-person-pending">Pending</span> : <button type="button" className="msgs-person-action" onClick={() => void startChat(p.username)}>Add</button>}
                  </div>
                ))}
              </div>
            )}
            {tab === "chats" &&
              chatList.map(({ u, sys, last, unread }) => {
                const ru = getUser(u);
                const name = sys ? "McCrack" : ru?.name ?? u;
                const preview = last?.media
                  ? last.media.kind === "image"
                    ? "Photo"
                    : "Video"
                  : sys
                    ? "Messages · official"
                    : last?.failed
                      ? "Not delivered"
                      : `${last?.from === "me" ? "You: " : ""}${last?.text ?? "Say hi"}`;
                const time = last ? (dayLabel(last.at) === "Today" ? fmtTime(last.at) : shortDate(last.at)) : "";
                return (
                  <button
                    key={u}
                    type="button"
                    className={`msgs-row ${active === u ? "on" : ""}`}
                    onClick={() => {
                      setTab("chats");
                      openChat(u);
                    }}
                  >
                    <GlyphAvatar
                      src={ru?.avatar ?? rosterAvatar({ username: u, system: sys, preset: ru?.preset ?? 0 })}
                      size={46}
                      username={u}
                      verified={sys || ru?.verified}
                      status={sys ? undefined : isOnline(u) ? (ru?.status === "idle" ? "idle" : "online") : "offline"}
                    />
                    <span className="msgs-row-meta">
                      <span className="msgs-row-name">
                        {name}
                        <RoleBadge role={ru?.role} compact />
                        {(sys || ru?.verified) && <VerifiedBadge />}
                      </span>
                      <span className="msgs-row-preview">{preview}</span>
                    </span>
                    <span className="msgs-row-side">
                      {time && <span className="msgs-row-time">{time}</span>}
                      {unread > 0 && <span className="msgs-row-unread">{unread}</span>}
                    </span>
                  </button>
                );
              })}
            {tab === "chats" && chatList.length === 0 && (
              <p className="msgs-empty">No conversations yet. Tap + to find someone online.</p>
            )}
            {tab === "people" && people.length === 0 && !addErr && (
              <p className="msgs-empty">
                {net === "online" ? "No other Messages users yet. Share the site so friends can join." : "Connecting to the Messages server…"}
              </p>
            )}
          </div>
        </aside>

        <section className="msgs-conv">
          {activeUser ? (
            <>
              <header className="msgs-conv-head">
                <button type="button" className="msgs-back-btn" onClick={() => setActive(null)}>
                  ‹
                </button>
                <button type="button" className="msgs-conv-open" onClick={() => { if (activeUser && !activeUser.system && !activeUser.group) openProfile(activeUser); }}>
                  <GlyphAvatar src={activeUser.avatar ?? rosterAvatar({ username: activeUser.username, system: activeUser.system, preset: activeUser.preset })} size={40} username={activeUser.username} verified={activeUser.verified} />
                  <div className="msgs-conv-head-meta">
                    <span className="msgs-conv-name">
                      {activeUser.name}
                      <RoleBadge role={activeUser.role} />
                      {activeUser.verified && <VerifiedBadge />}
                    </span>
                    <span className="msgs-conv-sub">
                      {activeUser.system ? "Official system channel" : activeUser.group ? `${activeUser.members?.length ?? 0} members` : `@${activeUser.username}`}
                    </span>
                  </div>
                </button>

                {!activeUser.system && !activeUser.group && !!active && contacts.includes(active) && isOnline(active) && (
                  <div className="msgs-head-actions">
                    <button type="button" title="Call" onClick={() => startCall(activeUser.username, "voice")}>
                      <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.9">
                        <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.13.96.36 1.9.7 2.8a2 2 0 0 1-.45 2.1L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.1-.45c.9.34 1.84.57 2.8.7A2 2 0 0 1 22 16.9z" />
                      </svg>
                    </button>
                    <button type="button" title="Video call" onClick={() => startCall(activeUser.username, "video")}>
                      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.9">
                        <rect x="3" y="6" width="13" height="12" rx="2.5" />
                        <path d="M16 10l5-3v10l-5-3" strokeLinejoin="round" />
                      </svg>
                    </button>
                  </div>
                )}
                {isOwner && !activeUser.system && !activeUser.group && (
                  <div className="msgs-head-actions">
                    <button type="button" title="Manage badge" onClick={() => setRoleMenu((v) => !v)}>
                      <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.9">
                        <path d="M12 2l7 3v6c0 4.5-3 8-7 9-4-1-7-4.5-7-9V5l7-3z" />
                      </svg>
                    </button>
                  </div>
                )}
                {roleMenu && isOwner && !activeUser.system && !activeUser.group && (
                  <>
                    <div className="msgs-ghost-overlay" onClick={() => setRoleMenu(false)} />
                    <div className="msgs-status-menu msgs-role-menu">
                      {(["owner", "moderator", "user"] as Role[]).map((r) => (
                        <button key={r} type="button" className={activeUser.role === r ? "sel" : ""} onClick={() => void applyRole(activeUser.username, r)}>
                          <span style={{ textTransform: "capitalize" }}>{r === "user" ? "No badge" : r}</span>
                        </button>
                      ))}
                      <div className="msgs-owner-sep" />
                      <button type="button" className={activeUser.verified ? "sel" : ""} onClick={() => void applyVerified(activeUser.username, !activeUser.verified)}>
                        {activeUser.verified ? "Remove verified" : "Give verified"}
                      </button>
                      {EFFECTS.map((fx) => (
                        <button key={fx.id} type="button" className={activeUser.effects?.includes(fx.id) ? "sel" : ""} onClick={() => toggleEffect(activeUser.username, fx.id)}>
                          {fx.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </header>

              <div className="msgs-msgs">
                  {activeMsgs.map((m, i) => {
                  const prevDay = i > 0 ? dayLabel(activeMsgs[i - 1].at) : null;
                  const dLabel = dayLabel(m.at);
                  const showDay = i === 0 || prevDay !== dLabel;
                  const mine = m.from === "me";
                  const med = m.media;
                  return (
                    <div key={m.id}>
                      {showDay && <div className="msgs-day">{dLabel}</div>}
                      <div className={`msgs-bubble-row ${mine ? "mine" : "theirs"}`}>
                        {!mine && (
                          <GlyphAvatar src={activeUser.group
                          ? (getUser(m.from)?.avatar ?? { kind: "preset" as const, id: getUser(m.from)?.preset ?? hashPreset(m.from) })
                          : (activeUser.avatar ?? rosterAvatar({ username: activeUser.username, system: activeUser.system, preset: activeUser.preset }))} size={30} username={activeUser.group ? m.from : activeUser.username} />
                        )}
                        <div className={`msgs-bubble-wrap ${activeUser.system ? "system" : ""} ${mine ? "mine" : ""}`}>
                          {activeUser.group && <div className="msgs-bubble-name"><span>{mine ? "You" : getUser(m.from)?.name ?? m.from}</span><span className="msgs-bubble-time">{fmtTime(m.at)}</span></div>}
                          {activeUser.system && (
                            <div className="msgs-bubble-name">
                              <span>McCrack</span>
                              <VerifiedBadge />
                              <span className="msgs-bubble-time">{fmtTime(m.at)}</span>
                            </div>
                          )}
                          {editingId === m.id ? (
                            <form className="msgs-edit-form" onSubmit={(e) => { e.preventDefault(); void saveEdit(m); }}>
                              <input value={editDraft} onChange={(e) => setEditDraft(e.target.value)} maxLength={4000} autoFocus />
                              <button type="submit" disabled={!editDraft.trim()}>Save</button>
                              <button type="button" onClick={() => { setEditingId(null); setEditDraft(""); }}>Cancel</button>
                            </form>
                          ) : (
                            <div className={`msgs-bubble ${mine ? "mine" : ""} ${m.deleted ? "deleted" : ""}`}>
                              {!m.deleted && med?.kind === "image" && <img className="msgs-media-img" src={med.url} alt={med.name} onClick={() => setLightbox(med.url)} />}
                              {!m.deleted && med?.kind === "video" && <video className="msgs-media-vid" src={med.url} controls preload="metadata" />}
                              {m.deleted ? <p>This message was unsent.</p> : m.text && <p>{m.text}</p>}
                            </div>
                          )}
                          {!activeUser.system && <div className="msgs-message-meta"><span className="msgs-time-under">{fmtTime(m.at)}{m.edited && !m.deleted ? " · edited" : ""}</span>{mine && m.seen && <span className="msgs-seen-label">Seen{m.seenAt ? ` · ${fmtTime(m.seenAt)}` : ""}</span>}</div>}
                          {mine && !m.deleted && !m.pending && !m.failed && editingId !== m.id && (
                            <div className="msgs-message-actions">
                              {m.text && <button type="button" onClick={() => { setEditingId(m.id); setEditDraft(m.text); }}>Edit</button>}
                              <button type="button" onClick={() => void removeMessage(m)}>Delete</button>
                              <button type="button" onClick={() => void unsend(m)}>Unsend</button>
                            </div>
                          )}
                          {activeUser.system && <div className="msgs-official-tag">Official announcement channel</div>}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              {activeUser.system ? (
                <div className="msgs-locked">
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="5" y="11" width="14" height="9" rx="2" />
                    <path d="M8 11V8a4 4 0 0 1 8 0v3" strokeLinecap="round" />
                  </svg>
                  This is an official system announcement channel.
                </div>
              ) : !activeUser.group && !contacts.includes(active ?? "") ? (
                <div className="msgs-locked msgs-req-pending">Accept the contact request before sending messages. Use People to accept or decline requests.</div>
              ) : (
                <>
                  {active && !activeUser.group && contacts.includes(active) && !isOnline(active) && (
                    <div className="msgs-locked msgs-req-pending">
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="9" />
                        <path d="M12 8v4.5" strokeLinecap="round" />
                        <path d="M12 15.6v.6" strokeLinecap="round" />
                      </svg>
                      @{activeUser.username} is offline — your message will be waiting when they open Messages.
                    </div>
                  )}
                <div className="msgs-composer">
                  <input
                    ref={attachRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm,video/quicktime,video/x-matroska"
                    style={{ display: "none" }}
                    onChange={onAttach}
                  />
                  <button type="button" className="msgs-attach-btn" title="Send photo or video" onClick={() => attachRef.current?.click()}>
                    <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.9">
                      <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && enterSends) {
                        if (!e.shiftKey) { e.preventDefault(); send(); }
                      }
                    }}
                    className="msgs-input"
                    placeholder={activeMsgs.length === 0 ? `Message ${activeUser.group ? activeUser.name : `@${active}`}...` : "Message..."}
                  />
                  <button type="button" className="msgs-send-btn" onClick={send} disabled={!draft.trim() || (!activeUser.group && !contacts.includes(active ?? ""))}>
                    <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor">
                      <path d="M3 20.5L22 12 3 3.5v6.6L15.5 12 3 13.9z" />
                    </svg>
                  </button>
                </div>
                </>
              )}
            </>
          ) : (
            <div className="msgs-conv-empty">
              <span className="msgs-conv-empty-logo">V</span>
              <h2>Messages</h2>
              <p>Select a conversation to start chatting.</p>
            </div>
          )}
        </section>
      </div>

      {notice && !call && createPortal((() => {
        const u = getUser(notice.user) ?? { username: notice.user, name: nameCap(notice.user), preset: hashPreset(notice.user) };
        return (
          <div className="msgs-banner msgs-banner--text" role="button" onClick={() => { setNotice(null); if (activeRef.current !== notice.user) setActive(notice.user); }}>
            <GlyphAvatar src={rosterAvatar({ username: u.username, system: !!(u as RosterUser).system, preset: u.preset })} size={44} username={u.username} />
            <div className="msgs-banner-body">
              <span className="msgs-banner-name">{u.name}</span>
              <span className="msgs-banner-sub">{notice.text}</span>
            </div>
          </div>
        );
      })(), document.body)}
      {toast && <div className="msgs-toast">{toast}</div>}
      {newChat && <NewChatModal people={people} me={profile.username.toLowerCase()} onPick={startChat} onCreate={startChat} onClose={() => setNewChat(false)} />}
      {newGroup && <CreateGroupModal people={people.filter((person) => contacts.includes(person.username))} onCreate={(title, usernames) => void createGroupChat(title, usernames)} onClose={() => setNewGroup(false)} />}
      {settingsOpen && profile && (
        <SettingsPanel
          profile={profile}
          notifOn={notifOn}
          onNotif={setNotifOn}
          enterSends={enterSends}
          onEnterSends={setEnterSends}
          onBack={() => setSettingsOpen(false)}
          onOpenProfile={() => { setSettingsOpen(false); openSelfProfile(); }}
          onEditProfile={() => { setSettingsOpen(false); setEditOpen(true); }}
          onSignOut={() => void signOut()}
          onInfo={(t, lines) => setInfo({ title: t, lines })}
          isOwner={isOwner}
          onLab={() => setLabOpen(true)}
        />
      )}
      {editOpen && profile && (
        <EditProfilePanel
          adminOwner={adminOwner}
          profile={profile}
          onBack={() => setEditOpen(false)}
          onSave={(p) => {
            setProfile(p);
            setEditOpen(false);
            setProfileView((v) => (v && v.isSelf ? { ...v, user: { username: p.username, name: p.name, avatar: p.avatar, preset: hashPreset(p.username), verified: p.verified, role: p.role, effects: p.effects, status: p.status, bio: p.bio, banner: p.banner, joinedAt: p.joinedAt } } : v));
            setPeople((ps) => ps.map((x) => (x.username === p.username.toLowerCase() ? { ...x, name: p.name, avatar: p.avatar, bio: p.bio, banner: p.banner, status: p.status, effects: p.effects, verified: p.verified } : x)));
            setToast("Profile saved.");
          }}
        />
      )}
      {labOpen && profile && (
        <LabPanel
          adminOwner={adminOwner}
          isOwner={isOwner}
          badges={activeBadges}
          effects={profile.effects ?? []}
          lab={lab}
          onLab={toggleLab}
          onToggleBadge={toggleBadge}
          onToggleEffect={(id) => applyEffects(profile.username, (profile.effects ?? []).includes(id) ? (profile.effects ?? []).filter((x) => x !== id) : [...(profile.effects ?? []), id])}
          onReset={resetLab}
          onBack={() => setLabOpen(false)}
        />
      )}
      {call && <CallOverlay call={call} onEnd={() => setCall(null)} onActive={() => setCall((c) => (c ? { ...c, stage: "active", startedAt: Date.now() } : c))} resolve={(u) => getUser(u) ?? { username: u, name: nameCap(u), preset: hashPreset(u) }} />}
      {profileView && (
        <ProfilePanel
          key={profileView.user.username}
          user={profileView.user}
          isSelf={profileView.isSelf}
          isContact={contacts.includes(profileView.user.username)}
          pending={requests.some((r) => r.kind === "contact" && r.username === profileView.user.username)}
          adminOwner={adminOwner}
          isOwner={profileView.isSelf && isOwner}
          contactsList={contactsList}
          onBack={() => setProfileView(null)}
          onChat={() => { const u = profileView.user.username; setProfileView(null); setTab("chats"); void startChat(u); }}
          onEdit={() => { setProfileView(null); setEditOpen(true); }}
          onSettings={() => { setProfileView(null); setSettingsOpen(true); }}
          onOpenUser={(u) => setProfileView({ user: u, isSelf: Boolean(profile && u.username === profile.username.toLowerCase()) })}
          onToggleEffect={applyEffects}
          onToggleVerified={applyVerified}
        />
      )}
      {info && <InfoModal title={info.title} lines={info.lines} onClose={() => setInfo(null)} />}
      {lightbox && (
        <div className="msgs-modal-overlay msgs-lightbox" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="attachment" onClick={(e) => e.stopPropagation()} />
          <button type="button" className="msgs-lightbox-x" onClick={() => setLightbox(null)}>✕</button>
        </div>
      )}
    </div>
  );
}

export default MessagesSurface;
