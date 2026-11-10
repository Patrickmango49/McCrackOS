const express = require("express");
const { Innertube } = require("youtubei.js");

const app = express();
const PORT = process.env.PORT || 3000;

// The COS frontend is hosted on GitHub Pages and calls this public, read-only API.
// Search endpoints expose public video metadata only; no credentials are accepted.
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Accept, Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

// Serve frontend files from /public
app.use(express.static("public"));

let youtube = null;

/**
 * Create Innertube instance once, then reuse it
 */
async function getYT() {
  if (!youtube) {
    youtube = await Innertube.create();
    console.log("Innertube ready");
  }
  return youtube;
}

/**
 * Search route
 * Example:
 * /search?q=mrbeast
 */

function parseDuration(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const text = typeof value === "string" ? value : value?.text || value?.toString?.() || "";
  if (!text || text === "[object Object]") return null;
  if (/^\d+(?:\.\d+)?$/.test(text.trim())) return Number(text);
  const parts = text.trim().split(":").map(Number);
  if (!parts.length || parts.length > 3 || parts.some(n => !Number.isFinite(n))) return null;
  return parts.reduce((total, part) => total * 60 + part, 0);
}

function normalizeVideo(video) {
  const durationSeconds =
    parseDuration(video.duration?.seconds) ??
    parseDuration(video.length_seconds) ??
    parseDuration(video.duration?.text) ??
    parseDuration(video.duration);
  const thumbnails = video.thumbnails || [];
  const thumb = [...thumbnails].reverse().find(t => Number(t?.width) > 0 && Number(t?.height) > 0);
  const aspectRatio = thumb ? Number(thumb.width) / Number(thumb.height) : null;
  const portraitHint = video.is_short === true || (aspectRatio !== null && aspectRatio < 0.9);
  const durationLabel = video.duration?.text || (durationSeconds !== null
    ? Math.floor(durationSeconds / 60) + ":" + String(Math.floor(durationSeconds % 60)).padStart(2, "0")
    : "");
  return {
    id: video.id,
    title: video.title?.text || video.title?.toString?.() || "Untitled",
    thumbnail: thumb?.url || video.thumbnails?.[0]?.url || "",
    durationSeconds,
    durationLabel,
    portraitHint
  };
}

app.get("/search", async (req, res) => {
  try {
    const query = req.query.q || "";

    if (!query.trim()) {
      return res.json([]);
    }

    const yt = await getYT();
    const results = await yt.search(query);

    const videos = (results.videos || [])
      .filter(v => v && v.id)
      .map(normalizeVideo);

    res.json(videos);

  } catch (err) {
    console.error("SEARCH ERROR:", err);
    res.status(500).json({
      error: err.message || "Search failed"
    });
  }
});


/**
 * Dedicated Shorts discovery route.
 * Only returns videos with a known duration of 60 seconds or less.
 */
app.get("/shorts", async (req, res) => {
  try {
    const query = String(req.query.q || "").trim();
    if (!query) return res.json([]);

    const yt = await getYT();
    const results = await yt.search(query);
    const shorts = (results.videos || [])
      .filter(video => video && video.id)
      .map(normalizeVideo)
      .filter(video => Number.isFinite(video.durationSeconds) && video.durationSeconds > 0 && video.durationSeconds <= 60)
      .sort((a, b) => Number(b.portraitHint) - Number(a.portraitHint));

    res.json(shorts.slice(0, 24));
  } catch (err) {
    console.error("SHORTS ERROR:", err);
    res.status(500).json({ error: err.message || "Shorts search failed" });
  }
});

// Start server
app.listen(PORT, () => {
  console.log("McCrackTube running on port " + PORT);
});