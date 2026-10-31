const { findFresh, json } = require("./libs/mirror");

exports.handler = async (event) => {
  let excludes = [];
  try {
    excludes = JSON.parse(event.body || "{}").excludes || [];
  } catch {
    excludes = [];
  }
  if (!Array.isArray(excludes)) excludes = [];
  excludes = excludes.map((e) => String(e));

  if (event.httpMethod !== "POST" && event.httpMethod !== "GET") return json(405, { error: "method" });
  if (event.queryStringParameters && event.queryStringParameters.debug === "env") {
    return json(200, { hasToken: !!process.env.VERCEL_TOKEN, tokenLen: process.env.VERCEL_TOKEN ? process.env.VERCEL_TOKEN.length : 0, hasTarget: !!process.env.VERTEX_SITE_URL, target: process.env.VERTEX_SITE_URL || null });
  }
  const out = await findFresh(excludes);
  if (out.error) return json(503, out);
  return json(200, out);
};