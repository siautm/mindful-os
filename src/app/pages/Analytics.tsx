import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
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

  /** One row per calendar day in range: checklist + exercise, sleep, meditation, weight, finance. */
  function getWellnessCheckInRows() {
    const { start, end } = getDateRange(timePeriod);
    const startDay = new Date(start);
    startDay.setHours(0, 0, 0, 0);
    const endDay = new Date(end);
    endDay.setHours(0, 0, 0, 0);
    if (timePeriod === "total") {
      const cap = new Date(endDay);
      cap.setDate(cap.getDate() - 365);
      if (startDay.getTime() < cap.getTime()) {
        startDay.setTime(cap.getTime());
      }
    }

    const exercises = getExerciseEntries();
    const sleeps = getSleepEntries();
    const meditations = getMeditationEntries();
    const weights = getWeightEntries();
    const finances = getFinanceEntries();

    const days: Date[] = [];
    const cur = new Date(startDay);
    while (cur.getTime() <= endDay.getTime()) {
      days.push(new Date(cur));
      cur.setDate(cur.getDate() + 1);
    }
    days.reverse();

    return days.map((day) => {
      const d0 = new Date(day);
      d0.setHours(0, 0, 0, 0);
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
    });
  }

  const pomodoroData = getPomodoroData();
  const tasksData = getTasksData();
  const financeData = getFinanceData();
  const wellnessRows = getWellnessCheckInRows();

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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="size-12 bg-purple-100 rounded-full flex items-center justify-center">
                <Clock className="size-6 text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-semibold text-gray-900">
                  {pomodoroData.total.minutes}m
                </div>
                <p className="text-sm text-gray-600">Focus Time</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="size-12 bg-blue-100 rounded-full flex items-center justify-center">
                <TrendingUp className="size-6 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-semibold text-gray-900">
                  {pomodoroData.total.sessions}
                </div>
                <p className="text-sm text-gray-600">Sessions</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="size-12 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle2 className="size-6 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-semibold text-gray-900">
                  {tasksData.total.tasks}
                </div>
                <p className="text-sm text-gray-600">Tasks Done</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="size-12 bg-red-100 rounded-full flex items-center justify-center">
                <DollarSign className="size-6 text-red-600" />
              </div>
              <div>
                <div className="text-2xl font-semibold text-gray-900">
                  ${financeData.total.expenses.toFixed(0)}
                </div>
                <p className="text-sm text-gray-600">Expenses</p>
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

          <div className="grid grid-cols-2 gap-4">
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

          <div className="grid grid-cols-2 gap-4">
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
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Income vs Expenses</CardTitle>
              </CardHeader>
              <CardContent>
                {financeData.chart.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
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

            <Card>
              <CardHeader>
                <CardTitle>Expense Categories</CardTitle>
              </CardHeader>
              <CardContent>
                {financeData.pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={financeData.pieData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(entry) => `${entry.name}: $${entry.value}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {financeData.pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-gray-500">
                    No expenses for this period
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Total Income</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">
                  ${financeData.total.income.toFixed(2)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Total Expenses</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-600">
                  ${financeData.total.expenses.toFixed(2)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Balance</CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className={`text-3xl font-bold ${
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
                Daily check-in log
              </CardTitle>
              <p className="text-sm text-gray-600 font-normal">
                Checklist progress, exercise, sleep, meditation, weight, and finance entries per day
                (same rules as the Check-In page).
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {wellnessRows.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No days in this range.</p>
              ) : (
                wellnessRows.map((row) => (
                  <div
                    key={row.day.toISOString()}
                    className="rounded-xl border border-gray-200 bg-gray-50/80 p-4 space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 pb-2">
                      <div className="flex items-center gap-2">
                        <Calendar className="size-4 text-emerald-600" />
                        <span className="font-semibold text-gray-900">{row.label}</span>
                      </div>
                      {row.complete ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                          <CheckCircle2 className="size-3.5" />
                          Full check-in
                        </span>
                      ) : (
                        <span className="text-xs text-gray-500">Checklist incomplete</span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
                      {(
                        [
                          ["Exercise", row.checklist.exercise],
                          ["Finance", row.checklist.finance],
                          ["Sleep", row.checklist.sleep],
                          ["Meditation", row.checklist.meditation],
                          ["Weight", row.checklist.weight],
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
                      <div className="rounded-lg bg-white/90 border border-gray-100 p-3">
                        <p className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
                          <Dumbbell className="size-3.5 text-emerald-600" />
                          Exercise
                        </p>
                        {row.exercises.length === 0 ? (
                          <p className="text-xs text-gray-400">No entries</p>
                        ) : (
                          <ul className="text-xs text-gray-700 space-y-1">
                            {row.exercises.map((e: ExerciseEntry) => (
                              <li key={e.id}>
                                {e.type} · {e.duration} min · {e.intensity}
                                {e.notes ? ` — ${e.notes}` : ""}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      <div className="rounded-lg bg-white/90 border border-gray-100 p-3">
                        <p className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
                          <Moon className="size-3.5 text-indigo-600" />
                          Sleep
                        </p>
                        {row.sleeps.length === 0 ? (
                          <p className="text-xs text-gray-400">No entries</p>
                        ) : (
                          <ul className="text-xs text-gray-700 space-y-1">
                            {row.sleeps.map((s: SleepEntry) => (
                              <li key={s.id}>
                                Bed {s.bedTime}
                                {s.wakeTime != null && s.wakeTime !== ""
                                  ? ` → wake ${s.wakeTime}`
                                  : ""}
                                {s.duration != null ? ` · ${s.duration}h` : ""}
                                {s.quality != null ? ` · quality ${s.quality}/5` : ""}
                                {s.notes ? ` — ${s.notes}` : ""}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      <div className="rounded-lg bg-white/90 border border-gray-100 p-3">
                        <p className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
                          <Brain className="size-3.5 text-purple-600" />
                          Meditation
                        </p>
                        {row.meditations.length === 0 ? (
                          <p className="text-xs text-gray-400">No entries</p>
                        ) : (
                          <ul className="text-xs text-gray-700 space-y-1">
                            {row.meditations.map((m: MeditationEntry) => (
                              <li key={m.id}>
                                {m.duration} min · {m.type}
                                {m.notes ? ` — ${m.notes}` : ""}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      <div className="rounded-lg bg-white/90 border border-gray-100 p-3">
                        <p className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
                          <Scale className="size-3.5 text-teal-600" />
                          Weight
                        </p>
                        {row.weights.length === 0 ? (
                          <p className="text-xs text-gray-400">No entries</p>
                        ) : (
                          <ul className="text-xs text-gray-700 space-y-1">
                            {row.weights.map((w: WeightEntry) => (
                              <li key={w.id}>
                                {w.weight} {w.unit}
                                {w.notes ? ` — ${w.notes}` : ""}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>

                    <div className="rounded-lg bg-white/90 border border-gray-100 p-3">
                      <p className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
                        <DollarSign className="size-3.5 text-amber-600" />
                        Finance ({row.finance.length}{" "}
                        {row.finance.length === 1 ? "entry" : "entries"})
                      </p>
                      {row.finance.length === 0 ? (
                        <p className="text-xs text-gray-400">No entries</p>
                      ) : (
                        <ul className="text-xs text-gray-700 space-y-1 max-h-32 overflow-y-auto">
                          {row.finance.map((f: FinanceEntry) => (
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
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}