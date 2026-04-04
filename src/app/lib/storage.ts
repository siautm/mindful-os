import { toast } from "sonner";
import type { QuoteLocale, QuoteSourceTag } from "./quotesApi";
import { normalizeQuoteTags, QUOTE_SOURCE_TAGS } from "./quotesApi";

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
  completed: boolean;
  estimatedMinutes: number;
  createdAt: string;
}

export interface FocusSession {
  id: string;
  taskId?: string;
  taskTitle?: string;
  duration: number;
  completed: boolean;
  date: string;
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
  startTime: string;
  endTime: string;
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
  wakeTime: string; // HH:MM
  duration: number; // hours (calculated)
  quality: number; // 1-5 rating
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
  type: string; // cardio, strength, yoga, sports, walking, other
  duration: number; // minutes
  intensity: string; // light, moderate, intense
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

const API_BASE = import.meta.env.VITE_API_BASE_URL?.trim() || "";
const STATE_ENDPOINT = `${API_BASE}/api/state`;

let cloudState: Record<string, unknown> = {};
let isCloudStateInitialized = false;
let lastCloudErrorAt = 0;
let cloudUserId: string | null = null;
let cloudToken: string | null = null;

export function setCloudAuth(userId: string | null, accessToken: string | null): void {
  cloudUserId = userId;
  cloudToken = accessToken;
  cloudState = {};
  isCloudStateInitialized = false;
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

export async function initializeCloudStorage(): Promise<void> {
  if (isCloudStateInitialized) return;
  if (!cloudUserId || !cloudToken) {
    showCloudError("Please sign in to load cloud data.");
    isCloudStateInitialized = true;
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
  } catch (error) {
    console.error("Failed to initialize cloud state:", error);
    showCloudError("Cloud DB is not ready. Please fix backend/Supabase setup.");
  } finally {
    isCloudStateInitialized = true;
  }
}

// Generic storage functions (Supabase-backed via /api/state)
function getFromStorage<T>(key: string, defaultValue: T): T {
  const value = cloudState[key];
  if (value === undefined) return defaultValue;
  return value as T;
}

function setToStorage<T>(key: string, value: T): void {
  const previousValue = cloudState[key];
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

// Task functions
export function getTasks(): Task[] {
  return getFromStorage<Task[]>("mindful_tasks", []);
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

  // Quick wins
  const quickTasks = incompleteTasks.filter(t => t.estimatedMinutes <= 15);
  if (quickTasks.length > 0) {
    suggestions.push(`⚡ ${quickTasks.length} quick task(s) (<15 min). Perfect for a short focus session!`);
  }

  // Time-intensive tasks
  const longTasks = incompleteTasks.filter(t => t.estimatedMinutes > 60);
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
export function getEvents(): EventEntry[] {
  return getFromStorage<EventEntry[]>("mindful_events", []);
}

export function saveEvents(events: EventEntry[]): void {
  setToStorage("mindful_events", events);
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

export function getCheckInStreak(): number {
  const checkIns = getCheckIns();
  if (checkIns.length === 0) return 0;

  // Sort by date descending
  const sorted = [...checkIns].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < sorted.length; i++) {
    const checkInDate = new Date(sorted[i].date);
    checkInDate.setHours(0, 0, 0, 0);

    const expectedDate = new Date(today);
    expectedDate.setDate(expectedDate.getDate() - i);

    if (checkInDate.getTime() === expectedDate.getTime()) {
      streak++;
    } else {
      break;
    }
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
  return getFromStorage<ExerciseEntry[]>("mindful_exercise", []);
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

export function getQuoteLocale(): QuoteLocale {
  const v = getFromStorage<string>("mindful_quote_locale", "en");
  return v === "zh" ? "zh" : "en";
}

export function saveQuoteLocale(locale: QuoteLocale): void {
  setToStorage("mindful_quote_locale", locale);
}

const QUOTE_TAGS_KEY = "mindful_quote_tags";

export function getQuoteTags(): QuoteSourceTag[] {
  const raw = getFromStorage<string[] | null>(QUOTE_TAGS_KEY, null);
  if (!raw || !Array.isArray(raw)) return [...QUOTE_SOURCE_TAGS];
  return normalizeQuoteTags(raw);
}

export function saveQuoteTags(tags: readonly QuoteSourceTag[]): void {
  const next = normalizeQuoteTags(tags);
  setToStorage(QUOTE_TAGS_KEY, next);
}

export function getMinigameHighScore(): number {
  return getFromStorage<number>("minigame-highscore", 0);
}

export function saveMinigameHighScore(score: number): void {
  setToStorage("minigame-highscore", score);
}