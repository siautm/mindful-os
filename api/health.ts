import { handleOptions, sendJson } from "./_lib/http.js";

export default async function handler(req: any, res: any) {
  if (handleOptions(req, res)) return;
  if (req.method !== "GET") {
    sendJson(res, 405, { error: "Method Not Allowed" });
    return;
  }
  sendJson(res, 200, { ok: true, service: "mindful-os-api" });
}

