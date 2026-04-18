import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import {
  Calendar,
  TrendingUp,
  Clock,
  CheckCircle2,
  DollarSign,
  Heart,
  Dumbbell,
  Moon,
  Brain,
  Scale,
  Circle,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Repeat2,
} from "lucide-react";
import {
  getFocusSessions,
  getFinanceEntries,
  getExerciseEntries,
  getSleepEntries,
  getMeditationEntries,
  getWeightEntries,
  getWellnessChecklistStatusForDate,
  isWellnessChecklistCompleteForDate,
  getCheckInTrackingStartYmd,
  getStudyPlans,
  FocusSession,
  FinanceEntry,
  ExerciseEntry,
  SleepEntry,
  MeditationEntry,
  WeightEntry,
  type StudyPlan,
} from "../lib/storage";

type TimePeriod = "daily" | "weekly" | "monthly" | "yearly" | "total";

const COLORS = ["#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#3b82f6", "#ef4444"];

function toYmdLocal(d: Date): string {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
}

function parseYmdLocal(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d);
}

type WellnessDetailRow = {
  day: Date;
  label: string;
  checklist: ReturnType<typeof getWellnessChecklistStatusForDate>;
  complete: boolean;
  exercises: ExerciseEntry[];
  sleeps: SleepEntry[];
  meditations: MeditationEntry[];
  weights: WeightEntry[];
  finance: FinanceEntry[];
};

type DayCellTheme = "green" | "red" | "amber" | "neutral";

function sameCalendarDay(isoOrDate: string, day: Date): boolean {
  return new Date(isoOrDate).toDateString() === day.toDateString();
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

function buildWellnessDetailRow(d0: Date): WellnessDetailRow {
  const exercises = getExerciseEntries();
  const sleeps = getSleepEntries();
  const meditations = getMeditationEntries();
  const weights = getWeightEntries();
  const finances = getFinanceEntries();

  const checklist = getWellnessChecklistStatusForDate(d0);
  const exercisesDay = exercises.filter((e) => sameCalendarDay(e.date, d0));
  const sleepsDay = sleeps.filter((e) => sameCalendarDay(e.date, d0));
  const meditationsDay = meditations.filter(
    (e) => sameCalendarDay(e.date, d0) && e.duration >= 0.5
  );
  const weightsDay = weights.filter((e) => sameCalendarDay(e.date, d0));
  const financeDay = finances.filter((e) => financeEntryOnCalendarDay(e, d0));
  const label = d0.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    ...(d0.getFullYear() !== new Date().getFullYear() ? { year: "numeric" as const } : {}),
  });
  const complete =
    checklist.exercise &&
    checklist.finance &&
    checklist.sleep &&
    checklist.meditation &&
    checklist.weight;
  return {
    day: d0,
    label,
    checklist,
    complete,
    exercises: exercisesDay,
    sleeps: sleepsDay,
    meditations: meditationsDay,
    weights: weightsDay,
    finance: financeDay,
  };
}

function dayCellTheme(ymd: string, trackingStartYmd: string, todayYmd: string): DayCellTheme {
  if (ymd < trackingStartYmd || ymd > todayYmd) return "neutral";
  const d = parseYmdLocal(ymd);
  if (isWellnessChecklistCompleteForDate(d)) return "green";
  if (ymd < todayYmd) return "red";
  return "amber";
}

/** Every calendar month from tracking start through `endYmd`'s month (inclusive). */
function eachMonthInRange(trackingStartYmd: string, endYmd: string): { y: number; m: number; label: string; value: string }[] {
  const [sy, sm] = trackingStartYmd.split("-").map(Number);
  const [ey, em] = endYmd.split("-").map(Number);
  const end = new Date(ey, em - 1, 1);
  const out: { y: number; m: number; label: string; value: string }[] = [];
  const cur = new Date(sy, sm - 1, 1);
  while (cur <= end) {
    const y = cur.getFullYear();
    const m = cur.getMonth();
    out.push({
      y,
      m,
      label: cur.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
      value: `${y}-${String(m + 1).padStart(2, "0")}`,
    });
    cur.setMonth(cur.getMonth() + 1);
  }
  return out;
}

export function Analytics() {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("weekly");
  const [focusSessions, setFocusSessions] = useState<FocusSession[]>([]);
  const [financeEntries, setFinanceEntries] = useState<FinanceEntry[]>([]);
  const [studyPlans, setStudyPlans] = useState<StudyPlan[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  function loadData() {
    setFocusSessions(getFocusSessions());
    setFinanceEntries(getFinanceEntries());
    setStudyPlans(getStudyPlans());
  }

  // Helper function to get date range based on period
  function getDateRange(period: TimePeriod): { start: Date; end: Date } {
    const end = new Date();
    const start = new Date();

    switch (period) {
      case "daily":
        start.setHours(0, 0, 0, 0);
        break;
      case "weekly":
        start.setDate(start.getDate() - 7);
        break;
      case "monthly":
        start.setMonth(start.getMonth() - 1);
        break;
      case "yearly":
        start.setFullYear(start.getFullYear() - 1);
        break;
      case "total":
        start.setFullYear(2000); // Far past date
        break;
    }

    return { start, end };
  }

  // Helper to format dates for grouping
  function getDateKey(date: Date, period: TimePeriod): string {
    switch (period) {
      case "daily":
        return date.toLocaleTimeString([], { hour: "2-digit" });
      case "weekly":
        return date.toLocaleDateString("en-US", { weekday: "short" });
      case "monthly":
        return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      case "yearly":
        return date.toLocaleDateString("en-US", { month: "short" });
      case "total":
        return date.toLocaleDateString("en-US", { year: "numeric", month: "short" });
      default:
        return date.toLocaleDateString();
    }
  }

  // Process Pomodoro data
  function getPomodoroData() {
    const { start, end } = getDateRange(timePeriod);
    const filtered = focusSessions.filter(s => {
      const date = new Date(s.date);
      return date >= start && date <= end;
    });

    const completedSessions = filtered.filter((s) => s.completed);
    const incompleteSessions = filtered.filter((s) => !s.completed);

    if (timePeriod === "total") {
      const totalMinutes = completedSessions.reduce((sum, s) => sum + s.duration, 0);
      const totalSessions = filtered.length;
      return {
        chart: [{
          name: "Total",
          minutes: totalMinutes,
          sessions: totalSessions,
          completedSessions: completedSessions.length,
          incompleteSessions: incompleteSessions.length,
        }],
        total: {
          minutes: totalMinutes,
          sessions: totalSessions,
          completedSessions: completedSessions.length,
          incompleteSessions: incompleteSessions.length,
        },
      };
    }

    const grouped: Record<string, { minutes: number; sessions: number; completedSessions: number; incompleteSessions: number }> = {};
    filtered.forEach(session => {
      const key = getDateKey(new Date(session.date), timePeriod);
      if (!grouped[key]) {
        grouped[key] = { minutes: 0, sessions: 0, completedSessions: 0, incompleteSessions: 0 };
      }
      grouped[key].sessions += 1;
      if (session.completed) {
        grouped[key].minutes += session.duration;
        grouped[key].completedSessions += 1;
      } else {
        grouped[key].incompleteSessions += 1;
      }
    });

    const chart = Object.entries(grouped).map(([name, data]) => ({
      name,
      minutes: data.minutes,
      sessions: data.sessions,
      completedSessions: data.completedSessions,
      incompleteSessions: data.incompleteSessions,
    }));

    const totalMinutes = completedSessions.reduce((sum, s) => sum + s.duration, 0);
    const totalSessions = filtered.length;

    return {
      chart,
      total: {
        minutes: totalMinutes,
        sessions: totalSessions,
        completedSessions: completedSessions.length,
        incompleteSessions: incompleteSessions.length,
      },
    };
  }

  // Process Finance data
  function getFinanceData() {
    const { start, end } = getDateRange(timePeriod);
    const filtered = financeEntries.filter(e => {
      const date = new Date(e.date);
      return date >= start && date <= end;
    });

    const totalIncome = filtered.filter(e => e.type === "income").reduce((sum, e) => sum + e.amount, 0);
    const totalExpenses = filtered.filter(e => e.type === "expense").reduce((sum, e) => sum + e.amount, 0);

    // Category breakdown
    const categoryData: Record<string, number> = {};
    filtered
      .filter(e => e.type === "expense")
      .forEach(e => {
        categoryData[e.category] = (categoryData[e.category] || 0) + e.amount;
      });

    const pieData = Object.entries(categoryData).map(([name, value]) => ({
      name,
      value: parseFloat(value.toFixed(2)),
    }));

    if (timePeriod === "total") {
      return {
        chart: [
          { name: "Income", amount: totalIncome },
          { name: "Expenses", amount: totalExpenses },
        ],
        pieData,
        total: { income: totalIncome, expenses: totalExpenses, balance: totalIncome - totalExpenses },
      };
    }

    const grouped: Record<string, { income: number; expenses: number }> = {};
    filtered.forEach(entry => {
      const key = getDateKey(new Date(entry.date), timePeriod);
      if (!grouped[key]) {
        grouped[key] = { income: 0, expenses: 0 };
      }
      if (entry.type === "income") {
        grouped[key].income += entry.amount;
      } else {
        grouped[key].expenses += entry.amount;
      }
    });

    const chart = Object.entries(grouped).map(([name, data]) => ({
      name,
      income: parseFloat(data.income.toFixed(2)),
      expenses: parseFloat(data.expenses.toFixed(2)),
    }));

    return {
      chart,
      pieData,
      total: { income: totalIncome, expenses: totalExpenses, balance: totalIncome - totalExpenses },
    };
  }

  function getStudyPlanAnalytics() {
    const { start, end } = getDateRange(timePeriod);
    const sessions = focusSessions.filter((s) => {
      if (!s.completed || !s.studyPlanId) return false;
      const d = new Date(s.date);
      return d >= start && d <= end;
    });
    const byPlan: Record<string, { minutes: number; sessions: number; label: string }> = {};
    sessions.forEach((s) => {
      const key = s.studyPlanId!;
      const label = s.studyPlanName?.trim() || key;
      if (!byPlan[key]) byPlan[key] = { minutes: 0, sessions: 0, label };
      byPlan[key].minutes += s.duration;
      byPlan[key].sessions += 1;
    });
    const focusChart = Object.values(byPlan).map((v) => ({
      name: v.label.length > 28 ? `${v.label.slice(0, 26)}…` : v.label,
      minutes: v.minutes,
      sessions: v.sessions,
    }));

    const planRows = studyPlans.map((p) => {
      const total = p.parts.length;
      const done = p.parts.filter((x) => x.completed).length;
      return {
        id: p.id,
        name: p.name,
        done,
        total,
        pct: total > 0 ? Math.round((done / total) * 100) : 0,
      };
    });

    const totalParts = studyPlans.reduce((s, p) => s + p.parts.length, 0);
    const doneParts = studyPlans.reduce(
      (s, p) => s + p.parts.filter((x) => x.completed).length,
      0
    );

    return {
      focusChart,
      planRows,
      totalPlans: studyPlans.length,
      totalParts,
      doneParts,
      overallPct: totalParts > 0 ? Math.round((doneParts / totalParts) * 100) : 0,
      focusMinutes: sessions.reduce((s, x) => s + x.duration, 0),
    };
  }

  const pomodoroData = getPomodoroData();
  const financeData = getFinanceData();
  const studyAnalytics = getStudyPlanAnalytics();

  const trackingStartYmd = useMemo(() => getCheckInTrackingStartYmd(), []);
  const todayYmd = toYmdLocal(new Date());

  const [checkinCalYM, setCheckinCalYM] = useState(() => {
    const t = new Date();
    return { y: t.getFullYear(), m: t.getMonth() };
  });
  const [selectedCheckinYmd, setSelectedCheckinYmd] = useState(() => toYmdLocal(new Date()));

  const completedCheckinYmds: string[] = (() => {
    const out: string[] = [];
    const today = parseYmdLocal(todayYmd);
    const start = parseYmdLocal(trackingStartYmd);
    const d = new Date(today);
    while (d.getTime() >= start.getTime()) {
      if (isWellnessChecklistCompleteForDate(d)) {
        out.push(toYmdLocal(d));
      }
      d.setDate(d.getDate() - 1);
    }
    return out;
  })();

  const effectiveSelectedYmd =
    selectedCheckinYmd >= trackingStartYmd && selectedCheckinYmd <= todayYmd
      ? selectedCheckinYmd
      : todayYmd;
  const selectedRow = buildWellnessDetailRow(parseYmdLocal(effectiveSelectedYmd));

  /** Week starts Monday (column 1 = Mon). */
  function monthGridCells(year: number, month: number) {
    const first = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0).getDate();
    const startPad = (first.getDay() + 6) % 7;
    const cells: { ymd: string | null; dayNum: number | null }[] = [];
    for (let i = 0; i < startPad; i++) {
      cells.push({ ymd: null, dayNum: null });
    }
    for (let day = 1; day <= lastDay; day++) {
      const ymd = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      cells.push({ ymd, dayNum: day });
    }
    return cells;
  }

  function cellClass(theme: DayCellTheme, isSelected: boolean) {
    const ring = isSelected ? " ring-1 ring-offset-1 ring-emerald-600 z-[1]" : "";
    switch (theme) {
      case "green":
        return `bg-emerald-500 text-white font-semibold hover:bg-emerald-600${ring}`;
      case "red":
        return `bg-red-500 text-white font-semibold hover:bg-red-600${ring}`;
      case "amber":
        return `bg-amber-400 text-amber-950 font-semibold hover:bg-amber-500${ring}`;
      default:
        return `bg-gray-100 text-gray-400${isSelected ? " ring-1 ring-offset-1 ring-gray-500" : ""}`;
    }
  }

  const checkinMonthCells = monthGridCells(checkinCalYM.y, checkinCalYM.m);
  const checkinMonthJumpOptions = useMemo(
    () => eachMonthInRange(trackingStartYmd, todayYmd),
    [trackingStartYmd, todayYmd]
  );
  const checkinMonthSelectValue = `${checkinCalYM.y}-${String(checkinCalYM.m + 1).padStart(2, "0")}`;
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  return (
    <div className="w-full min-w-0 max-w-full space-y-6 px-4 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:px-5 sm:py-6 md:px-6 md:py-8 md:pb-8 lg:px-8">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between min-w-0">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">
            Visualize your productivity and spending patterns
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0 w-full lg:w-auto">
          <Select value={timePeriod} onValueChange={(v) => setTimePeriod(v as TimePeriod)}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Today</SelectItem>
              <SelectItem value="weekly">Last 7 Days</SelectItem>
              <SelectItem value="monthly">Last Month</SelectItem>
              <SelectItem value="yearly">Last Year</SelectItem>
              <SelectItem value="total">All Time</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        <Card>
          <CardContent className="px-2.5 pt-4 pb-4 sm:px-6 sm:pt-6 sm:pb-6">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="size-9 sm:size-12 shrink-0 bg-purple-100 rounded-full flex items-center justify-center">
                <Clock className="size-4 sm:size-6 text-purple-600" />
              </div>
              <div className="min-w-0">
                <div className="text-lg sm:text-2xl font-semibold text-gray-900 tabular-nums">
                  {pomodoroData.total.minutes}m
                </div>
                <p className="text-[10px] sm:text-sm text-gray-600 leading-tight">Focus</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="px-2.5 pt-4 pb-4 sm:px-6 sm:pt-6 sm:pb-6">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="size-9 sm:size-12 shrink-0 bg-blue-100 rounded-full flex items-center justify-center">
                <TrendingUp className="size-4 sm:size-6 text-blue-600" />
              </div>
              <div className="min-w-0">
                <div className="text-lg sm:text-2xl font-semibold text-gray-900 tabular-nums">
                  {pomodoroData.total.sessions}
                </div>
                <p className="text-[10px] sm:text-sm text-gray-600 leading-tight">Sessions</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="px-2.5 pt-4 pb-4 sm:px-6 sm:pt-6 sm:pb-6">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="size-9 sm:size-12 shrink-0 bg-red-100 rounded-full flex items-center justify-center">
                <DollarSign className="size-4 sm:size-6 text-red-600" />
              </div>
              <div className="min-w-0">
                <div className="text-lg sm:text-2xl font-semibold text-gray-900 tabular-nums truncate">
                  ${financeData.total.expenses.toFixed(0)}
                </div>
                <p className="text-[10px] sm:text-sm text-gray-600 leading-tight">Spend</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="pomodoro" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-1 h-auto p-1">
          <TabsTrigger value="pomodoro" className="text-xs sm:text-sm">
            <Clock className="size-4 sm:mr-2 shrink-0" />
            <span className="truncate">Pomodoro</span>
          </TabsTrigger>
          <TabsTrigger value="finance" className="text-xs sm:text-sm">
            <DollarSign className="size-4 sm:mr-2 shrink-0" />
            <span className="truncate">Finance</span>
          </TabsTrigger>
          <TabsTrigger value="study" className="text-xs sm:text-sm">
            <BookOpen className="size-4 sm:mr-2 shrink-0" />
            <span className="truncate">Study</span>
          </TabsTrigger>
          <TabsTrigger value="checkin" className="text-xs sm:text-sm">
            <Heart className="size-4 sm:mr-2 shrink-0" />
            <span className="truncate">Check-in</span>
          </TabsTrigger>
        </TabsList>

        {/* Pomodoro Tab */}
        <TabsContent value="pomodoro" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Focus Time Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              {pomodoroData.chart.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={pomodoroData.chart}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="minutes" fill="#8b5cf6" name="Minutes" />
                    <Bar dataKey="completedSessions" fill="#10b981" name="Completed" />
                    <Bar dataKey="incompleteSessions" fill="#ef4444" name="Incomplete" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[350px] flex items-center justify-center text-gray-500">
                  No pomodoro data for this period
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Completed Focus Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-600">
                  {pomodoroData.total.minutes} minutes
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  Counts completed sessions only
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Session Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-pink-600">
                  {pomodoroData.total.completedSessions}/{pomodoroData.total.sessions}
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  Completed / Total (incomplete: {pomodoroData.total.incompleteSessions})
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Finance Tab */}
        <TabsContent value="finance" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <Card className="min-w-0 overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-base sm:text-lg">Income vs Expenses</CardTitle>
              </CardHeader>
              <CardContent className="px-2 sm:px-6">
                {financeData.chart.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={financeData.chart}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="income" fill="#10b981" name="Income" />
                      <Bar dataKey="expenses" fill="#ef4444" name="Expenses" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-gray-500">
                    No finance data for this period
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="min-w-0 overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-base sm:text-lg">Expense Categories</CardTitle>
              </CardHeader>
              <CardContent className="px-2 sm:px-6">
                {financeData.pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={financeData.pieData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={false}
                        outerRadius={72}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {financeData.pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => `$${v.toFixed(2)}`} />
                      <Legend
                        wrapperStyle={{ fontSize: "11px" }}
                        className="[&_li]:!mr-2"
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[280px] flex items-center justify-center text-gray-500 text-sm">
                    No expenses for this period
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <Card>
              <CardHeader className="pb-2 pt-4 sm:pt-6">
                <CardTitle className="text-xs sm:text-sm">Total Income</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 pb-4 sm:pb-6">
                <div className="text-xl sm:text-3xl font-bold text-green-600 break-all tabular-nums">
                  ${financeData.total.income.toFixed(2)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2 pt-4 sm:pt-6">
                <CardTitle className="text-xs sm:text-sm">Total Expenses</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 pb-4 sm:pb-6">
                <div className="text-xl sm:text-3xl font-bold text-red-600 break-all tabular-nums">
                  ${financeData.total.expenses.toFixed(2)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2 pt-4 sm:pt-6">
                <CardTitle className="text-xs sm:text-sm">Balance</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 pb-4 sm:pb-6">
                <div
                  className={`text-xl sm:text-3xl font-bold break-all tabular-nums ${
                    financeData.total.balance >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  ${financeData.total.balance.toFixed(2)}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="study" className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Card>
              <CardContent className="pt-4 pb-4 px-4">
                <p className="text-xs text-gray-500">Plans</p>
                <p className="text-2xl font-semibold text-indigo-600 tabular-nums">{studyAnalytics.totalPlans}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4 px-4">
                <p className="text-xs text-gray-500">Parts done</p>
                <p className="text-2xl font-semibold text-gray-900 tabular-nums">
                  {studyAnalytics.doneParts}/{studyAnalytics.totalParts || "0"}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4 px-4">
                <p className="text-xs text-gray-500">Completion</p>
                <p className="text-2xl font-semibold text-emerald-600 tabular-nums">{studyAnalytics.overallPct}%</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4 px-4">
                <p className="text-xs text-gray-500">Focus (linked)</p>
                <p className="text-2xl font-semibold text-violet-600 tabular-nums">{studyAnalytics.focusMinutes}m</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Progress by plan</CardTitle>
              <p className="text-sm text-gray-600 font-normal">
                Share of parts marked complete (current state). Use Study plans to update.
              </p>
            </CardHeader>
            <CardContent>
              {studyAnalytics.planRows.length === 0 ? (
                <p className="text-sm text-gray-500 py-8 text-center">No study plans yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height={Math.min(360, 40 + studyAnalytics.planRows.length * 36)}>
                  <BarChart
                    data={studyAnalytics.planRows.map((r) => ({
                      name: r.name.length > 24 ? `${r.name.slice(0, 22)}…` : r.name,
                      pct: r.pct,
                    }))}
                    layout="vertical"
                    margin={{ left: 8, right: 16 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                    <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: number) => [`${v}%`, "Parts done"]} />
                    <Bar dataKey="pct" fill="#6366f1" name="Completion %" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Focus time by study plan</CardTitle>
              <p className="text-sm text-gray-600 font-normal">
                Pomodoro sessions in this period where you picked a study plan (and optional part).
              </p>
            </CardHeader>
            <CardContent>
              {studyAnalytics.focusChart.length === 0 ? (
                <p className="text-sm text-gray-500 py-8 text-center">
                  No linked focus sessions in this period.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={studyAnalytics.focusChart}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-25} textAnchor="end" height={70} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="minutes" fill="#8b5cf6" name="Minutes" />
                    <Bar dataKey="sessions" fill="#a78bfa" name="Sessions" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="checkin" className="min-w-0">
          <div className="grid w-full min-w-0 max-w-none grid-cols-1 overflow-hidden rounded-2xl border border-gray-200/90 bg-white shadow-sm lg:grid-cols-[minmax(17rem,34%)_minmax(0,1fr)]">
            <div className="border-b border-gray-100 bg-gradient-to-b from-rose-50/50 to-white p-5 sm:p-6 lg:border-b-0 lg:border-r lg:border-gray-100 lg:p-7 xl:p-8">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
                  <Heart className="size-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg font-semibold leading-tight text-gray-900 sm:text-xl">Wellness calendar</h3>
                  <p className="text-sm leading-snug text-gray-500">
                    Since {trackingStartYmd} · week starts Monday
                  </p>
                </div>
              </div>
              <div className="mb-4 flex flex-wrap gap-x-4 gap-y-2 text-sm text-gray-600">
                <span className="inline-flex items-center gap-2">
                  <span className="size-2.5 shrink-0 rounded-sm bg-emerald-500" />
                  Complete
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="size-2.5 shrink-0 rounded-sm bg-red-500" />
                  Missed
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="size-2.5 shrink-0 rounded-sm bg-amber-400" />
                  Today
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="size-2.5 shrink-0 rounded-sm bg-gray-200 ring-1 ring-gray-300/80" />
                  Out of range
                </span>
              </div>

              <div className="mb-4 flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-0.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="size-10 shrink-0"
                    aria-label="Previous month"
                    onClick={() =>
                      setCheckinCalYM((p) => (p.m === 0 ? { y: p.y - 1, m: 11 } : { y: p.y, m: p.m - 1 }))
                    }
                  >
                    <ChevronLeft className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="size-10 shrink-0"
                    aria-label="Next month"
                    onClick={() =>
                      setCheckinCalYM((p) => (p.m === 11 ? { y: p.y + 1, m: 0 } : { y: p.y, m: p.m + 1 }))
                    }
                  >
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
                <Select
                  value={checkinMonthSelectValue}
                  onValueChange={(v) => {
                    const [yy, mm] = v.split("-").map(Number);
                    setCheckinCalYM({ y: yy, m: mm - 1 });
                  }}
                >
                  <SelectTrigger className="h-10 min-w-[10rem] flex-1 text-sm sm:min-w-[12rem]">
                    <SelectValue placeholder="Month" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {checkinMonthJumpOptions.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="secondary"
                  className="h-10 shrink-0 px-4 text-sm"
                  onClick={() => {
                    const [y, m] = todayYmd.split("-").map(Number);
                    setCheckinCalYM({ y, m: m - 1 });
                    setSelectedCheckinYmd(todayYmd);
                  }}
                >
                  Today
                </Button>
              </div>

              <p className="mb-2 text-center text-sm font-semibold text-gray-800 sm:text-base">
                {monthNames[checkinCalYM.m]} {checkinCalYM.y}
              </p>
              <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                {(["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"] as const).map((d, wi) => (
                  <div
                    key={`w-${wi}`}
                    className="pb-1 text-center text-xs font-medium uppercase tracking-wide text-gray-500"
                  >
                    {d}
                  </div>
                ))}
                {checkinMonthCells.map((cell, idx) => {
                  if (cell.ymd == null || cell.dayNum == null) {
                    return <div key={`pad-${idx}`} className="h-10 sm:h-11" aria-hidden />;
                  }
                  const theme = dayCellTheme(cell.ymd, trackingStartYmd, todayYmd);
                  const selectable = cell.ymd >= trackingStartYmd && cell.ymd <= todayYmd;
                  return (
                    <button
                      key={cell.ymd}
                      type="button"
                      disabled={!selectable}
                      onClick={() => selectable && setSelectedCheckinYmd(cell.ymd!)}
                      className={`h-10 w-full rounded-lg text-sm font-medium transition-colors active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-35 sm:h-11 sm:text-base ${cellClass(
                        theme,
                        cell.ymd === effectiveSelectedYmd
                      )}`}
                    >
                      {cell.dayNum}
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 space-y-1.5">
                <Label htmlFor="checkin-date-pick" className="text-sm text-gray-500">
                  Pick a date
                </Label>
                <Input
                  id="checkin-date-pick"
                  type="date"
                  className="h-10 w-full text-sm sm:h-11 sm:text-base"
                  min={trackingStartYmd}
                  max={todayYmd}
                  value={effectiveSelectedYmd}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v && v >= trackingStartYmd && v <= todayYmd) {
                      setSelectedCheckinYmd(v);
                      const [yy, mm] = v.split("-").map(Number);
                      setCheckinCalYM({ y: yy, m: mm - 1 });
                    }
                  }}
                />
              </div>

              {completedCheckinYmds.length > 0 && (
                <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50/90 px-3 py-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Recent complete</p>
                  <div className="flex max-h-28 flex-wrap gap-2 overflow-y-auto">
                    {completedCheckinYmds.slice(0, 12).map((ymd) => (
                      <button
                        key={ymd}
                        type="button"
                        className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors sm:text-sm ${
                          ymd === effectiveSelectedYmd
                            ? "border-emerald-600 bg-emerald-50 text-emerald-900"
                            : "border-gray-200 bg-white text-gray-700 hover:border-emerald-300"
                        }`}
                        onClick={() => {
                          setSelectedCheckinYmd(ymd);
                          const [yy, mm] = ymd.split("-").map(Number);
                          setCheckinCalYM({ y: yy, m: mm - 1 });
                        }}
                      >
                        {ymd}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="min-w-0 p-5 sm:p-6 lg:p-7 xl:p-8">
              <div className="mb-5 flex flex-wrap items-center gap-3 border-b border-gray-100 pb-4">
                <Calendar className="size-5 shrink-0 text-emerald-600 sm:size-6" />
                <h3 className="text-lg font-semibold text-gray-900 sm:text-xl">{selectedRow.label}</h3>
                {selectedRow.complete ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
                    <CheckCircle2 className="size-4" />
                    Full check-in
                  </span>
                ) : (
                  <span className="text-sm text-gray-500">Incomplete</span>
                )}
              </div>

              <div className="mb-5 flex flex-wrap gap-x-4 gap-y-2 text-sm text-gray-600">
                {(
                  [
                    ["Exercise", selectedRow.checklist.exercise],
                    ["Finance", selectedRow.checklist.finance],
                    ["Sleep", selectedRow.checklist.sleep],
                    ["Meditation", selectedRow.checklist.meditation],
                    ["Weight", selectedRow.checklist.weight],
                  ] as const
                ).map(([name, ok]) => (
                  <span key={name} className="inline-flex items-center gap-1.5">
                    {ok ? (
                      <CheckCircle2 className="size-4 text-green-600" />
                    ) : (
                      <Circle className="size-4 text-gray-300" />
                    )}
                    {name}
                  </span>
                ))}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700">
                    <Dumbbell className="size-4 text-emerald-600" />
                    Exercise
                  </p>
                  {selectedRow.exercises.length === 0 ? (
                    <p className="text-sm text-gray-400">No entries</p>
                  ) : (
                    <ul className="space-y-1.5 text-sm leading-relaxed text-gray-700">
                      {selectedRow.exercises.map((e: ExerciseEntry) => (
                        <li key={e.id}>
                          {e.type}
                          {e.duration != null ? ` · ${e.duration} min` : ""}
                          {` · ${e.times ?? 1} time${(e.times ?? 1) > 1 ? "s" : ""}`}
                          {e.notes ? ` — ${e.notes}` : ""}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700">
                    <Moon className="size-4 text-indigo-600" />
                    Sleep
                  </p>
                  {selectedRow.sleeps.length === 0 ? (
                    <p className="text-sm text-gray-400">No entries</p>
                  ) : (
                    <ul className="space-y-1.5 text-sm leading-relaxed text-gray-700">
                      {selectedRow.sleeps.map((s: SleepEntry) => (
                        <li key={s.id}>
                          Bed {s.bedTime}
                          {s.wakeTime != null && s.wakeTime !== "" ? ` → wake ${s.wakeTime}` : ""}
                          {s.duration != null ? ` · ${s.duration}h` : ""}
                          {s.quality != null ? ` · quality ${s.quality}/5` : ""}
                          {s.notes ? ` — ${s.notes}` : ""}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700">
                    <Brain className="size-4 text-purple-600" />
                    Meditation
                  </p>
                  {selectedRow.meditations.length === 0 ? (
                    <p className="text-sm text-gray-400">No entries</p>
                  ) : (
                    <ul className="space-y-1.5 text-sm leading-relaxed text-gray-700">
                      {selectedRow.meditations.map((m: MeditationEntry) => (
                        <li key={m.id}>
                          {m.duration} min · {m.type}
                          {m.notes ? ` — ${m.notes}` : ""}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700">
                    <Scale className="size-4 text-teal-600" />
                    Weight
                  </p>
                  {selectedRow.weights.length === 0 ? (
                    <p className="text-sm text-gray-400">No entries</p>
                  ) : (
                    <ul className="space-y-1.5 text-sm leading-relaxed text-gray-700">
                      {selectedRow.weights.map((w: WeightEntry) => (
                        <li key={w.id}>
                          {w.weight} {w.unit}
                          {w.notes ? ` — ${w.notes}` : ""}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="col-span-full rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700">
                    <DollarSign className="size-4 text-amber-600" />
                    Finance ({selectedRow.finance.length}{" "}
                    {selectedRow.finance.length === 1 ? "entry" : "entries"})
                  </p>
                  {selectedRow.finance.length === 0 ? (
                    <p className="text-sm text-gray-400">No entries</p>
                  ) : (
                    <ul className="max-h-40 space-y-1.5 overflow-y-auto text-sm leading-relaxed text-gray-700">
                      {selectedRow.finance.map((f: FinanceEntry) => (
                        <li key={f.id}>
                          <span className={f.type === "income" ? "text-green-700" : "text-red-700"}>
                            {f.type === "income" ? "+" : "-"}${f.amount.toFixed(2)}
                          </span>{" "}
                          · {f.category}
                          {f.description ? ` — ${f.description}` : ""}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}