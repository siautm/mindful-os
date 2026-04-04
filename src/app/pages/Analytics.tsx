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
} from "lucide-react";
import {
  getFocusSessions,
  getTasks,
  getFinanceEntries,
  getExerciseEntries,
  getSleepEntries,
  getMeditationEntries,
  getWeightEntries,
  getWellnessChecklistStatusForDate,
  isWellnessChecklistCompleteForDate,
  getCheckInTrackingStartYmd,
  FocusSession,
  Task,
  FinanceEntry,
  ExerciseEntry,
  SleepEntry,
  MeditationEntry,
  WeightEntry,
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

type MonthStripStatus = "green" | "red" | "amber" | "neutral";

function monthStripStatus(
  year: number,
  month: number,
  trackingStartYmd: string,
  todayYmd: string
): MonthStripStatus {
  const lastDay = new Date(year, month + 1, 0).getDate();
  let inRange = false;
  let missPast = false;
  let completeAny = false;

  for (let day = 1; day <= lastDay; day++) {
    const ymd = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    if (ymd < trackingStartYmd || ymd > todayYmd) continue;
    inRange = true;
    const d = parseYmdLocal(ymd);
    const complete = isWellnessChecklistCompleteForDate(d);
    if (complete) {
      completeAny = true;
      continue;
    }
    if (ymd < todayYmd) {
      missPast = true;
    }
  }

  if (!inRange) return "neutral";
  if (missPast) return "red";
  if (completeAny) return "green";
  return "amber";
}

export function Analytics() {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("weekly");
  const [focusSessions, setFocusSessions] = useState<FocusSession[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [financeEntries, setFinanceEntries] = useState<FinanceEntry[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  function loadData() {
    setFocusSessions(getFocusSessions());
    setTasks(getTasks());
    setFinanceEntries(getFinanceEntries());
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
      return s.completed && date >= start && date <= end;
    });

    if (timePeriod === "total") {
      const totalMinutes = filtered.reduce((sum, s) => sum + s.duration, 0);
      const totalSessions = filtered.length;
      return {
        chart: [{ name: "Total", minutes: totalMinutes, sessions: totalSessions }],
        total: { minutes: totalMinutes, sessions: totalSessions },
      };
    }

    const grouped: Record<string, { minutes: number; sessions: number }> = {};
    filtered.forEach(session => {
      const key = getDateKey(new Date(session.date), timePeriod);
      if (!grouped[key]) {
        grouped[key] = { minutes: 0, sessions: 0 };
      }
      grouped[key].minutes += session.duration;
      grouped[key].sessions += 1;
    });

    const chart = Object.entries(grouped).map(([name, data]) => ({
      name,
      minutes: data.minutes,
      sessions: data.sessions,
    }));

    const totalMinutes = filtered.reduce((sum, s) => sum + s.duration, 0);
    const totalSessions = filtered.length;

    return {
      chart,
      total: { minutes: totalMinutes, sessions: totalSessions },
    };
  }

  // Process Tasks data
  function getTasksData() {
    const { start, end } = getDateRange(timePeriod);
    const filtered = tasks.filter(t => {
      const date = new Date(t.createdAt);
      return t.completed && date >= start && date <= end;
    });

    if (timePeriod === "total") {
      const totalTasks = filtered.length;
      const avgPriority = filtered.length > 0
        ? filtered.reduce((sum, t) => sum + t.priority, 0) / filtered.length
        : 0;
      return {
        chart: [{ name: "Total", completed: totalTasks, avgPriority: avgPriority.toFixed(1) }],
        total: { tasks: totalTasks, avgPriority: avgPriority.toFixed(1) },
      };
    }

    const grouped: Record<string, { count: number; totalPriority: number }> = {};
    filtered.forEach(task => {
      const key = getDateKey(new Date(task.createdAt), timePeriod);
      if (!grouped[key]) {
        grouped[key] = { count: 0, totalPriority: 0 };
      }
      grouped[key].count += 1;
      grouped[key].totalPriority += task.priority;
    });

    const chart = Object.entries(grouped).map(([name, data]) => ({
      name,
      completed: data.count,
      avgPriority: (data.totalPriority / data.count).toFixed(1),
    }));

    const totalTasks = filtered.length;
    const avgPriority = totalTasks > 0
      ? (filtered.reduce((sum, t) => sum + t.priority, 0) / totalTasks).toFixed(1)
      : "0";

    return {
      chart,
      total: { tasks: totalTasks, avgPriority },
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

  const pomodoroData = getPomodoroData();
  const tasksData = getTasksData();
  const financeData = getFinanceData();

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

  function monthGridCells(year: number, month: number) {
    const first = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0).getDate();
    const startPad = first.getDay();
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
    const ring = isSelected ? " ring-2 ring-offset-1 ring-emerald-600 z-[1]" : "";
    switch (theme) {
      case "green":
        return `bg-emerald-500 text-white font-semibold hover:bg-emerald-600${ring}`;
      case "red":
        return `bg-red-500 text-white font-semibold hover:bg-red-600${ring}`;
      case "amber":
        return `bg-amber-400 text-amber-950 font-semibold hover:bg-amber-500${ring}`;
      default:
        return `bg-gray-100 text-gray-400${isSelected ? " ring-2 ring-offset-1 ring-gray-500" : ""}`;
    }
  }

  function monthStripButtonClass(s: MonthStripStatus, isCurrentMonth: boolean) {
    const base =
      "min-w-0 min-h-[2.25rem] sm:min-h-0 sm:flex-1 rounded-md px-0.5 py-1.5 sm:px-1 sm:py-2 text-[9px] sm:text-xs font-medium transition-colors border";
    const cur = isCurrentMonth ? " ring-2 ring-emerald-500 ring-offset-1" : "";
    switch (s) {
      case "green":
        return `${base} border-emerald-600 bg-emerald-500 text-white${cur}`;
      case "red":
        return `${base} border-red-600 bg-red-500 text-white${cur}`;
      case "amber":
        return `${base} border-amber-500 bg-amber-400 text-amber-950${cur}`;
      default:
        return `${base} border-gray-200 bg-gray-100 text-gray-500${cur}`;
    }
  }

  const checkinMonthCells = monthGridCells(checkinCalYM.y, checkinCalYM.m);
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  return (
    <div className="px-4 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-6 md:p-8 md:pb-8 space-y-6 w-full min-w-0 max-w-full">
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
              <div className="size-9 sm:size-12 shrink-0 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle2 className="size-4 sm:size-6 text-green-600" />
              </div>
              <div className="min-w-0">
                <div className="text-lg sm:text-2xl font-semibold text-gray-900 tabular-nums">
                  {tasksData.total.tasks}
                </div>
                <p className="text-[10px] sm:text-sm text-gray-600 leading-tight">Tasks</p>
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
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 gap-1 h-auto p-1">
          <TabsTrigger value="pomodoro" className="text-xs sm:text-sm">
            <Clock className="size-4 sm:mr-2 shrink-0" />
            <span className="truncate">Pomodoro</span>
          </TabsTrigger>
          <TabsTrigger value="tasks" className="text-xs sm:text-sm">
            <CheckCircle2 className="size-4 sm:mr-2 shrink-0" />
            <span className="truncate">Tasks</span>
          </TabsTrigger>
          <TabsTrigger value="finance" className="text-xs sm:text-sm">
            <DollarSign className="size-4 sm:mr-2 shrink-0" />
            <span className="truncate">Finance</span>
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
                    <Bar dataKey="sessions" fill="#ec4899" name="Sessions" />
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
                <CardTitle className="text-sm">Total Focus Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-600">
                  {pomodoroData.total.minutes} minutes
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  ≈ {Math.floor(pomodoroData.total.minutes / 60)}h {pomodoroData.total.minutes % 60}m
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Average Session Length</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-pink-600">
                  {pomodoroData.total.sessions > 0
                    ? Math.round(pomodoroData.total.minutes / pomodoroData.total.sessions)
                    : 0}{" "}
                  min
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  Across {pomodoroData.total.sessions} sessions
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tasks Tab */}
        <TabsContent value="tasks" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Tasks Completed</CardTitle>
            </CardHeader>
            <CardContent>
              {tasksData.chart.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={tasksData.chart}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="completed"
                      stroke="#10b981"
                      strokeWidth={2}
                      name="Completed Tasks"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[350px] flex items-center justify-center text-gray-500">
                  No completed tasks for this period
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Total Tasks Completed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">
                  {tasksData.total.tasks}
                </div>
                <p className="text-sm text-gray-600 mt-1">Tasks finished</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Average Priority</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">
                  {tasksData.total.avgPriority}
                </div>
                <p className="text-sm text-gray-600 mt-1">Out of 10</p>
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

        <TabsContent value="checkin" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="size-5 text-rose-500" />
                Check-in calendar
              </CardTitle>
              <p className="text-xs sm:text-sm text-gray-600 font-normal leading-relaxed">
                Tracking starts from{" "}
                <span className="font-medium text-gray-800">{trackingStartYmd}</span> (set the first time you open
                Analytics). Green = full five-item check-in, red = missed past day, amber = today still in progress.
                Gray = before tracking or future.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-wrap gap-3 text-xs text-gray-600">
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-3 rounded-sm bg-emerald-500" />
                  Done
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-3 rounded-sm bg-red-500" />
                  Missed
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-3 rounded-sm bg-amber-400" />
                  Today
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-3 rounded-sm bg-gray-200 border border-gray-300" />
                  N/A
                </span>
              </div>

              <div>
                <p className="text-xs font-medium text-gray-500 mb-2">{checkinCalYM.y} — tap a month</p>
                <div className="grid grid-cols-6 gap-1 sm:flex sm:flex-wrap sm:justify-start">
                  {monthNames.map((name, mi) => {
                    const s = monthStripStatus(checkinCalYM.y, mi, trackingStartYmd, todayYmd);
                    return (
                      <button
                        key={name}
                        type="button"
                        className={monthStripButtonClass(s, mi === checkinCalYM.m)}
                        onClick={() => setCheckinCalYM({ y: checkinCalYM.y, m: mi })}
                      >
                        {name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label="Previous month"
                  onClick={() =>
                    setCheckinCalYM((p) => (p.m === 0 ? { y: p.y - 1, m: 11 } : { y: p.y, m: p.m - 1 }))
                  }
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <span className="text-sm font-semibold text-gray-900">
                  {monthNames[checkinCalYM.m]} {checkinCalYM.y}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label="Next month"
                  onClick={() =>
                    setCheckinCalYM((p) => (p.m === 11 ? { y: p.y + 1, m: 0 } : { y: p.y, m: p.m + 1 }))
                  }
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>

              <div className="grid grid-cols-7 gap-0.5 sm:gap-1 text-center text-[9px] sm:text-[11px] font-medium text-gray-500">
                {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
                  <div key={d} className="py-0.5 sm:py-1 truncate">
                    {d}
                  </div>
                ))}
                {checkinMonthCells.map((cell, idx) => {
                  if (cell.ymd == null || cell.dayNum == null) {
                    return <div key={`pad-${idx}`} className="aspect-square min-h-0" />;
                  }
                  const theme = dayCellTheme(cell.ymd, trackingStartYmd, todayYmd);
                  const selectable = cell.ymd >= trackingStartYmd && cell.ymd <= todayYmd;
                  return (
                    <button
                      key={cell.ymd}
                      type="button"
                      disabled={!selectable}
                      onClick={() => selectable && setSelectedCheckinYmd(cell.ymd!)}
                      className={`aspect-square min-h-[2rem] sm:min-h-0 rounded-md text-[10px] sm:text-xs flex items-center justify-center transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 ${cellClass(
                        theme,
                        cell.ymd === effectiveSelectedYmd
                      )}`}
                    >
                      {cell.dayNum}
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                <div className="space-y-1.5 flex-1">
                  <Label htmlFor="checkin-date-pick">Choose day</Label>
                  <Input
                    id="checkin-date-pick"
                    type="date"
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
              </div>

              <div>
                <p className="text-sm font-medium text-gray-800 mb-2">Completed check-ins only</p>
                {completedCheckinYmds.length === 0 ? (
                  <p className="text-sm text-gray-500">No full check-ins recorded yet since {trackingStartYmd}.</p>
                ) : (
                  <ul className="flex flex-wrap gap-2">
                    {completedCheckinYmds.map((ymd) => (
                      <li key={ymd}>
                        <button
                          type="button"
                          className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
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
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex flex-wrap items-center gap-2">
                <Calendar className="size-5 text-emerald-600" />
                <span>Status for {selectedRow.label}</span>
                {selectedRow.complete ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                    <CheckCircle2 className="size-3.5" />
                    Full check-in
                  </span>
                ) : (
                  <span className="text-xs font-normal text-gray-500">Checklist incomplete</span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
                {(
                  [
                    ["Exercise", selectedRow.checklist.exercise],
                    ["Finance", selectedRow.checklist.finance],
                    ["Sleep", selectedRow.checklist.sleep],
                    ["Meditation", selectedRow.checklist.meditation],
                    ["Weight", selectedRow.checklist.weight],
                  ] as const
                ).map(([name, ok]) => (
                  <span key={name} className="inline-flex items-center gap-1">
                    {ok ? (
                      <CheckCircle2 className="size-3.5 text-green-600" />
                    ) : (
                      <Circle className="size-3.5 text-gray-300" />
                    )}
                    {name}
                  </span>
                ))}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg bg-gray-50 border border-gray-100 p-3">
                  <p className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
                    <Dumbbell className="size-3.5 text-emerald-600" />
                    Exercise
                  </p>
                  {selectedRow.exercises.length === 0 ? (
                    <p className="text-xs text-gray-400">No entries</p>
                  ) : (
                    <ul className="text-xs text-gray-700 space-y-1">
                      {selectedRow.exercises.map((e: ExerciseEntry) => (
                        <li key={e.id}>
                          {e.type} · {e.duration} min · {e.intensity}
                          {e.notes ? ` — ${e.notes}` : ""}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="rounded-lg bg-gray-50 border border-gray-100 p-3">
                  <p className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
                    <Moon className="size-3.5 text-indigo-600" />
                    Sleep
                  </p>
                  {selectedRow.sleeps.length === 0 ? (
                    <p className="text-xs text-gray-400">No entries</p>
                  ) : (
                    <ul className="text-xs text-gray-700 space-y-1">
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

                <div className="rounded-lg bg-gray-50 border border-gray-100 p-3">
                  <p className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
                    <Brain className="size-3.5 text-purple-600" />
                    Meditation
                  </p>
                  {selectedRow.meditations.length === 0 ? (
                    <p className="text-xs text-gray-400">No entries</p>
                  ) : (
                    <ul className="text-xs text-gray-700 space-y-1">
                      {selectedRow.meditations.map((m: MeditationEntry) => (
                        <li key={m.id}>
                          {m.duration} min · {m.type}
                          {m.notes ? ` — ${m.notes}` : ""}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="rounded-lg bg-gray-50 border border-gray-100 p-3">
                  <p className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
                    <Scale className="size-3.5 text-teal-600" />
                    Weight
                  </p>
                  {selectedRow.weights.length === 0 ? (
                    <p className="text-xs text-gray-400">No entries</p>
                  ) : (
                    <ul className="text-xs text-gray-700 space-y-1">
                      {selectedRow.weights.map((w: WeightEntry) => (
                        <li key={w.id}>
                          {w.weight} {w.unit}
                          {w.notes ? ` — ${w.notes}` : ""}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              <div className="rounded-lg bg-gray-50 border border-gray-100 p-3">
                <p className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
                  <DollarSign className="size-3.5 text-amber-600" />
                  Finance ({selectedRow.finance.length}{" "}
                  {selectedRow.finance.length === 1 ? "entry" : "entries"})
                </p>
                {selectedRow.finance.length === 0 ? (
                  <p className="text-xs text-gray-400">No entries</p>
                ) : (
                  <ul className="text-xs text-gray-700 space-y-1 max-h-32 overflow-y-auto">
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
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}