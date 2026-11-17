const NOW_PLAYING_KEY = "vertex-now-playing";

export function readNowPlaying(): string {
  try { return (localStorage.getItem(NOW_PLAYING_KEY) ?? "").trim().slice(0, 40); } catch { return ""; }
}

export function publishNowPlaying(name: string) {
  try { localStorage.setItem(NOW_PLAYING_KEY, name); } catch { /* noop */ }
  try { window.dispatchEvent(new CustomEvent("vertex-now-playing", { detail: name })); } catch { /* noop */ }
}

export type MediaSession = {
  source: "music" | "video";
  title: string;
  artist: string;
  artwork: string;
  playing: boolean;
  progress: number;
  duration: number;
  volume?: number;
  muted?: boolean;
  queue?: string[];
  onToggle?: () => void;
  onSeek?: (time: number) => void;
  onNext?: () => void;
  onPrev?: () => void;
  onSetVolume?: (volume: number) => void;
  onToggleMute?: () => void;
  onClose?: () => void;
};

let mediaSession: MediaSession | null = null;
const mediaListeners = new Set<() => void>();

export function getMediaSession(): MediaSession | null {
  return mediaSession;
}

export function setMediaSession(next: MediaSession | null) {
  if (mediaSession === next) return;
  mediaSession = next;
  notifyMediaSession();
}

export function notifyMediaSession() {
  mediaListeners.forEach((listener) => { try { listener(); } catch { /* noop */ } });
}

export function subscribeMediaSession(listener: () => void): () => void {
  mediaListeners.add(listener);
  return () => { mediaListeners.delete(listener); };
}
