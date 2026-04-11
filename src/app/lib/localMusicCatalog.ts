/**
 * Build-time catalog of audio files in repo-root `music/`.
 * Vite resolves URLs; labels come from filenames (shown in Focus picker).
 */

export type FolderMusicNoiseId = `music:${string}`;

export interface FolderMusicTrack {
  noiseId: FolderMusicNoiseId;
  fileName: string;
  label: string;
  url: string;
}

function basenameFromGlobKey(key: string): string {
  const normalized = key.replace(/\\/g, "/");
  const i = normalized.lastIndexOf("/");
  return i >= 0 ? normalized.slice(i + 1) : normalized;
}

function labelFromFileName(fileName: string): string {
  const withoutExt = fileName.replace(/\.[^/.]+$/i, "");
  const spaced = withoutExt.replace(/_/g, " ").trim();
  return spaced || fileName;
}

function collectGlob(): Record<string, string> {
  /* Vite requires each glob pattern to be a string literal (no variables). */
  const merged: Record<string, string> = {};
  Object.assign(
    merged,
    import.meta.glob("../../../music/*.mp3", { eager: true, query: "?url", import: "default" }) as Record<
      string,
      string
    >,
    import.meta.glob("../../../music/*.m4a", { eager: true, query: "?url", import: "default" }) as Record<
      string,
      string
    >,
    import.meta.glob("../../../music/*.ogg", { eager: true, query: "?url", import: "default" }) as Record<
      string,
      string
    >,
    import.meta.glob("../../../music/*.opus", { eager: true, query: "?url", import: "default" }) as Record<
      string,
      string
    >,
    import.meta.glob("../../../music/*.wav", { eager: true, query: "?url", import: "default" }) as Record<
      string,
      string
    >,
    import.meta.glob("../../../music/*.webm", { eager: true, query: "?url", import: "default" }) as Record<
      string,
      string
    >
  );
  return merged;
}

function buildTracks(): FolderMusicTrack[] {
  const mod = collectGlob();
  const tracks: FolderMusicTrack[] = [];
  for (const [key, url] of Object.entries(mod)) {
    if (typeof url !== "string" || !url) continue;
    const fileName = basenameFromGlobKey(key);
    if (!fileName || fileName.startsWith(".")) continue;
    const noiseId = `music:${encodeURIComponent(fileName)}` as FolderMusicNoiseId;
    tracks.push({
      noiseId,
      fileName,
      label: labelFromFileName(fileName),
      url,
    });
  }
  tracks.sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }));
  return tracks;
}

const _tracks = buildTracks();

const BY_NOISE_ID = new Map<string, FolderMusicTrack>(
  _tracks.map((t) => [t.noiseId, t])
);
const BY_FILE = new Map<string, FolderMusicTrack>(_tracks.map((t) => [t.fileName, t]));

export const FOLDER_MUSIC_TRACKS: readonly FolderMusicTrack[] = _tracks;

export function isFolderMusicNoiseId(raw: string): raw is FolderMusicNoiseId {
  return raw.startsWith("music:") && raw.length > 6;
}

export function getFolderMusicTrackByNoiseId(id: string): FolderMusicTrack | null {
  if (!isFolderMusicNoiseId(id)) return null;
  const hit = BY_NOISE_ID.get(id);
  if (hit) return hit;
  try {
    const fileName = decodeURIComponent(id.slice(6));
    return BY_FILE.get(fileName) ?? null;
  } catch {
    return null;
  }
}

export async function decodeAudioBufferFromUrl(
  ctx: AudioContext,
  url: string,
  signal?: AbortSignal
): Promise<AudioBuffer | null> {
  try {
    const res = await fetch(url, { signal });
    if (!res.ok) return null;
    const arr = await res.arrayBuffer();
    if (arr.byteLength === 0) return null;
    return await ctx.decodeAudioData(arr.slice(0));
  } catch {
    return null;
  }
}
