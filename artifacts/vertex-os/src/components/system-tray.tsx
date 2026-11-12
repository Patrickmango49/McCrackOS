import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { Battery, BatteryCharging, BatteryFull, BatteryLow, BatteryMedium, Bell, ChevronLeft, ChevronRight, Pause, Play, PlugZap, Volume2, VolumeX, X } from "lucide-react";
import { localeOf, type Lang } from "../i18n";

const BASE = import.meta.env.BASE_URL.endsWith("/") ? import.meta.env.BASE_URL : `${import.meta.env.BASE_URL}/`;

type TrayPanel = null | "clock" | "audio" | "battery";
type SysAudioState = { on: boolean; vol: number; muted: boolean; output: "speakers" | "headphones" };

export type TrayNotification = { id: number; title: string; copy: string; href?: string };

type BatteryState = { supported: boolean; level: number; charging: boolean; chargingTime: number; dischargingTime: number };

type BatteryManagerLike = {
  level: number;
  charging: boolean;
  chargingTime: number;
  dischargingTime: number;
  addEventListener: (type: string, listener: () => void) => void;
  removeEventListener: (type: string, listener: () => void) => void;
};

function fmtBatTime(seconds: number): string | null {
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return h > 0 ? `${h} h ${m} min` : `${m} min`;
}

function readSysAudio(): SysAudioState {
  try {
    const raw = localStorage.getItem("vertex-sys-audio");
    if (raw) {
      const parsed = JSON.parse(raw) as { on?: boolean; vol?: number; muted?: boolean; output?: string };
      return {
        on: Boolean(parsed.on),
        vol: typeof parsed.vol === "number" && Number.isFinite(parsed.vol) ? Math.min(100, Math.max(0, parsed.vol)) : 40,
        muted: Boolean(parsed.muted),
        output: parsed.output === "headphones" ? "headphones" : "speakers",
      };
    }
  } catch { /* fall through */ }
  return { on: false, vol: 40, muted: false, output: "speakers" };
}

export function SystemTray({ now, lang, notifications, unseen, onOpenClock, onDismiss, onClear }: {
  now: Date;
  lang: Lang;
  notifications: TrayNotification[];
  unseen: number;
  onOpenClock: () => void;
  onDismiss: (id: number) => void;
  onClear: () => void;
}) {
  const [panel, setPanel] = useState<TrayPanel>(null);
  const [sys, setSys] = useState(readSysAudio);
  const [battery, setBattery] = useState<BatteryState>({ supported: false, level: 1, charging: false, chargingTime: Infinity, dischargingTime: Infinity });
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [calAnchor, setCalAnchor] = useState(() => ({ y: now.getFullYear(), m: now.getMonth() }));

  useEffect(() => {
    try { localStorage.setItem("vertex-sys-audio", JSON.stringify(sys)); } catch { /* ignore */ }
  }, [sys]);

  useEffect(() => {
    const sync = (event: Event) => {
      const next = (event as CustomEvent<SysAudioState>).detail;
      if (next) setSys({ ...next, output: next.output === "headphones" ? "headphones" : "speakers" });
    };
    window.addEventListener("vertex-sys-audio-change", sync);
    return () => window.removeEventListener("vertex-sys-audio-change", sync);
  }, []);

  const updateSys = (change: (current: SysAudioState) => SysAudioState) => setSys((current) => {
    const next = change(current);
    window.dispatchEvent(new CustomEvent("vertex-sys-audio-change", { detail: next }));
    return next;
  });

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = sys.muted ? 0 : Math.min(1, Math.max(0, sys.vol / 100));
    if (sys.on && audio.paused) { void audio.play().catch(() => undefined); }
    else if (!sys.on && !audio.paused) { audio.pause(); }
  }, [sys]);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    const nav = navigator as Navigator & { getBattery?: () => Promise<BatteryManagerLike> };
    if (typeof nav.getBattery !== "function") return;
    let manager: BatteryManagerLike | null = null;
    let cancelled = false;
    const sync = () => {
      if (!manager || cancelled) return;
      setBattery({ supported: true, level: manager.level, charging: manager.charging, chargingTime: manager.chargingTime, dischargingTime: manager.dischargingTime });
    };
    nav.getBattery().then((b) => {
      if (cancelled) return;
      manager = b;
      b.addEventListener("levelchange", sync);
      b.addEventListener("chargingchange", sync);
      b.addEventListener("chargingtimechange", sync);
      b.addEventListener("dischargingtimechange", sync);
      sync();
    }).catch(() => undefined);
    return () => {
      cancelled = true;
      if (manager) {
        manager.removeEventListener("levelchange", sync);
        manager.removeEventListener("chargingchange", sync);
        manager.removeEventListener("chargingtimechange", sync);
        manager.removeEventListener("dischargingtimechange", sync);
      }
    };
  }, []);

  const toggle = (next: Exclude<TrayPanel, null>) => setPanel((p) => (p === next ? null : next));

  const openClock = () => {
    setCalAnchor({ y: now.getFullYear(), m: now.getMonth() });
    onOpenClock();
    setPanel((p) => (p === "clock" ? null : "clock"));
  };

  const shiftMonth = (delta: number) => setCalAnchor(({ y, m }) => {
    const d = new Date(y, m + delta, 1);
    return { y: d.getFullYear(), m: d.getMonth() };
  });

  const calCells = useMemo(() => {
    const firstDay = new Date(calAnchor.y, calAnchor.m, 1).getDay();
    const daysIn = new Date(calAnchor.y, calAnchor.m + 1, 0).getDate();
    const prevDays = new Date(calAnchor.y, calAnchor.m, 0).getDate();
    const out: { y: number; m: number; d: number; inMonth: boolean }[] = [];
    for (let i = 0; i < 42; i++) {
      const day = i - firstDay + 1;
      if (day <= 0) {
        out.push({ y: new Date(calAnchor.y, calAnchor.m - 1, 1).getFullYear(), m: new Date(calAnchor.y, calAnchor.m - 1, 1).getMonth(), d: prevDays + day, inMonth: false });
      } else if (day > daysIn) {
        out.push({ y: new Date(calAnchor.y, calAnchor.m + 1, 1).getFullYear(), m: new Date(calAnchor.y, calAnchor.m + 1, 1).getMonth(), d: day - daysIn, inMonth: false });
      } else {
        out.push({ y: calAnchor.y, m: calAnchor.m, d: day, inMonth: true });
      }
    }
    return out;
  }, [calAnchor]);

  const loc = localeOf(lang);
  const fmtHourMinute = new Intl.DateTimeFormat(loc, { hour: "2-digit", minute: "2-digit" });
  const fmtDateShort = new Intl.DateTimeFormat(loc, { weekday: "short", month: "short", day: "numeric" });
  const fmtDateLong = new Intl.DateTimeFormat(loc, { weekday: "long", month: "long", day: "numeric" });
  const fmtMonthYear = new Intl.DateTimeFormat(loc, { month: "long", year: "numeric" });
  const fmtWeekdayShort = new Intl.DateTimeFormat(loc, { weekday: "short" });

  const time = fmtHourMinute.format(now);
  const dateShort = fmtDateShort.format(now);
  const dateLong = fmtDateLong.format(now);
  const weekdaySamples = [0, 1, 2, 3, 4, 5, 6].map((i) => new Date(2026, 0, 4 + i));

  const audible = sys.on && sys.vol > 0 && !sys.muted;

  const batPct = Math.round(battery.level * 100);
  const batLow = !battery.charging && batPct <= 20;
  const BatIcon = battery.charging ? BatteryCharging : batPct <= 20 ? BatteryLow : batPct <= 60 ? BatteryMedium : BatteryFull;
  const batTime = battery.charging ? fmtBatTime(battery.chargingTime) : fmtBatTime(battery.dischargingTime);

  return (
    <>
      {panel && <div className="tray-scrim" onClick={() => setPanel(null)} />}
      <div className="system-tray" onClick={(event) => event.stopPropagation()}>
        <div className={`tray-seg tray-seg-sound${panel === "audio" ? " is-open" : ""}`} onClick={() => toggle("audio")} role="button" tabIndex={0} aria-label="System audio">
          {sys.muted || sys.vol === 0 ? <VolumeX size={17} /> : <Volume2 size={17} />}
          <span className={`tray-eq${audible ? " playing" : ""}`} aria-hidden="true">
            <i /><i /><i /><i /><i />
          </span>
        </div>
        {battery.supported && (
          <div className={`tray-seg tray-seg-battery${panel === "battery" ? " is-open" : ""}`} onClick={() => toggle("battery")} role="button" tabIndex={0} aria-label="Battery status">
            <BatIcon size={17} />
            <span className="tray-bat-pct">{batPct}%</span>
          </div>
        )}
        <div className={`tray-seg tray-seg-clock${panel === "clock" ? " is-open" : ""}`} onClick={openClock} role="button" tabIndex={0} aria-label="Clock, calendar and notifications">
          <span className="tray-time">{time}</span>
          <span className="tray-date">{dateShort}</span>
          {unseen > 0 && <span className="tray-unseen">{unseen > 9 ? "9+" : unseen}</span>}
        </div>

        {panel === "audio" && (
          <div className="tray-flyout tray-flyout-audio">
            <div className="tray-flyout-title"><Volume2 size={14} /> System Audio</div>
            <div className="tray-audio-track">Ambient Loop <span className="tray-dot" /> seamless</div>
            <div className="tray-volume-row">
              <button className={`tray-mute${sys.muted || sys.vol === 0 ? " is-muted" : ""}`} onClick={() => updateSys((s) => ({ ...s, muted: !s.muted }))} aria-label="Toggle mute">
                {sys.muted || sys.vol === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>
              <input
                className="tray-range"
                type="range"
                min={0}
                max={100}
                step={1}
                value={sys.muted ? 0 : sys.vol}
                style={{ "--tray-fill": `${sys.muted ? 0 : sys.vol}%` } as CSSProperties}
                onChange={(event) => updateSys((s) => ({ ...s, vol: Number(event.target.value) }))}
                aria-label="Volume level"
              />
              <span className="tray-vol-num">{sys.muted ? 0 : sys.vol}</span>
            </div>
            <button className={`tray-play${sys.on ? " is-on" : ""}`} onClick={() => updateSys((s) => ({ ...s, on: !s.on }))}>
              {sys.on ? <Pause size={15} /> : <Play size={15} />}
              {sys.on ? "Playing" : "Play system audio"}
            </button>
          </div>
        )}

        {panel === "battery" && (
          <div className="tray-flyout tray-flyout-battery">
            <div className="tray-flyout-title">{battery.charging ? <PlugZap size={14} /> : <Battery size={14} />} Battery</div>
            <div className="tray-bat-big">
              <div className="tray-bat-gauge"><i className={battery.charging ? "charging" : batLow ? "low" : ""} style={{ width: `${batPct}%` }} /></div>
              <strong>{batPct}%</strong>
            </div>
            <div className="tray-bat-status">{battery.charging ? "Plugged in · charging" : "On battery power"}</div>
            <div className="tray-bat-status">{batTime ? (battery.charging ? `Full in about ${batTime}` : `About ${batTime} remaining`) : (battery.charging ? "Estimating charge time…" : "Estimating time remaining…")}</div>
            <div className="tray-bat-note">Live battery status from this device.</div>
          </div>
        )}

        {panel === "clock" && (
          <div className="tray-flyout tray-flyout-clock">
            <div className="tray-clock-top">
              <div className="tray-flyout-time">{time}</div>
              <div className="tray-flyout-date">{dateLong}</div>
            </div>

            <div className="tray-action-head">
              <span className="tray-action-title"><Bell size={13} /> Notifications</span>
              {notifications.length > 0 && <span className="tray-action-count">{notifications.length}</span>}
              {notifications.length > 0 && <button className="tray-action-clear" onClick={onClear}>Clear all</button>}
            </div>
            <div className="tray-notif-list">
              {notifications.length === 0 ? (
                <div className="tray-notif-empty">Nothing here yet — notifications will show up in this panel.</div>
              ) : (
                notifications.slice(0, 8).map((n) => (
                  <div className="tray-notif" key={n.id}>
                    {n.href
                      ? <a className="tray-notif-body" href={n.href} target="_blank" rel="noopener noreferrer"><span className="tray-notif-title">{n.title}</span><span className="tray-notif-copy">{n.copy}</span></a>
                      : <div className="tray-notif-body"><span className="tray-notif-title">{n.title}</span><span className="tray-notif-copy">{n.copy}</span></div>}
                    <button className="tray-notif-x" onClick={() => onDismiss(n.id)} aria-label="Dismiss notification"><X size={11} /></button>
                  </div>
                ))
              )}
            </div>

            <div className="tray-cal-widget">
              <div className="tray-cal-nav">
                <span className="tray-cal-head">{fmtMonthYear.format(new Date(calAnchor.y, calAnchor.m, 1))}</span>
                <span className="tray-cal-arrows">
                  <button className="tray-cal-btn" onClick={() => shiftMonth(-1)} aria-label="Previous month"><ChevronLeft size={14} /></button>
                  <button className="tray-cal-btn" onClick={() => shiftMonth(1)} aria-label="Next month"><ChevronRight size={14} /></button>
                </span>
              </div>
              <div className="tray-calendar-grid">
                {weekdaySamples.map((d, i) => (
                  <span key={`w${i}`} className="tray-cal-dow">{fmtWeekdayShort.format(d)}</span>
                ))}
                {calCells.map((c, i) => (
                  <span key={`d${i}`} className={`tray-cal-day${c.inMonth ? "" : " adj"}${c.d === now.getDate() && c.m === now.getMonth() && c.y === now.getFullYear() ? " today" : ""}`}>
                    {c.d}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
      <audio ref={audioRef} src={`${BASE}system-audio/ambient-loop.wav`} loop preload="none" />
    </>
  );
}
