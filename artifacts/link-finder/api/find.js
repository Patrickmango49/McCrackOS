const TOKEN = process.env.VERCEL_TOKEN || "";
const MIRROR_PROJECT = "vertex-mirror";
const TARGET_SITE = process.env.VERTEX_SITE_URL || "https://vertex-os-site.netlify.app";

const MIRROR_HTML = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Vertex Games — Portal</title><style>html,body{margin:0;height:100%;background:#060a12;font-family:'Segoe UI',system-ui,sans-serif}.top{position:fixed;top:0;left:0;right:0;height:34px;display:flex;align-items:center;justify-content:space-between;padding:0 12px;background:rgba(6,10,18,.93);border-bottom:1px solid rgba(255,255,255,.08);color:#9db4ce;font-size:12px;z-index:9;box-sizing:border-box}.top b{color:#4cc9f0}.top a{color:#7b5cff;text-decoration:none;font-weight:700}iframe{position:fixed;inset:34px 0 0 0;width:100%;height:calc(100% - 34px);border:0}</style></head><body><div class="top"><b>Vertex Games</b><span>portal</span><a href="${TARGET_SITE}" target="_top">open site</a></div><iframe src="${TARGET_SITE}/" allowfullscreen></iframe></body></html>`;

async function vj(path, opts = {}) {
  const r = await fetch("https://api.vercel.com" + path, {
    ...opts,
    headers: { Authorization: "Bearer " + TOKEN, "Content-Type": "application/json", ...(opts.headers || {}) },
  });
  let j = null;
  try { j = await r.json(); } catch { /* keep null */ }
  return { status: r.status, ok: r.ok, j };
}

let PROJECT_ID = "";

async function ensureProject() {
  const { j } = await vj("/v6/projects/");
  const found = j && Array.isArray(j.projects) ? j.projects.find((p) => p.name === MIRROR_PROJECT) : null;
  if (!found) {
    const made = await vj("/v6/projects", { method: "POST", body: JSON.stringify({ name: MIRROR_PROJECT, framework: null }) });
    await new Promise((r) => setTimeout(r, 1500));
    const { j: again } = await vj("/v6/projects/");
    const f2 = again && Array.isArray(again.projects) ? again.projects.find((p) => p.name === MIRROR_PROJECT) : null;
    PROJECT_ID = (f2 && f2.id) || (made.j && made.j.id) || "";
  } else {
    PROJECT_ID = found.id || "";
  }
  await vj("/v9/projects/" + (PROJECT_ID || MIRROR_PROJECT), { method: "PATCH", body: JSON.stringify({ ssoProtection: null }) });
  return PROJECT_ID;
}

async function createDeploy() {
  const files = [{ file: "index.html", data: Buffer.from(MIRROR_HTML).toString("base64"), encoding: "base64" }];
  const body = {
    name: MIRROR_PROJECT,
    files,
    projectSettings: { framework: null, buildCommand: null, outputDirectory: null, installCommand: null },
  };
  const make = await vj("/v13/deployments", { method: "POST", body: JSON.stringify(body) });
  if (!make.j || !make.j.url) return null;
  const id = make.j.uid || make.j.id || "";
  const url = "https://" + make.j.url;
  let ready = (make.j.readyState || "") === "READY";
  for (let i = 0; i < 22 && !ready; i++) {
    await new Promise((r) => setTimeout(r, 500));
    const poll = await vj("/v13/deployments/" + encodeURIComponent(id));
    ready = (poll.j && poll.j.readyState) === "READY";
  }
  return { id, url, ready };
}

async function pickOrCreate(excludes) {
  const excl = new Set(excludes.map((u) => String(u).replace(/^https?:\/\//, "").replace(/^www\./, "").toLowerCase()));
  const qs = (PROJECT_ID ? "?projectId=" + encodeURIComponent(PROJECT_ID) : "?projectName=" + MIRROR_PROJECT) + "&limit=100";
  const list = await vj("/v6/deployments" + qs);
  const candidates = (list.j && Array.isArray(list.j.deployments)) ? list.j.deployments.filter((d) => d.state === "READY") : [];
  const chosen = candidates.find((d) => !excl.has((d.url || "").toLowerCase()));
  if (chosen) {
    return { id: chosen.uid || chosen.id || "", url: "https://" + chosen.url, ready: true, reused: true };
  }
  const made = await createDeploy();
  return made ? { id: made.id, url: made.url, ready: made.ready, reused: false } : null;
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") { res.status(405).json({ error: "method" }); return; }
  if (!TOKEN) { res.status(500).json({ error: "no-token" }); return; }
  let excludes = [];
  try { const p = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {}); excludes = (p.excludes || []).filter((x) => typeof x === "string"); } catch { /* noop */ }
  try {
    await ensureProject();
    if (!PROJECT_ID) { res.status(500).json({ error: "no-project" }); return; }
    const found = await pickOrCreate(excludes);
    if (!found) { res.status(502).json({ error: "deploy-failed" }); return; }
    res.status(200).json({ url: found.url, deployId: found.id, name: "Vertex Games portal", host: "vercel", strictness: 4, ready: found.ready, fresh: !found.reused });
  } catch (e) {
    res.status(500).json({ error: String((e && e.message) || e) });
  }
}