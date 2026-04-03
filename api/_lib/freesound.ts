export const noiseQueries: Record<string, string> = {
  white: "white noise",
  pink: "pink noise",
  brown: "brown noise",
  rain: "rain window soft",
  thunderstorm: "thunderstorm distant",
  ocean: "ocean waves beach",
  waterfall: "waterfall nature",
  forest: "forest wind leaves",
  cafe: "cafe ambience chatter",
  library: "library quiet room tone",
  fireplace: "fireplace crackling fire",
  crickets: "crickets night",
  train: "train interior ride",
  wind: "wind soft breeze",
};

type FreesoundHit = {
  id?: number;
  name?: string;
  previews?: {
    "preview-hq-mp3"?: string;
    "preview-lq-mp3"?: string;
    "preview-hq-ogg"?: string;
    "preview-lq-ogg"?: string;
  };
};

function pickPreview(previews?: FreesoundHit["previews"]): string | null {
  if (!previews) return null;
  return (
    previews["preview-hq-mp3"] ||
    previews["preview-lq-mp3"] ||
    previews["preview-hq-ogg"] ||
    previews["preview-lq-ogg"] ||
    null
  );
}

export async function fetchPreviewForNoiseType(type: string): Promise<{
  id: number | null;
  name: string | null;
  previewUrl: string | null;
}> {
  const token = process.env.FREESOUND_API_KEY;
  if (!token) {
    throw new Error("Missing FREESOUND_API_KEY");
  }

  const query = noiseQueries[type];
  if (!query) {
    throw new Error(`Unsupported noise type: ${type}`);
  }

  const url =
    "https://freesound.org/apiv2/search/text/?" +
    new URLSearchParams({
      query,
      fields: "id,name,previews,duration",
      page_size: "8",
      page: "1",
      token,
    }).toString();

  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Freesound search failed: ${res.status} ${text.slice(0, 200)}`);
  }

  const data = (await res.json()) as { results?: FreesoundHit[] };
  const hits = Array.isArray(data.results) ? data.results : [];

  for (const hit of hits) {
    const previewUrl = pickPreview(hit.previews);
    if (!previewUrl) continue;
    return {
      id: hit.id ?? null,
      name: hit.name ?? null,
      previewUrl,
    };
  }

  return { id: null, name: null, previewUrl: null };
}

