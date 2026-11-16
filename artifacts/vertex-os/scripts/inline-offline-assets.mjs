/**
 * Post-processes the single-file offline build so it is actually self-contained.
 *
 * vite-plugin-singlefile inlines the JS + CSS bundle, but the app still points
 * at loose files in /public (logos, app icons, wallpapers, fonts…). Anything
 * loaded from disk like that breaks when the download is opened from file://,
 * which is exactly why the offline copy showed missing icons and logos.
 *
 * This script walks a whitelist of the public folders, turns each file into a
 * data: URI, exposes the whole set on `globalThis.__VERTEX_ASSETS__`, and
 * rewrites the url(...) / href="/..." references baked into the inlined CSS and
 * HTML. The runtime asset() helpers (see src/asset-map.ts) read the same map at
 * runtime for the icons the app builds dynamically.
 *
 * Heavy folders that never belonged in a text file (videos, eaglercraft, the
 * web proxy runtime) are deliberately skipped — those features need the network.
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

const root = process.cwd();
const publicDir = join(root, "public");
const htmlPath = join(root, "dist", "single", "index.html");

/** Folders under /public to embed. Order does not matter. */
const INCLUDE_DIRS = ["images", "fonts", "wallpapers", "themes", "games"];
/** Individual files at the root of /public to embed. */
const INCLUDE_FILES = ["vertex-hub-logo.png", "vertex-hub-logo-halloween.png", "favicon.svg"];
/** App entry points and their small runtime companions, stored in the repo-level /apps folder. */
const APP_FILES = [
  "apps/messages/index.html",
  "apps/messages/calls.js",
  "apps/movies/index.html",
  "apps/music/web/index.html",
  "apps/music/web/mobile.html",
  "apps/youtube/public/index.html",
];

const MIME = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".otf": "font/otf",
  ".ttf": "font/ttf",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".css": "text/css",
  ".json": "application/json",
  ".html": "text/html",
  ".js": "text/javascript",
};

function mimeFor(file) {
  const dot = file.lastIndexOf(".");
  return MIME[file.slice(dot).toLowerCase()] ?? "application/octet-stream";
}

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.isFile()) out.push(full);
  }
  return out;
}

function collect() {
  const files = [];
  for (const dir of INCLUDE_DIRS) {
    const abs = join(publicDir, dir);
    try {
      if (statSync(abs).isDirectory()) files.push(...walk(abs));
    } catch { /* folder not present — skip */ }
  }
  for (const file of INCLUDE_FILES) {
    const abs = join(publicDir, file);
    try {
      if (statSync(abs).isFile()) files.push(abs);
    } catch { /* skip */ }
  }
  return files;
}

const map = {};
let raw = 0;
for (const abs of collect()) {
  const key = relative(publicDir, abs).split(sep).join("/");
  const buf = readFileSync(abs);
  raw += buf.length;
  map[key] = `data:${mimeFor(abs)};base64,${buf.toString("base64")}`;
}

// App source lives at the repository root rather than under /public. Add it
// to the same runtime map before serialising that map into the final HTML.
for (const key of APP_FILES) {
  const abs = join(root, "..", "..", key);
  try {
    if (!statSync(abs).isFile()) continue;
    const buf = readFileSync(abs);
    raw += buf.length;
    map[key] = `data:${mimeFor(abs)};base64,${buf.toString("base64")}`;
  } catch { /* app source may be absent in a reduced checkout */ }
}

// Inline local app scripts when their source is already in the bundle. Any
// remaining relative assets resolve through the app's hosted base URL at runtime.
for (const key of APP_FILES.filter((file) => file.endsWith(".html"))) {
  const abs = join(root, "..", "..", key);
  try {
    let appHtml = readFileSync(abs, "utf8");
    const folder = key.slice(0, key.lastIndexOf("/") + 1);
    appHtml = appHtml.replace(/(<script\\b[^>]*\\bsrc=["'])([^"']+)(["'][^>]*>\\s*<\\/script>)/gi, (whole, start, src, end) => {
      if (/^(data:|https?:|\\/\\/)/i.test(src)) return whole;
      const target = folder + src.replace(/^\\.\\//, "");
      return map[target] ? start + map[target] + end : whole;
    });
    map[key] = `data:text/html;base64,${Buffer.from(appHtml, "utf8").toString("base64")}`;
  } catch { /* retain the original data URI if a source cannot be read */ }
}

let html = readFileSync(htmlPath, "utf8");

const normalise = (value) => value.replace(/^\\.\\//, "").replace(/^\\//, "");

html = html.replace(/url\\((["']?)([^)"']+)\\1\\)/g, (whole, _q, path) => {
  if (/^data:/i.test(path)) return whole;
  const hit = map[normalise(path)];
  return hit ? `url("${hit}")` : whole;
});

html = html.replace(/href="([^"]+)"/g, (whole, path) => {
  if (/^(data:|https?:|#|\\/\\/)/i.test(path)) return whole;
  const hit = map[normalise(path)];
  return hit ? `href="${hit}"` : whole;
});

const assetScript = `<script>globalThis.__VERTEX_ASSETS__=${JSON.stringify(map)};</script>`;
html = html.includes("<head>") ? html.replace("<head>", `<head>${assetScript}`) : `${assetScript}${html}`;

writeFileSync(htmlPath, html);

const keys = Object.keys(map).length;
console.log(`[inline-offline-assets] embedded ${keys} files (${(raw / 1024 / 1024).toFixed(2)} MiB) → dist/single/index.html is now ${(Buffer.byteLength(html) / 1024 / 1024).toFixed(2)} MiB`);
