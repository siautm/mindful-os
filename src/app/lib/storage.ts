import { toast } from "sonner";
import type { QuoteLocale, QuoteSourceTag } from "./quotesApi";
import { normalizeQuoteTags, QUOTE_SOURCE_TAGS } from "./quotesApi";
import {
  FOCUS_WALLPAPER_MATCH_SOUND,
  normalizeFocusWallpaperChoice,
  type FocusWallpaperChoice,
} from "./focusWallpapers";

// Storage utility functions for Mindful OS

export interface TimetableEntry {
  id: string;
  courseName: string;
  courseCode: string;
  day: string;
  startTime: string;
  endTime: string;
  location: string;
  instructor: string;
}

export interface FocusSession {
  id: string;
  taskId?: string;
  taskTitle?: string;
  duration: number;
  completed: boolean;
  date: string;
  studyPlanId?: string;
  studyPartId?: string;
  studyPlanName?: string;
  studyPartTitle?: string;
}

export interface FinanceEntry {
  id: string;
  type: "income" | "expense";
  amount: number;
  category: string;
  description: string;
  date: string;
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  url?: string;
  file?: string; // Base64 encoded MP3 data
}

export interface Playlist {
  id: string;
  name: string;
  songIds: string[];
  createdAt: string;
}

export interface CheckInEntry {
  id: string;
  date: string;
  mood: string; // happy, good, neutral, stressed, tired
  energy: number; // 1-5
  intention: string;
  gratitude: string;
  note: string;
}

export interface SleepEntry {
  id: string;
  date: string; // date of waking up
  bedTime: string; // HH:MM
  /** Optional; omitted when user only logs bed time. */
  wakeTime?: string;
  /** Hours asleep; set when wake time was logged. */
  duration?: number;
  /** Optional 1–5; omitted when not rated. */
  quality?: number;
  notes: string;
}

export interface MeditationEntry {
  id: string;
  date: string;
  duration: number; // minutes
  type: string; // guided, breathing, mindfulness, body-scan, other
  notes: string;
}

export interface ExerciseEntry {
  id: string;
  date: string;
  type: string; // custom exercise name
  duration?: number; // optional minutes
  times: number; // how many times
  calories?: number;
  notes: string;
}

export interface WeightEntry {
  id: string;
  date: string;
  weight: number; // in kg or lbs
  unit: string; // kg or lbs
  bodyFat?: number; // percentage
  notes: string;
}

export interface QuoteEntry {
  text: string;
  author: string;
}

export interface PdfBookRecord {
  id: string;
  title: string;
  storagePath: string | null;
  totalPages: number;
  currentPage: number;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PdfBookmark {
  id: string;
  bookId: string;
  page: number;
  note: string;
  createdAt: string;
}

export interface PdfQuote {
  id: string;
  bookId: string;
  page: number;
  text: string;
  createdAt: string;
}

export interface StudyPlanPart {
  id: string;
  title: string;
  detail: string;
  order: number;
  completed: boolean;
}

export interface StudyPlan {
  id: string;
  name: string;
  description: string;
  durationHours: number;
  parts: StudyPlanPart[];
  createdAt: string;
}

export interface Habit {
  id: string;
  name: string;
  description: string;
  createdAt: string;
}

/** One row per habit marked done on a calendar day (local YYYY-MM-DD). */
export interface HabitDayEntry {
  habitId: string;
  date: string;
}

const API_BASE = import.meta.env.VITE_API_BASE_URL?.trim() || "";
const STATE_ENDPOINT = `${API_BASE}/api/state`;
const STORAGE_SCHEMA_VERSION_KEY = "mindful_schema_version";
const STORAGE_SCHEMA_LATEST = 2;

let cloudState: Record<string, unknown> = {};
let isCloudStateInitialized = false;
let lastCloudErrorAt = 0;
let cloudUserId: string | null = null;
let cloudToken: string | null = null;

/** Keys removed from the app; stripped from localStorage on sync. */
const DEPRECATED_STORAGE_KEYS = [
  "mindful_tasks",
  "mindful_events",
  "mindful_ideas",
  "mindful_journal",
  "mindful_food",
] as const;

/** Array-backed app_state keys: merge from local when cloud is empty/missing. */
const MERGE_FROM_LOCAL_KEYS = [
  "mindful_timetable",
  "mindful_finance",
  "mindful_focus_sessions",
  "mindful_checkins",
  "mindful_sleep",
  "mindful_meditation",
  "mindful_exercise",
  "mindful_weight",
  "mindful_habits",
  "mindful_habit_days",
  "mindful_study_plans",
  "mindful_focus_presets",
  "mindful_favorite_quotes",
  "mindful_pdf_books",
  "mindful_pdf_bookmarks",
  "mindful_pdf_quotes",
] as const;

const MERGE_OBJECT_KEYS = ["mindful_bujo_state", "mindful_daily_memo"] as const;

export const STORAGE_HYDRATED_EVENT = "mindful-storage-hydrated";

function dispatchStorageHydrated(): void {
  if (typeof window === "undefined") return;
  queueMicrotask(() => window.dispatchEvent(new CustomEvent(STORAGE_HYDRATED_EVENT)));
}

export function setCloudAuth(userId: string | null, accessToken: string | null): void {
  cloudUserId = userId;
  cloudToken = accessToken;
  cloudState = {};
  isCloudStateInitialized = false;
  dispatchStorageHydrated();
}

function showCloudError(message: string): void {
  const now = Date.now();
  if (now - lastCloudErrorAt < 3000) return;
  lastCloudErrorAt = now;
  toast.error(message);
}

async function postState(key: string, value: unknown): Promise<boolean> {
  if (!cloudUserId || !cloudToken) {
    throw new Error("Not authenticated.");
  }
  const response = await fetch(STATE_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cloudToken}`,
    },
    body: JSON.stringify({ key, value }),
  });
  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`Cloud save failed (${response.status}): ${errorText.slice(0, 180)}`);
  }
  return true;
}

function normalizeExerciseEntries(raw: unknown): ExerciseEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((entry) => {
    const e = (entry ?? {}) as Partial<ExerciseEntry> & Record<string, unknown>;
    return {
      id: typeof e.id === "string" && e.id.trim() !== "" ? e.id : Date.now().toString(),
      date:
        typeof e.date === "string" && e.date.trim() !== ""
          ? e.date
          : new Date().toISOString(),
      type: typeof e.type === "string" ? e.type : "",
      duration:
        typeof e.duration === "number" && Number.isFinite(e.duration) && e.duration > 0
          ? e.duration
          : undefined,
      times:
        typeof e.times === "number" && Number.isFinite(e.times) && e.times > 0
          ? Math.floor(e.times)
          : 1,
      calories:
        typeof e.calories === "number" && Number.isFinite(e.calories)
          ? e.calories
          : undefined,
      notes: typeof e.notes === "string" ? e.notes : "",
    };
  });
}

function purgeDeprecatedLocalKeys(): void {
  if (typeof localStorage === "undefined") return;
  for (const key of DEPRECATED_STORAGE_KEYS) {
    localStorage.removeItem(key);
  }
}

function isEmptyCloudValue(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "object") {
    const o = value as Record<string, unknown>;
    if (Array.isArray(o.items) && o.items.length === 0 && Object.keys(o).length <= 2) {
      return true;
    }
    if ("dailyBullets" in o || "schemaVersion" in o) {
      const daily = (o.dailyBullets ?? {}) as Record<string, unknown[]>;
      const hasDaily = Object.values(daily).some((b) => Array.isArray(b) && b.length > 0);
      const yearlyGoals = o.yearlyGoals;
      const yearlyEvents = o.yearlyEvents;
      const longProjects = o.longProjects;
      const hasYearly =
        (Array.isArray(yearlyGoals) && yearlyGoals.length > 0) ||
        (Array.isArray(yearlyEvents) && yearlyEvents.length > 0) ||
        (Array.isArray(longProjects) && longProjects.length > 0);
      const monthlyGoals = o.monthlyGoals as Record<string, unknown[]> | undefined;
      const monthlyEvents = o.monthlyEvents as Record<string, unknown[]> | undefined;
      const hasMonthly =
        Object.values(monthlyGoals ?? {}).some((g) => Array.isArray(g) && g.length > 0) ||
        Object.values(monthlyEvents ?? {}).some((e) => Array.isArray(e) && e.length > 0);
      return !hasDaily && !hasYearly && !hasMonthly;
    }
    return Object.keys(o).length === 0;
  }
  return false;
}

function localValueHasContent(key: string, value: unknown): boolean {
  return !isEmptyCloudValue(value);
}

async function mergeLocalStorageIntoCloud(): Promise<void> {
  if (!isCloudReady()) return;
  purgeDeprecatedLocalKeys();

  const uploads: { key: string; value: unknown }[] = [];

  for (const key of MERGE_FROM_LOCAL_KEYS) {
    const cloudVal = cloudState[key];
    const localVal = readLocalFallback<unknown>(key, undefined);
    if (localVal === undefined) continue;
    if (isEmptyCloudValue(cloudVal) && localValueHasContent(key, localVal)) {
      cloudState[key] = localVal;
      uploads.push({ key, value: localVal });
    }
  }

  for (const key of MERGE_OBJECT_KEYS) {
    const cloudVal = cloudState[key];
    const localVal = readLocalFallback<unknown>(key, undefined);
    if (localVal === undefined) continue;
    if (isEmptyCloudValue(cloudVal) && localValueHasContent(key, localVal)) {
      cloudState[key] = localVal;
      uploads.push({ key, value: localVal });
    }
  }

  for (const { key, value } of uploads) {
    writeLocalFallback(key, value);
    await postState(key, value);
  }

  if (uploads.length > 0) {
    toast.success(`Synced ${uploads.length} local dataset(s) to cloud.`);
  }
}

async function runCloudMigrations(): Promise<void> {
  const currentVersionRaw = cloudState[STORAGE_SCHEMA_VERSION_KEY];
  const currentVersion =
    typeof currentVersionRaw === "number" && Number.isFinite(currentVersionRaw)
      ? currentVersionRaw
      : 0;
  if (currentVersion >= STORAGE_SCHEMA_LATEST) return;

  // v2: Exercise schema migration (remove intensity, add times, optional duration)
  const migratedExercise = normalizeExerciseEntries(cloudState["mindful_exercise"]);
  cloudState["mindful_exercise"] = migratedExercise;
  cloudState[STORAGE_SCHEMA_VERSION_KEY] = STORAGE_SCHEMA_LATEST;

  await postState("mindful_exercise", migratedExercise);
  await postState(STORAGE_SCHEMA_VERSION_KEY, STORAGE_SCHEMA_LATEST);
}

export async function initializeCloudStorage(): Promise<void> {
  if (isCloudStateInitialized) return;
  if (!cloudUserId || !cloudToken) {
    showCloudError("Please sign in to load cloud data.");
    isCloudStateInitialized = true;
    dispatchStorageHydrated();
    return;
  }
  try {
    const response = await fetch(STATE_ENDPOINT, {
      headers: { Authorization: `Bearer ${cloudToken}` },
    });
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`Cloud init failed (${response.status}): ${text.slice(0, 180)}`);
    }
    const json = (await response.json()) as { state?: Record<string, unknown> };
    cloudState = json.state ?? {};
    await mergeLocalStorageIntoCloud();
    await runCloudMigrations();
  } catch (error) {
    console.error("Failed to initialize cloud state:", error);
    showCloudError("Cloud DB is not ready. Please fix backend/Supabase setup.");
  } finally {
    isCloudStateInitialized = true;
    dispatchStorageHydrated();
  }
}

function isCloudReady(): boolean {
  return !!(cloudUserId && cloudToken);
}

function readLocalFallback<T>(key: string, defaultValue: T): T {
  if (typeof localStorage === "undefined") return defaultValue;
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return defaultValue;
    return JSON.parse(raw) as T;
  } catch {
    return defaultValue;
  }
}

function runLocalMigrations(): void {
  if (typeof localStorage === "undefined") return;
  const currentRaw = localStorage.getItem(STORAGE_SCHEMA_VERSION_KEY);
  const currentVersion = currentRaw ? Number(currentRaw) : 0;
  if (Number.isFinite(currentVersion) && currentVersion >= STORAGE_SCHEMA_LATEST) return;

  const exerciseRaw = readLocalFallback<unknown>("mindful_exercise", []);
  const migratedExercise = normalizeExerciseEntries(exerciseRaw);
  writeLocalFallback("mindful_exercise", migratedExercise);
  writeLocalFallback(STORAGE_SCHEMA_VERSION_KEY, STORAGE_SCHEMA_LATEST);
}

function writeLocalFallback(key: string, value: unknown): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error("localStorage set failed", key, e);
  }
}

// Generic storage: cloud when signed in; otherwise localStorage so prefs & data persist offline.
function getFromStorage<T>(key: string, defaultValue: T): T {
  if ((DEPRECATED_STORAGE_KEYS as readonly string[]).includes(key)) {
    return defaultValue;
  }
  if (isCloudReady()) {
    if (!isCloudStateInitialized) {
      return readLocalFallback(key, defaultValue);
    }
    const value = cloudState[key];
    if (value !== undefined) return value as T;
    const local = readLocalFallback<T | undefined>(key, undefined);
    if (local !== undefined) return local;
    return defaultValue;
  }
  runLocalMigrations();
  purgeDeprecatedLocalKeys();
  return readLocalFallback(key, defaultValue);
}

function setToStorage<T>(key: string, value: T): void {
  if ((DEPRECATED_STORAGE_KEYS as readonly string[]).includes(key)) {
    return;
  }

  writeLocalFallback(key, value);

  if (!isCloudReady()) {
    return;
  }

  if (!isCloudStateInitialized) {
    showCloudError("Still loading cloud data — try again in a moment.");
    return;
  }

  const previousValue = cloudState[key];
  if (
    Array.isArray(value) &&
    value.length === 0 &&
    Array.isArray(previousValue) &&
    previousValue.length > 1
  ) {
    console.warn(`Blocked clearing non-empty cloud key: ${key}`);
    showCloudError("Could not clear all items at once. Remove entries one by one.");
    return;
  }

  cloudState[key] = value as unknown;
  void postState(key, value).catch((error) => {
    cloudState[key] = previousValue;
    console.error(`Cloud save failed for ${key}:`, error);
    showCloudError("Failed to save to cloud DB. Changes were not persisted.");
  });
}

// Timetable functions
export function getTimetable(): TimetableEntry[] {
  return getFromStorage<TimetableEntry[]>("mindful_timetable", []);
}

export function saveTimetable(entries: TimetableEntry[]): void {
  setToStorage("mindful_timetable", entries);
}

/** Label for UI: course code + name when code exists. */
export function timetableCourseDisplayLabel(entry: TimetableEntry): string {
  const code = (entry.courseCode || "").trim();
  return code ? `${code} — ${entry.courseName}` : entry.courseName;
}

/** One selectable row per distinct course (deduped by code + name). */
export function getTimetableCourseSelectOptions(entries: TimetableEntry[]): {
  timetableEntryId: string;
  label: string;
}[] {
  const seen = new Set<string>();
  const out: { timetableEntryId: string; label: string }[] = [];
  for (const e of entries) {
    const name = (e.courseName || "").trim();
    if (!name) continue;
    const code = (e.courseCode || "").trim().toLowerCase();
    const key = `${code}|${name.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      timetableEntryId: e.id,
      label: timetableCourseDisplayLabel(e),
    });
  }
  out.sort((a, b) => a.label.localeCompare(b.label));
  return out;
}

// Focus session functions
export function getFocusSessions(): FocusSession[] {
  return getFromStorage<FocusSession[]>("mindful_focus_sessions", []);
}

export function saveFocusSessions(sessions: FocusSession[]): void {
  setToStorage("mindful_focus_sessions", sessions);
}

export function getTodayFocusTime(): number {
  const sessions = getFocusSessions();
  const today = new Date().toDateString();
  
  return sessions
    .filter(s => s.completed && new Date(s.date).toDateString() === today)
    .reduce((total, s) => total + s.duration, 0);
}

// Finance functions
export function getFinanceEntries(): FinanceEntry[] {
  return getFromStorage<FinanceEntry[]>("mindful_finance", []);
}

export function saveFinanceEntries(entries: FinanceEntry[]): void {
  setToStorage("mindful_finance", entries);
}

export function getFinanceSummary(entries: FinanceEntry[]) {
  const totalIncome = entries
    .filter(e => e.type === "income")
    .reduce((sum, e) => sum + e.amount, 0);
  
  const totalExpenses = entries
    .filter(e => e.type === "expense")
    .reduce((sum, e) => sum + e.amount, 0);
  
  const balance = totalIncome - totalExpenses;

  // Category breakdown for expenses
  const categoryTotals: Record<string, number> = {};
  entries
    .filter(e => e.type === "expense")
    .forEach(e => {
      categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
    });

  return {
    totalIncome,
    totalExpenses,
    balance,
    categoryTotals,
  };
}

export function getTodayFinanceEntries(): FinanceEntry[] {
  const entries = getFinanceEntries();
  const today = new Date().toDateString();
  return entries.filter(e => new Date(e.date).toDateString() === today);
}

// Song functions
export function getSongs(): Song[] {
  return getFromStorage<Song[]>("mindful_songs", []);
}

export function saveSongs(songs: Song[]): void {
  setToStorage("mindful_songs", songs);
}

// Study plans
export function getStudyPlans(): StudyPlan[] {
  return getFromStorage<StudyPlan[]>("mindful_study_plans", []);
}

export function saveStudyPlans(plans: StudyPlan[]): void {
  setToStorage("mindful_study_plans", plans);
}

export function updateStudyPlanPartCompleted(
  planId: string,
  partId: string,
  completed: boolean
): void {
  const plans = getStudyPlans();
  const next = plans.map((p) => {
    if (p.id !== planId) return p;
    return {
      ...p,
      parts: p.parts.map((part) =>
        part.id === partId ? { ...part, completed } : part
      ),
    };
  });
  saveStudyPlans(next);
}

// Habits
export function getHabits(): Habit[] {
  return getFromStorage<Habit[]>("mindful_habits", []);
}

export function saveHabits(habits: Habit[]): void {
  setToStorage("mindful_habits", habits);
}

export function getHabitDayEntries(): HabitDayEntry[] {
  return getFromStorage<HabitDayEntry[]>("mindful_habit_days", []);
}

export function saveHabitDayEntries(entries: HabitDayEntry[]): void {
  setToStorage("mindful_habit_days", entries);
}

export function isHabitCompletedOnDate(habitId: string, ymd: string): boolean {
  return getHabitDayEntries().some((e) => e.habitId === habitId && e.date === ymd);
}

export function setHabitCompletedOnDate(habitId: string, ymd: string, done: boolean): void {
  const raw = getHabitDayEntries();
  const next = raw.filter((e) => !(e.habitId === habitId && e.date === ymd));
  if (done) next.push({ habitId, date: ymd });
  saveHabitDayEntries(next);
}

export function habitCompletionCountInRange(
  habitId: string,
  startYmd: string,
  endYmd: string
): number {
  return getHabitDayEntries().filter(
    (e) => e.habitId === habitId && e.date >= startYmd && e.date <= endYmd
  ).length;
}

// Playlist functions
export function getPlaylists(): Playlist[] {
  return getFromStorage<Playlist[]>("mindful_playlists", []);
}

export function savePlaylists(playlists: Playlist[]): void {
  setToStorage("mindful_playlists", playlists);
}

// Focus Timer Presets
export interface FocusPreset {
  id: string;
  name: string;
  duration: number; // in minutes
}

export function getFocusPresets(): FocusPreset[] {
  const defaults: FocusPreset[] = [
    { id: "1", name: "Pomodoro", duration: 25 },
    { id: "2", name: "Short Break", duration: 5 },
    { id: "3", name: "Long Break", duration: 15 },
    { id: "4", name: "Deep Work", duration: 90 },
  ];
  return getFromStorage<FocusPreset[]>("mindful_focus_presets", defaults);
}

export function saveFocusPresets(presets: FocusPreset[]): void {
  setToStorage("mindful_focus_presets", presets);
}

export function getFocusWallpaperChoice(): FocusWallpaperChoice {
  const raw = getFromStorage<string>("mindful_focus_wallpaper", FOCUS_WALLPAPER_MATCH_SOUND);
  return normalizeFocusWallpaperChoice(raw);
}

export function saveFocusWallpaperChoice(choice: FocusWallpaperChoice): void {
  setToStorage("mindful_focus_wallpaper", normalizeFocusWallpaperChoice(choice));
}

export function getFocusNoiseTypeChoice(): string {
  return getFromStorage<string>("mindful_focus_noise_type", "none");
}

export function saveFocusNoiseTypeChoice(noiseType: string): void {
  setToStorage("mindful_focus_noise_type", noiseType);
}

// Check-in functions
export function getCheckIns(): CheckInEntry[] {
  return getFromStorage<CheckInEntry[]>("mindful_checkins", []);
}

export function saveCheckIns(checkIns: CheckInEntry[]): void {
  setToStorage("mindful_checkins", checkIns);
}

export function getTodayCheckIn(): CheckInEntry | null {
  const checkIns = getCheckIns();
  const today = new Date().toDateString();
  return checkIns.find(c => new Date(c.date).toDateString() === today) || null;
}

/** Daily wellness checklist: same rules as the Check-In page. */
export interface WellnessChecklistDayStatus {
  exercise: boolean;
  finance: boolean;
  sleep: boolean;
  meditation: boolean;
  weight: boolean;
}

function financeEntryOnCalendarDay(entry: FinanceEntry, day: Date): boolean {
  const dayStr = day.toDateString();
  const parts = entry.date.trim().split("-");
  if (parts.length === 3) {
    const y = Number(parts[0]);
    const m = Number(parts[1]) - 1;
    const d = Number(parts[2]);
    if (Number.isFinite(y) && Number.isFinite(m) && Number.isFinite(d)) {
      return new Date(y, m, d).toDateString() === dayStr;
    }
  }
  return new Date(entry.date).toDateString() === dayStr;
}

/** Snapshot of the five checklist items for a given calendar day (local). */
export function getWellnessChecklistStatusForDate(day: Date): WellnessChecklistDayStatus {
  const dayStr = day.toDateString();

  const exerciseEntries = getExerciseEntries();
  const exercise = exerciseEntries.some((e) => new Date(e.date).toDateString() === dayStr);

  const finance = getFinanceEntries().some((e) => financeEntryOnCalendarDay(e, day));

  const sleepEntries = getSleepEntries();
  const sleep = sleepEntries.some((e) => new Date(e.date).toDateString() === dayStr);

  const meditationEntries = getMeditationEntries();
  const meditation = meditationEntries.some(
    (e) => new Date(e.date).toDateString() === dayStr && e.duration >= 0.5
  );

  const weightEntries = getWeightEntries();
  const weight = weightEntries.some((e) => new Date(e.date).toDateString() === dayStr);

  return { exercise, finance, sleep, meditation, weight };
}

export function isWellnessChecklistCompleteForDate(day: Date): boolean {
  const s = getWellnessChecklistStatusForDate(day);
  return s.exercise && s.finance && s.sleep && s.meditation && s.weight;
}

/** True when today's five wellness items are all done (independent of journal check-ins). */
export function hasCompletedTodayWellnessChecklist(): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return isWellnessChecklistCompleteForDate(today);
}

/**
 * Consecutive days with a full wellness checklist, same UX as typical habit apps:
 * if today is not done yet, the streak still reflects yesterday and prior completed days.
 */
export function getCheckInStreak(): number {
  let streak = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  if (!isWellnessChecklistCompleteForDate(new Date(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }

  while (isWellnessChecklistCompleteForDate(new Date(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

// Sleep functions
export function getSleepEntries(): SleepEntry[] {
  return getFromStorage<SleepEntry[]>("mindful_sleep", []);
}

export function saveSleepEntries(entries: SleepEntry[]): void {
  setToStorage("mindful_sleep", entries);
}

export function getTodaySleepEntry(): SleepEntry | null {
  const entries = getSleepEntries();
  const today = new Date().toDateString();
  return entries.find(e => new Date(e.date).toDateString() === today) || null;
}

// Meditation functions
export function getMeditationEntries(): MeditationEntry[] {
  return getFromStorage<MeditationEntry[]>("mindful_meditation", []);
}

export function saveMeditationEntries(entries: MeditationEntry[]): void {
  setToStorage("mindful_meditation", entries);
}

export function getTodayMeditationEntry(): MeditationEntry | null {
  const entries = getMeditationEntries();
  const today = new Date().toDateString();
  return entries.find(e => new Date(e.date).toDateString() === today) || null;
}

// Exercise functions
export function getExerciseEntries(): ExerciseEntry[] {
  const raw = getFromStorage<unknown>("mindful_exercise", []);
  return normalizeExerciseEntries(raw);
}

export function saveExerciseEntries(entries: ExerciseEntry[]): void {
  setToStorage("mindful_exercise", entries);
}

export function getTodayExerciseEntry(): ExerciseEntry | null {
  const entries = getExerciseEntries();
  const today = new Date().toDateString();
  return entries.find(e => new Date(e.date).toDateString() === today) || null;
}

// Weight functions
export function getWeightEntries(): WeightEntry[] {
  return getFromStorage<WeightEntry[]>("mindful_weight", []);
}

export function saveWeightEntries(entries: WeightEntry[]): void {
  setToStorage("mindful_weight", entries);
}

export function getLatestWeightEntry(): WeightEntry | null {
  const entries = getWeightEntries();
  if (entries.length === 0) return null;
  return entries.reduce((latest, entry) => {
    const latestDate = new Date(latest.date);
    const entryDate = new Date(entry.date);
    return entryDate > latestDate ? entry : latest;
  });
}

// Quote functions
export function getFavoriteQuotes(): QuoteEntry[] {
  return getFromStorage<QuoteEntry[]>("mindful_favorite_quotes", []);
}

export function saveFavoriteQuotes(quotes: QuoteEntry[]): void {
  setToStorage("mindful_favorite_quotes", quotes);
}

export function addFavoriteQuote(quote: QuoteEntry): void {
  const favorites = getFavoriteQuotes();
  // Check if already exists
  const exists = favorites.some(q => q.text === quote.text && q.author === quote.author);
  if (!exists) {
    saveFavoriteQuotes([...favorites, quote]);
  }
}

export function removeFavoriteQuote(quote: QuoteEntry): void {
  const favorites = getFavoriteQuotes();
  const updated = favorites.filter(q => !(q.text === quote.text && q.author === quote.author));
  saveFavoriteQuotes(updated);
}

export function isQuoteFavorite(quote: QuoteEntry): boolean {
  const favorites = getFavoriteQuotes();
  return favorites.some(q => q.text === quote.text && q.author === quote.author);
}

const PDF_BOOKS_KEY = "mindful_pdf_books";
const PDF_BOOKMARKS_KEY = "mindful_pdf_bookmarks";
const PDF_QUOTES_KEY = "mindful_pdf_quotes";

export function getPdfBooks(): PdfBookRecord[] {
  return getFromStorage<PdfBookRecord[]>(PDF_BOOKS_KEY, []);
}

export function savePdfBooks(books: PdfBookRecord[]): void {
  setToStorage(PDF_BOOKS_KEY, books);
}

export function upsertPdfBook(book: PdfBookRecord): void {
  const books = getPdfBooks();
  const idx = books.findIndex((x) => x.id === book.id);
  if (idx >= 0) {
    const next = [...books];
    next[idx] = book;
    savePdfBooks(next);
    return;
  }
  savePdfBooks([book, ...books]);
}

export function getPdfBookmarks(): PdfBookmark[] {
  return getFromStorage<PdfBookmark[]>(PDF_BOOKMARKS_KEY, []);
}

export function savePdfBookmarks(bookmarks: PdfBookmark[]): void {
  setToStorage(PDF_BOOKMARKS_KEY, bookmarks);
}

export function getPdfQuotes(): PdfQuote[] {
  return getFromStorage<PdfQuote[]>(PDF_QUOTES_KEY, []);
}

export function savePdfQuotes(quotes: PdfQuote[]): void {
  setToStorage(PDF_QUOTES_KEY, quotes);
}

// UI preference functions
export function getThemePreference(): "light" | "dark" {
  return getFromStorage<"light" | "dark">("mindful_theme", "light");
}

export function saveThemePreference(theme: "light" | "dark"): void {
  setToStorage("mindful_theme", theme);
}

export function getLoadingShownDate(): string | null {
  return getFromStorage<string | null>("mindful_loading_shown", null);
}

export function saveLoadingShownDate(date: string): void {
  setToStorage("mindful_loading_shown", date);
}

/** Personal list (not tasks/events). Excluded from Analytics. */
export interface DailyMemoItem {
  id: string;
  text: string;
  done: boolean;
  /** Local calendar day (YYYY-MM-DD) when marked done; cleared when unchecked. Used to drop completed items after that day. */
  doneAtYmd?: string;
}

export interface DailyMemoState {
  items: DailyMemoItem[];
}

function localTodayYmd(): string {
  const x = new Date();
  x.setHours(0, 0, 0, 0);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
}

type DailyMemoStored = DailyMemoState & { dateYmd?: string };

function normalizeMemoItemsFromStorage(raw: DailyMemoStored | null, todayYmd: string): DailyMemoItem[] {
  if (!raw || typeof raw !== "object" || !Array.isArray(raw.items)) return [];
  const legacyListDay =
    typeof raw.dateYmd === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw.dateYmd) ? raw.dateYmd : todayYmd;
  return raw.items
    .filter((i) => i && typeof i === "object")
    .map((i) => {
      const id = typeof (i as DailyMemoItem).id === "string" ? (i as DailyMemoItem).id : `${Date.now()}`;
      const text = typeof (i as DailyMemoItem).text === "string" ? (i as DailyMemoItem).text : "";
      const done = Boolean((i as DailyMemoItem).done);
      const existing = (i as DailyMemoItem).doneAtYmd;
      const doneAtYmd =
        done && typeof existing === "string" && /^\d{4}-\d{2}-\d{2}$/.test(existing)
          ? existing
          : done
            ? legacyListDay
            : undefined;
      return { id, text, done, ...(doneAtYmd ? { doneAtYmd } : {}) };
    });
}

/** Completed items are kept until the end of that calendar day, then removed. Incomplete items persist. */
export function getDailyMemoState(): DailyMemoState {
  const todayYmd = localTodayYmd();
  const raw = getFromStorage<DailyMemoStored | null>("mindful_daily_memo", null);
  let items = normalizeMemoItemsFromStorage(raw, todayYmd);
  const pruned = items.filter((i) => !i.done || (i.doneAtYmd && i.doneAtYmd >= todayYmd));
  if (pruned.length !== items.length || (raw && "dateYmd" in raw)) {
    persistDailyMemo({ items: pruned });
    items = pruned;
  }
  return { items };
}

function persistDailyMemo(state: DailyMemoState): void {
  setToStorage("mindful_daily_memo", state);
}

export function saveDailyMemoItems(items: DailyMemoItem[]): void {
  persistDailyMemo({ items });
}

export function addDailyMemoItem(text: string): void {
  const t = text.trim();
  if (!t) return;
  const s = getDailyMemoState();
  persistDailyMemo({
    items: [
      ...s.items,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        text: t,
        done: false,
      },
    ],
  });
}

export function removeDailyMemoItem(id: string): void {
  const s = getDailyMemoState();
  persistDailyMemo({ items: s.items.filter((i) => i.id !== id) });
}

export function toggleDailyMemoItem(id: string): void {
  const todayYmd = localTodayYmd();
  const s = getDailyMemoState();
  persistDailyMemo({
    items: s.items.map((i) => {
      if (i.id !== id) return i;
      const nextDone = !i.done;
      return nextDone
        ? { ...i, done: true, doneAtYmd: todayYmd }
        : { ...i, done: false, doneAtYmd: undefined };
    }),
  });
}

export type BujoBulletType = "task" | "event" | "note";
export type BujoBulletStatus = "active" | "completed" | "cancelled" | "deferred" | "scheduled";

export interface BujoBullet {
  id: string;
  type: BujoBulletType;
  text: string;
  status: BujoBulletStatus;
  important: boolean;
  notes: string[];
  date?: string;
  scheduledDate?: string;
  scheduledTime?: string;
  parentProjectId?: string;
}

export interface BujoYearlyGoal {
  id: string;
  text: string;
  completed: boolean;
  category: "tasks" | "interested";
}

export interface BujoYearlyEvent {
  id: string;
  text: string;
  month?: number;
}

export interface BujoMonthlyGoal {
  id: string;
  text: string;
  completed: boolean;
  category: "tasks" | "interested";
}

export interface BujoMonthlyEvent {
  id: string;
  text: string;
}

export interface BujoLongProject {
  id: string;
  title: string;
  createdDate: string; // YYYY-MM-DD
  sourceBulletId?: string;
}

export interface BujoLongProjectSubtask {
  id: string;
  projectId: string;
  text: string;
  completed: boolean;
  plannedDate?: string; // YYYY-MM-DD
  anchorBulletId?: string;
  nextSubtaskId?: string;
}

export interface BujoState {
  yearlyGoals: BujoYearlyGoal[];
  yearlyEvents: BujoYearlyEvent[];
  monthlyGoals: Record<string, BujoMonthlyGoal[]>;
  monthlyEvents: Record<string, BujoMonthlyEvent[]>;
  dailyBullets: Record<string, BujoBullet[]>;
  longProjects: BujoLongProject[];
  longProjectSubtasks: BujoLongProjectSubtask[];
  schemaVersion: 2;
}

const BUJO_STORAGE_KEY = "mindful_bujo_state";

function getDefaultBujoState(): BujoState {
  return {
    yearlyGoals: [],
    yearlyEvents: [],
    monthlyGoals: {},
    monthlyEvents: {},
    dailyBullets: {},
    longProjects: [],
    longProjectSubtasks: [],
    schemaVersion: 2,
  };
}

export function getBujoState(): BujoState {
  const raw = getFromStorage<Partial<BujoState> | null>(BUJO_STORAGE_KEY, null);
  const defaults = getDefaultBujoState();
  if (!raw || typeof raw !== "object") return defaults;
  return {
    yearlyGoals: Array.isArray(raw.yearlyGoals) ? raw.yearlyGoals : defaults.yearlyGoals,
    yearlyEvents: Array.isArray(raw.yearlyEvents) ? raw.yearlyEvents : defaults.yearlyEvents,
    monthlyGoals:
      raw.monthlyGoals && typeof raw.monthlyGoals === "object"
        ? (raw.monthlyGoals as Record<string, BujoMonthlyGoal[]>)
        : defaults.monthlyGoals,
    monthlyEvents:
      raw.monthlyEvents && typeof raw.monthlyEvents === "object"
        ? (raw.monthlyEvents as Record<string, BujoMonthlyEvent[]>)
        : defaults.monthlyEvents,
    dailyBullets:
      raw.dailyBullets && typeof raw.dailyBullets === "object"
        ? (raw.dailyBullets as Record<string, BujoBullet[]>)
        : defaults.dailyBullets,
    longProjects: Array.isArray(raw.longProjects) ? raw.longProjects : defaults.longProjects,
    longProjectSubtasks: Array.isArray(raw.longProjectSubtasks)
      ? raw.longProjectSubtasks
      : defaults.longProjectSubtasks,
    schemaVersion: 2,
  };
}

export function saveBujoState(state: BujoState): void {
  setToStorage(BUJO_STORAGE_KEY, { ...state, schemaVersion: 2 });
}

const QUOTE_LOCALE_KEY = "mindful_quote_locale";
const QUOTE_TAGS_KEY = "mindful_quote_tags";

/**
 * localStorage first (always written on save) so refresh survives cloud lag/failed sync;
 * then cloud when signed in.
 */
export function getQuoteLocale(): QuoteLocale {
  const local = readLocalFallback<string | null>(QUOTE_LOCALE_KEY, null);
  if (local === "zh" || local === "en") return local === "zh" ? "zh" : "en";
  if (isCloudReady()) {
    const raw = cloudState[QUOTE_LOCALE_KEY];
    if (raw !== undefined && raw !== null) {
      const s = String(raw);
      return s === "zh" ? "zh" : "en";
    }
  }
  return "en";
}

export function saveQuoteLocale(locale: QuoteLocale): void {
  writeLocalFallback(QUOTE_LOCALE_KEY, locale);
  setToStorage(QUOTE_LOCALE_KEY, locale);
}

export function getQuoteTags(): QuoteSourceTag[] {
  const local = readLocalFallback<unknown>(QUOTE_TAGS_KEY, null);
  if (Array.isArray(local) && local.length > 0) {
    return normalizeQuoteTags(local as string[]);
  }
  if (isCloudReady()) {
    const raw = cloudState[QUOTE_TAGS_KEY];
    if (raw !== undefined && raw !== null && Array.isArray(raw)) {
      return normalizeQuoteTags(raw as string[]);
    }
  }
  if (Array.isArray(local)) return normalizeQuoteTags(local as string[]);
  return [...QUOTE_SOURCE_TAGS];
}

export function saveQuoteTags(tags: readonly QuoteSourceTag[]): void {
  const next = normalizeQuoteTags(tags);
  writeLocalFallback(QUOTE_TAGS_KEY, next);
  setToStorage(QUOTE_TAGS_KEY, next);
}

export function getMinigameHighScore(): number {
  return getFromStorage<number>("minigame-highscore", 0);
}

const CHECKIN_TRACKING_START_KEY = "mindful_checkin_tracking_start";

/**
 * Calendar day `YYYY-MM-DD` (local) when check-in analytics tracking began.
 * On first read, persists today's date so past days before that stay neutral (not "missed").
 */
export function getCheckInTrackingStartYmd(): string {
  const existing = getFromStorage<string | null>(CHECKIN_TRACKING_START_KEY, null);
  if (existing && /^\d{4}-\d{2}-\d{2}$/.test(existing)) return existing;
  const t = new Date();
  const ymd = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
  setToStorage(CHECKIN_TRACKING_START_KEY, ymd);
  return ymd;
}

export function saveMinigameHighScore(score: number): void {
  setToStorage("minigame-highscore", score);
}

export type MindfulBackupV1 = {
  version: 1;
  exportedAt: string;
  data: {
    timetable: TimetableEntry[];
    focusSessions: FocusSession[];
    financeEntries: FinanceEntry[];
    studyPlans: StudyPlan[];
    habits: Habit[];
    habitDays: HabitDayEntry[];
    focusPresets: FocusPreset[];
    checkIns: CheckInEntry[];
    sleepEntries: SleepEntry[];
    meditationEntries: MeditationEntry[];
    exerciseEntries: ExerciseEntry[];
    weightEntries: WeightEntry[];
    favoriteQuotes: QuoteEntry[];
    pdfBooks: PdfBookRecord[];
    pdfBookmarks: PdfBookmark[];
    pdfQuotes: PdfQuote[];
    dailyMemoItems: DailyMemoItem[];
    bujoState: BujoState;
    theme: "light" | "dark";
    quoteLocale: QuoteLocale;
    quoteTags: QuoteSourceTag[];
    minigameHighScore: number;
    focusWallpaperChoice: FocusWallpaperChoice;
    focusNoiseType: string;
    checkinTrackingStartYmd: string;
    loadingShownDate: string | null;
  };
};

export function createBackupSnapshot(): MindfulBackupV1 {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    data: {
      timetable: getTimetable(),
      focusSessions: getFocusSessions(),
      financeEntries: getFinanceEntries(),
      studyPlans: getStudyPlans(),
      habits: getHabits(),
      habitDays: getHabitDayEntries(),
      focusPresets: getFocusPresets(),
      checkIns: getCheckIns(),
      sleepEntries: getSleepEntries(),
      meditationEntries: getMeditationEntries(),
      exerciseEntries: getExerciseEntries(),
      weightEntries: getWeightEntries(),
      favoriteQuotes: getFavoriteQuotes(),
      pdfBooks: getPdfBooks(),
      pdfBookmarks: getPdfBookmarks(),
      pdfQuotes: getPdfQuotes(),
      dailyMemoItems: getDailyMemoState().items,
      bujoState: getBujoState(),
      theme: getThemePreference(),
      quoteLocale: getQuoteLocale(),
      quoteTags: getQuoteTags(),
      minigameHighScore: getMinigameHighScore(),
      focusWallpaperChoice: getFocusWallpaperChoice(),
      focusNoiseType: getFocusNoiseTypeChoice(),
      checkinTrackingStartYmd: getCheckInTrackingStartYmd(),
      loadingShownDate: getLoadingShownDate(),
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

export function importBackupSnapshot(raw: unknown): void {
  if (!isRecord(raw)) throw new Error("Backup file is invalid.");
  const version = Number(raw.version ?? 0);
  if (version !== 1) throw new Error(`Unsupported backup version: ${version}`);
  const data = raw.data;
  if (!isRecord(data)) throw new Error("Backup payload is missing.");

  if (Array.isArray(data.timetable)) saveTimetable(data.timetable as TimetableEntry[]);
  if (Array.isArray(data.focusSessions)) saveFocusSessions(data.focusSessions as FocusSession[]);
  if (Array.isArray(data.financeEntries)) saveFinanceEntries(data.financeEntries as FinanceEntry[]);
  if (Array.isArray(data.studyPlans)) saveStudyPlans(data.studyPlans as StudyPlan[]);
  if (Array.isArray(data.habits)) saveHabits(data.habits as Habit[]);
  if (Array.isArray(data.habitDays)) saveHabitDayEntries(data.habitDays as HabitDayEntry[]);
  if (Array.isArray(data.focusPresets)) saveFocusPresets(data.focusPresets as FocusPreset[]);
  if (Array.isArray(data.checkIns)) saveCheckIns(data.checkIns as CheckInEntry[]);
  if (Array.isArray(data.sleepEntries)) saveSleepEntries(data.sleepEntries as SleepEntry[]);
  if (Array.isArray(data.meditationEntries)) saveMeditationEntries(data.meditationEntries as MeditationEntry[]);
  if (Array.isArray(data.exerciseEntries)) saveExerciseEntries(data.exerciseEntries as ExerciseEntry[]);
  if (Array.isArray(data.weightEntries)) saveWeightEntries(data.weightEntries as WeightEntry[]);
  if (Array.isArray(data.favoriteQuotes)) saveFavoriteQuotes(data.favoriteQuotes as QuoteEntry[]);
  if (Array.isArray(data.pdfBooks)) savePdfBooks(data.pdfBooks as PdfBookRecord[]);
  if (Array.isArray(data.pdfBookmarks)) savePdfBookmarks(data.pdfBookmarks as PdfBookmark[]);
  if (Array.isArray(data.pdfQuotes)) savePdfQuotes(data.pdfQuotes as PdfQuote[]);
  if (Array.isArray(data.dailyMemoItems)) saveDailyMemoItems(data.dailyMemoItems as DailyMemoItem[]);
  if (isRecord(data.bujoState)) saveBujoState(data.bujoState as BujoState);

  if (data.theme === "light" || data.theme === "dark") saveThemePreference(data.theme);
  if (data.quoteLocale === "en" || data.quoteLocale === "zh") saveQuoteLocale(data.quoteLocale);
  if (Array.isArray(data.quoteTags)) saveQuoteTags(data.quoteTags as QuoteSourceTag[]);
  if (typeof data.minigameHighScore === "number") saveMinigameHighScore(data.minigameHighScore);
  if (typeof data.focusNoiseType === "string") saveFocusNoiseTypeChoice(data.focusNoiseType);
  if (typeof data.focusWallpaperChoice === "string") {
    saveFocusWallpaperChoice(data.focusWallpaperChoice as FocusWallpaperChoice);
  }
  if (typeof data.loadingShownDate === "string") saveLoadingShownDate(data.loadingShownDate);
  if (typeof data.checkinTrackingStartYmd === "string") {
    setToStorage(CHECKIN_TRACKING_START_KEY, data.checkinTrackingStartYmd);
  }
}