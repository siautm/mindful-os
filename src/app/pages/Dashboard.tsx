import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import {
  CheckSquare,
  Timer,
  TrendingUp,
  Calendar,
  ArrowRight,
  Sparkles,
  Trophy,
  Quote as QuoteIcon,
  Heart,
  Flame,
  Circle,
  CheckCircle2,
  Clock,
  MapPin,
  Star,
  X,
  Moon,
  Sun,
  Sunrise,
  Sunset,
} from "lucide-react";
import {
  getTasks,
  getTodayFocusTime,
  getFinanceEntries,
  getFinanceSummary,
  getTimetable,
  getEvents,
  hasCompletedTodayWellnessChecklist,
  getCheckInStreak,
  Task,
  EventEntry,
  TimetableEntry,
  QuoteEntry,
  getFavoriteQuotes,
  addFavoriteQuote,
  removeFavoriteQuote,
  isQuoteFavorite,
  getLoadingShownDate,
  saveLoadingShownDate,
  resolveTaskCourseLabel,
  formatTaskDueDateTime,
} from "../lib/storage";
import { motion } from "motion/react";
import { LoadingQuoteScreen } from "../components/LoadingQuoteScreen";
import { useTheme } from "../contexts/ThemeContext";
import { useQuoteLocale } from "../contexts/QuoteLocaleContext";
import {
  fetchQuoteFromNetwork,
  getInstantQuote,
  QUOTE_SOURCE_TAGS,
  scheduleIdleQuotePrefetch,
  type QuoteSourceTag,
} from "../lib/quotesApi";

type TimeOfDay = "morning" | "afternoon" | "evening";

interface TimeTheme {
  gradient: string;
  cardGradient: string;
  greeting: string;
  emoji: string;
  icon: any;
  accentColor: string;
  glowColor: string;
}

const timeThemes: Record<TimeOfDay, TimeTheme> = {
  morning: {
    gradient: "from-amber-400 via-orange-400 to-yellow-400",
    cardGradient: "from-amber-50 to-orange-50",
    greeting: "Good Morning",
    emoji: "🌅",
    icon: Sunrise,
    accentColor: "orange",
    glowColor: "rgba(251, 146, 60, 0.3)",
  },
  afternoon: {
    gradient: "from-sky-400 via-blue-400 to-cyan-400",
    cardGradient: "from-sky-50 to-blue-50",
    greeting: "Good Afternoon",
    emoji: "☀️",
    icon: Sun,
    accentColor: "blue",
    glowColor: "rgba(56, 189, 248, 0.3)",
  },
  evening: {
    gradient: "from-indigo-500 via-purple-500 to-pink-500",
    cardGradient: "from-indigo-50 to-purple-50",
    greeting: "Good Evening",
    emoji: "🌙",
    icon: Moon,
    accentColor: "purple",
    glowColor: "rgba(139, 92, 246, 0.3)",
  },
};

export function Dashboard() {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { locale, setLocale, quoteTags, toggleQuoteTag } = useQuoteLocale();
  const [showLoading, setShowLoading] = useState(true);
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>("morning");
  const [currentTheme, setCurrentTheme] = useState<TimeTheme>(timeThemes.morning);
  const [quote, setQuote] = useState<QuoteEntry>({ text: "", author: "" });
  const [quoteLoading, setQuoteLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoritesDialogOpen, setFavoritesDialogOpen] = useState(false);
  const [favoriteQuotes, setFavoriteQuotes] = useState<QuoteEntry[]>([]);
  const [hasCheckedIn, setHasCheckedIn] = useState(false);
  const [checkInStreak, setCheckInStreak] = useState(0);
  const cursorGlowRef = useRef<HTMLDivElement>(null);

  const particleConfigs = useMemo(
    () =>
      Array.from({ length: 15 }, (_, i) => ({
        id: i,
        w: Math.random() * 6 + 3,
        h: Math.random() * 6 + 3,
        left: Math.random() * 100,
        top: Math.random() * 100,
        duration: Math.random() * 4 + 3,
        delay: Math.random() * 2,
      })),
    []
  );

  // Stats
  const [stats, setStats] = useState({
    completedTasks: 0,
    totalTasks: 0,
    focusTime: 0,
    balance: 0,
    todayEvents: 0,
  });

  // Priority items (combined tasks, events, classes)
  const [priorityItems, setPriorityItems] = useState<Array<{
    type: "task" | "event" | "class";
    title: string;
    subtitle: string;
    time?: string;
    priority?: number;
    color: string;
  }>>([]);

  useEffect(() => {
    // Check if loading screen was shown today
    const lastShown = getLoadingShownDate();
    const today = new Date().toDateString();
    
    if (lastShown === today) {
      setShowLoading(false);
    } else {
      saveLoadingShownDate(today);
    }

    determineTimeOfDay();
    loadAllData();
  }, []);

  useEffect(() => {
    scheduleIdleQuotePrefetch(quoteTags);
  }, [quoteTags]);

  useEffect(() => {
    const el = cursorGlowRef.current;
    if (!el) return;
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        el.style.transform = `translate3d(${e.clientX - 192}px, ${e.clientY - 192}px, 0)`;
      });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
    };
  }, []);

  useEffect(() => {
    setIsFavorite(isQuoteFavorite(quote));
  }, [quote]);

  useEffect(() => {
    const favorites = getFavoriteQuotes();
    const instant = getInstantQuote(locale, favorites, quoteTags);
    setQuote(instant);
    setQuoteLoading(false);

    let cancelled = false;
    void fetchQuoteFromNetwork(locale, quoteTags).then((q) => {
      if (!cancelled) setQuote(q);
    });
    return () => {
      cancelled = true;
    };
  }, [locale, quoteTags]);

  /** Auto-refresh dashboard quote every 5 minutes. */
  useEffect(() => {
    const ms = 5 * 60 * 1000;
    const id = window.setInterval(() => {
      void fetchQuoteFromNetwork(locale, quoteTags).then((q) => {
        setQuote(q);
      });
    }, ms);
    return () => clearInterval(id);
  }, [locale, quoteTags]);

  useEffect(() => {
    setHasCheckedIn(hasCompletedTodayWellnessChecklist());
    setCheckInStreak(getCheckInStreak());
  }, [location.pathname]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible") {
        setHasCheckedIn(hasCompletedTodayWellnessChecklist());
        setCheckInStreak(getCheckInStreak());
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  function determineTimeOfDay() {
    const hour = new Date().getHours();
    let time: TimeOfDay;
    
    if (hour >= 6 && hour < 12) {
      time = "morning";
    } else if (hour >= 12 && hour < 18) {
      time = "afternoon";
    } else {
      time = "evening";
    }
    
    setTimeOfDay(time);
    setCurrentTheme(timeThemes[time]);
  }

  function loadAllData() {
    loadStats();
    loadCheckInStatus();
    loadPriorityItems();
    loadFavorites();
  }

  function loadStats() {
    const tasks = getTasks();
    const completedTasks = tasks.filter(t => t.completed).length;
    const focusTime = getTodayFocusTime();
    const financeEntries = getFinanceEntries();
    const { balance } = getFinanceSummary(financeEntries);
    
    const events = getEvents();
    const today = new Date().toDateString();
    const todayEvents = events.filter(e => new Date(e.date).toDateString() === today).length;

    setStats({
      completedTasks,
      totalTasks: tasks.length,
      focusTime: Math.round(focusTime),
      balance: Math.round(balance * 100) / 100,
      todayEvents,
    });
  }

  function loadCheckInStatus() {
    setHasCheckedIn(hasCompletedTodayWellnessChecklist());
    setCheckInStreak(getCheckInStreak());
  }

  function loadPriorityItems() {
    const items: Array<{
      type: "task" | "event" | "class";
      title: string;
      subtitle: string;
      time?: string;
      priority?: number;
      color: string;
    }> = [];

    // Get top 2 priority tasks
    const tasks = getTasks();
    const timetableRows = getTimetable();
    const incompleteTasks = tasks
      .filter(t => !t.completed)
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 2);
    
    incompleteTasks.forEach(task => {
      const course = resolveTaskCourseLabel(task, timetableRows);
      items.push({
        type: "task",
        title: task.title,
        subtitle: `Priority: ${task.priority} • ${formatTaskDueDateTime(task)}${course ? ` • ${course}` : ""}`,
        priority: task.priority,
        color: task.priority >= 8 ? "red" : task.priority >= 5 ? "yellow" : "green",
      });
    });

    // Get today's events
    const events = getEvents();
    const today = new Date().toDateString();
    const todayEvents = events
      .filter(e => new Date(e.date).toDateString() === today)
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
      .slice(0, 2);
    
    todayEvents.forEach(event => {
      items.push({
        type: "event",
        title: event.title,
        subtitle: event.category,
        time: `${event.startTime} - ${event.endTime}`,
        color: "blue",
      });
    });

    // Get today's classes
    const timetable = getTimetable();
    const todayDay = new Date().toLocaleDateString("en-US", { weekday: "long" });
    const todayClasses = timetable
      .filter(e => e.day === todayDay)
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
      .slice(0, 2);
    
    todayClasses.forEach(classEntry => {
      items.push({
        type: "class",
        title: classEntry.courseName,
        subtitle: classEntry.courseCode,
        time: `${classEntry.startTime} - ${classEntry.endTime}`,
        color: "orange",
      });
    });

    // Sort by priority and limit to top 6
    const sortedItems = items.sort((a, b) => {
      if (a.priority && b.priority) return b.priority - a.priority;
      if (a.priority) return -1;
      if (b.priority) return 1;
      return 0;
    }).slice(0, 6);

    setPriorityItems(sortedItems);
  }

  async function refreshQuote() {
    setQuoteLoading(true);
    const q = await fetchQuoteFromNetwork(locale, quoteTags);
    setQuote(q);
    setQuoteLoading(false);
  }

  function loadFavorites() {
    setFavoriteQuotes(getFavoriteQuotes());
  }

  function handleToggleFavorite() {
    if (!quote.text.trim()) return;
    if (isFavorite) {
      removeFavoriteQuote(quote);
    } else {
      addFavoriteQuote(quote);
    }
    setIsFavorite(!isFavorite);
    loadFavorites();
  }

  function handleSelectFavoriteQuote(favoriteQuote: QuoteEntry) {
    setQuote(favoriteQuote);
    setFavoritesDialogOpen(false);
  }

  function handleRemoveFavorite(favoriteQuote: QuoteEntry) {
    removeFavoriteQuote(favoriteQuote);
    loadFavorites();
    if (quote.text === favoriteQuote.text && quote.author === favoriteQuote.author) {
      setIsFavorite(false);
    }
  }

  if (showLoading) {
    return <LoadingQuoteScreen onComplete={() => setShowLoading(false)} />;
  }

  const TimeIcon = currentTheme.icon;
  const completionRate = stats.totalTasks > 0 
    ? Math.round((stats.completedTasks / stats.totalTasks) * 100)
    : 0;

  return (
    <div className={`min-h-screen relative overflow-hidden transition-colors duration-500 ${
      theme === "dark" 
        ? "bg-gray-900" 
        : "bg-gradient-to-br from-gray-50 to-gray-100"
    }`}>
      <div
        ref={cursorGlowRef}
        className="pointer-events-none fixed left-0 top-0 size-96 rounded-full opacity-20 blur-3xl will-change-transform"
        style={{
          background: currentTheme.glowColor,
          transform: "translate3d(-9999px, -9999px, 0)",
        }}
      />

      {particleConfigs.map((p) => (
        <motion.div
          key={p.id}
          className={`absolute rounded-full ${theme === "dark" ? "bg-white/10" : "bg-black/5"}`}
          style={{
            width: p.w,
            height: p.h,
            left: `${p.left}%`,
            top: `${p.top}%`,
          }}
          animate={{
            y: [0, -40, 0],
            opacity: [0.1, 0.3, 0.1],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
          }}
        />
      ))}

      <div className="relative z-10 px-4 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-6 md:p-8 md:pb-8 space-y-6 max-w-7xl mx-auto w-full min-w-0">
        {/* Hero Section with Theme Toggle */}
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 100 }}
          className={`relative overflow-hidden rounded-3xl bg-gradient-to-r ${currentTheme.gradient} p-8 md:p-12 shadow-2xl group`}
        >
          {/* Parallax Background Elements */}
          <motion.div
            className="absolute top-0 right-0 size-64 bg-white/10 rounded-full blur-3xl"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{ duration: 5, repeat: Infinity }}
          />
          <motion.div
            className="absolute bottom-0 left-0 size-48 bg-white/10 rounded-full blur-2xl"
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.2, 0.4, 0.2],
            }}
            transition={{ duration: 4, repeat: Infinity, delay: 1 }}
          />

          {/* Dark Mode Toggle */}
          <motion.div
            className="absolute top-6 right-6"
            whileHover={{ scale: 1.1, rotate: 180 }}
            whileTap={{ scale: 0.9 }}
          >
            <Button
              onClick={toggleTheme}
              variant="ghost"
              size="sm"
              className="size-12 rounded-full bg-white/20 backdrop-blur-md hover:bg-white/30 border border-white/30"
            >
              {theme === "dark" ? (
                <Sun className="size-6 text-white" />
              ) : (
                <Moon className="size-6 text-white" />
              )}
            </Button>
          </motion.div>

          <div className="relative z-10">
            <motion.div
              className="flex items-center gap-4 mb-4"
              initial={{ x: -30, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <TimeIcon className="size-12 text-white" />
              <div>
                <h1 className="text-4xl md:text-5xl font-bold text-white">
                  {currentTheme.greeting} {currentTheme.emoji}
                </h1>
                <p className="text-lg md:text-xl text-white/90 mt-1">
                  {new Date().toLocaleDateString("en-US", { 
                    weekday: "long", 
                    month: "long", 
                    day: "numeric" 
                  })}
                </p>
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Quick Stats Bar */}
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          {[
            { label: "Tasks", value: `${stats.completedTasks}/${stats.totalTasks}`, icon: CheckSquare, link: "/tasks", color: currentTheme.accentColor },
            { label: "Focus", value: `${stats.focusTime}m`, icon: Timer, link: "/focus", color: currentTheme.accentColor },
            { label: "Balance", value: `$${stats.balance}`, icon: TrendingUp, link: "/finance", color: currentTheme.accentColor },
            { label: "Events", value: stats.todayEvents, icon: Calendar, link: "/events", color: currentTheme.accentColor },
          ].map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Link key={stat.label} to={stat.link}>
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1 + index * 0.05, type: "spring" }}
                  whileHover={{ scale: 1.05, y: -5 }}
                  whileTap={{ scale: 0.95 }}
                  className={`${
                    theme === "dark" 
                      ? "bg-gray-800 border-gray-700" 
                      : "bg-white border-gray-200"
                  } border-2 rounded-2xl p-4 shadow-lg hover:shadow-2xl transition-all cursor-pointer group`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Icon className={`size-6 text-${stat.color}-500 group-hover:scale-110 transition-transform`} />
                    <ArrowRight className={`size-4 ${theme === "dark" ? "text-gray-600" : "text-gray-400"} group-hover:translate-x-1 transition-transform`} />
                  </div>
                  <p className={`text-2xl font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                    {stat.value}
                  </p>
                  <p className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                    {stat.label}
                  </p>
                </motion.div>
              </Link>
            );
          })}
        </motion.div>

        {/* Quote Card with Favorites */}
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          whileHover={{ scale: 1.02, y: -5 }}
          onClick={() => setFavoritesDialogOpen(true)}
          className={`${
            theme === "dark" 
              ? "bg-gray-800 border-gray-700" 
              : `bg-gradient-to-br ${currentTheme.cardGradient} border-${currentTheme.accentColor}-200`
          } border-2 rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all cursor-pointer group`}
        >
          <div className="flex items-start gap-4">
            <div className={`size-12 bg-gradient-to-br ${currentTheme.gradient} rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:rotate-12 transition-transform`}>
              <QuoteIcon className="size-6 text-white" />
            </div>
            <div className="flex-1">
              {quoteLoading ? (
                <p className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                  {locale === "zh" ? "正在加载名言…" : "Loading quote…"}
                </p>
              ) : (
                <>
                  <p className={`text-lg italic ${theme === "dark" ? "text-gray-200" : "text-gray-800"} mb-2`}>
                    “{quote.text}”
                  </p>
                  <p className={`text-sm font-semibold text-${currentTheme.accentColor}-600`}>
                    — {quote.author}
                  </p>
                </>
              )}
            </div>
            <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center">
              <div className="flex rounded-lg border border-white/20 bg-white/10 p-0.5 dark:border-gray-600 dark:bg-gray-800/80">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setLocale("en");
                  }}
                  className={`rounded-md px-2 py-1 text-xs font-semibold ${
                    locale === "en"
                      ? theme === "dark"
                        ? "bg-gray-700 text-white"
                        : "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-700 dark:text-gray-400"
                  }`}
                >
                  EN
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setLocale("zh");
                  }}
                  className={`rounded-md px-2 py-1 text-xs font-semibold ${
                    locale === "zh"
                      ? theme === "dark"
                        ? "bg-gray-700 text-white"
                        : "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-700 dark:text-gray-400"
                  }`}
                >
                  中文
                </button>
              </div>
              <div className="flex flex-wrap justify-end gap-1 max-w-[220px]">
                {QUOTE_SOURCE_TAGS.map((tag: QuoteSourceTag) => {
                  const on = quoteTags.includes(tag);
                  const label =
                    locale === "zh"
                      ? tag === "books"
                        ? "文学"
                        : tag === "anime"
                          ? "动画"
                          : "游戏"
                      : tag === "books"
                        ? "Books"
                        : tag === "anime"
                          ? "Anime"
                          : "Games";
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleQuoteTag(tag);
                      }}
                      className={`rounded-md px-2 py-0.5 text-[10px] font-semibold border transition-colors ${
                        on
                          ? theme === "dark"
                            ? "border-violet-500/80 bg-violet-950/50 text-violet-200"
                            : "border-violet-400 bg-violet-100 text-violet-900"
                          : theme === "dark"
                            ? "border-gray-600 text-gray-500 hover:border-gray-500"
                            : "border-gray-300 text-gray-500 hover:border-gray-400"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-2">
                <motion.div whileHover={{ scale: 1.2, rotate: 15 }} whileTap={{ scale: 0.9 }}>
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleFavorite();
                    }}
                    variant="ghost"
                    size="sm"
                    disabled={quoteLoading || !quote.text.trim()}
                    className={isFavorite ? "text-yellow-500" : `${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}
                  >
                    <Star className={`size-5 ${isFavorite ? "fill-yellow-500" : ""}`} />
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.2, rotate: -15 }} whileTap={{ scale: 0.9 }}>
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      void refreshQuote();
                    }}
                    variant="ghost"
                    size="sm"
                    disabled={quoteLoading}
                    className={`text-${currentTheme.accentColor}-600`}
                  >
                    <Sparkles className="size-4" />
                  </Button>
                </motion.div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Main Content: Check-In & Priority Items */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Check-In Card */}
          <Link to="/checkin">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3, type: "spring" }}
              whileHover={{ scale: 1.05, y: -10 }}
              whileTap={{ scale: 0.95 }}
              className={`${
                hasCheckedIn
                  ? theme === "dark"
                    ? "bg-gray-800 border-gray-700"
                    : "bg-gradient-to-br from-green-50 to-emerald-50 border-green-300"
                  : "bg-gradient-to-br from-red-50 to-pink-50 border-red-300 animate-pulse"
              } border-2 rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all cursor-pointer h-full`}
            >
              <div className="text-center">
                <motion.div
                  className={`size-20 bg-gradient-to-br ${
                    hasCheckedIn ? "from-green-500 to-emerald-500" : "from-red-500 to-pink-500"
                  } rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg`}
                  animate={{
                    scale: hasCheckedIn ? 1 : [1, 1.1, 1],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: hasCheckedIn ? 0 : Infinity,
                  }}
                >
                  {hasCheckedIn ? (
                    <CheckCircle2 className="size-10 text-white" />
                  ) : (
                    <Heart className="size-10 text-white" />
                  )}
                </motion.div>
                <h3 className={`text-xl font-bold ${theme === "dark" ? "text-white" : "text-gray-900"} mb-2`}>
                  {hasCheckedIn ? "Checked In!" : "Daily Check-In"}
                </h3>
                <p className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-600"} mb-4`}>
                  {hasCheckedIn
                    ? "Great job keeping the streak!"
                    : "Complete your wellness checklist"}
                </p>
                {checkInStreak > 0 && (
                  <div className="flex items-center justify-center gap-2">
                    <Flame className="size-5 text-orange-500" />
                    <span className="text-lg font-bold text-orange-600">
                      {checkInStreak} Day Streak!
                    </span>
                  </div>
                )}
                {!hasCheckedIn && (
                  <div className="mt-4">
                    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${
                      theme === "dark" 
                        ? "bg-red-900/30 text-red-400" 
                        : "bg-red-100 text-red-700"
                    } font-semibold text-sm`}>
                      <span className="relative flex size-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full size-3 bg-red-500"></span>
                      </span>
                      Action Required
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </Link>

          {/* Today's Priority Items */}
          <motion.div
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="lg:col-span-2"
          >
            <Card className={`${
              theme === "dark" 
                ? "bg-gray-800 border-gray-700" 
                : "bg-white border-gray-200"
            } border-2 shadow-lg hover:shadow-2xl transition-all h-full`}>
              <CardHeader>
                <CardTitle className={`flex items-center gap-2 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                  <Trophy className={`size-6 text-${currentTheme.accentColor}-500`} />
                  Today's Priorities
                </CardTitle>
              </CardHeader>
              <CardContent>
                {priorityItems.length === 0 ? (
                  <div className="text-center py-12">
                    <Sparkles className={`size-16 ${theme === "dark" ? "text-gray-600" : "text-gray-300"} mx-auto mb-4`} />
                    <p className={`${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                      No priorities for today!
                    </p>
                    <p className={`text-sm ${theme === "dark" ? "text-gray-500" : "text-gray-500"} mt-1`}>
                      Time to relax or plan ahead
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {priorityItems.map((item, index) => {
                      const colorClasses = {
                        red: `bg-red-100 text-red-700 border-red-200 ${theme === "dark" && "bg-red-900/30 text-red-400 border-red-800"}`,
                        yellow: `bg-yellow-100 text-yellow-700 border-yellow-200 ${theme === "dark" && "bg-yellow-900/30 text-yellow-400 border-yellow-800"}`,
                        green: `bg-green-100 text-green-700 border-green-200 ${theme === "dark" && "bg-green-900/30 text-green-400 border-green-800"}`,
                        blue: `bg-blue-100 text-blue-700 border-blue-200 ${theme === "dark" && "bg-blue-900/30 text-blue-400 border-blue-800"}`,
                        orange: `bg-orange-100 text-orange-700 border-orange-200 ${theme === "dark" && "bg-orange-900/30 text-orange-400 border-orange-800"}`,
                      };

                      const icons = {
                        task: CheckSquare,
                        event: Calendar,
                        class: Calendar,
                      };

                      const ItemIcon = icons[item.type];

                      return (
                        <motion.div
                          key={index}
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ delay: 0.4 + index * 0.05, type: "spring" }}
                          whileHover={{ scale: 1.05, y: -5 }}
                          className={`${colorClasses[item.color as keyof typeof colorClasses]} border-2 rounded-xl p-4 shadow-md hover:shadow-lg transition-all`}
                        >
                          <div className="flex items-start gap-3">
                            <ItemIcon className="size-5 flex-shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm mb-1 truncate">
                                {item.title}
                              </p>
                              <p className="text-xs opacity-80 mb-2">
                                {item.subtitle}
                              </p>
                              {item.time && (
                                <div className="flex items-center gap-1 text-xs">
                                  <Clock className="size-3" />
                                  {item.time}
                                </div>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Quick Actions */}
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex flex-wrap gap-3 justify-center"
        >
          {[
            { label: "View All Tasks", link: "/tasks", icon: CheckSquare },
            { label: "Start Focus Timer", link: "/focus", icon: Timer },
            { label: "Check Timetable", link: "/timetable", icon: Calendar },
            { label: "Take a Break", link: "/minigame", icon: Sparkles },
          ].map((action, index) => {
            const Icon = action.icon;
            return (
              <Link key={action.label} to={action.link}>
                <motion.div
                  whileHover={{ scale: 1.1, y: -5 }}
                  whileTap={{ scale: 0.95 }}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.5 + index * 0.05, type: "spring" }}
                >
                  <Button
                    variant="outline"
                    className={`${
                      theme === "dark"
                        ? "bg-gray-800 border-gray-700 text-gray-200 hover:bg-gray-700"
                        : "bg-white border-gray-300 hover:bg-gray-50"
                    } shadow-md hover:shadow-xl transition-all`}
                  >
                    <Icon className="size-4 mr-2" />
                    {action.label}
                  </Button>
                </motion.div>
              </Link>
            );
          })}
        </motion.div>
      </div>

      {/* Favorites Dialog */}
      <Dialog open={favoritesDialogOpen} onOpenChange={setFavoritesDialogOpen}>
        <DialogContent className={`max-w-2xl max-h-[80vh] overflow-y-auto ${
          theme === "dark" ? "bg-gray-800 text-white" : "bg-white"
        }`}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Star className="size-6 text-yellow-500 fill-yellow-500" />
              Favorite Quotes ({favoriteQuotes.length})
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-4">
            {favoriteQuotes.length === 0 ? (
              <div className="text-center py-12">
                <Star className={`size-16 ${theme === "dark" ? "text-gray-600" : "text-gray-300"} mx-auto mb-4`} />
                <p className={`${theme === "dark" ? "text-gray-400" : "text-gray-600"} mb-2`}>
                  No favorite quotes yet
                </p>
                <p className={`text-sm ${theme === "dark" ? "text-gray-500" : "text-gray-500"}`}>
                  Click the star icon on any quote to save it here!
                </p>
              </div>
            ) : (
              favoriteQuotes.map((fav, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  whileHover={{ scale: 1.02, x: 5 }}
                  className={`p-4 ${
                    theme === "dark"
                      ? "bg-gray-700 border-gray-600"
                      : `bg-gradient-to-br ${currentTheme.cardGradient} border-${currentTheme.accentColor}-200`
                  } rounded-xl border-2 hover:shadow-lg transition-all cursor-pointer group`}
                  onClick={() => handleSelectFavoriteQuote(fav)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className={`text-base italic ${theme === "dark" ? "text-gray-200" : "text-gray-800"} mb-2`}>
                        "{fav.text}"
                      </p>
                      <p className={`text-sm font-semibold text-${currentTheme.accentColor}-600`}>
                        — {fav.author}
                      </p>
                    </div>
                    <motion.div whileHover={{ scale: 1.3, rotate: 90 }}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveFavorite(fav);
                        }}
                        className="text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="size-4" />
                      </Button>
                    </motion.div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
