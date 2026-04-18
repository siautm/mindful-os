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

export interface Task {
  id: string;
  title: string;
  description: string;
  urgency: number; // 1-10
  importance: number; // 1-10
  priority: number; // calculated
  dueDate: string;
  /** Optional due time same calendar day as `dueDate`, 24h `HH:mm` from time input. */
  dueTime?: string;
  completed: boolean;
  /** @deprecated Optional; UI no longer collects this (defaults to 0). */
  estimatedMinutes?: number;
  createdAt: string;
  /** study | game | hobby | other */
  category?: string;
  /** Optional link to a Timetable row (representative slot for this course). */
  linkedTimetableEntryId?: string;
  /** Denormalized label, e.g. "PSY101 — Intro"; kept if the timetable row is removed. */
  courseLabel?: string;
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

export interface JournalEntry {
  id: string;
  date: string;
  wins: string[];
  reflection: string;
  mood: number; // 1-5
  pomodoroSessions?: FocusSession[];
  completedTasks?: Task[];
  expenses?: FinanceEntry[];
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

export interface IdeaEntry {
  id: string;
  date: string;
  title: string;
  content: string;
  tags: string[];
}

export interface EventEntry {
  id: string;
  title: string;
  description: string;
  date: string;
  /** Optional; omit or empty for all-day style events. */
  startTime?: string;
  endTime?: string;
  /** Optional duration in minutes (informational). */
  durationMinutes?: number;
  category: string;
  location?: string;
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

export interface FoodEntry {
  id: string;
  date: string;
  mealType: string; // breakfast, lunch, dinner, snack
  foodName: string;
  calories: number;
  protein?: number; // grams
  carbs?: number; // grams
  fats?: number; // grams
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
  if (isCloudReady()) {
    const value = cloudState[key];
    if (value !== undefined) return value as T;
    return defaultValue;
  }
  runLocalMigrations();
  return readLocalFallback(key, defaultValue);
}

function setToStorage<T>(key: string, value: T): void {
  const previousValue = cloudState[key];
  cloudState[key] = value as unknown;
  if (!isCloudReady()) {
    writeLocalFallback(key, value);
    return;
  }
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

export function resolveTaskCourseLabel(
  task: Task,
  timetable: TimetableEntry[]
): string | undefined {
  if (task.linkedTimetableEntryId) {
    const row = timetable.find((r) => r.id === task.linkedTimetableEntryId);
    if (row) return timetableCourseDisplayLabel(row);
  }
  const legacy = task.courseLabel?.trim();
  return legacy || undefined;
}

export function taskDueDayISO(task: Task): string {
  return task.dueDate.split("T")[0];
}

/** For sorting by deadline (end of day if no time). */
export function taskDueSortKey(task: Task): number {
  const day = taskDueDayISO(task);
  const [y, mo, d] = day.split("-").map(Number);
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) {
    return 0;
  }
  const t = task.dueTime?.trim();
  if (t && /^\d{1,2}:\d{2}$/.test(t)) {
    const [H, M] = t.split(":").map((s) => parseInt(s, 10));
    return new Date(y, mo - 1, d, H, M).getTime();
  }
  return new Date(y, mo - 1, d, 23, 59, 59, 999).getTime();
}

export function formatTaskDueDateTime(task: Task, locale = "en-US"): string {
  const day = taskDueDayISO(task);
  const [y, mo, d] = day.split("-").map(Number);
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) {
    return task.dueDate;
  }
  const dateObj = new Date(y, mo - 1, d);
  const datePart = dateObj.toLocaleDateString(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const t = task.dueTime?.trim();
  if (!t || !/^\d{1,2}:\d{2}$/.test(t)) return datePart;
  const [H, M] = t.split(":").map((s) => parseInt(s, 10));
  const timeObj = new Date(y, mo - 1, d, H, M);
  const timePart = timeObj.toLocaleTimeString(locale, {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${datePart} · ${timePart}`;
}

function normalizeTask(t: Task): Task {
  return {
    ...t,
    category: t.category ?? "other",
    estimatedMinutes: t.estimatedMinutes ?? 0,
  };
}

// Task functions
export function getTasks(): Task[] {
  const raw = getFromStorage<Task[]>("mindful_tasks", []);
  return raw.map(normalizeTask);
}

export function saveTasks(tasks: Task[]): void {
  setToStorage("mindful_tasks", tasks);
}

export function calculatePriority(urgency: number, importance: number): number {
  // Eisenhower Matrix scoring: urgency * 0.6 + importance * 0.4
  return Math.round((urgency * 0.6 + importance * 0.4) * 10) / 10;
}

export function getTaskSuggestions(tasks: Task[]): string[] {
  const incompleteTasks = tasks.filter(t => !t.completed);
  const suggestions: string[] = [];

  if (incompleteTasks.length === 0) {
    suggestions.push("🎉 All tasks completed! Time to add new goals or take a well-deserved break.");
    return suggestions;
  }

  // Sort by priority
  const sortedTasks = [...incompleteTasks].sort((a, b) => b.priority - a.priority);
  const highPriorityTasks = sortedTasks.filter(t => t.priority >= 8);
  
  if (highPriorityTasks.length > 0) {
    suggestions.push(`🎯 Focus on high-priority tasks: "${highPriorityTasks[0].title}" (Priority: ${highPriorityTasks[0].priority})`);
  }

  // Check for urgent tasks (due soon)
  const urgentTasks = incompleteTasks.filter(t => {
    const dueDate = new Date(t.dueDate);
    const today = new Date();
    const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= 2 && diffDays >= 0;
  });

  if (urgentTasks.length > 0) {
    suggestions.push(`⏰ ${urgentTasks.length} task(s) due within 2 days. Consider tackling them today!`);
  }

  // Quick wins (legacy estimated minutes only)
  const quickTasks = incompleteTasks.filter(t => (t.estimatedMinutes ?? 0) > 0 && (t.estimatedMinutes ?? 0) <= 15);
  if (quickTasks.length > 0) {
    suggestions.push(`⚡ ${quickTasks.length} quick task(s) (<15 min). Perfect for a short focus session!`);
  }

  const longTasks = incompleteTasks.filter(t => (t.estimatedMinutes ?? 0) > 60);
  if (longTasks.length > 0) {
    suggestions.push(`📚 ${longTasks.length} time-intensive task(s). Break them into smaller chunks for better progress.`);
  }

  return suggestions;
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

// Journal functions
export function getJournalEntries(): JournalEntry[] {
  return getFromStorage<JournalEntry[]>("mindful_journal", []);
}

export function saveJournalEntries(entries: JournalEntry[]): void {
  setToStorage("mindful_journal", entries);
}

export function getTodayJournalEntry(): JournalEntry | null {
  const entries = getJournalEntries();
  const today = new Date().toDateString();
  return entries.find(e => new Date(e.date).toDateString() === today) || null;
}

// Song functions
export function getSongs(): Song[] {
  return getFromStorage<Song[]>("mindful_songs", []);
}

export function saveSongs(songs: Song[]): void {
  setToStorage("mindful_songs", songs);
}

// Idea functions
export function getIdeas(): IdeaEntry[] {
  return getFromStorage<IdeaEntry[]>("mindful_ideas", []);
}

export function saveIdeas(ideas: IdeaEntry[]): void {
  setToStorage("mindful_ideas", ideas);
}

// Event functions
function normalizeEvent(e: EventEntry): EventEntry {
  return {
    ...e,
    startTime: e.startTime?.trim() || undefined,
    endTime: e.endTime?.trim() || undefined,
    durationMinutes:
      e.durationMinutes != null && Number.isFinite(e.durationMinutes)
        ? e.durationMinutes
        : undefined,
  };
}

export function getEvents(): EventEntry[] {
  const raw = getFromStorage<EventEntry[]>("mindful_events", []);
  return raw.map(normalizeEvent);
}

export function saveEvents(events: EventEntry[]): void {
  setToStorage("mindful_events", events);
}

/** Start of event in ms (local); midnight if no start time. */
export function eventStartMs(e: EventEntry): number {
  const d = e.date.split("T")[0];
  const st = e.startTime?.trim();
  if (st) {
    const t = new Date(`${d}T${st}`).getTime();
    if (!Number.isNaN(t)) return t;
  }
  return new Date(`${d}T00:00:00`).getTime();
}

/** End of event in ms; end of calendar day if no times/duration. */
export function eventEndMs(e: EventEntry): number {
  const d = e.date.split("T")[0];
  const en = e.endTime?.trim();
  if (en) {
    const t = new Date(`${d}T${en}`).getTime();
    if (!Number.isNaN(t)) return t;
  }
  const st = e.startTime?.trim();
  if (st) {
    const start = new Date(`${d}T${st}`).getTime();
    if (!Number.isNaN(start)) {
      if (e.durationMinutes != null && e.durationMinutes > 0) {
        return start + e.durationMinutes * 60000;
      }
      return start + 3600000;
    }
  }
  if (e.durationMinutes != null && e.durationMinutes > 0) {
    return eventStartMs(e) + e.durationMinutes * 60000;
  }
  return new Date(`${d}T23:59:59.999`).getTime();
}

export function formatEventTimeRange(e: EventEntry): string {
  const st = e.startTime?.trim();
  const en = e.endTime?.trim();
  const dm = e.durationMinutes;
  if (st && en) return `${st} – ${en}`;
  if (st && dm != null && dm > 0) return `${st} · ${dm} min`;
  if (st) return `From ${st}`;
  if (en) return `Until ${en}`;
  if (dm != null && dm > 0) return `${dm} min`;
  return "All day";
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

// Food functions
export function getFoodEntries(): FoodEntry[] {
  return getFromStorage<FoodEntry[]>("mindful_food", []);
}

export function saveFoodEntries(entries: FoodEntry[]): void {
  setToStorage("mindful_food", entries);
}

export function getTodayFoodEntries(): FoodEntry[] {
  const entries = getFoodEntries();
  const today = new Date().toDateString();
  return entries.filter(e => new Date(e.date).toDateString() === today);
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

export interface BujoState {
  yearlyGoals: BujoYearlyGoal[];
  yearlyEvents: BujoYearlyEvent[];
  monthlyGoals: Record<string, BujoMonthlyGoal[]>;
  monthlyEvents: Record<string, BujoMonthlyEvent[]>;
  dailyBullets: Record<string, BujoBullet[]>;
  schemaVersion: 1;
}

const BUJO_STORAGE_KEY = "mindful_bujo_state";

function getDefaultBujoState(): BujoState {
  return {
    yearlyGoals: [],
    yearlyEvents: [],
    monthlyGoals: {},
    monthlyEvents: {},
    dailyBullets: {},
    schemaVersion: 1,
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
    schemaVersion: 1,
  };
}

export function saveBujoState(state: BujoState): void {
  setToStorage(BUJO_STORAGE_KEY, { ...state, schemaVersion: 1 });
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