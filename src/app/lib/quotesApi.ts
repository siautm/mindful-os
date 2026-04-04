export type QuoteLocale = "en" | "zh";

/** User-selectable sources; fetch picks one at random from the enabled set. */
export type QuoteSourceTag = "books" | "anime" | "games";

export const QUOTE_SOURCE_TAGS: readonly QuoteSourceTag[] = ["books", "anime", "games"];

/** Same shape as `QuoteEntry` in storage (kept separate to avoid circular imports). */
export type FetchedQuote = { text: string; author: string };

const FALLBACK_EN: FetchedQuote[] = [
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "Success is the sum of small efforts repeated day in and day out.", author: "Robert Collier" },
  { text: "Focus on being productive instead of busy.", author: "Tim Ferriss" },
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
];

const FALLBACK_ZH: FetchedQuote[] = [
  { text: "千里之行，始于足下。", author: "老子" },
  { text: "不积跬步，无以至千里。", author: "荀子" },
  { text: "业精于勤，荒于嬉。", author: "韩愈" },
  { text: "博观而约取，厚积而薄发。", author: "苏轼" },
];

/** Curated game lines (EN) — no stable public game-quote API found. */
const FALLBACK_GAME_EN: FetchedQuote[] = [
  { text: "The right man in the wrong place can make all the difference in the world.", author: "Half-Life 2" },
  { text: "War never changes.", author: "Fallout" },
  { text: "Do a barrel roll!", author: "Star Fox 64" },
  { text: "It's dangerous to go alone! Take this.", author: "The Legend of Zelda" },
  { text: "The cake is a lie.", author: "Portal" },
  { text: "Stay awhile and listen.", author: "Diablo" },
  { text: "I used to be an adventurer like you, then I took an arrow in the knee.", author: "The Elder Scrolls V: Skyrim" },
  { text: "Would you kindly…", author: "BioShock" },
  { text: "Nothing is true, everything is permitted.", author: "Assassin's Creed" },
  { text: "Hey! Listen!", author: "The Legend of Zelda: Ocarina of Time" },
  { text: "Finish him!", author: "Mortal Kombat" },
  { text: "A man chooses; a slave obeys.", author: "BioShock" },
  { text: "The cycle ends here. We must be better than this.", author: "God of War (2018)" },
  { text: "Stand in the ashes of a trillion dead souls and ask if honor matters.", author: "Mass Effect 2" },
  { text: "Hope is what makes us strong. It is why we are here.", author: "The Last of Us" },
];

const PREFETCH_KEY = "mindful_quote_prefetch_v2";
const PREFETCH_MAX_AGE_MS = 45 * 60 * 1000;
const FETCH_TIMEOUT_MS = 5000;

type PrefetchStore = Record<string, { text: string; author: string; at: number }>;

function prefetchCacheKey(locale: QuoteLocale, tags: readonly QuoteSourceTag[]): string {
  return `${locale}:${[...tags].sort().join(",")}`;
}

function readPrefetchStore(): PrefetchStore {
  try {
    const raw = localStorage.getItem(PREFETCH_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as PrefetchStore;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writePrefetchQuote(key: string, q: FetchedQuote): void {
  try {
    const store = readPrefetchStore();
    store[key] = { ...q, at: Date.now() };
    localStorage.setItem(PREFETCH_KEY, JSON.stringify(store));
  } catch {
    /* ignore quota */
  }
}

function readCachedPrefetch(key: string): FetchedQuote | null {
  const row = readPrefetchStore()[key];
  if (!row?.text?.trim()) return null;
  if (Date.now() - row.at > PREFETCH_MAX_AGE_MS) return null;
  return { text: row.text, author: row.author };
}

export function normalizeQuoteTags(input: readonly string[] | undefined | null): QuoteSourceTag[] {
  const set = new Set<QuoteSourceTag>();
  for (const x of input ?? []) {
    if (x === "books" || x === "anime" || x === "games") set.add(x);
  }
  if (set.size === 0) return [...QUOTE_SOURCE_TAGS];
  return QUOTE_SOURCE_TAGS.filter((t) => set.has(t));
}

function randomFallback(locale: QuoteLocale): FetchedQuote {
  const list = locale === "zh" ? FALLBACK_ZH : FALLBACK_EN;
  return list[Math.floor(Math.random() * list.length)];
}

function randomFromFavorites(favorites: readonly { text: string; author: string }[]): FetchedQuote | null {
  if (!favorites.length) return null;
  const i = Math.floor(Math.random() * favorites.length);
  const f = favorites[i];
  return { text: f.text, author: f.author };
}

function pickRandomTag(tags: readonly QuoteSourceTag[]): QuoteSourceTag {
  return tags[Math.floor(Math.random() * tags.length)];
}

/** Instant quote: favorite → prefetch cache → built-in fallback (sync). */
export function getInstantQuote(
  locale: QuoteLocale,
  favorites: readonly { text: string; author: string }[],
  tags: readonly QuoteSourceTag[] = QUOTE_SOURCE_TAGS
): FetchedQuote {
  const normalized = normalizeQuoteTags(tags);
  const key = prefetchCacheKey(locale, normalized);
  return randomFromFavorites(favorites) ?? readCachedPrefetch(key) ?? randomFallback(locale);
}

async function fetchWithTimeout(url: string, ms: number): Promise<Response> {
  const ctrl = new AbortController();
  const t = window.setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

async function fetchEnglishGeneric(): Promise<FetchedQuote | null> {
  const parseDummy = async (): Promise<FetchedQuote> => {
    const r = await fetchWithTimeout("https://dummyjson.com/quotes/random", FETCH_TIMEOUT_MS);
    if (!r.ok) throw new Error(String(r.status));
    const data = (await r.json()) as { quote?: string; author?: string };
    if (!data.quote?.trim()) throw new Error("empty");
    return { text: data.quote.trim(), author: (data.author || "Unknown").trim() };
  };
  const parseZenQuotes = async (): Promise<FetchedQuote> => {
    const r = await fetchWithTimeout("https://zenquotes.io/api/random", FETCH_TIMEOUT_MS);
    if (!r.ok) throw new Error(String(r.status));
    const arr = (await r.json()) as Array<{ q?: string; a?: string }>;
    const row = arr?.[0];
    if (!row?.q?.trim()) throw new Error("empty");
    return { text: row.q.trim(), author: (row.a || "Unknown").trim() };
  };
  try {
    return await parseDummy();
  } catch {
    /* try backup */
  }
  try {
    return await parseZenQuotes();
  } catch {
    return null;
  }
}

function excerptFromPoemLines(lines: string[], author: string, title: string): FetchedQuote | null {
  const skip = (s: string) => {
    const t = s.trim();
    if (!t) return true;
    if (/^(ACT |SCENE|\[)/i.test(t)) return true;
    if (/^[_*]/.test(t) && t.length < 80) return true;
    return false;
  };
  const good = lines.filter((l) => !skip(l));
  const chunk = good.slice(0, 4).join(" ").replace(/\s+/g, " ").trim();
  if (chunk.length < 12) return null;
  const text = chunk.length > 380 ? `${chunk.slice(0, 377)}…` : chunk;
  const src = title?.trim() ? `${author} — ${title}` : author;
  return { text, author: src || "Unknown" };
}

async function fetchEnglishBooks(): Promise<FetchedQuote | null> {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const r = await fetchWithTimeout("https://poetrydb.org/random/1", FETCH_TIMEOUT_MS);
      if (!r.ok) throw new Error(String(r.status));
      const arr = (await r.json()) as Array<{
        title?: string;
        author?: string;
        lines?: string[];
        linecount?: string;
      }>;
      const poem = arr?.[0];
      const lines = poem?.lines;
      const lc = Number(poem?.linecount);
      if (!lines?.length || !Number.isFinite(lc) || lc > 48) continue;
      const q = excerptFromPoemLines(lines, (poem.author || "Unknown").trim(), (poem.title || "").trim());
      if (q) return q;
    } catch {
      /* retry */
    }
  }
  return fetchEnglishGeneric();
}

async function fetchEnglishAnime(): Promise<FetchedQuote | null> {
  try {
    const r = await fetchWithTimeout("https://api.animechan.io/v1/quotes/random", FETCH_TIMEOUT_MS);
    if (!r.ok) throw new Error(String(r.status));
    const body = (await r.json()) as {
      status?: string;
      data?: { content?: string; anime?: { name?: string }; character?: { name?: string } };
    };
    const d = body.data;
    const text = d?.content?.trim();
    if (!text) throw new Error("empty");
    const anime = d?.anime?.name?.trim() || "Anime";
    const who = d?.character?.name?.trim() || "?";
    return { text, author: `${who} · ${anime}` };
  } catch {
    return fetchEnglishGeneric();
  }
}

function fetchEnglishGames(): Promise<FetchedQuote | null> {
  const i = Math.floor(Math.random() * FALLBACK_GAME_EN.length);
  return Promise.resolve(FALLBACK_GAME_EN[i]);
}

async function fetchEnglishByTag(tag: QuoteSourceTag): Promise<FetchedQuote | null> {
  if (tag === "books") return fetchEnglishBooks();
  if (tag === "anime") return fetchEnglishAnime();
  return fetchEnglishGames();
}

/** Hitokoto: a=动画, c=文学, g=游戏 */
function hitokotoParam(tag: QuoteSourceTag): string {
  if (tag === "anime") return "a";
  if (tag === "games") return "g";
  return "c";
}

async function fetchChineseByTag(tag: QuoteSourceTag): Promise<FetchedQuote | null> {
  const c = hitokotoParam(tag);
  try {
    const r = await fetchWithTimeout(`https://v1.hitokoto.cn/?c=${c}&encode=json`, FETCH_TIMEOUT_MS);
    if (!r.ok) throw new Error(String(r.status));
    const data = (await r.json()) as {
      hitokoto?: string;
      from?: string;
      from_who?: string | null;
    };
    const text = data.hitokoto?.trim();
    if (!text) return null;
    const author = (data.from_who || data.from || "佚名").trim();
    return { text, author };
  } catch {
    return null;
  }
}

/** API fetch; updates prefetch cache on success. Use for refresh and idle warmup. */
export async function fetchQuoteFromNetwork(
  locale: QuoteLocale,
  tags: readonly QuoteSourceTag[] = QUOTE_SOURCE_TAGS
): Promise<FetchedQuote> {
  const normalized = normalizeQuoteTags(tags);
  const key = prefetchCacheKey(locale, normalized);
  const tag = pickRandomTag(normalized);
  const online =
    locale === "zh" ? await fetchChineseByTag(tag) : await fetchEnglishByTag(tag);
  const result = online ?? randomFallback(locale);
  if (online) writePrefetchQuote(key, online);
  return result;
}

export async function fetchRandomQuote(
  locale: QuoteLocale,
  tags: readonly QuoteSourceTag[] = QUOTE_SOURCE_TAGS
): Promise<FetchedQuote> {
  return fetchQuoteFromNetwork(locale, tags);
}

export function scheduleIdleQuotePrefetch(tags: readonly QuoteSourceTag[] = QUOTE_SOURCE_TAGS): void {
  const normalized = normalizeQuoteTags(tags);
  const run = () => {
    void fetchQuoteFromNetwork("en", normalized).catch(() => {});
    void fetchQuoteFromNetwork("zh", normalized).catch(() => {});
  };
  if (typeof requestIdleCallback !== "undefined") {
    requestIdleCallback(run, { timeout: 10_000 });
  } else {
    window.setTimeout(run, 2500);
  }
}
