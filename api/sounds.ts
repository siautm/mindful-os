import { fetchPreviewForNoiseType, noiseQueries } from "./_lib/freesound.js";
import { handleOptions, sendJson } from "./_lib/http.js";

export default async function handler(req: any, res: any) {
  if (handleOptions(req, res)) return;

  if (req.method !== "GET") {
    sendJson(res, 405, { error: "Method Not Allowed" });
    return;
  }

  try {
    const type = typeof req.query?.type === "string" ? req.query.type : "white";
    if (!noiseQueries[type]) {
      sendJson(res, 400, { error: "Unsupported noise type" });
      return;
    }

    const result = await fetchPreviewForNoiseType(type);
    if (!result.previewUrl) {
      sendJson(res, 404, { error: "No sound preview found", type });
      return;
    }

    sendJson(res, 200, {
      type,
      id: result.id,
      name: result.name,
      previewUrl: result.previewUrl,
      source: "freesound",
    });
  } catch (error: any) {
    sendJson(res, 500, { error: error?.message ?? "Failed to fetch sound" });
  }
}

