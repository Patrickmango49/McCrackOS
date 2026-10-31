const TOKEN = process.env.VERCEL_TOKEN || "";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "DELETE" && req.method !== "POST") { res.status(405).json({ ok: false }); return; }
  let payload = {};
  try { payload = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {}); } catch { /* noop */ }
  const id = String(req.query.id || payload.id || "");
  if (!id || !/^[A-Za-z0-9_-]{1,64}$/.test(id)) { res.status(400).json({ ok: false, error: "bad-id" }); return; }
  if (!TOKEN) { res.status(500).json({ ok: false, error: "no-token" }); return; }
  try {
    const r = await fetch("https://api.vercel.com/v13/deployments/" + encodeURIComponent(id), {
      method: "DELETE",
      headers: { Authorization: "Bearer " + TOKEN },
    });
    res.status(200).json({ ok: r.ok || r.status === 404 });
  } catch (e) {
    res.status(500).json({ ok: false, error: String((e && e.message) || e) });
  }
}