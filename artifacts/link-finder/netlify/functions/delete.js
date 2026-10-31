const { deleteDeploy, json } = require("./libs/mirror");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST" && event.httpMethod !== "DELETE") return json(405, { error: "method" });
  let id = "";
  try {
    const body = JSON.parse(event.body || "{}");
    id = body.deployId || body.id || "";
  } catch {
    id = "";
  }
  const out = await deleteDeploy(id);
  const status = out.ok ? 200 : 400;
  return json(status, out);
};