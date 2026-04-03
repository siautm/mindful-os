export function getApiBaseUrl(): string {
  return import.meta.env.VITE_API_BASE_URL?.trim() || "";
}

/**
 * Resolve a real ambient preview URL from our backend and decode it to AudioBuffer.
 * Backend endpoint: GET /api/sounds?type=...
 */
export async function fetchFreesoundBufferForNoiseType(
  ctx: AudioContext,
  noiseKey: string,
  signal?: AbortSignal
): Promise<AudioBuffer | null> {
  const base = getApiBaseUrl();
  const url = `${base}/api/sounds?${new URLSearchParams({ type: noiseKey }).toString()}`;

  const metaRes = await fetch(url, { signal, headers: { Accept: "application/json" } });
  if (!metaRes.ok) return null;

  const meta = (await metaRes.json()) as { previewUrl?: string };
  if (!meta.previewUrl) return null;

  const audioRes = await fetch(meta.previewUrl, { signal, mode: "cors" });
  if (!audioRes.ok) return null;
  const arr = await audioRes.arrayBuffer();
  return await ctx.decodeAudioData(arr.slice(0));
}
