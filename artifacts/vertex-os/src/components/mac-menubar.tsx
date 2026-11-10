import { useEffect, useMemo, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Battery, Check, Info, Languages, LockKeyhole, Monitor,
  RotateCcw, Search, Settings2, Sparkles, Volume2,
} from "lucide-react";
import { LANGS, localeOf, type Lang } from "../i18n";

export type MacWindowRef = { id: string; title: string };

type MenuItem =
  | { kind: "sep" }
  | {
      kind: "item";
      label: string;
      hint?: string;
      icon?: LucideIcon;
      checked?: boolean;
      danger?: boolean;
      onSelect: () => void;
    };

export type MacMenuBarProps = {
  now: Date;
  lang: Lang;
  appName: string;
  accountName: string;
  windows: MacWindowRef[];
  activeWindowId: string | null;
  unseen: number;
  showIcons: boolean;
  onPickLanguage: (lang: Lang) => void;
  onOpenApp: (id: string) => void;
  onFocusApp: (id: string) => void;
  onMinimizeApp: (id: string) => void;
  onCloseApp: (id: string) => void;
  onAbout: () => void;
  onSettings: () => void;
  onLaunchpad: () => void;
  onNotifications: () => void;
  onRestart: () => void;
  onLock: () => void;
  onToggleIcons: () => void;
  onHint: (title: string, copy: string) => void;
};

type BatteryState = { supported: boolean; level: number; charging: boolean; chargingTime: number; dischargingTime: number };
type BatteryManagerLike = {
  level: number;
  charging: boolean;
  chargingTime: number;
  dischargingTime: number;
  addEventListener: (type: string, listener: () => void) => void;
  removeEventListener: (type: string, listener: () => void) => void;
};

const BAR_H = 44;

function useBattery() {
  const [battery, setBattery] = useState<BatteryState>({ supported: false, level: 1, charging: false, chargingTime: Infinity, dischargingTime: Infinity });
  useEffect(() => {
    const nav = navigator as Navigator & { getBattery?: () => Promise<BatteryManagerLike> };
    if (typeof nav.getBattery !== "function") return;
    let manager: BatteryManagerLike | null = null;
    const sync = () => {
      if (!manager) return;
      setBattery({ supported: true, level: manager.level, charging: manager.charging, chargingTime: manager.chargingTime, dischargingTime: manager.dischargingTime });
    };
    nav.getBattery().then((b) => {
      manager = b;
      sync();
      b.addEventListener("levelchange", sync);
      b.addEventListener("chargingchange", sync);
    }).catch(() => undefined);
    return () => {
      if (!manager) return;
      manager.removeEventListener("levelchange", sync);
      manager.removeEventListener("chargingchange", sync);
    };
  }, []);
  return battery;
}

function AppleGlyph({ size = 15 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" focusable="false" className="mac-bar-glyph">
      <path fill="currentColor" d="M16.9 12.5c0-2.4 1.9-3.5 2-3.6-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.2-2.8.9-3.5.9-.7 0-1.8-.9-3-.8-1.5 0-2.9.9-3.7 2.3-1.6 2.7-.4 6.8 1.1 9 .8 1.1 1.7 2.3 2.9 2.3 1.2 0 1.6-.8 3-.8s1.8.8 3 .7c1.3 0 2.1-1.1 2.8-2.2.9-1.3 1.2-2.5 1.3-2.6-.1 0-2.5-1-2.5-3.4zM14.7 5.3c.6-.8 1.1-1.9 1-3-.9 0-2.1.6-2.8 1.4-.6.7-1.1 1.8-1 2.9 1 .1 2.1-.5 2.8-1.3z" />
    </svg>
  );
}

function WifiGlyph() {
  return (
    <svg viewBox="0 0 24 24" width={16} height={16} aria-hidden="true" focusable="false" className="mac-bar-glyph">
      <path fill="currentColor" d="M12 18.6a1.6 1.6 0 1 0 0 3.2 1.6 1.6 0 0 0 0-3.2zM12 12.3c1.9 0 3.6.7 4.8 1.9l1.5-1.5A8.9 8.9 0 0 0 12 9.9c-2.4 0-4.6 1-6.3 2.8l1.5 1.5a6.6 6.6 0 0 1 4.8-1.9zM12 6.6c3.1 0 6 1.2 8.2 3.4l1.5-1.5A14.4 14.4 0 0 0 12 4.2c-4 0-7.6 1.6-9.7 4.3l1.5 1.5A11.9 11.9 0 0 1 12 6.6z" />
    </svg>
  );
}

function ControlGlyph() {
  return (
    <svg viewBox="0 0 24 24" width={16} height={16} aria-hidden="true" focusable="false" className="mac-bar-glyph">
      <path fill="currentColor" d="M4 6.8h10.2v2H4v-2zm12.6 0H20v2h-3.4v-2zM4 11h3.4v2H4v-2zm5.8 0H20v2H9.8v-2zM4 15.2h10.2v2H4v-2zm12.6 0H20v2h-3.4v-2z" />
      <circle fill="currentColor" cx="16" cy="7.8" r="2.1" />
      <circle fill="currentColor" cx="7.4" cy="12" r="2.1" />
      <circle fill="currentColor" cx="16" cy="16.2" r="2.1" />
    </svg>
  );
}

function BatteryGlyph({ level, charging }: { level: number; charging: boolean }) {
  const pct = Math.round(Math.max(0, Math.min(1, level)) * 100);
  return (
    <span className="mac-bar-battery" role="img" aria-label={`Battery ${pct}%`}>
      <span className="mac-bar-battery-text">{pct}%</span>
      <svg viewBox="0 0 32 16" width={26} height={13} aria-hidden="true" focusable="false">
        <rect x="0.75" y="0.75" width="26.5" height="14.5" rx="4.4" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path fill="currentColor" d="M28.7 5.4c1.6.5 2.4 1.4 2.4 2.6s-.8 2.1-2.4 2.6V5.4z" />
        <rect x="3.2" y="3.2" width={Math.max(2.2, 21.6 * level)} height="9.6" rx="2.2" fill="currentColor" opacity={pct <= 20 && !charging ? 0.95 : 0.9} />
      </svg>
      {charging ? <span className="mac-bar-bolt" aria-hidden="true" /> : null}
    </span>
  );
}

export function MacMenuBar(props: MacMenuBarProps) {
  const {
    now, lang, appName, accountName, windows, activeWindowId, unseen, showIcons,
    onPickLanguage, onOpenApp, onFocusApp, onMinimizeApp, onCloseApp,
    onAbout, onSettings, onLaunchpad, onNotifications, onRestart, onLock,
    onToggleIcons, onHint,
  } = props;
  const battery = useBattery();
  const [open, setOpen] = useState<string | null>(null);
  const [panelX, setPanelX] = useState<number | null>(null);
  const barRef = useRef<HTMLDivElement | null>(null);
  const leftRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const loc = useMemo(() => localeOf(lang), [lang]);

  useEffect(() => {
    if (!open || open === "lang" || open === "clock") { setPanelX(null); return; }
    const el = leftRefs.current[open];
    const bar = barRef.current;
    if (!el || !bar) { setPanelX(null); return; }
    const limit = Math.max(6, bar.clientWidth - 250);
    setPanelX(Math.max(6, Math.min(el.offsetLeft - 8, limit)));
  }, [open, windows, lang]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const close = () => setOpen(null);
  const run = (fn: () => void) => () => { close(); fn(); };
  const nope = (what: string) => () => onHint(what, `${what} is not available in the web build yet.`);

  const apple: MenuItem[] = [
    { kind: "item", label: `About ${appName === "Finder" ? "Vertex-OS" : appName}`, icon: Info, onSelect: onAbout },
    { kind: "sep" },
    { kind: "item", label: "System Settings…", icon: Settings2, onSelect: onSettings },
    { kind: "item", label: "Vertex Store…", icon: Sparkles, onSelect: () => onOpenApp("hub") },
    { kind: "item", label: "Launchpad", icon: Monitor, onSelect: onLaunchpad },
    { kind: "sep" },
    { kind: "item", label: "Language", icon: Languages, onSelect: () => setOpen("lang") },
    { kind: "sep" },
    { kind: "item", label: "Lock Screen", icon: LockKeyhole, onSelect: onLock },
    { kind: "item", label: "Restart…", icon: RotateCcw, onSelect: onRestart },
  ];

  const langItems: MenuItem[] = LANGS.map((entry) => ({
    kind: "item" as const,
    label: entry.native,
    hint: entry.label,
    checked: entry.code === lang,
    onSelect: () => { onPickLanguage(entry.code as Lang); setOpen(null); },
  }));

  const app: MenuItem[] = [
    { kind: "item", label: `About ${appName}`, icon: Info, onSelect: onAbout },
    { kind: "sep" },
    { kind: "item", label: "Settings…", icon: Settings2, onSelect: onSettings },
    { kind: "sep" },
    { kind: "item", label: `Hide ${appName}`, icon: Volume2, onSelect: run(() => activeWindowId && onMinimizeApp(activeWindowId)) },
    { kind: "item", label: `Quit ${appName}`, danger: true, onSelect: run(() => activeWindowId && onCloseApp(activeWindowId)) },
  ];

  const file: MenuItem[] = [
    { kind: "item", label: "New Window", icon: Search, onSelect: onLaunchpad },
    { kind: "item", label: "Open Settings…", icon: Settings2, onSelect: onSettings },
    { kind: "sep" },
    { kind: "item", label: "Close Window", danger: true, onSelect: run(() => activeWindowId && onCloseApp(activeWindowId)) },
  ];

  const edit: MenuItem[] = [
    { kind: "item", label: "Undo", hint: "⌘Z", onSelect: nope("Undo") },
    { kind: "item", label: "Redo", hint: "⇧⌘Z", onSelect: nope("Redo") },
    { kind: "sep" },
    { kind: "item", label: "Cut", hint: "⌘X", onSelect: nope("Cut") },
    { kind: "item", label: "Copy", hint: "⌘C", onSelect: nope("Copy") },
    { kind: "item", label: "Paste", hint: "⌘V", onSelect: nope("Paste") },
    { kind: "item", label: "Select All", hint: "⌘A", onSelect: nope("Select All") },
  ];

  const view: MenuItem[] = [
    { kind: "item", label: showIcons ? "Hide Desktop Icons" : "Show Desktop Icons", icon: Monitor, onSelect: onToggleIcons },
    { kind: "sep" },
    { kind: "item", label: "Enter Full Screen", icon: Monitor, onSelect: run(() => activeWindowId && onMinimizeApp(activeWindowId)) },
    { kind: "item", label: "Notification Centre", icon: Sparkles, onSelect: onNotifications },
  ];

  const windowItems: MenuItem[] = windows.length
    ? windows.map((win) => ({
        kind: "item" as const,
        label: win.title,
        checked: win.id === activeWindowId,
        onSelect: () => onFocusApp(win.id),
      }))
    : [{ kind: "item" as const, label: "No open windows", onSelect: onLaunchpad }];

  const help: MenuItem[] = [
    { kind: "item", label: "Vertex-OS Help", icon: Info, onSelect: onLaunchpad },
  ];

  const menus: { id: string; label: string; items: MenuItem[]; bold?: boolean }[] = [
    { id: "apple", label: "", items: apple },
    { id: "app", label: appName, items: app, bold: true },
    { id: "file", label: "File", items: file },
    { id: "edit", label: "Edit", items: edit },
    { id: "view", label: "View", items: view },
    { id: "window", label: "Window", items: windowItems },
    { id: "help", label: "Help", items: help },
  ];

  const time = new Intl.DateTimeFormat(loc, { hour: "numeric", minute: "2-digit" }).format(now);
  const date = new Intl.DateTimeFormat(loc, { weekday: "short", month: "short", day: "numeric" }).format(now);

  const toggle = (id: string) => setOpen((prev) => (prev === id ? null : id));

  return (
    <>
      {open ? <div className="mac-bar-scrim" onPointerDown={close} aria-hidden="true" /> : null}
      <div className="mac-bar" ref={barRef} style={{ ["--mac-bar-h" as string]: `${BAR_H}px` }}>
        <div className="mac-bar-left">
          {menus.map((menu) => (
            <button
              key={menu.id}
              type="button"
              ref={(el) => { leftRefs.current[menu.id] = el; }}
              className={`mac-bar-item mac-bar-item--${menu.id}${open === menu.id ? " is-open" : ""}${menu.bold ? " is-bold" : ""}`}
              aria-haspopup="menu"
              aria-expanded={open === menu.id}
              onClick={() => toggle(menu.id)}
              onMouseEnter={() => { if (open && open !== menu.id) setOpen(menu.id); }}
            >
              {menu.id === "apple" ? <AppleGlyph /> : null}
              <span className="mac-bar-label">{menu.label}</span>
            </button>
          ))}
        </div>

        <div className="mac-bar-right">
          <button type="button" className={"mac-bar-status mac-bar-language" + (open === "lang" ? " is-open" : "")} onClick={() => toggle("lang")} aria-label="Choose language" aria-expanded={open === "lang"}>{lang.toUpperCase()}</button>
          <button type="button" className={"mac-bar-status" + (open === "internet" ? " is-open" : "")} onClick={() => toggle("internet")} aria-label="Internet settings" aria-expanded={open === "internet"}>
            <WifiGlyph />
          </button>
          <button type="button" className={"mac-bar-status" + (open === "control" ? " is-open" : "")} onClick={() => toggle("control")} aria-label="Control Centre" aria-expanded={open === "control"}>
            <ControlGlyph />
          </button>
          {!battery.supported ? <button type="button" className={"mac-bar-status" + (open === "battery" ? " is-open" : "")} onClick={() => toggle("battery")} aria-label="Battery status" aria-expanded={open === "battery"}><Battery size={18} /></button> : null}
          {battery.supported ? (
            <button type="button" className="mac-bar-status" onClick={() => setOpen("battery")} aria-label={`Battery ${Math.round(battery.level * 100)}%`}>
              <BatteryGlyph level={battery.level} charging={battery.charging} />
            </button>
          ) : null}
          <button type="button" className={`mac-bar-status mac-bar-clock${unseen > 0 ? " has-unseen" : ""}`} onClick={() => toggle("clock")} aria-label={`${date} ${time}`}>
            <span className="mac-bar-clock-time">{time}</span>
            <span className="mac-bar-clock-date">{date}</span>
            {unseen > 0 ? <span className="mac-bar-badge">{unseen > 9 ? "9+" : unseen}</span> : null}
          </button>
        </div>

        {menus.map((menu) => (open === menu.id ? (
          <div key={`panel-${menu.id}`} className={`mac-menu mac-menu--${menu.id}`} role="menu" style={panelX === null ? undefined : { left: panelX }}>
            <div className="mac-menu-head">
              {menu.id === "apple" ? <AppleGlyph size={17} /> : <span className="mac-menu-head-dot" aria-hidden="true" />}
              <strong>{menu.id === "apple" ? "Vertex-OS" : menu.label}</strong>
              {menu.id === "apple" ? <span className="mac-menu-head-user">{accountName}</span> : null}
            </div>
            {menu.items.map((item, index) => item.kind === "sep"
              ? <div key={`sep-${index}`} className="mac-menu-sep" role="separator" />
              : (
                <button
                  key={item.label}
                  type="button"
                  role="menuitem"
                  className={`mac-menu-row${item.danger ? " is-danger" : ""}`}
                  onClick={item.onSelect}
                >
                  <span className="mac-menu-check">{item.checked ? <Check size={13} /> : null}</span>
                  <span className="mac-menu-text">
                    {item.icon ? <item.icon size={14} /> : null}
                    <span>{item.label}</span>
                  </span>
                  {item.hint ? <span className="mac-menu-hint">{item.hint}</span> : null}
                </button>
              ))}
            {menu.id === "apple" ? (
              <div className="mac-menu-foot">
                <span>{accountName}</span>
                <button type="button" className="mac-menu-foot-btn" onClick={onLock}>Lock</button>
                <button type="button" className="mac-menu-foot-btn" onClick={onRestart}>Restart</button>
              </div>
            ) : null}
          </div>
        ) : null))}

        {open === "internet" ? <div className="mac-menu mac-menu--right mac-menu--status" role="dialog" aria-label="Internet settings">
          <div className="mac-menu-head"><WifiGlyph /><strong>Internet</strong></div>
          <button type="button" className="mac-menu-row" onClick={run(onSettings)}><span className="mac-menu-check"><Settings2 size={14} /></span><span className="mac-menu-text"><span>Network settings…</span></span></button>
        </div> : null}

        {open === "battery" ? <div className="mac-menu mac-menu--right mac-menu--status" role="dialog" aria-label="Battery status">
          <div className="mac-menu-head"><Battery size={16} /><strong>Battery</strong></div>
          {battery.supported ? <>
            <div className="mac-menu-battery-main"><BatteryGlyph level={battery.level} charging={battery.charging} /><strong>{Math.round(battery.level * 100)}%</strong></div>
            <p className="mac-menu-status-copy">{battery.charging ? "Charging" : "On battery"}{Number.isFinite(battery.chargingTime) && battery.charging ? " · " + Math.round(battery.chargingTime / 60) + " min until full" : ""}{Number.isFinite(battery.dischargingTime) && !battery.charging ? " · about " + Math.round(battery.dischargingTime / 60) + " min remaining" : ""}</p>
          </> : <p className="mac-menu-status-copy">Battery details are not exposed by this browser or device.</p>}
        </div> : null}

        {open === "control" ? <div className="mac-menu mac-menu--right mac-menu--status" role="dialog" aria-label="Control Centre">
          <div className="mac-menu-head"><ControlGlyph /><strong>Control Centre</strong></div>
          <button type="button" className="mac-menu-row" onClick={() => setOpen("internet")}><span className="mac-menu-check"><WifiGlyph /></span><span className="mac-menu-text"><span>Internet</span></span></button>
          <button type="button" className="mac-menu-row" onClick={() => setOpen("battery")}><span className="mac-menu-check"><Battery size={14} /></span><span className="mac-menu-text"><span>Battery</span></span><span className="mac-menu-hint">{battery.supported ? Math.round(battery.level * 100) + "%" : "Unavailable"}</span></button>
          <button type="button" className="mac-menu-row" onClick={() => setOpen("lang")}><span className="mac-menu-check"><Languages size={14} /></span><span className="mac-menu-text"><span>Language</span></span><span className="mac-menu-hint">{lang.toUpperCase()}</span></button>
          <button type="button" className="mac-menu-row" onClick={run(onSettings)}><span className="mac-menu-check"><Settings2 size={14} /></span><span className="mac-menu-text"><span>System Settings…</span></span></button>
          <button type="button" className="mac-menu-row" onClick={run(onNotifications)}><span className="mac-menu-check"><Sparkles size={14} /></span><span className="mac-menu-text"><span>Notifications</span></span>{unseen > 0 ? <span className="mac-menu-hint">{unseen} new</span> : null}</button>
        </div> : null}

        {open === "lang" ? (
          <div className="mac-menu mac-menu--right" role="menu">
            <div className="mac-menu-head"><Languages size={17} /><strong>Language</strong></div>
            {langItems.map((item) => item.kind === "item" && (
              <button key={item.label} type="button" role="menuitem" className="mac-menu-row" onClick={item.onSelect}>
                <span className="mac-menu-check">{item.checked ? <Check size={13} /> : null}</span>
                <span className="mac-menu-text"><span>{item.label}</span></span>
                {item.hint ? <span className="mac-menu-hint">{item.hint}</span> : null}
              </button>
            ))}
          </div>
        ) : null}

        {open === "clock" ? (
          <div className="mac-menu mac-menu--right mac-menu--clock" role="menu">
            <div className="mac-menu-head"><strong className="mac-menu-clock-big">{time}</strong></div>
            <div className="mac-menu-clock-date">{date}</div>
            <div className="mac-menu-sep" />
            <button type="button" role="menuitem" className="mac-menu-row" onClick={run(onNotifications)}>
              <span className="mac-menu-check" />
              <span className="mac-menu-text"><span>Notification Centre</span></span>
              {unseen > 0 ? <span className="mac-menu-hint">{unseen} new</span> : null}
            </button>
            <button type="button" role="menuitem" className="mac-menu-row" onClick={run(onSettings)}>
              <span className="mac-menu-check" />
              <span className="mac-menu-text"><span>System Settings…</span></span>
            </button>
          </div>
        ) : null}
      </div>
    </>
  );
}
