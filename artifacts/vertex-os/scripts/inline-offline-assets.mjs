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

let html = readFileSync(htmlPath, "utf8");

const normalise = (value) => value.replace(/^\.\//, "").replace(/^\//, "");

html = html.replace(/url\((["']?)([^)"']+)\1\)/g, (whole, _q, path) => {
  if (/^data:/i.test(path)) return whole;
  const hit = map[normalise(path)];
  return hit ? `url("${hit}")` : whole;
});

html = html.replace(/href="([^"]+)"/g, (whole, path) => {
  if (/^(data:|https?:|#|\/\/)/i.test(path)) return whole;
  const hit = map[normalise(path)];
  return hit ? `href="${hit}"` : whole;
});

const script = `<script>globalThis.__VERTEX_ASSETS__=${JSON.stringify(map)};</script>`;
html = html.includes("<head>") ? html.replace("<head>", `<head>${script}`) : `${script}${html}`;

writeFileSync(htmlPath, html);

const keys = Object.keys(map).length;
console.log(`[inline-offline-assets] embedded ${keys} files (${(raw / 1024 / 1024).toFixed(2)} MiB) → dist/single/index.html is now ${(Buffer.byteLength(html) / 1024 / 1024).toFixed(2)} MiB`);
